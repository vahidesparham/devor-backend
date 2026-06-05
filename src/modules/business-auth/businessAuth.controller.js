const { ok } = require('../../shared/http/response');
const service = require('./businessAuth.service');

async function login(req, res) {
  const result = await service.login(req.body, req);
  return ok(res, { code: 'BUSINESS_LOGIN_SUCCESS', data: result });
}

async function refresh(req, res) {
  const result = await service.refresh(req.body, req);
  return ok(res, { code: 'BUSINESS_REFRESH_SUCCESS', data: result });
}

async function logout(req, res) {
  const result = await service.logout(req.body, req);
  return ok(res, { code: 'BUSINESS_LOGOUT_SUCCESS', data: result });
}

async function me(req, res) {
  const result = await service.me(req.businessUser.id);
  return ok(res, { code: 'BUSINESS_ME_SUCCESS', data: result });
}

async function updateMyProfile(req, res) {
  const result = await service.updateMyProfile(req.businessUser.id, req.body, req);
  return ok(res, { code: 'BUSINESS_PROFILE_UPDATE_SUCCESS', data: result });
}

async function changeMyPassword(req, res) {
  const result = await service.changeMyPassword(req.businessUser.id, req.body, req);
  return ok(res, { code: 'BUSINESS_PASSWORD_CHANGE_SUCCESS', data: result });
}

module.exports = {
  login,
  refresh,
  logout,
  me,
  updateMyProfile,
  changeMyPassword,
};
