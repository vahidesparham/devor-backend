const express = require('express');
const appAuth = require('../../middlewares/appAuth');
const validate = require('../../middlewares/validate');
const controller = require('./appNotification.controller');
const {
  listNotificationsSchema,
  notificationIdSchema,
} = require('./appNotification.schemas');

const router = express.Router();

router.use(appAuth);
router.get('/', validate(listNotificationsSchema, 'query'), controller.list);
router.get('/unread-count', controller.unreadCount);
router.patch('/:id/read', validate(notificationIdSchema, 'params'), controller.markRead);
router.post('/read-all', controller.markAllRead);

module.exports = router;
