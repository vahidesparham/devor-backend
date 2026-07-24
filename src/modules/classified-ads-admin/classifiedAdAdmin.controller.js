const { ok } = require('../../shared/http/response');
const service = require('./classifiedAdAdmin.service');

async function list(req, res) {
  const result = await service.listClassifiedAds(req.query);
  return ok(res, { code: 'CLASSIFIED_ADMIN_LIST_SUCCESS', data: result.items, meta: result.meta });
}

async function stats(_req, res) {
  const data = await service.getModerationStats();
  return ok(res, { code: 'CLASSIFIED_ADMIN_STATS_SUCCESS', data });
}

async function detail(req, res) {
  const data = await service.getClassifiedAdById(req.params.id);
  return ok(res, { code: 'CLASSIFIED_ADMIN_DETAIL_SUCCESS', data });
}

function action(method, code) {
  return async (req, res) => {
    const data = await service[method](req.params.id, req.body, req);
    return ok(res, { code, data });
  };
}

module.exports = {
  approve: action('approveClassifiedAd', 'CLASSIFIED_APPROVE_SUCCESS'),
  archive: action('archiveClassifiedAd', 'CLASSIFIED_ADMIN_ARCHIVE_SUCCESS'),
  detail,
  list,
  reject: action('rejectClassifiedAd', 'CLASSIFIED_REJECT_SUCCESS'),
  restore: action('restoreClassifiedAd', 'CLASSIFIED_RESTORE_SUCCESS'),
  stats,
  suspend: action('suspendClassifiedAd', 'CLASSIFIED_SUSPEND_SUCCESS'),
};
