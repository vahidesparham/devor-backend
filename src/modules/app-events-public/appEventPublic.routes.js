const express = require('express');
const validate = require('../../middlewares/validate');
const controller = require('./appEventPublic.controller');
const {
  publicEventCategoryListSchema,
  publicEventDetailQuerySchema,
  publicEventListSchema,
  publicEventParamSchema,
} = require('./appEventPublic.schemas');

const router = express.Router();

router.get(
  '/categories',
  validate(publicEventCategoryListSchema, 'query'),
  controller.categories,
);
router.get(
  '/',
  validate(publicEventListSchema, 'query'),
  controller.list,
);
router.get(
  '/:id',
  validate(publicEventParamSchema, 'params'),
  validate(publicEventDetailQuerySchema, 'query'),
  controller.detail,
);

module.exports = router;
