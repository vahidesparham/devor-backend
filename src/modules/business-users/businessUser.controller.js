const { ok } = require('../../shared/http/response');
const service = require('./businessUser.service');

async function list(req, res) {
  const result = await service.listBusinessUsers(req.query);
  return ok(res, { code: 'BUSINESS_USER_LIST_SUCCESS', data: result.items, meta: result.meta });
}

async function detail(req, res) {
  const item = await service.getBusinessUserById(req.params.id);
  return ok(res, { code: 'BUSINESS_USER_DETAIL_SUCCESS', data: item });
}

async function create(req, res) {
  const item = await service.createBusinessUser(req.body, req);
  return ok(res, { code: 'BUSINESS_USER_CREATE_SUCCESS', data: item }, 201);
}

async function update(req, res) {
  const item = await service.updateBusinessUser(req.params.id, req.body, req);
  return ok(res, { code: 'BUSINESS_USER_UPDATE_SUCCESS', data: item });
}

async function remove(req, res) {
  await service.deleteBusinessUser(req.params.id, req);
  return ok(res, { code: 'BUSINESS_USER_DELETE_SUCCESS', data: null });
}

module.exports = { list, detail, create, update, remove };
