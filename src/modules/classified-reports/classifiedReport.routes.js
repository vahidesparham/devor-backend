const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./classifiedReport.controller');
const {
  closeActionSchema,
  idParamSchema,
  listClassifiedReportsSchema,
  reviewActionSchema,
} = require('./classifiedReport.schemas');

const router = express.Router();

router.get('/', auth, requirePermission('classified_reports.read'), validate(listClassifiedReportsSchema, 'query'), controller.list);
router.get('/stats', auth, requirePermission('classified_reports.read'), controller.stats);
router.get('/:id', auth, requirePermission('classified_reports.read'), validate(idParamSchema, 'params'), controller.detail);
router.post('/:id/actions/review', auth, requirePermission('classified_reports.update'), validate(idParamSchema, 'params'), validate(reviewActionSchema), controller.review);
router.post('/:id/actions/resolve', auth, requirePermission('classified_reports.update'), validate(idParamSchema, 'params'), validate(closeActionSchema), controller.resolve);
router.post('/:id/actions/dismiss', auth, requirePermission('classified_reports.update'), validate(idParamSchema, 'params'), validate(closeActionSchema), controller.dismiss);

module.exports = router;
