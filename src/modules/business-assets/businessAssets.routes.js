const express = require('express');
const multer = require('multer');
const prisma = require('../../prisma');
const businessAuth = require('../../middlewares/businessAuth');
const uploadController = require('../uploads/upload.controller');
const { ok } = require('../../shared/http/response');
const { AppError } = require('../../shared/http/response');

const router = express.Router();

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const allowedImageConfigCodes = new Set([
  'business_user_avatar',
  'business_logo',
  'business_cover',
  'business_gallery',
  'business_slideshow',
  'offering_category_image',
  'business_offering_image',
]);

router.get('/image-configs/:code', businessAuth, async (req, res) => {
  const item = await prisma.imageConfig.findUnique({ where: { code: req.params.code } });
  if (!item || !allowedImageConfigCodes.has(item.code)) {
    throw new AppError(404, 'NOT_FOUND', 'Image config not found');
  }
  return ok(res, { code: 'BUSINESS_IMAGE_CONFIG_DETAIL', data: item });
});

router.post('/uploads/image', businessAuth, imageUpload.single('image'), (req, res, next) => {
  if (!allowedImageConfigCodes.has(req.body?.code)) {
    throw new AppError(403, 'FORBIDDEN', 'Image config is not allowed');
  }
  return uploadController.uploadImage(req, res, next);
});

module.exports = router;
