const { runMonitoredJob } = require('../../shared/jobs/backgroundJobMonitor');
const { dispatchPendingAppEvents } = require('./appEventOutbox.service');

const DEFAULT_INTERVAL_MS = 5000;

function startAppEventWorker({
  intervalMs = DEFAULT_INTERVAL_MS,
  onError = (error) => console.error('[app-event-worker]', error),
} = {}) {
  let running = false;
  let stopped = false;

  async function run() {
    if (running || stopped) return;
    running = true;
    try {
      await runMonitoredJob('app-event-dispatch', async () => {
        let result;
        let scannedCount = 0;
        let processedCount = 0;
        let failedCount = 0;
        do {
          result = await dispatchPendingAppEvents();
          scannedCount += result.scannedCount;
          processedCount += result.processedCount;
          failedCount += result.failedCount;
        } while (!stopped && result.hasMore);
        return {
          scannedCount,
          affectedCount: processedCount,
          metadata: { failedCount },
        };
      }, { staleAfterMs: Math.max(intervalMs * 4, 60 * 1000) });
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
  startAppEventWorker,
};
