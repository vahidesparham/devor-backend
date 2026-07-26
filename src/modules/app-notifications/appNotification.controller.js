const { ok } = require('../../shared/http/response');
const service = require('./appNotification.service');

async function list(req, res) {
  const result = await service.listNotifications(req.appUser, req.query);
  return ok(res, {
    code: 'APP_NOTIFICATION_LIST_SUCCESS',
    data: result.items,
    meta: result.meta,
  });
}

async function unreadCount(req, res) {
  return ok(res, {
    code: 'APP_NOTIFICATION_UNREAD_COUNT_SUCCESS',
    data: await service.unreadCount(req.appUser),
  });
}

async function markRead(req, res) {
  return ok(res, {
    code: 'APP_NOTIFICATION_MARK_READ_SUCCESS',
    data: await service.markRead(req.appUser, req.params.id),
  });
}

async function markAllRead(req, res) {
  return ok(res, {
    code: 'APP_NOTIFICATION_MARK_ALL_READ_SUCCESS',
    data: await service.markAllRead(req.appUser),
  });
}

module.exports = {
  list,
  markAllRead,
  markRead,
  unreadCount,
};
