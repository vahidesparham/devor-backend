const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./smsSetting.controller');
const { updateSmsSettingSchema } = require('./smsSetting.schemas');

const router = express.Router();

router.get(
  '/',
  auth,
  requirePermission('panel_settings.read'),
  controller.getSmsSettings,
);
router.patch(
  '/',
  auth,
  requirePermission('panel_settings.update'),
  validate(updateSmsSettingSchema),
  controller.updateSmsSettings,
);

module.exports = router;
