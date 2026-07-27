const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./eventCategory.controller');
const {
  createEventCategorySchema,
  updateEventCategorySchema,
  listEventCategoriesSchema,
  idParamSchema,
} = require('./eventCategory.schemas');

const router = express.Router();

router.get(
  '/',
  auth,
  requirePermission('event_categories.read'),
  validate(listEventCategoriesSchema, 'query'),
  controller.listEventCategories,
);
router.get(
  '/next-display-order',
  auth,
  requirePermission('event_categories.create'),
  controller.getNextDisplayOrder,
);
router.get(
  '/:id',
  auth,
  requirePermission('event_categories.read'),
  validate(idParamSchema, 'params'),
  controller.getEventCategoryById,
);
router.post(
  '/',
  auth,
  requirePermission('event_categories.create'),
  validate(createEventCategorySchema),
  controller.createEventCategory,
);
router.patch(
  '/:id',
  auth,
  requirePermission('event_categories.update'),
  validate(idParamSchema, 'params'),
  validate(updateEventCategorySchema),
  controller.updateEventCategory,
);
router.delete(
  '/:id',
  auth,
  requirePermission('event_categories.delete'),
  validate(idParamSchema, 'params'),
  controller.deleteEventCategory,
);

module.exports = router;
