const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./businessContactLink.controller');
const {
  createBusinessContactLinkSchema,
  updateBusinessContactLinkSchema,
  listBusinessContactLinksSchema,
  idParamSchema,
} = require('./businessContactLink.schemas');

const router = express.Router();

router.get('/', auth, requirePermission('business_contact_links.read'), validate(listBusinessContactLinksSchema, 'query'), controller.list);
router.get('/next-display-order', auth, requirePermission('business_contact_links.read'), controller.nextDisplayOrder);
router.get('/:id', auth, requirePermission('business_contact_links.read'), validate(idParamSchema, 'params'), controller.detail);
router.post('/', auth, requirePermission('business_contact_links.create'), validate(createBusinessContactLinkSchema), controller.create);
router.patch('/:id', auth, requirePermission('business_contact_links.update'), validate(idParamSchema, 'params'), validate(updateBusinessContactLinkSchema), controller.update);
router.delete('/:id', auth, requirePermission('business_contact_links.delete'), validate(idParamSchema, 'params'), controller.remove);

module.exports = router;
