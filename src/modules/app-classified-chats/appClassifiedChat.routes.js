const express = require('express');
const validate = require('../../middlewares/validate');
const controller = require('./appClassifiedChat.controller');
const {
  adIdSchema,
  conversationIdSchema,
  conversationListSchema,
  messageListSchema,
  sendMessageSchema,
} = require('./appClassifiedChat.schemas');
const {
  chatCreateLimiter,
  chatMessageLimiter,
} = require('../app-classifieds/appClassified.rateLimits');

const router = express.Router();

router.get(
  '/',
  validate(conversationListSchema, 'query'),
  controller.list,
);
router.get('/unread-count', controller.unreadCount);
router.post(
  ['/ads/:adId', '/listings/:adId'],
  chatCreateLimiter,
  validate(adIdSchema, 'params'),
  controller.start,
);
router.get(
  '/:conversationId',
  validate(conversationIdSchema, 'params'),
  controller.detail,
);
router.get(
  '/:conversationId/messages',
  validate(conversationIdSchema, 'params'),
  validate(messageListSchema, 'query'),
  controller.messages,
);
router.post(
  '/:conversationId/messages',
  chatMessageLimiter,
  validate(conversationIdSchema, 'params'),
  validate(sendMessageSchema),
  controller.send,
);
router.post(
  '/:conversationId/read',
  validate(conversationIdSchema, 'params'),
  controller.markRead,
);

module.exports = router;
