const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./banner.controller');
const {
  createBannerSchema,
  updateBannerSchema,
  listBannersSchema,
  idParamSchema,
} = require('./banner.schemas');

const router = express.Router();

router.get('/', auth, requirePermission('banners.read'), validate(listBannersSchema, 'query'), controller.listBanners);
router.get('/:id', auth, requirePermission('banners.read'), validate(idParamSchema, 'params'), controller.getBannerById);
router.post('/', auth, requirePermission('banners.create'), validate(createBannerSchema), controller.createBanner);
router.patch('/:id', auth, requirePermission('banners.update'), validate(idParamSchema, 'params'), validate(updateBannerSchema), controller.updateBanner);
router.delete('/:id', auth, requirePermission('banners.delete'), validate(idParamSchema, 'params'), controller.deleteBanner);

module.exports = router;
