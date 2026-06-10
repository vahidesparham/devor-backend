const { ok } = require('../../shared/http/response');
const service = require('./appAuth.service');

async function requestOtp(req, res) {
  const result = await service.requestOtp(req.body);
  return ok(res, { code: 'APP_OTP_CREATED', data: result });
}

async function verifyOtp(req, res) {
  const result = await service.verifyOtp(req.body, req);
  return ok(res, { code: 'APP_OTP_VERIFIED', data: result });
}

async function completeProfile(req, res) {
  const result = await service.completeProfile(req.appUser.id, req.body);
  return ok(res, { code: 'APP_PROFILE_COMPLETED', data: result });
}

async function uploadAvatar(req, res) {
  const result = await service.uploadAvatar(req.file);
  return ok(res, { code: 'APP_AVATAR_UPLOAD_SUCCESS', data: result }, 201);
}

async function me(req, res) {
  const result = await service.me(req.appUser.id);
  return ok(res, { code: 'APP_ME', data: result });
}

module.exports = {
  requestOtp,
  verifyOtp,
  completeProfile,
  uploadAvatar,
  me,
};
