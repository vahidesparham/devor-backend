const { ok } = require('../../shared/http/response');
const service = require('./appEventPublic.service');

async function categories(req, res) {
  const result = await service.listCategories(req.query);
  return ok(res, {
    code: 'APP_EVENT_CATEGORY_LIST',
    data: result.items,
    meta: result.meta,
  });
}

async function list(req, res) {
  const result = await service.listEvents(req.query);
  return ok(res, {
    code: 'APP_EVENT_LIST',
    data: result.items,
    meta: result.meta,
  });
}

async function detail(req, res) {
  const result = await service.getEventDetail(req.params.id, req.query);
  return ok(res, {
    code: 'APP_EVENT_DETAIL',
    data: result.item,
    meta: result.meta,
  });
}

module.exports = {
  categories,
  detail,
  list,
};
