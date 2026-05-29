const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./business.controller');
const {
  createBusinessSchema,
  updateBusinessSchema,
  listBusinessesSchema,
  idParamSchema,
} = require('./business.schemas');

const router = express.Router();

router.get('/', auth, requirePermission('businesses.read'), validate(listBusinessesSchema, 'query'), controller.list);
router.get('/next-display-order', auth, requirePermission('businesses.read'), controller.nextDisplayOrder);
router.get('/:id', auth, requirePermission('businesses.read'), validate(idParamSchema, 'params'), controller.detail);
router.post('/', auth, requirePermission('businesses.create'), validate(createBusinessSchema), controller.create);
router.patch('/:id', auth, requirePermission('businesses.update'), validate(idParamSchema, 'params'), validate(updateBusinessSchema), controller.update);
router.delete('/:id', auth, requirePermission('businesses.delete'), validate(idParamSchema, 'params'), controller.remove);

module.exports = router;
