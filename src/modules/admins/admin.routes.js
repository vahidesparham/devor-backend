const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./admin.controller');
const {
  listAdminsQuerySchema,
  createAdminSchema,
  updateAdminSchema,
  idParamSchema
} = require('./admin.schemas');

const router = express.Router();

router.get('/', auth, requirePermission('admin_users.read'), validate(listAdminsQuerySchema, 'query'), controller.listAdmins);
router.get('/:id', auth, requirePermission('admin_users.read'), validate(idParamSchema, 'params'), controller.getAdminById);
router.post('/', auth, requirePermission('admin_users.create'), validate(createAdminSchema), controller.createAdmin);
router.patch(
  '/:id',
  auth,
  requirePermission('admin_users.update'),
  validate(idParamSchema, 'params'),
  validate(updateAdminSchema),
  controller.updateAdmin
);

module.exports = router;
