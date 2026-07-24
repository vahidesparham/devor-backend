const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./classifiedAttribute.controller');
const {
  createClassifiedAttributeOptionSchema,
  createClassifiedAttributeSchema,
  idParamSchema,
  listClassifiedAttributesSchema,
  nextDisplayOrderSchema,
  nextOptionDisplayOrderSchema,
  optionParamSchema,
  updateClassifiedAttributeOptionSchema,
  updateClassifiedAttributeSchema,
} = require('./classifiedAttribute.schemas');

const router = express.Router();

router.get('/', auth, requirePermission('classified_attributes.read'), validate(listClassifiedAttributesSchema, 'query'), controller.list);
router.get('/next-display-order', auth, requirePermission('classified_attributes.read'), validate(nextDisplayOrderSchema, 'query'), controller.nextDisplayOrder);
router.get('/options/next-display-order', auth, requirePermission('classified_attributes.read'), validate(nextOptionDisplayOrderSchema, 'query'), controller.nextOptionDisplayOrder);
router.get('/:id/options', auth, requirePermission('classified_attributes.read'), validate(idParamSchema, 'params'), controller.listOptions);
router.get('/:id/options/:optionId', auth, requirePermission('classified_attributes.read'), validate(optionParamSchema, 'params'), controller.optionDetail);
router.post('/:id/options', auth, requirePermission('classified_attributes.create'), validate(idParamSchema, 'params'), validate(createClassifiedAttributeOptionSchema), controller.createOption);
router.patch('/:id/options/:optionId', auth, requirePermission('classified_attributes.update'), validate(optionParamSchema, 'params'), validate(updateClassifiedAttributeOptionSchema), controller.updateOption);
router.delete('/:id/options/:optionId', auth, requirePermission('classified_attributes.delete'), validate(optionParamSchema, 'params'), controller.removeOption);
router.get('/:id', auth, requirePermission('classified_attributes.read'), validate(idParamSchema, 'params'), controller.detail);
router.post('/', auth, requirePermission('classified_attributes.create'), validate(createClassifiedAttributeSchema), controller.create);
router.patch('/:id', auth, requirePermission('classified_attributes.update'), validate(idParamSchema, 'params'), validate(updateClassifiedAttributeSchema), controller.update);
router.delete('/:id', auth, requirePermission('classified_attributes.delete'), validate(idParamSchema, 'params'), controller.remove);

module.exports = router;
