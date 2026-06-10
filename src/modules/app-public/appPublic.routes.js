const express = require('express');
const multer = require('multer');
const validate = require('../../middlewares/validate');
const appAuth = require('../../middlewares/appAuth');
const controller = require('./appPublic.controller');
const authController = require('./appAuth.controller');
const { completeProfileSchema, requestOtpSchema, verifyOtpSchema } = require('./appAuth.schemas');
const {
  contentPageParamSchema,
  langQuerySchema,
  publicBlogListQuerySchema,
  publicBlogPostParamSchema,
} = require('./appPublic.schemas');

const router = express.Router();
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get('/bootstrap', controller.bootstrap);
router.get('/onboarding-pages', validate(langQuerySchema, 'query'), controller.onboardingPages);
router.get('/faqs', validate(langQuerySchema, 'query'), controller.faqs);
router.get('/countries', validate(langQuerySchema, 'query'), controller.countries);
router.get('/cities', validate(langQuerySchema, 'query'), controller.cities);
router.get('/contact-page', validate(langQuerySchema, 'query'), controller.contactPage);
router.get('/blog-posts', validate(publicBlogListQuerySchema, 'query'), controller.blogPosts);
router.get(
  '/blog-posts/:id',
  validate(publicBlogPostParamSchema, 'params'),
  validate(langQuerySchema, 'query'),
  controller.blogPost,
);
router.get(
  '/content-pages/:slug',
  validate(contentPageParamSchema, 'params'),
  validate(langQuerySchema, 'query'),
  controller.contentPage,
);
router.post('/auth/request-otp', validate(requestOtpSchema), authController.requestOtp);
router.post('/auth/verify-otp', validate(verifyOtpSchema), authController.verifyOtp);
router.get('/auth/me', appAuth, authController.me);
router.patch('/auth/profile', appAuth, validate(completeProfileSchema), authController.completeProfile);
router.post('/auth/avatar', appAuth, imageUpload.single('image'), authController.uploadAvatar);

module.exports = router;
