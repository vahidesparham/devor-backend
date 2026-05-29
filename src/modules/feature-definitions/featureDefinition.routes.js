const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./featureDefinition.controller');
const {
  createFeatureDefinitionSchema,
  updateFeatureDefinitionSchema,
  listFeatureDefinitionsSchema,
  idParamSchema,
} = require('./featureDefinition.schemas');

const router = express.Router();

router.get('/', auth, requirePermission('feature_definitions.read'), validate(listFeatureDefinitionsSchema, 'query'), controller.list);
router.get('/next-display-order', auth, requirePermission('feature_definitions.read'), controller.nextDisplayOrder);
router.get('/:id', auth, requirePermission('feature_definitions.read'), validate(idParamSchema, 'params'), controller.detail);
router.post('/', auth, requirePermission('feature_definitions.create'), validate(createFeatureDefinitionSchema), controller.create);
router.patch('/:id', auth, requirePermission('feature_definitions.update'), validate(idParamSchema, 'params'), validate(updateFeatureDefinitionSchema), controller.update);
router.delete('/:id', auth, requirePermission('feature_definitions.delete'), validate(idParamSchema, 'params'), controller.remove);

module.exports = router;
