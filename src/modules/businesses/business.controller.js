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

module.exports = { list, detail, create, update, remove, nextDisplayOrder };
