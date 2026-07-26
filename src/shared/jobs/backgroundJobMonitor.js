const prisma = require('../../prisma');

function toCount(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
}

function errorMessage(error) {
  return String(error?.message || error || 'Unknown background job error').slice(0, 1000);
}

async function runMonitoredJob(jobName, handler, {
  db = prisma,
  staleAfterMs = 60 * 60 * 1000,
} = {}) {
  const startedAt = new Date();
  const staleBefore = new Date(startedAt.getTime() - staleAfterMs);

  await db.backgroundJobState.upsert({
    where: { jobName },
    update: {},
    create: { jobName },
  });
  const claimed = await db.backgroundJobState.updateMany({
    where: {
      jobName,
      OR: [
        { isRunning: false },
        { lastStartedAt: { lt: staleBefore } },
      ],
    },
    data: {
      isRunning: true,
      lastStartedAt: startedAt,
    },
  });
  if (claimed.count !== 1) {
    return { skipped: true, reason: 'already_running' };
  }

  try {
    const result = await handler();
    const finishedAt = new Date();
    await db.backgroundJobState.update({
      where: { jobName },
      data: {
        isRunning: false,
        lastSucceededAt: finishedAt,
        lastDurationMs: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
        lastScannedCount: toCount(result?.scannedCount),
        lastAffectedCount: toCount(result?.affectedCount ?? result?.expiredCount ?? result?.processedCount),
        consecutiveFailures: 0,
        lastError: null,
        metadata: result?.metadata || undefined,
      },
    });
    return { ...result, skipped: false };
  } catch (error) {
    const finishedAt = new Date();
    await db.backgroundJobState.update({
      where: { jobName },
      data: {
        isRunning: false,
        lastFailedAt: finishedAt,
        lastDurationMs: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
        consecutiveFailures: { increment: 1 },
        lastError: errorMessage(error),
      },
    }).catch(() => {});
    throw error;
  }
}

module.exports = {
  runMonitoredJob,
};
