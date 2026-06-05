const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./business.controller');
const {
  createBusinessSchema,
  updateBusinessSchema,
  listBusinessesSchema,
  idParamSchema,
  reviewActionSchema,
} = require('./business.schemas');

const router = express.Router();

router.get('/', auth, requirePermission('businesses.read'), validate(listBusinessesSchema, 'query'), controller.list);
router.get('/next-display-order', auth, requirePermission('businesses.read'), controller.nextDisplayOrder);
router.get('/:id/readiness', auth, requirePermission('businesses.read'), validate(idParamSchema, 'params'), controller.readiness);
router.get('/:id', auth, requirePermission('businesses.read'), validate(idParamSchema, 'params'), controller.detail);
router.post('/', auth, requirePermission('businesses.create'), validate(createBusinessSchema), controller.create);
router.patch('/:id', auth, requirePermission('businesses.update'), validate(idParamSchema, 'params'), validate(updateBusinessSchema), controller.update);
router.post('/:id/submit-review', auth, requirePermission('businesses.publish'), validate(idParamSchema, 'params'), validate(reviewActionSchema), controller.submitReview);
router.post('/:id/publish', auth, requirePermission('businesses.publish'), validate(idParamSchema, 'params'), validate(reviewActionSchema), controller.publish);
router.post('/:id/reject', auth, requirePermission('businesses.publish'), validate(idParamSchema, 'params'), validate(reviewActionSchema), controller.reject);
router.post('/:id/suspend', auth, requirePermission('businesses.publish'), validate(idParamSchema, 'params'), validate(reviewActionSchema), controller.suspend);
router.post('/:id/draft', auth, requirePermission('businesses.publish'), validate(idParamSchema, 'params'), validate(reviewActionSchema), controller.moveToDraft);
router.delete('/:id', auth, requirePermission('businesses.delete'), validate(idParamSchema, 'params'), controller.remove);

module.exports = router;
