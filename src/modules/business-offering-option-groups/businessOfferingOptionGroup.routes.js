const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./businessOfferingOptionGroup.controller');
const { createBusinessOfferingOptionGroupSchema, updateBusinessOfferingOptionGroupSchema, listBusinessOfferingOptionGroupsSchema, idParamSchema } = require('./businessOfferingOptionGroup.schemas');

const router = express.Router();

router.get('/', auth, requirePermission('offering_option_groups.read'), validate(listBusinessOfferingOptionGroupsSchema, 'query'), controller.list);
router.get('/next-display-order', auth, requirePermission('offering_option_groups.read'), controller.nextDisplayOrder);
router.get('/:id', auth, requirePermission('offering_option_groups.read'), validate(idParamSchema, 'params'), controller.detail);
router.post('/', auth, requirePermission('offering_option_groups.create'), validate(createBusinessOfferingOptionGroupSchema), controller.create);
router.patch('/:id', auth, requirePermission('offering_option_groups.update'), validate(idParamSchema, 'params'), validate(updateBusinessOfferingOptionGroupSchema), controller.update);
router.delete('/:id', auth, requirePermission('offering_option_groups.delete'), validate(idParamSchema, 'params'), controller.remove);

module.exports = router;
