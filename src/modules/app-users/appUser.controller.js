const { ok } = require('../../shared/http/response');
const service = require('./appUser.service');

async function list(req, res) {
  const result = await service.listAppUsers(req.query);
  return ok(res, { code: 'APP_USER_LIST_SUCCESS', data: result.items, meta: result.meta });
}

async function detail(req, res) {
  const item = await service.getAppUserById(req.params.id);
  return ok(res, { code: 'APP_USER_DETAIL_SUCCESS', data: item });
}

async function update(req, res) {
  const item = await service.updateAppUser(req.params.id, req.body, req);
  return ok(res, { code: 'APP_USER_UPDATE_SUCCESS', data: item });
}

module.exports = {
  list,
  detail,
  update,
};
