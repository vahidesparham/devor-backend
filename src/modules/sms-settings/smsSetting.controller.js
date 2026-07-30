const { ok } = require('../../shared/http/response');
const service = require('./smsSetting.service');

async function getSmsSettings(_req, res) {
  return ok(res, {
    code: 'SMS_SETTINGS_GET_SUCCESS',
    data: await service.getSmsSettings(),
  });
}

async function updateSmsSettings(req, res) {
  return ok(res, {
    code: 'SMS_SETTINGS_UPDATE_SUCCESS',
    data: await service.updateSmsSettings(req.body, req),
  });
}

module.exports = {
  getSmsSettings,
  updateSmsSettings,
};
