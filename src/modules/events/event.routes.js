const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./event.controller');
const {
  createEventSchema,
  updateEventSchema,
  listEventsSchema,
  updateEventStatusSchema,
  idParamSchema,
} = require('./event.schemas');

const router = express.Router();

router.get(
  '/',
  auth,
  requirePermission('events.read'),
  validate(listEventsSchema, 'query'),
  controller.listEvents,
);
router.get(
  '/:id',
  auth,
  requirePermission('events.read'),
  validate(idParamSchema, 'params'),
  controller.getEventById,
);
router.post('/', auth, requirePermission('events.create'), validate(createEventSchema), controller.createEvent);
router.patch(
  '/:id',
  auth,
  requirePermission('events.update'),
  validate(idParamSchema, 'params'),
  validate(updateEventSchema),
  controller.updateEvent,
);
router.patch(
  '/:id/status',
  auth,
  requirePermission('events.update'),
  validate(idParamSchema, 'params'),
  validate(updateEventStatusSchema),
  controller.updateEventStatus,
);
router.delete(
  '/:id',
  auth,
  requirePermission('events.delete'),
  validate(idParamSchema, 'params'),
  controller.deleteEvent,
);

module.exports = router;
