const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./panelSetting.controller');
const { updatePanelSettingSchema } = require('./panelSetting.schemas');

const router = express.Router();

router.get('/', controller.getPanelSettings);
router.patch('/', auth, requirePermission('panel_settings.update'), validate(updatePanelSettingSchema), controller.updatePanelSettings);

module.exports = router;
