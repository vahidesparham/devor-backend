const { ok } = require('../../shared/http/response');
const service = require('./appClassifiedChat.service');

async function start(req, res) {
  const data = await service.startConversation(req.appUser, req.params.adId);
  return ok(res, {
    code: 'CLASSIFIED_CHAT_START_SUCCESS',
    data,
  });
}

async function list(req, res) {
  const result = await service.listConversations(req.appUser, req.query);
  return ok(res, {
    code: 'CLASSIFIED_CHAT_LIST_SUCCESS',
    data: result.items,
    meta: result.meta,
  });
}

async function unreadCount(req, res) {
  const data = await service.unreadCount(req.appUser);
  return ok(res, {
    code: 'CLASSIFIED_CHAT_UNREAD_COUNT_SUCCESS',
    data,
  });
}

async function detail(req, res) {
  const data = await service.getConversation(
    req.appUser,
    req.params.conversationId,
  );
  return ok(res, {
    code: 'CLASSIFIED_CHAT_DETAIL_SUCCESS',
    data,
  });
}

async function messages(req, res) {
  const result = await service.listMessages(
    req.appUser,
    req.params.conversationId,
    req.query,
  );
  return ok(res, {
    code: 'CLASSIFIED_CHAT_MESSAGES_SUCCESS',
    data: result.items,
    meta: result.meta,
  });
}

async function send(req, res) {
  const data = await service.sendMessage(
    req.appUser,
    req.params.conversationId,
    req.body,
  );
  return ok(res, {
    code: 'CLASSIFIED_CHAT_MESSAGE_SEND_SUCCESS',
    data,
  }, data.duplicate ? 200 : 201);
}

async function markRead(req, res) {
  const data = await service.markRead(
    req.appUser,
    req.params.conversationId,
  );
  return ok(res, {
    code: 'CLASSIFIED_CHAT_MARK_READ_SUCCESS',
    data,
  });
}

module.exports = {
  detail,
  list,
  markRead,
  messages,
  send,
  start,
  unreadCount,
};
