const prisma = require('../../prisma');
const { STATUSES, assertClassifiedTransition } = require('./classifiedLifecycle');

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
} = {}) {
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
