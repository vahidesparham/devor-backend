const { ok } = require('../../shared/http/response');
const roleService = require('./role.service');

async function listRoles(req, res) {
  const result = await roleService.listRoles(req.query);
  return ok(res, {
    code: 'ROLE_LIST_SUCCESS',
    data: result.items,
    meta: result.meta
  });
}

async function getRoleById(req, res) {
  const role = await roleService.getRoleById(req.params.id);
  return ok(res, {
    code: 'ROLE_GET_SUCCESS',
    data: role,
    meta: null
  });
}

async function createRole(req, res) {
  const role = await roleService.createRole(req.body, req);
  return ok(
    res,
    {
      code: 'ROLE_CREATE_SUCCESS',
      data: role,
      meta: null
    },
    201
  );
}

async function updateRole(req, res) {
  const role = await roleService.updateRole(req.params.id, req.body, req);
  return ok(res, {
    code: 'ROLE_UPDATE_SUCCESS',
    data: role,
    meta: null
  });
}

async function deleteRole(req, res) {
  await roleService.deleteRole(req.params.id, req);
  return ok(res, {
    code: 'ROLE_DELETE_SUCCESS',
    data: null,
    meta: null
  });
}

module.exports = {
  listRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole
};
