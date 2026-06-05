const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./onboardingPage.controller');
const {
  createOnboardingPageSchema,
  updateOnboardingPageSchema,
  listOnboardingPagesSchema,
  idParamSchema,
} = require('./onboardingPage.schemas');

const router = express.Router();

router.get('/', auth, requirePermission('onboarding_pages.read'), validate(listOnboardingPagesSchema, 'query'), controller.listOnboardingPages);
router.get('/next-display-order', auth, requirePermission('onboarding_pages.create'), controller.getNextDisplayOrder);
router.get('/:id', auth, requirePermission('onboarding_pages.read'), validate(idParamSchema, 'params'), controller.getOnboardingPageById);
router.post('/', auth, requirePermission('onboarding_pages.create'), validate(createOnboardingPageSchema), controller.createOnboardingPage);
router.patch('/:id', auth, requirePermission('onboarding_pages.update'), validate(idParamSchema, 'params'), validate(updateOnboardingPageSchema), controller.updateOnboardingPage);
router.delete('/:id', auth, requirePermission('onboarding_pages.delete'), validate(idParamSchema, 'params'), controller.deleteOnboardingPage);

module.exports = router;
