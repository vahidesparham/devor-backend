const express = require('express');
const multer = require('multer');
const appAuth = require('../../middlewares/appAuth');
const validate = require('../../middlewares/validate');
const controller = require('./appClassified.controller');
const {
  actionBodySchema,
  categoryParamSchema,
  createAdSchema,
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
} = require('./appClassified.rateLimits');

const router = express.Router();
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
});

router.get(
  '/categories',
  validate(publicCategoryListSchema, 'query'),
  controller.publicCategories,
);
router.get(
  '/categories/:categoryId/filters',
  validate(categoryParamSchema, 'params'),
  controller.publicCategoryFilters,
);
router.get('/ads', validate(publicAdListSchema, 'query'), controller.publicAds);
router.get(
  '/ads/:id',
  validate(idParamSchema, 'params'),
  controller.publicAdDetail,
);

router.use(appAuth);
router.get('/posting-config', controller.postingConfig);
router.get('/categories/:categoryId/attributes', validate(categoryParamSchema, 'params'), controller.categoryAttributes);
router.get('/my-ads', validate(listMyAdsSchema, 'query'), controller.list);
router.post('/my-ads', createAdLimiter, validate(createAdSchema), controller.create);
router.get('/my-ads/:id', validate(idParamSchema, 'params'), controller.detail);
router.patch('/my-ads/:id', mutationLimiter, validate(idParamSchema, 'params'), validate(updateAdSchema), controller.update);
router.put(
  '/my-ads/:id/attributes',
  mutationLimiter,
  validate(idParamSchema, 'params'),
  validate(saveAttributeValuesSchema),
  controller.saveAttributes,
);
router.post(
  '/my-ads/:id/images',
  imageLimiter,
  validate(idParamSchema, 'params'),
  imageUpload.single('image'),
  validate(imageUploadBodySchema),
  controller.uploadImage,
);
router.patch(
  '/my-ads/:id/images/order',
  imageLimiter,
  validate(idParamSchema, 'params'),
  validate(reorderImagesSchema),
  controller.reorderImages,
);
router.delete(
  '/my-ads/:id/images/:imageId',
  imageLimiter,
  validate(imageParamSchema, 'params'),
  validate(imageDeleteQuerySchema, 'query'),
  controller.deleteImage,
);
router.get('/my-ads/:id/readiness', validate(idParamSchema, 'params'), controller.readiness);

for (const [path, handler] of [
  ['submit', controller.submit],
  ['pause', controller.pause],
  ['resume', controller.resume],
  ['sold', controller.markSold],
  ['renew', controller.renew],
  ['archive', controller.archive],
]) {
  router.post(
    `/my-ads/:id/actions/${path}`,
    actionLimiter,
    validate(idParamSchema, 'params'),
    validate(actionBodySchema),
    handler,
  );
}

module.exports = router;
