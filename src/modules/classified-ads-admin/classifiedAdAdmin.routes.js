const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./classifiedAdAdmin.controller');
const {
  approveSchema,
  archiveSchema,
  idParamSchema,
  listClassifiedAdsSchema,
  rejectSchema,
  restoreSchema,
  suspendSchema,
} = require('./classifiedAdAdmin.schemas');

const router = express.Router();

router.get('/', auth, requirePermission('classified_ads.read'), validate(listClassifiedAdsSchema, 'query'), controller.list);
router.get('/stats', auth, requirePermission('classified_ads.read'), controller.stats);
router.get('/:id', auth, requirePermission('classified_ads.read'), validate(idParamSchema, 'params'), controller.detail);
router.post('/:id/actions/approve', auth, requirePermission('classified_ads.moderate'), validate(idParamSchema, 'params'), validate(approveSchema), controller.approve);
router.post('/:id/actions/reject', auth, requirePermission('classified_ads.moderate'), validate(idParamSchema, 'params'), validate(rejectSchema), controller.reject);
router.post('/:id/actions/suspend', auth, requirePermission('classified_ads.suspend'), validate(idParamSchema, 'params'), validate(suspendSchema), controller.suspend);
router.post('/:id/actions/restore', auth, requirePermission('classified_ads.suspend'), validate(idParamSchema, 'params'), validate(restoreSchema), controller.restore);
router.post('/:id/actions/archive', auth, requirePermission('classified_ads.archive'), validate(idParamSchema, 'params'), validate(archiveSchema), controller.archive);

module.exports = router;
