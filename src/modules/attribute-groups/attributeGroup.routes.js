const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./attributeGroup.controller');
const {
  createAttributeGroupSchema,
  updateAttributeGroupSchema,
  listAttributeGroupsSchema,
  idParamSchema,
} = require('./attributeGroup.schemas');

const router = express.Router();

router.get('/', auth, requirePermission('attribute_groups.read'), validate(listAttributeGroupsSchema, 'query'), controller.list);
router.get('/next-display-order', auth, requirePermission('attribute_groups.read'), controller.nextDisplayOrder);
router.get('/:id', auth, requirePermission('attribute_groups.read'), validate(idParamSchema, 'params'), controller.detail);
router.post('/', auth, requirePermission('attribute_groups.create'), validate(createAttributeGroupSchema), controller.create);
router.patch('/:id', auth, requirePermission('attribute_groups.update'), validate(idParamSchema, 'params'), validate(updateAttributeGroupSchema), controller.update);
router.delete('/:id', auth, requirePermission('attribute_groups.delete'), validate(idParamSchema, 'params'), controller.remove);

module.exports = router;
