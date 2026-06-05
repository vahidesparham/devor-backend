const { ok } = require('../../shared/http/response');
const service = require('./businessRole.service');

async function listPermissions(req, res) {
  const result = await service.listBusinessPermissions(req.query);
  return ok(res, { code: 'BUSINESS_PERMISSION_LIST_SUCCESS', data: result.items, meta: result.meta });
}

async function list(req, res) {
  const result = await service.listBusinessRoles(req.query);
  return ok(res, { code: 'BUSINESS_ROLE_LIST_SUCCESS', data: result.items, meta: result.meta });
}

async function detail(req, res) {
  const item = await service.getBusinessRoleById(req.params.id);
  return ok(res, { code: 'BUSINESS_ROLE_DETAIL_SUCCESS', data: item });
}

async function create(req, res) {
  const item = await service.createBusinessRole(req.body, req);
  return ok(res, { code: 'BUSINESS_ROLE_CREATE_SUCCESS', data: item }, 201);
}

async function update(req, res) {
  const item = await service.updateBusinessRole(req.params.id, req.body, req);
  return ok(res, { code: 'BUSINESS_ROLE_UPDATE_SUCCESS', data: item });
}

async function remove(req, res) {
  await service.deleteBusinessRole(req.params.id, req);
  return ok(res, { code: 'BUSINESS_ROLE_DELETE_SUCCESS', data: null });
}

async function nextDisplayOrder(req, res) {
  const value = await service.getNextDisplayOrder(req.query.businessId);
  return ok(res, { code: 'BUSINESS_ROLE_NEXT_DISPLAY_ORDER_SUCCESS', data: { value } });
}

module.exports = { listPermissions, list, detail, create, update, remove, nextDisplayOrder };
