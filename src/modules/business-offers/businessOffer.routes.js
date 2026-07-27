const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./businessOffer.controller');
const {
  createBusinessOfferSchema,
  updateBusinessOfferSchema,
  listBusinessOffersSchema,
  idParamSchema,
} = require('./businessOffer.schemas');

const router = express.Router();

router.get('/', auth, requirePermission('business_offers.read'), validate(listBusinessOffersSchema, 'query'), controller.list);
router.get('/next-display-order', auth, requirePermission('business_offers.read'), controller.nextDisplayOrder);
router.get('/:id', auth, requirePermission('business_offers.read'), validate(idParamSchema, 'params'), controller.detail);
router.post('/', auth, requirePermission('business_offers.create'), validate(createBusinessOfferSchema), controller.create);
router.patch('/:id', auth, requirePermission('business_offers.update'), validate(idParamSchema, 'params'), validate(updateBusinessOfferSchema), controller.update);
router.delete('/:id', auth, requirePermission('business_offers.delete'), validate(idParamSchema, 'params'), controller.remove);

module.exports = router;
