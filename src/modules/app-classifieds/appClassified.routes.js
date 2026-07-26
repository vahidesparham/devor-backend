const express = require('express');
const multer = require('multer');
const appAuth = require('../../middlewares/appAuth');
const optionalAppAuth = require('../../middlewares/optionalAppAuth');
const validate = require('../../middlewares/validate');
const controller = require('./appClassified.controller');
const { requireClassifiedFeature } = require('../classifieds-domain/classifiedFeatureGate');
const {
  actionBodySchema,
  categoryParamSchema,
  createAdSchema,
  createReportSchema,
  favoriteAdListSchema,
  idParamSchema,
  imageDeleteQuerySchema,
  imageParamSchema,
  imageUploadBodySchema,
  listMyAdsSchema,
  publicAdListSchema,
  publicCategoryListSchema,
  reorderImagesSchema,
  saveAttributeValuesSchema,
  updateAdSchema,
} = require('./appClassified.schemas');
const {
  actionLimiter,
  createAdLimiter,
  imageLimiter,
  mutationLimiter,
  publicReadLimiter,
  reportLimiter,
} = require('./appClassified.rateLimits');

const router = express.Router();
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
});
const browseEnabled = requireClassifiedFeature('publicBrowseEnabled');
const postingEnabled = requireClassifiedFeature('appUserPostingEnabled');
const favoritesEnabled = requireClassifiedFeature('favoritesEnabled');
const reportsEnabled = requireClassifiedFeature('reportsEnabled');
const appClassifiedChatRoutes = require('../app-classified-chats/appClassifiedChat.routes');

router.get(
  '/categories',
  publicReadLimiter,
  browseEnabled,
  validate(publicCategoryListSchema, 'query'),
  controller.publicCategories,
);
router.get(
  '/categories/:categoryId/filters',
  publicReadLimiter,
  browseEnabled,
  validate(categoryParamSchema, 'params'),
  controller.publicCategoryFilters,
);
router.get(
  ['/ads', '/listings'],
  publicReadLimiter,
  browseEnabled,
  validate(publicAdListSchema, 'query'),
  controller.publicAds,
);
router.get(
  ['/ads/:id', '/listings/:id'],
  publicReadLimiter,
  browseEnabled,
  optionalAppAuth,
  validate(idParamSchema, 'params'),
  controller.publicAdDetail,
);

router.use(appAuth);
router.use('/chats', appClassifiedChatRoutes);
router.get(
  '/favorites',
  favoritesEnabled,
  validate(favoriteAdListSchema, 'query'),
  controller.favorites,
);
router.post(
  ['/ads/:id/favorite', '/listings/:id/favorite'],
  favoritesEnabled,
  mutationLimiter,
  validate(idParamSchema, 'params'),
  controller.addFavorite,
);
router.delete(
  ['/ads/:id/favorite', '/listings/:id/favorite'],
  favoritesEnabled,
  mutationLimiter,
  validate(idParamSchema, 'params'),
  controller.removeFavorite,
);
router.post(
  ['/ads/:id/reports', '/listings/:id/reports'],
  reportsEnabled,
  reportLimiter,
  validate(idParamSchema, 'params'),
  validate(createReportSchema),
  controller.createReport,
);
router.get('/posting-config', controller.postingConfig);
router.get('/categories/:categoryId/attributes', validate(categoryParamSchema, 'params'), controller.categoryAttributes);
router.get(['/my-ads', '/my-listings'], validate(listMyAdsSchema, 'query'), controller.list);
router.post(
  ['/my-ads', '/my-listings'],
  postingEnabled,
  createAdLimiter,
  validate(createAdSchema),
  controller.create,
);
router.get(['/my-ads/:id', '/my-listings/:id'], validate(idParamSchema, 'params'), controller.detail);
router.patch(
  ['/my-ads/:id', '/my-listings/:id'],
  postingEnabled,
  mutationLimiter,
  validate(idParamSchema, 'params'),
  validate(updateAdSchema),
  controller.update,
);
router.put(
  ['/my-ads/:id/attributes', '/my-listings/:id/attributes'],
  postingEnabled,
  mutationLimiter,
  validate(idParamSchema, 'params'),
  validate(saveAttributeValuesSchema),
  controller.saveAttributes,
);
router.post(
  ['/my-ads/:id/images', '/my-listings/:id/images'],
  postingEnabled,
  imageLimiter,
  validate(idParamSchema, 'params'),
  imageUpload.single('image'),
  validate(imageUploadBodySchema),
  controller.uploadImage,
);
router.patch(
  ['/my-ads/:id/images/order', '/my-listings/:id/images/order'],
  postingEnabled,
  imageLimiter,
  validate(idParamSchema, 'params'),
  validate(reorderImagesSchema),
  controller.reorderImages,
);
router.delete(
  ['/my-ads/:id/images/:imageId', '/my-listings/:id/images/:imageId'],
  postingEnabled,
  imageLimiter,
  validate(imageParamSchema, 'params'),
  validate(imageDeleteQuerySchema, 'query'),
  controller.deleteImage,
);
router.get(
  ['/my-ads/:id/readiness', '/my-listings/:id/readiness'],
  validate(idParamSchema, 'params'),
  controller.readiness,
);

for (const [path, handler, requiresPosting] of [
  ['submit', controller.submit, true],
  ['pause', controller.pause, false],
  ['resume', controller.resume, true],
  ['sold', controller.markSold, false],
  ['renew', controller.renew, true],
  ['archive', controller.archive, false],
]) {
  router.post(
    [`/my-ads/:id/actions/${path}`, `/my-listings/:id/actions/${path}`],
    ...(requiresPosting ? [postingEnabled] : []),
    actionLimiter,
    validate(idParamSchema, 'params'),
    validate(actionBodySchema),
    handler,
  );
}

module.exports = router;
