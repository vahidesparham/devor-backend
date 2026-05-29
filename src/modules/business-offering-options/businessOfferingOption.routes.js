const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./businessOfferingOption.controller');
const { createBusinessOfferingOptionSchema, updateBusinessOfferingOptionSchema, listBusinessOfferingOptionsSchema, idParamSchema } = require('./businessOfferingOption.schemas');

const router = express.Router();

router.get('/', auth, requirePermission('offering_options.read'), validate(listBusinessOfferingOptionsSchema, 'query'), controller.list);
router.get('/next-display-order', auth, requirePermission('offering_options.read'), controller.nextDisplayOrder);
router.get('/:id', auth, requirePermission('offering_options.read'), validate(idParamSchema, 'params'), controller.detail);
router.post('/', auth, requirePermission('offering_options.create'), validate(createBusinessOfferingOptionSchema), controller.create);
router.patch('/:id', auth, requirePermission('offering_options.update'), validate(idParamSchema, 'params'), validate(updateBusinessOfferingOptionSchema), controller.update);
router.delete('/:id', auth, requirePermission('offering_options.delete'), validate(idParamSchema, 'params'), controller.remove);

module.exports = router;
