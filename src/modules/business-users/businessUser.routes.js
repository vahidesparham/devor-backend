const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./businessUser.controller');
const {
  createBusinessUserSchema,
  createBusinessUserAccountSchema,
  createBusinessMembershipSchema,
  updateBusinessUserSchema,
  updateBusinessUserAccountSchema,
  updateBusinessMembershipSchema,
  listBusinessUsersSchema,
  idParamSchema,
} = require('./businessUser.schemas');

const router = express.Router();

router.get('/accounts', auth, requirePermission('business_users.read'), validate(listBusinessUsersSchema, 'query'), controller.listAccounts);
router.get('/accounts/:id', auth, requirePermission('business_users.read'), validate(idParamSchema, 'params'), controller.accountDetail);
router.post('/accounts', auth, requirePermission('business_users.create'), validate(createBusinessUserAccountSchema), controller.createAccount);
router.patch('/accounts/:id', auth, requirePermission('business_users.update'), validate(idParamSchema, 'params'), validate(updateBusinessUserAccountSchema), controller.updateAccount);
router.delete('/accounts/:id', auth, requirePermission('business_users.delete'), validate(idParamSchema, 'params'), controller.removeAccount);

router.post('/memberships', auth, requirePermission('business_users.create'), validate(createBusinessMembershipSchema), controller.createMembership);
router.patch('/memberships/:id', auth, requirePermission('business_users.update'), validate(idParamSchema, 'params'), validate(updateBusinessMembershipSchema), controller.updateMembership);

router.get('/', auth, requirePermission('business_users.read'), validate(listBusinessUsersSchema, 'query'), controller.list);
router.get('/:id', auth, requirePermission('business_users.read'), validate(idParamSchema, 'params'), controller.detail);
router.post('/', auth, requirePermission('business_users.create'), validate(createBusinessUserSchema), controller.create);
router.patch('/:id', auth, requirePermission('business_users.update'), validate(idParamSchema, 'params'), validate(updateBusinessUserSchema), controller.update);
router.delete('/:id', auth, requirePermission('business_users.delete'), validate(idParamSchema, 'params'), controller.remove);

module.exports = router;
