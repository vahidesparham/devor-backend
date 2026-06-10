const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./faqCategory.controller');
const {
  createFaqCategorySchema,
  updateFaqCategorySchema,
  listFaqCategoriesSchema,
  idParamSchema,
} = require('./faqCategory.schemas');

const router = express.Router();

router.get('/', auth, requirePermission('faq_categories.read'), validate(listFaqCategoriesSchema, 'query'), controller.listFaqCategories);
router.get('/next-display-order', auth, requirePermission('faq_categories.create'), controller.getNextDisplayOrder);
router.get('/:id', auth, requirePermission('faq_categories.read'), validate(idParamSchema, 'params'), controller.getFaqCategoryById);
router.post('/', auth, requirePermission('faq_categories.create'), validate(createFaqCategorySchema), controller.createFaqCategory);
router.patch('/:id', auth, requirePermission('faq_categories.update'), validate(idParamSchema, 'params'), validate(updateFaqCategorySchema), controller.updateFaqCategory);
router.delete('/:id', auth, requirePermission('faq_categories.delete'), validate(idParamSchema, 'params'), controller.deleteFaqCategory);

module.exports = router;
