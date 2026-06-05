const { ok } = require('../../shared/http/response');
const service = require('./panelSetting.service');

async function getPanelSettings(_req, res) {
  const item = await service.getPanelSettings();
  return ok(res, { code: 'PANEL_SETTINGS_GET_SUCCESS', data: item });
}

async function updatePanelSettings(req, res) {
  const item = await service.updatePanelSettings(req.body, req);
  return ok(res, { code: 'PANEL_SETTINGS_UPDATE_SUCCESS', data: item });
}

module.exports = {
  getPanelSettings,
  updatePanelSettings,
};
