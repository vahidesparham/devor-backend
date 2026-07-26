const prisma = require('../../prisma');
const { runMonitoredJob } = require('../../shared/jobs/backgroundJobMonitor');
const { DEFAULT_CLASSIFIED_SETTINGS } = require('./classifiedSettings');
const { reconcileClassifiedMedia } = require('./classifiedMediaMaintenance.service');

const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000;

function startClassifiedMediaMaintenanceWorker({
  intervalMs = DEFAULT_INTERVAL_MS,
  onError = (error) => console.error('[classified-media-worker]', error),
} = {}) {
  let running = false;
  let stopped = false;

  async function run() {
    if (running || stopped) return;
    running = true;
    try {
      await runMonitoredJob('classified-media-reconciliation', async () => {
        const row = await prisma.classifiedSetting.findUnique({ where: { id: 1 } });
        const settings = { ...DEFAULT_CLASSIFIED_SETTINGS, ...(row || {}) };
        return reconcileClassifiedMedia({
          graceHours: settings.mediaCleanupGraceHours,
          execute: true,
        });
      }, { staleAfterMs: Math.max(intervalMs * 2, 2 * 60 * 60 * 1000) });
    } catch (error) {
      onError(error);
    } finally {
      running = false;
    }
  }

  const timer = setInterval(run, intervalMs);
  timer.unref();
  run();

  return () => {
    stopped = true;
    clearInterval(timer);
  };
}

module.exports = {
  DEFAULT_INTERVAL_MS,
  startClassifiedMediaMaintenanceWorker,
};
