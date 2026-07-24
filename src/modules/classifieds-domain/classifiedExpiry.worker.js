const {
  expireDueClassifiedAds,
} = require('./classifiedExpiry.service');

const DEFAULT_INTERVAL_MS = 60 * 1000;

function startClassifiedExpiryWorker({
  intervalMs = DEFAULT_INTERVAL_MS,
  onError = (error) => console.error('[classified-expiry-worker]', error),
} = {}) {
  let running = false;
  let stopped = false;

  async function run() {
    if (running || stopped) return;
    running = true;
    try {
      let result;
      do {
        result = await expireDueClassifiedAds();
      } while (!stopped && result.hasMore);
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
  startClassifiedExpiryWorker,
};
