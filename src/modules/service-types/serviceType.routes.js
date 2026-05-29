const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./serviceType.controller');
const {
  createServiceTypeSchema,
  updateServiceTypeSchema,
  listServiceTypesSchema,
  idParamSchema,
} = require('./serviceType.schemas');

const router = express.Router();

router.get('/', auth, requirePermission('service_types.read'), validate(listServiceTypesSchema, 'query'), controller.list);
router.get('/next-display-order', auth, requirePermission('service_types.read'), controller.nextDisplayOrder);
router.get('/:id', auth, requirePermission('service_types.read'), validate(idParamSchema, 'params'), controller.detail);
router.post('/', auth, requirePermission('service_types.create'), validate(createServiceTypeSchema), controller.create);
router.patch('/:id', auth, requirePermission('service_types.update'), validate(idParamSchema, 'params'), validate(updateServiceTypeSchema), controller.update);
router.delete('/:id', auth, requirePermission('service_types.delete'), validate(idParamSchema, 'params'), controller.remove);

module.exports = router;
