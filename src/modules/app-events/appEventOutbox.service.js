const { randomUUID } = require('crypto');
const prisma = require('../../prisma');

const DEFAULT_BATCH_SIZE = 50;
const MAX_ATTEMPTS = 5;

async function enqueueAppEvent(db, {
  eventType,
  aggregateType,
  aggregateId,
  recipientAppUserId,
  payload,
  dedupeKey,
  availableAt,
}) {
  if (!recipientAppUserId || !db?.appEventOutbox) return null;
  return db.appEventOutbox.upsert({
    where: { dedupeKey },
    update: {},
    create: {
      eventType,
      aggregateType,
      aggregateId: String(aggregateId),
      recipientAppUserId: Number(recipientAppUserId),
      payload,
      dedupeKey,
      availableAt: availableAt || new Date(),
    },
  });
}

function classifiedStatusMessage(status, title) {
  const adTitle = String(title || 'آگهی شما').trim();
  const messages = {
    PUBLISHED: {
      title: 'آگهی منتشر شد',
      body: `آگهی «${adTitle}» منتشر شد و اکنون برای کاربران قابل مشاهده است.`,
    },
    REJECTED: {
      title: 'آگهی نیاز به اصلاح دارد',
      body: `آگهی «${adTitle}» تأیید نشد. دلیل بررسی را در بخش آگهی‌های من ببینید.`,
    },
    SUSPENDED: {
      title: 'نمایش آگهی متوقف شد',
      body: `نمایش آگهی «${adTitle}» توسط مدیریت متوقف شده است.`,
    },
    EXPIRED: {
      title: 'مهلت آگهی پایان یافت',
      body: `مهلت نمایش آگهی «${adTitle}» پایان یافته است. می‌توانید آن را تمدید کنید.`,
    },
    ARCHIVED: {
      title: 'آگهی بایگانی شد',
      body: `آگهی «${adTitle}» بایگانی شد.`,
    },
  };
  return messages[status] || null;
}

function enqueueClassifiedStatusEvent(db, {
  ad,
  status,
  version,
  note,
  notificationsEnabled = true,
}) {
  if (!notificationsEnabled || !ad?.appUserId) return Promise.resolve(null);
  const message = classifiedStatusMessage(status, ad.title);
  if (!message) return Promise.resolve(null);
  return enqueueAppEvent(db, {
    eventType: `CLASSIFIED_AD_${status}`,
    aggregateType: 'CLASSIFIED_AD',
    aggregateId: ad.publicCode || ad.id,
    recipientAppUserId: ad.appUserId,
    dedupeKey: `classified-ad:${ad.id}:status:${status}:v${version}`,
    payload: {
      ...message,
      data: {
        adId: ad.id,
        publicCode: ad.publicCode,
        status,
        note: note || null,
      },
    },
  });
}

async function recoverStaleEvents(db, now) {
  const staleBefore = new Date(now.getTime() - 10 * 60 * 1000);
  await db.appEventOutbox.updateMany({
    where: {
      status: 'PROCESSING',
      lockedAt: { lt: staleBefore },
    },
    data: {
      status: 'FAILED',
      lockedAt: null,
      lockToken: null,
      availableAt: now,
      lastError: 'Recovered stale processing lock',
    },
  });
}

async function claimEvents(db, batchSize, now) {
  const candidates = await db.appEventOutbox.findMany({
    where: {
      status: { in: ['PENDING', 'FAILED'] },
      availableAt: { lte: now },
      attempts: { lt: MAX_ATTEMPTS },
    },
    orderBy: [{ availableAt: 'asc' }, { id: 'asc' }],
    take: batchSize,
    select: { id: true },
  });
  if (!candidates.length) return [];

  const lockToken = randomUUID();
  const ids = candidates.map((item) => item.id);
  await db.appEventOutbox.updateMany({
    where: {
      id: { in: ids },
      status: { in: ['PENDING', 'FAILED'] },
      availableAt: { lte: now },
      attempts: { lt: MAX_ATTEMPTS },
    },
    data: {
      status: 'PROCESSING',
      attempts: { increment: 1 },
      lockedAt: now,
      lockToken,
    },
  });
  return db.appEventOutbox.findMany({
    where: { lockToken, status: 'PROCESSING' },
    orderBy: { id: 'asc' },
  });
}

async function dispatchEvent(db, event, now) {
  const payload = event.payload || {};
  await db.$transaction(async (tx) => {
    if (event.recipientAppUserId) {
      await tx.appNotification.upsert({
        where: { sourceEventId: event.id },
        update: {},
        create: {
          appUserId: event.recipientAppUserId,
          sourceEventId: event.id,
          type: event.eventType,
          title: String(payload.title || 'اعلان جدید').slice(0, 160),
          body: String(payload.body || '').slice(0, 500),
          data: payload.data || null,
        },
      });
    }
    await tx.appEventOutbox.update({
      where: { id: event.id },
      data: {
        status: 'PROCESSED',
        processedAt: now,
        lockedAt: null,
        lockToken: null,
        lastError: null,
      },
    });
  });
}

async function failEvent(db, event, error, now) {
  const dead = event.attempts >= MAX_ATTEMPTS;
  const backoffMinutes = Math.min(60, 2 ** Math.max(0, event.attempts - 1));
  await db.appEventOutbox.update({
    where: { id: event.id },
    data: {
      status: dead ? 'DEAD' : 'FAILED',
      availableAt: new Date(now.getTime() + backoffMinutes * 60 * 1000),
      lockedAt: null,
      lockToken: null,
      lastError: String(error?.message || error || 'Event dispatch failed').slice(0, 1000),
    },
  });
}

async function dispatchPendingAppEvents({
  db = prisma,
  batchSize = DEFAULT_BATCH_SIZE,
  now = new Date(),
} = {}) {
  await recoverStaleEvents(db, now);
  const events = await claimEvents(db, batchSize, now);
  let processedCount = 0;
  let failedCount = 0;

  for (const event of events) {
    try {
      await dispatchEvent(db, event, now);
      processedCount += 1;
    } catch (error) {
      failedCount += 1;
      await failEvent(db, event, error, now);
    }
  }

  return {
    scannedCount: events.length,
    processedCount,
    affectedCount: processedCount,
    failedCount,
    hasMore: events.length === batchSize,
    metadata: { failedCount },
  };
}

module.exports = {
  DEFAULT_BATCH_SIZE,
  MAX_ATTEMPTS,
  dispatchPendingAppEvents,
  enqueueAppEvent,
  enqueueClassifiedStatusEvent,
};
