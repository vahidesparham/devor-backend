const { ok } = require('../../shared/http/response');
const service = require('./businessUser.service');

async function list(req, res) {
  const result = await service.listBusinessUsers(req.query);
  return ok(res, { code: 'BUSINESS_USER_LIST_SUCCESS', data: result.items, meta: result.meta });
}

async function listAccounts(req, res) {
  const result = await service.listBusinessUserAccounts(req.query);
  return ok(res, { code: 'BUSINESS_USER_ACCOUNT_LIST_SUCCESS', data: result.items, meta: result.meta });
}

async function detail(req, res) {
  const item = await service.getBusinessUserById(req.params.id);
  return ok(res, { code: 'BUSINESS_USER_DETAIL_SUCCESS', data: item });
}

async function accountDetail(req, res) {
  const item = await service.getBusinessUserAccountById(req.params.id);
  return ok(res, { code: 'BUSINESS_USER_ACCOUNT_DETAIL_SUCCESS', data: item });
}

async function create(req, res) {
  const item = await service.createBusinessUser(req.body, req);
  return ok(res, { code: 'BUSINESS_USER_CREATE_SUCCESS', data: item }, 201);
}

async function createMembership(req, res) {
  const item = await service.createBusinessMembership(req.body, req);
  return ok(res, { code: 'BUSINESS_MEMBERSHIP_CREATE_SUCCESS', data: item }, 201);
}

async function createAccount(req, res) {
  const item = await service.createBusinessUserAccount(req.body, req);
  return ok(res, { code: 'BUSINESS_USER_ACCOUNT_CREATE_SUCCESS', data: item }, 201);
}

async function update(req, res) {
  const item = await service.updateBusinessUser(req.params.id, req.body, req);
  return ok(res, { code: 'BUSINESS_USER_UPDATE_SUCCESS', data: item });
}

async function updateMembership(req, res) {
  const item = await service.updateBusinessMembership(req.params.id, req.body, req);
  return ok(res, { code: 'BUSINESS_MEMBERSHIP_UPDATE_SUCCESS', data: item });
}

async function updateAccount(req, res) {
  const item = await service.updateBusinessUserAccount(req.params.id, req.body, req);
  return ok(res, { code: 'BUSINESS_USER_ACCOUNT_UPDATE_SUCCESS', data: item });
}

async function remove(req, res) {
  await service.deleteBusinessUser(req.params.id, req);
  return ok(res, { code: 'BUSINESS_USER_DELETE_SUCCESS', data: null });
}

async function removeAccount(req, res) {
  await service.deleteBusinessUserAccount(req.params.id, req);
  return ok(res, { code: 'BUSINESS_USER_ACCOUNT_DELETE_SUCCESS', data: null });
}

module.exports = { list, listAccounts, detail, accountDetail, create, createMembership, createAccount, update, updateMembership, updateAccount, remove, removeAccount };
