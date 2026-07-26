const express = require('express');
const multer = require('multer');
const validate = require('../../middlewares/validate');
const appAuth = require('../../middlewares/appAuth');
const optionalAppAuth = require('../../middlewares/optionalAppAuth');
const controller = require('./appPublic.controller');
const authController = require('./appAuth.controller');
const appClassifiedRoutes = require('../app-classifieds/appClassified.routes');
const appNotificationRoutes = require('../app-notifications/appNotification.routes');
const { completeProfileSchema, refreshSchema, requestOtpSchema, verifyOtpSchema } = require('./appAuth.schemas');
const {
  contentPageParamSchema,
  langQuerySchema,
  publicHomeQuerySchema,
  publicExploreQuerySchema,
  publicBusinessListQuerySchema,
  publicBusinessFiltersQuerySchema,
  publicAreaListQuerySchema,
  publicBlogListQuerySchema,
  publicBlogPostParamSchema,
  publicBusinessParamSchema,
  publicBusinessDetailQuerySchema,
  publicBusinessReviewListQuerySchema,
  publicFavoriteBusinessListQuerySchema,
  publicMyReviewListQuerySchema,
  publicWalletTransactionListQuerySchema,
  createBusinessReviewSchema,
} = require('./appPublic.schemas');

const router = express.Router();
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get('/bootstrap', controller.bootstrap);
router.get('/home', validate(publicHomeQuerySchema, 'query'), controller.home);
router.get('/explore', optionalAppAuth, validate(publicExploreQuerySchema, 'query'), controller.explore);
router.get('/businesses', optionalAppAuth, validate(publicBusinessListQuerySchema, 'query'), controller.businesses);
router.get('/business-filters', validate(publicBusinessFiltersQuerySchema, 'query'), controller.businessFilters);
router.get('/onboarding-pages', validate(langQuerySchema, 'query'), controller.onboardingPages);
router.get('/faqs', validate(langQuerySchema, 'query'), controller.faqs);
router.get('/countries', validate(langQuerySchema, 'query'), controller.countries);
router.get('/cities', validate(langQuerySchema, 'query'), controller.cities);
router.get('/areas', validate(publicAreaListQuerySchema, 'query'), controller.areas);
router.get('/contact-page', validate(langQuerySchema, 'query'), controller.contactPage);
router.get('/blog-posts', validate(publicBlogListQuerySchema, 'query'), controller.blogPosts);
router.get('/favorites', appAuth, validate(publicFavoriteBusinessListQuerySchema, 'query'), controller.favoriteBusinesses);
router.get('/my-reviews', appAuth, validate(publicMyReviewListQuerySchema, 'query'), controller.myReviews);
router.get('/wallet', appAuth, controller.wallet);
router.get('/wallet/transactions', appAuth, validate(publicWalletTransactionListQuerySchema, 'query'), controller.walletTransactions);
router.get(
  '/businesses/:id',
  optionalAppAuth,
  validate(publicBusinessParamSchema, 'params'),
  validate(publicBusinessDetailQuerySchema, 'query'),
  controller.businessDetail,
);
router.get(
  '/businesses/:id/reviews',
  validate(publicBusinessParamSchema, 'params'),
  validate(publicBusinessReviewListQuerySchema, 'query'),
  controller.businessReviews,
);
router.post(
  '/businesses/:id/reviews',
  appAuth,
  validate(publicBusinessParamSchema, 'params'),
  validate(createBusinessReviewSchema),
  controller.createBusinessReview,
);
router.post(
  '/businesses/:id/favorite',
  appAuth,
  validate(publicBusinessParamSchema, 'params'),
  controller.addBusinessFavorite,
);
router.delete(
  '/businesses/:id/favorite',
  appAuth,
  validate(publicBusinessParamSchema, 'params'),
  controller.removeBusinessFavorite,
);
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
router.post('/auth/refresh', validate(refreshSchema), authController.refresh);
router.get('/auth/me', appAuth, authController.me);
router.patch('/auth/profile', appAuth, validate(completeProfileSchema), authController.completeProfile);
router.post('/auth/avatar', appAuth, imageUpload.single('image'), authController.uploadAvatar);
router.use('/notifications', appNotificationRoutes);
router.use('/classifieds', appClassifiedRoutes);

module.exports = router;
