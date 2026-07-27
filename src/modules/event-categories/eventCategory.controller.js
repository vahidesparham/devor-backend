const { ok } = require('../../shared/http/response');
const service = require('./eventCategory.service');

async function listEventCategories(req, res) {
  const result = await service.listEventCategories(req.query, req.get('x-lang') || null);
  return ok(res, { code: 'EVENT_CATEGORY_LIST_SUCCESS', data: result.items, meta: result.meta });
}

async function getEventCategoryById(req, res) {
  const item = await service.getEventCategoryById(req.params.id);
  return ok(res, { code: 'EVENT_CATEGORY_DETAIL_SUCCESS', data: item });
}

async function createEventCategory(req, res) {
  const item = await service.createEventCategory(req.body, req);
  return ok(res, { code: 'EVENT_CATEGORY_CREATE_SUCCESS', data: item }, 201);
}

async function updateEventCategory(req, res) {
  const item = await service.updateEventCategory(req.params.id, req.body, req);
  return ok(res, { code: 'EVENT_CATEGORY_UPDATE_SUCCESS', data: item });
}

async function deleteEventCategory(req, res) {
  await service.deleteEventCategory(req.params.id, req);
  return ok(res, { code: 'EVENT_CATEGORY_DELETE_SUCCESS', data: null });
}

async function getNextDisplayOrder(req, res) {
  const displayOrder = await service.getNextDisplayOrder();
  return ok(res, {
    code: 'EVENT_CATEGORY_NEXT_DISPLAY_ORDER_SUCCESS',
    data: { displayOrder },
  });
}

module.exports = {
  listEventCategories,
  getEventCategoryById,
  createEventCategory,
  updateEventCategory,
  deleteEventCategory,
  getNextDisplayOrder,
};
