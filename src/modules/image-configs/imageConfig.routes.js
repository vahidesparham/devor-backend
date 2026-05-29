const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./imageConfig.controller');
const {
  createImageConfigSchema,
  updateImageConfigSchema,
  idParamSchema,
  listQuerySchema
} = require('./imageConfig.schemas');

const router = express.Router();

router.get('/', auth, requirePermission('image_configs.read'), validate(listQuerySchema, 'query'), controller.listImageConfigs);
router.get('/:id', auth, requirePermission('image_configs.read'), validate(idParamSchema, 'params'), controller.getImageConfigById);
router.post('/', auth, requirePermission('image_configs.create'), validate(createImageConfigSchema), controller.createImageConfig);
router.patch(
  '/:id',
  auth,
  requirePermission('image_configs.update'),
  validate(idParamSchema, 'params'),
  validate(updateImageConfigSchema),
  controller.updateImageConfig
);
router.delete(
  '/:id',
  auth,
  requirePermission('image_configs.delete'),
  validate(idParamSchema, 'params'),
  controller.deleteImageConfig
);

module.exports = router;
