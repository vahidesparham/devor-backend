const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./businessOffering.controller');
const {
  createBusinessOfferingSchema,
  updateBusinessOfferingSchema,
  listBusinessOfferingsSchema,
  idParamSchema,
} = require('./businessOffering.schemas');

const router = express.Router();

router.get('/', auth, requirePermission('offerings.read'), validate(listBusinessOfferingsSchema, 'query'), controller.list);
router.get('/next-display-order', auth, requirePermission('offerings.read'), controller.nextDisplayOrder);
router.get('/:id', auth, requirePermission('offerings.read'), validate(idParamSchema, 'params'), controller.detail);
router.post('/', auth, requirePermission('offerings.create'), validate(createBusinessOfferingSchema), controller.create);
router.patch('/:id', auth, requirePermission('offerings.update'), validate(idParamSchema, 'params'), validate(updateBusinessOfferingSchema), controller.update);
router.delete('/:id', auth, requirePermission('offerings.delete'), validate(idParamSchema, 'params'), controller.remove);

module.exports = router;
