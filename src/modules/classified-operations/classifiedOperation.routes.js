const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./classifiedOperation.controller');
const {
  reconcileMediaSchema,
  updateSettingsSchema,
} = require('./classifiedOperation.schemas');

const router = express.Router();

router.get('/', auth, requirePermission('classified_operations.read'), controller.status);
router.patch(
  '/settings',
  auth,
  requirePermission('classified_settings.update'),
  validate(updateSettingsSchema),
  controller.updateSettings,
);
router.post('/jobs/expiry/run', auth, requirePermission('classified_operations.run'), controller.runExpiry);
router.post('/jobs/events/run', auth, requirePermission('classified_operations.run'), controller.dispatchEvents);
router.post(
  '/jobs/media/reconcile',
  auth,
  requirePermission('classified_operations.run'),
  validate(reconcileMediaSchema),
  controller.reconcileMedia,
);
router.post('/events/retry-dead', auth, requirePermission('classified_operations.run'), controller.retryDeadEvents);

module.exports = router;
