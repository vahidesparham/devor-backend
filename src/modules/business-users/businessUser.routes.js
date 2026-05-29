const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./businessUser.controller');
const {
  createBusinessUserSchema,
  updateBusinessUserSchema,
  listBusinessUsersSchema,
  idParamSchema,
} = require('./businessUser.schemas');

const router = express.Router();

router.get('/', auth, requirePermission('business_users.read'), validate(listBusinessUsersSchema, 'query'), controller.list);
router.get('/:id', auth, requirePermission('business_users.read'), validate(idParamSchema, 'params'), controller.detail);
router.post('/', auth, requirePermission('business_users.create'), validate(createBusinessUserSchema), controller.create);
router.patch('/:id', auth, requirePermission('business_users.update'), validate(idParamSchema, 'params'), validate(updateBusinessUserSchema), controller.update);
router.delete('/:id', auth, requirePermission('business_users.delete'), validate(idParamSchema, 'params'), controller.remove);

module.exports = router;
