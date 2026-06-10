const { ok } = require('../../shared/http/response');
const service = require('./faqCategory.service');

async function listFaqCategories(req, res) {
  const lang = req.get('x-lang') || null;
  const result = await service.listFaqCategories(req.query, lang);
  return ok(res, { code: 'FAQ_CATEGORY_LIST_SUCCESS', data: result.items, meta: result.meta });
}

async function getFaqCategoryById(req, res) {
  const item = await service.getFaqCategoryById(req.params.id);
  return ok(res, { code: 'FAQ_CATEGORY_DETAIL_SUCCESS', data: item });
}

async function createFaqCategory(req, res) {
  const item = await service.createFaqCategory(req.body, req);
  return ok(res, { code: 'FAQ_CATEGORY_CREATE_SUCCESS', data: item }, 201);
}

async function updateFaqCategory(req, res) {
  const item = await service.updateFaqCategory(req.params.id, req.body, req);
  return ok(res, { code: 'FAQ_CATEGORY_UPDATE_SUCCESS', data: item });
}

async function deleteFaqCategory(req, res) {
  await service.deleteFaqCategory(req.params.id, req);
  return ok(res, { code: 'FAQ_CATEGORY_DELETE_SUCCESS', data: null });
}

async function getNextDisplayOrder(req, res) {
  const displayOrder = await service.getNextDisplayOrder();
  return ok(res, { code: 'FAQ_CATEGORY_NEXT_DISPLAY_ORDER_SUCCESS', data: { displayOrder } });
}

module.exports = {
  listFaqCategories,
  getFaqCategoryById,
  createFaqCategory,
  updateFaqCategory,
  deleteFaqCategory,
  getNextDisplayOrder,
};
