const { ok } = require('../../shared/http/response');
const service = require('./classifiedReport.service');

async function list(req, res) {
  const result = await service.listClassifiedReports(req.query);
  return ok(res, { code: 'CLASSIFIED_REPORT_LIST_SUCCESS', data: result.items, meta: result.meta });
}

async function stats(_req, res) {
  return ok(res, { code: 'CLASSIFIED_REPORT_STATS_SUCCESS', data: await service.getReportStats() });
}

async function detail(req, res) {
  return ok(res, { code: 'CLASSIFIED_REPORT_DETAIL_SUCCESS', data: await service.getClassifiedReportById(req.params.id) });
}

function action(method, code) {
  return async (req, res) => ok(res, { code, data: await service[method](req.params.id, req.body, req) });
}

module.exports = {
  detail,
  dismiss: action('dismissClassifiedReport', 'CLASSIFIED_REPORT_DISMISS_SUCCESS'),
  list,
  resolve: action('resolveClassifiedReport', 'CLASSIFIED_REPORT_RESOLVE_SUCCESS'),
  review: action('reviewClassifiedReport', 'CLASSIFIED_REPORT_REVIEW_SUCCESS'),
  stats,
};
