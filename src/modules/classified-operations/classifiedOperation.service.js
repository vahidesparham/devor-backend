const prisma = require('../../prisma');
const { audit } = require('../../shared/audit/audit');
const { AppError } = require('../../shared/http/response');
const { runMonitoredJob } = require('../../shared/jobs/backgroundJobMonitor');
const { dispatchPendingAppEvents } = require('../app-events/appEventOutbox.service');
const { expireDueClassifiedAds } = require('../classifieds-domain/classifiedExpiry.service');
const { reconcileClassifiedMedia } = require('../classifieds-domain/classifiedMediaMaintenance.service');
const {
  DEFAULT_CLASSIFIED_SETTINGS,
  validateClassifiedSettings,
} = require('../classifieds-domain/classifiedSettings');

const OPEN_REPORT_STATUSES = ['OPEN', 'REVIEWING'];

async function loadSettings(db = prisma) {
  const row = await db.classifiedSetting.findUnique({ where: { id: 1 } });
  return { ...DEFAULT_CLASSIFIED_SETTINGS, ...(row || {}) };
}

function mapJob(job, now) {
  const startedAt = job.lastStartedAt ? new Date(job.lastStartedAt) : null;
  const stale = Boolean(
    job.isRunning
    && startedAt
    && now.getTime() - startedAt.getTime() > 2 * 60 * 60 * 1000
  );
  return {
    name: job.jobName,
    isRunning: job.isRunning,
    stale,
    healthy: !stale && job.consecutiveFailures === 0,
    lastStartedAt: job.lastStartedAt,
    lastSucceededAt: job.lastSucceededAt,
    lastFailedAt: job.lastFailedAt,
    lastDurationMs: job.lastDurationMs,
    lastScannedCount: job.lastScannedCount,
    lastAffectedCount: job.lastAffectedCount,
    consecutiveFailures: job.consecutiveFailures,
    lastError: job.lastError,
    metadata: job.metadata,
  };
}

async function getOperationalStatus() {
  const now = new Date();
  const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const [
    settings,
    adStatuses,
    reportStatuses,
    eventStatuses,
    jobs,
    oldestPending,
    expiringSoonCount,
    unreadNotificationCount,
  ] = await Promise.all([
    loadSettings(),
    prisma.classifiedAd.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.classifiedReport.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.appEventOutbox.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.backgroundJobState.findMany({ orderBy: { jobName: 'asc' } }),
    prisma.classifiedAd.findFirst({
      where: { status: 'PENDING_REVIEW', deletedAt: null },
      orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }],
      select: { submittedAt: true },
    }),
    prisma.classifiedAd.count({
      where: {
        status: { in: ['PUBLISHED', 'PAUSED', 'SUSPENDED'] },
        expiresAt: { gt: now, lte: nextDay },
        deletedAt: null,
      },
    }),
    prisma.appNotification.count({ where: { readAt: null } }),
  ]);

  const reportsByStatus = Object.fromEntries(
    reportStatuses.map((row) => [row.status, row._count._all]),
  );
  const eventsByStatus = Object.fromEntries(
    eventStatuses.map((row) => [row.status, row._count._all]),
  );
  const mappedJobs = jobs.map((job) => mapJob(job, now));
  const deadEventCount = eventsByStatus.DEAD || 0;
  const unhealthyJobCount = mappedJobs.filter((job) => !job.healthy).length;

  return {
    generatedAt: now,
    health: {
      status: deadEventCount || unhealthyJobCount ? 'ATTENTION' : 'HEALTHY',
      deadEventCount,
      unhealthyJobCount,
    },
    featureFlags: {
      publicBrowseEnabled: settings.publicBrowseEnabled,
      appUserPostingEnabled: settings.appUserPostingEnabled,
      favoritesEnabled: settings.favoritesEnabled,
      reportsEnabled: settings.reportsEnabled,
      notificationsEnabled: settings.notificationsEnabled,
      allowChatContact: settings.allowChatContact,
      maintenanceMessage: settings.maintenanceMessage,
    },
    limits: {
      maxReportsPerUserPerDay: settings.maxReportsPerUserPerDay,
      mediaCleanupGraceHours: settings.mediaCleanupGraceHours,
      chatStarterMessageLimit: settings.chatStarterMessageLimit,
    },
    moderation: {
      byStatus: Object.fromEntries(adStatuses.map((row) => [row.status, row._count._all])),
      pendingCount: adStatuses.find((row) => row.status === 'PENDING_REVIEW')?._count._all || 0,
      oldestPendingAt: oldestPending?.submittedAt || null,
      openReportCount: OPEN_REPORT_STATUSES.reduce(
        (sum, status) => sum + (reportsByStatus[status] || 0),
        0,
      ),
      expiringSoonCount,
    },
    events: {
      byStatus: eventsByStatus,
      pendingCount: (eventsByStatus.PENDING || 0) + (eventsByStatus.FAILED || 0),
      deadCount: deadEventCount,
      unreadNotificationCount,
    },
    jobs: mappedJobs,
  };
}

async function updateSettings(data, req) {
  const previous = await loadSettings();
  const next = { ...previous, ...data };
  const issues = validateClassifiedSettings(next);
  if (issues.length) {
    throw new AppError(400, 'CLASSIFIED_SETTINGS_INVALID', 'Classified settings are invalid', {
      errors: issues.map((item) => ({ path: item.field, message: item.message })),
    });
  }
  const saved = await prisma.$transaction(async (tx) => {
    const updated = await tx.classifiedSetting.upsert({
      where: { id: 1 },
      update: data,
      create: { ...DEFAULT_CLASSIFIED_SETTINGS, ...data },
    });
    await audit(req, {
      action: 'UPDATE',
      entity: 'ClassifiedSetting',
      entityId: 1,
      before: previous,
      after: updated,
    }, tx);
    return updated;
  });
  return saved;
}

async function runExpiryNow(req) {
  const result = await runMonitoredJob('classified-expiry', async () => {
    let batch;
    let scannedCount = 0;
    let expiredCount = 0;
    do {
      batch = await expireDueClassifiedAds();
      scannedCount += batch.scannedCount;
      expiredCount += batch.expiredCount;
    } while (batch.hasMore);
    return { scannedCount, affectedCount: expiredCount, expiredCount };
  });
  await audit(req, {
    action: 'BULK',
    entity: 'ClassifiedExpiryJob',
    details: result,
  });
  return result;
}

async function dispatchEventsNow(req) {
  const result = await runMonitoredJob('app-event-dispatch', async () => {
    let batch;
    let scannedCount = 0;
    let processedCount = 0;
    let failedCount = 0;
    do {
      batch = await dispatchPendingAppEvents();
      scannedCount += batch.scannedCount;
      processedCount += batch.processedCount;
      failedCount += batch.failedCount;
    } while (batch.hasMore);
    return {
      scannedCount,
      affectedCount: processedCount,
      processedCount,
      metadata: { failedCount },
    };
  });
  await audit(req, {
    action: 'BULK',
    entity: 'AppEventOutbox',
    details: result,
  });
  return result;
}

async function reconcileMedia(data, req) {
  const settings = await loadSettings();
  const execute = data.execute === true;
  const handler = () => reconcileClassifiedMedia({
    execute,
    graceHours: settings.mediaCleanupGraceHours,
  });
  const result = execute
    ? await runMonitoredJob('classified-media-reconciliation', handler)
    : await handler();
  await audit(req, {
    action: 'BULK',
    entity: 'ClassifiedMedia',
    details: {
      execute,
      scannedCount: result.scannedCount,
      orphanCount: result.orphanCount,
      deletedCount: result.deletedCount,
      missingReferenceCount: result.missingReferenceCount,
    },
  });
  return result;
}

async function retryDeadEvents(req) {
  const result = await prisma.appEventOutbox.updateMany({
    where: { status: 'DEAD' },
    data: {
      status: 'PENDING',
      attempts: 0,
      availableAt: new Date(),
      lockedAt: null,
      lockToken: null,
      lastError: null,
    },
  });
  await audit(req, {
    action: 'BULK',
    entity: 'AppEventOutbox',
    details: { action: 'RETRY_DEAD', updatedCount: result.count },
  });
  return { updatedCount: result.count };
}

module.exports = {
  dispatchEventsNow,
  getOperationalStatus,
  reconcileMedia,
  retryDeadEvents,
  runExpiryNow,
  updateSettings,
};
