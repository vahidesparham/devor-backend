const prisma = require('../../prisma');
const { STATUSES, assertClassifiedTransition } = require('./classifiedLifecycle');
const { DEFAULT_CLASSIFIED_SETTINGS } = require('./classifiedSettings');
const { enqueueClassifiedStatusEvent } = require('../app-events/appEventOutbox.service');

const EXPIRABLE_STATUSES = Object.freeze([
  STATUSES.PUBLISHED,
  STATUSES.PAUSED,
  STATUSES.SUSPENDED,
]);
const DEFAULT_BATCH_SIZE = 200;

async function expireDueClassifiedAds({
  now = new Date(),
  batchSize = DEFAULT_BATCH_SIZE,
  db = prisma,
  settings: settingsOverride,
} = {}) {
  const settingsRow = settingsOverride || (
    db.classifiedSetting
      ? await db.classifiedSetting.findUnique({ where: { id: 1 } })
      : null
  );
  const settings = { ...DEFAULT_CLASSIFIED_SETTINGS, ...(settingsRow || {}) };
  const dueAds = await db.classifiedAd.findMany({
    where: {
      status: { in: EXPIRABLE_STATUSES },
      expiresAt: { lte: now },
      deletedAt: null,
    },
    orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }],
    take: batchSize,
    select: {
      id: true,
      status: true,
      version: true,
      expiresAt: true,
      publicCode: true,
      title: true,
      appUserId: true,
    },
  });

  let expiredCount = 0;
  for (const ad of dueAds) {
    assertClassifiedTransition(ad.status, STATUSES.EXPIRED);
    const changed = await db.$transaction(async (tx) => {
      const updated = await tx.classifiedAd.updateMany({
        where: {
          id: ad.id,
          status: ad.status,
          version: ad.version,
          expiresAt: { lte: now },
          deletedAt: null,
        },
        data: {
          status: STATUSES.EXPIRED,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) return false;

      await tx.classifiedAdStatusHistory.create({
        data: {
          adId: ad.id,
          fromStatus: ad.status,
          toStatus: STATUSES.EXPIRED,
          actorType: 'SYSTEM',
          actorId: null,
          reasonCode: 'PUBLICATION_EXPIRED',
          metadata: {
            expiresAt: ad.expiresAt?.toISOString() || null,
            processedAt: now.toISOString(),
          },
        },
      });
      await enqueueClassifiedStatusEvent(tx, {
        ad,
        status: STATUSES.EXPIRED,
        version: ad.version + 1,
        notificationsEnabled: settings.notificationsEnabled,
      });
      return true;
    });
    if (changed) expiredCount += 1;
  }

  return {
    scannedCount: dueAds.length,
    expiredCount,
    hasMore: dueAds.length === batchSize,
  };
}

module.exports = {
  DEFAULT_BATCH_SIZE,
  EXPIRABLE_STATUSES,
  expireDueClassifiedAds,
};
