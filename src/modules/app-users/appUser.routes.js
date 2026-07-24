const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./appUser.controller');
const { listAppUsersSchema, createAppUserSchema, updateAppUserSchema, idParamSchema } = require('./appUser.schemas');

const router = express.Router();

router.get('/', auth, requirePermission('app_users.read'), validate(listAppUsersSchema, 'query'), controller.list);
router.post('/', auth, requirePermission('app_users.create'), validate(createAppUserSchema), controller.create);
router.get('/:id', auth, requirePermission('app_users.read'), validate(idParamSchema, 'params'), controller.detail);
router.patch('/:id', auth, requirePermission('app_users.update'), validate(idParamSchema, 'params'), validate(updateAppUserSchema), controller.update);

module.exports = router;
