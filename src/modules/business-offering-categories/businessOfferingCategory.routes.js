const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./businessOfferingCategory.controller');
const {
  createBusinessOfferingCategorySchema,
  updateBusinessOfferingCategorySchema,
  listBusinessOfferingCategoriesSchema,
  idParamSchema,
} = require('./businessOfferingCategory.schemas');

const router = express.Router();

router.get('/', auth, requirePermission('offering_categories.read'), validate(listBusinessOfferingCategoriesSchema, 'query'), controller.list);
router.get('/next-display-order', auth, requirePermission('offering_categories.read'), controller.nextDisplayOrder);
router.get('/:id', auth, requirePermission('offering_categories.read'), validate(idParamSchema, 'params'), controller.detail);
router.post('/', auth, requirePermission('offering_categories.create'), validate(createBusinessOfferingCategorySchema), controller.create);
router.patch('/:id', auth, requirePermission('offering_categories.update'), validate(idParamSchema, 'params'), validate(updateBusinessOfferingCategorySchema), controller.update);
router.delete('/:id', auth, requirePermission('offering_categories.delete'), validate(idParamSchema, 'params'), controller.remove);

module.exports = router;
