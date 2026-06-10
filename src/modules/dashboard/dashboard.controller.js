const service = require('./dashboard.service');
const { ok } = require('../../shared/http/response');

async function getAdminDashboard(_req, res) {
  const data = await service.getAdminDashboard();
  return ok(res, { data });
}

module.exports = {
  getAdminDashboard,
};
