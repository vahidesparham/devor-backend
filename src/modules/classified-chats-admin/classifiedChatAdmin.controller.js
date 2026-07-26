const { ok } = require('../../shared/http/response');
const service = require('./classifiedChatAdmin.service');

async function list(req, res) {
  const result = await service.list(req.query);
  return ok(res, {
    code: 'CLASSIFIED_CHAT_ADMIN_LIST_SUCCESS',
    data: result.items,
    meta: result.meta,
  });
}

async function stats(req, res) {
  const data = await service.stats();
  return ok(res, {
    code: 'CLASSIFIED_CHAT_ADMIN_STATS_SUCCESS',
    data,
  });
}

async function detail(req, res) {
  const data = await service.detail(req.params.id);
  return ok(res, {
    code: 'CLASSIFIED_CHAT_ADMIN_DETAIL_SUCCESS',
    data,
  });
}

async function block(req, res) {
  const data = await service.block(req.admin, req.params.id, req.body);
  return ok(res, {
    code: 'CLASSIFIED_CHAT_ADMIN_BLOCK_SUCCESS',
    data,
  });
}

async function unblock(req, res) {
  const data = await service.unblock(req.params.id);
  return ok(res, {
    code: 'CLASSIFIED_CHAT_ADMIN_UNBLOCK_SUCCESS',
    data,
  });
}

module.exports = {
  block,
  detail,
  list,
  stats,
  unblock,
};
