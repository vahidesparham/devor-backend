const express = require('express');
const validate = require('../../middlewares/validate');
const controller = require('./appPublic.controller');
const { langQuerySchema } = require('./appPublic.schemas');

const router = express.Router();

router.get('/bootstrap', controller.bootstrap);
router.get('/onboarding-pages', validate(langQuerySchema, 'query'), controller.onboardingPages);

module.exports = router;
