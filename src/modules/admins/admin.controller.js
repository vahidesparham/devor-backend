const { ok } = require('../../shared/http/response');
const adminService = require('./admin.service');

async function listAdmins(req, res) {
  const result = await adminService.listAdmins(req.query);
  return ok(res, {
    code: 'ADMIN_LIST_SUCCESS',
    data: result.items,
    meta: result.meta
  });
}

async function getAdminById(req, res) {
  const admin = await adminService.getAdminById(req.params.id);
  return ok(res, {
    code: 'ADMIN_GET_SUCCESS',
    data: admin,
    meta: null
  });
}

async function createAdmin(req, res) {
  const admin = await adminService.createAdmin(req.body, req);
  return ok(
    res,
    {
      code: 'ADMIN_CREATE_SUCCESS',
      data: admin
    },
    201
  );
}

async function updateAdmin(req, res) {
  const admin = await adminService.updateAdmin(req.params.id, req.body, req);
  return ok(res, {
    code: 'ADMIN_UPDATE_SUCCESS',
    data: admin
  });
}

module.exports = {
  listAdmins,
  getAdminById,
  createAdmin,
  updateAdmin
};
