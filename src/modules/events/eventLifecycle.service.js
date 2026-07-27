const prisma = require('../../prisma');

const DEFAULT_BATCH_SIZE = 200;

async function endExpiredEvents({
  now = new Date(),
  batchSize = DEFAULT_BATCH_SIZE,
  db = prisma,
} = {}) {
  const dueEvents = await db.event.findMany({
    where: {
      status: 'PUBLISHED',
      endsAt: { lte: now },
    },
    orderBy: [{ endsAt: 'asc' }, { id: 'asc' }],
    take: batchSize,
    select: { id: true },
  });

  if (!dueEvents.length) {
    return {
      scannedCount: 0,
      endedCount: 0,
      hasMore: false,
    };
  }

  const result = await db.event.updateMany({
    where: {
      id: { in: dueEvents.map((item) => item.id) },
      status: 'PUBLISHED',
      endsAt: { lte: now },
    },
    data: {
      status: 'ENDED',
    },
  });

  return {
    scannedCount: dueEvents.length,
    endedCount: result.count,
    hasMore: dueEvents.length === batchSize,
  };
}

module.exports = {
  DEFAULT_BATCH_SIZE,
  endExpiredEvents,
};
