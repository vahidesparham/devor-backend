const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./classifiedCategory.controller');
const {
  categoryOptionsSchema,
  createClassifiedCategorySchema,
  idParamSchema,
  listClassifiedCategoriesSchema,
  nextDisplayOrderSchema,
  updateClassifiedCategorySchema,
} = require('./classifiedCategory.schemas');

const router = express.Router();

router.get('/', auth, requirePermission('classified_categories.read'), validate(listClassifiedCategoriesSchema, 'query'), controller.list);
router.get('/tree', auth, requirePermission('classified_categories.read'), controller.tree);
router.get('/options', auth, requirePermission('classified_categories.read'), validate(categoryOptionsSchema, 'query'), controller.options);
router.get('/next-display-order', auth, requirePermission('classified_categories.read'), validate(nextDisplayOrderSchema, 'query'), controller.nextDisplayOrder);
router.get('/:id', auth, requirePermission('classified_categories.read'), validate(idParamSchema, 'params'), controller.detail);
router.post('/', auth, requirePermission('classified_categories.create'), validate(createClassifiedCategorySchema), controller.create);
router.patch('/:id', auth, requirePermission('classified_categories.update'), validate(idParamSchema, 'params'), validate(updateClassifiedCategorySchema), controller.update);
router.delete('/:id', auth, requirePermission('classified_categories.delete'), validate(idParamSchema, 'params'), controller.remove);

module.exports = router;
