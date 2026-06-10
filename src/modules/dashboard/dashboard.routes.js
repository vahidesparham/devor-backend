const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const controller = require('./dashboard.controller');

const router = express.Router();

router.get('/', auth, requirePermission('businesses.read'), controller.getAdminDashboard);

module.exports = router;
