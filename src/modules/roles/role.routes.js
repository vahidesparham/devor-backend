const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./role.controller');
const { listRolesQuerySchema, createRoleSchema, updateRoleSchema, idParamSchema } = require('./role.schemas');

const router = express.Router();

router.get('/', auth, requirePermission('roles.read'), validate(listRolesQuerySchema, 'query'), controller.listRoles);
router.get('/:id', auth, requirePermission('roles.read'), validate(idParamSchema, 'params'), controller.getRoleById);
router.post('/', auth, requirePermission('roles.create'), validate(createRoleSchema), controller.createRole);
router.patch('/:id', auth, requirePermission('roles.update'), validate(idParamSchema, 'params'), validate(updateRoleSchema), controller.updateRole);
router.delete('/:id', auth, requirePermission('roles.delete'), validate(idParamSchema, 'params'), controller.deleteRole);

module.exports = router;
