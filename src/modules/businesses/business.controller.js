const { ok } = require('../../shared/http/response');
const service = require('./business.service');

async function list(req, res) {
  const lang = req.get('x-lang') || null;
  const result = await service.listBusinesses(req.query, lang);
  return ok(res, { code: 'BUSINESS_LIST_SUCCESS', data: result.items, meta: result.meta });
}

async function detail(req, res) {
  const item = await service.getBusinessById(req.params.id);
  return ok(res, { code: 'BUSINESS_DETAIL_SUCCESS', data: item });
}

async function readiness(req, res) {
  const item = await service.getBusinessReadiness(req.params.id);
  return ok(res, { code: 'BUSINESS_READINESS_SUCCESS', data: item });
}

async function create(req, res) {
  const item = await service.createBusiness(req.body, req);
  return ok(res, { code: 'BUSINESS_CREATE_SUCCESS', data: item }, 201);
}

async function update(req, res) {
  const item = await service.updateBusiness(req.params.id, req.body, req);
  return ok(res, { code: 'BUSINESS_UPDATE_SUCCESS', data: item });
}

async function remove(req, res) {
  await service.deleteBusiness(req.params.id, req);
  return ok(res, { code: 'BUSINESS_DELETE_SUCCESS', data: null });
}

async function nextDisplayOrder(req, res) {
  const value = await service.getNextDisplayOrder(req.query.serviceTypeId);
  return ok(res, { code: 'BUSINESS_NEXT_DISPLAY_ORDER_SUCCESS', data: { value } });
}

async function submitReview(req, res) {
  const item = await service.transitionBusinessPublication(req.params.id, 'PENDING_REVIEW', req.body || {}, req);
  return ok(res, { code: 'BUSINESS_SUBMIT_REVIEW_SUCCESS', data: item });
}

async function publish(req, res) {
  const item = await service.transitionBusinessPublication(req.params.id, 'PUBLISHED', req.body || {}, req);
  return ok(res, { code: 'BUSINESS_PUBLISH_SUCCESS', data: item });
}

async function reject(req, res) {
  const item = await service.transitionBusinessPublication(req.params.id, 'REJECTED', req.body || {}, req);
  return ok(res, { code: 'BUSINESS_REJECT_SUCCESS', data: item });
}

async function suspend(req, res) {
  const item = await service.transitionBusinessPublication(req.params.id, 'SUSPENDED', req.body || {}, req);
  return ok(res, { code: 'BUSINESS_SUSPEND_SUCCESS', data: item });
}

async function moveToDraft(req, res) {
  const item = await service.transitionBusinessPublication(req.params.id, 'DRAFT', req.body || {}, req);
  return ok(res, { code: 'BUSINESS_DRAFT_SUCCESS', data: item });
}

module.exports = { list, detail, readiness, create, update, remove, nextDisplayOrder, submitReview, publish, reject, suspend, moveToDraft };
