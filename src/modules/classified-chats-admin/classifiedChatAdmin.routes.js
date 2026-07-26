const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./classifiedChatAdmin.controller');
const {
  blockSchema,
  idSchema,
  listSchema,
} = require('./classifiedChatAdmin.schemas');

const router = express.Router();

router.get(
  '/',
  auth,
  requirePermission('classified_chats.read'),
  validate(listSchema, 'query'),
  controller.list,
);
router.get(
  '/stats',
  auth,
  requirePermission('classified_chats.read'),
  controller.stats,
);
router.get(
  '/:id',
  auth,
  requirePermission('classified_chats.read'),
  validate(idSchema, 'params'),
  controller.detail,
);
router.post(
  '/:id/actions/block',
  auth,
  requirePermission('classified_chats.moderate'),
  validate(idSchema, 'params'),
  validate(blockSchema),
  controller.block,
);
router.post(
  '/:id/actions/unblock',
  auth,
  requirePermission('classified_chats.moderate'),
  validate(idSchema, 'params'),
  controller.unblock,
);

module.exports = router;
