const { ok } = require('../../shared/http/response');
const service = require('./serviceType.service');

async function list(req, res) {
  const lang = req.get('x-lang') || null;
  const result = await service.listServiceTypes(req.query, lang);
  return ok(res, { code: 'SERVICE_TYPE_LIST_SUCCESS', data: result.items, meta: result.meta });
}

async function detail(req, res) {
  const item = await service.getServiceTypeById(req.params.id);
  return ok(res, { code: 'SERVICE_TYPE_DETAIL_SUCCESS', data: item });
}

async function create(req, res) {
  const item = await service.createServiceType(req.body, req);
  return ok(res, { code: 'SERVICE_TYPE_CREATE_SUCCESS', data: item }, 201);
}

async function update(req, res) {
  const item = await service.updateServiceType(req.params.id, req.body, req);
  return ok(res, { code: 'SERVICE_TYPE_UPDATE_SUCCESS', data: item });
}

async function remove(req, res) {
  await service.deleteServiceType(req.params.id, req);
  return ok(res, { code: 'SERVICE_TYPE_DELETE_SUCCESS', data: null });
}

async function nextDisplayOrder(_req, res) {
  const value = await service.getNextDisplayOrder();
  return ok(res, { code: 'SERVICE_TYPE_NEXT_DISPLAY_ORDER_SUCCESS', data: { value } });
}

module.exports = { list, detail, create, update, remove, nextDisplayOrder };
