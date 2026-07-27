const { runMonitoredJob } = require('../../shared/jobs/backgroundJobMonitor');
const { endExpiredEvents } = require('./eventLifecycle.service');

const DEFAULT_INTERVAL_MS = 60 * 1000;

function startEventLifecycleWorker({
  intervalMs = DEFAULT_INTERVAL_MS,
  onError = (error) => console.error('[event-lifecycle-worker]', error),
} = {}) {
  let running = false;
  let stopped = false;

  async function run() {
    if (running || stopped) return;
    running = true;
    try {
      await runMonitoredJob('event-lifecycle', async () => {
        let result;
        let scannedCount = 0;
        let endedCount = 0;
        do {
          result = await endExpiredEvents();
          scannedCount += result.scannedCount;
          endedCount += result.endedCount;
        } while (!stopped && result.hasMore);

        return {
          scannedCount,
          affectedCount: endedCount,
          endedCount,
        };
      }, { staleAfterMs: Math.max(intervalMs * 4, 5 * 60 * 1000) });
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
  startEventLifecycleWorker,
};
