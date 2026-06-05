const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./businessRole.controller');
const {
  createBusinessRoleSchema,
  updateBusinessRoleSchema,
  listBusinessRolesSchema,
  listBusinessPermissionsSchema,
  idParamSchema,
} = require('./businessRole.schemas');

const router = express.Router();

router.get('/permissions', auth, requirePermission('business_roles.read'), validate(listBusinessPermissionsSchema, 'query'), controller.listPermissions);
router.get('/next-display-order', auth, requirePermission('business_roles.read'), controller.nextDisplayOrder);
router.get('/', auth, requirePermission('business_roles.read'), validate(listBusinessRolesSchema, 'query'), controller.list);
router.get('/:id', auth, requirePermission('business_roles.read'), validate(idParamSchema, 'params'), controller.detail);
router.post('/', auth, requirePermission('business_roles.create'), validate(createBusinessRoleSchema), controller.create);
router.patch('/:id', auth, requirePermission('business_roles.update'), validate(idParamSchema, 'params'), validate(updateBusinessRoleSchema), controller.update);
router.delete('/:id', auth, requirePermission('business_roles.delete'), validate(idParamSchema, 'params'), controller.remove);

module.exports = router;
