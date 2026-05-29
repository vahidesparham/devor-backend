const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./permission.controller');
const { listPermissionsQuerySchema } = require('./permission.schemas');

const router = express.Router();

router.get('/', auth, requirePermission('permissions.read'), validate(listPermissionsQuerySchema, 'query'), controller.listPermissions);

module.exports = router;
