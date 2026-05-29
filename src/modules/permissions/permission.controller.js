const { ok } = require('../../shared/http/response');
const permissionService = require('./permission.service');

async function listPermissions(req, res) {
  const result = await permissionService.listPermissions(req.query);
  return ok(res, {
    code: 'PERMISSION_LIST_SUCCESS',
    data: result.items,
    meta: result.meta
  });
}

module.exports = {
  listPermissions
};
