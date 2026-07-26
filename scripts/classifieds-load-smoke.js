const { performance } = require('node:perf_hooks');

const baseUrl = String(
  process.env.CLASSIFIED_LOAD_BASE_URL || 'http://127.0.0.1:3001/v1/app/classifieds',
).replace(/\/+$/, '');
const concurrency = Math.max(1, Number(process.env.CLASSIFIED_LOAD_CONCURRENCY) || 8);
const requestsPerScenario = Math.max(
  concurrency,
  Number(process.env.CLASSIFIED_LOAD_REQUESTS) || 40,
);
const maxP95Ms = Math.max(100, Number(process.env.CLASSIFIED_LOAD_MAX_P95_MS) || 1500);

function percentile(values, percent) {
  if (!values.length) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  const index = Math.min(ordered.length - 1, Math.ceil((percent / 100) * ordered.length) - 1);
  return Math.round(ordered[index] * 10) / 10;
}

async function requestJson(url) {
  const startedAt = performance.now();
  const response = await fetch(url, {
    headers: { 'user-agent': 'devor-classified-load-smoke/1.0' },
  });
  const durationMs = performance.now() - startedAt;
  const payload = await response.json().catch(() => null);
  return { durationMs, ok: response.ok, status: response.status, payload };
}

async function runScenario(name, buildUrl) {
  let cursor = 0;
  const durations = [];
  const statuses = new Map();

  async function worker() {
    while (cursor < requestsPerScenario) {
      const index = cursor;
      cursor += 1;
      const result = await requestJson(buildUrl(index));
      durations.push(result.durationMs);
      statuses.set(result.status, (statuses.get(result.status) || 0) + 1);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const errors = [...statuses.entries()]
    .filter(([status]) => status < 200 || status >= 400)
    .reduce((sum, [, count]) => sum + count, 0);
  return {
    name,
    requests: durations.length,
    errors,
    p50Ms: percentile(durations, 50),
    p95Ms: percentile(durations, 95),
    p99Ms: percentile(durations, 99),
    statuses: Object.fromEntries(statuses),
  };
}

async function main() {
  const seedResponse = await requestJson(`${baseUrl}/ads?page=1&pageSize=20`);
  if (!seedResponse.ok) {
    throw new Error(`Could not load classified seed page (HTTP ${seedResponse.status})`);
  }
  const ads = Array.isArray(seedResponse.payload?.data) ? seedResponse.payload.data : [];
  if (!ads.length) throw new Error('At least one published classified ad is required');

  const detailId = ads[0].id;
  const query = encodeURIComponent(String(ads[0].title || '').split(/\s+/)[0] || 'a');
  const scenarios = await Promise.all([
    runScenario('feed', (index) => `${baseUrl}/ads?page=${(index % 3) + 1}&pageSize=20`),
    runScenario('search', () => `${baseUrl}/ads?page=1&pageSize=20&q=${query}`),
    runScenario('detail', () => `${baseUrl}/ads/${detailId}`),
  ]);

  console.table(scenarios);
  const failed = scenarios.filter((scenario) => (
    scenario.errors > 0 || scenario.p95Ms > maxP95Ms
  ));
  if (failed.length) {
    throw new Error(
      `Load smoke threshold failed: ${failed.map((item) => item.name).join(', ')} `
      + `(max p95 ${maxP95Ms} ms, zero HTTP errors required)`,
    );
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
