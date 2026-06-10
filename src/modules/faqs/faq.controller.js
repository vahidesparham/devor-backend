const { ok } = require('../../shared/http/response');
const service = require('./faq.service');

async function listFaqs(req, res) {
  const lang = req.get('x-lang') || null;
  const result = await service.listFaqs(req.query, lang);
  return ok(res, { code: 'FAQ_LIST_SUCCESS', data: result.items, meta: result.meta });
}

async function getFaqById(req, res) {
  const item = await service.getFaqById(req.params.id);
  return ok(res, { code: 'FAQ_DETAIL_SUCCESS', data: item });
}

async function createFaq(req, res) {
  const item = await service.createFaq(req.body, req);
  return ok(res, { code: 'FAQ_CREATE_SUCCESS', data: item }, 201);
}

async function updateFaq(req, res) {
  const item = await service.updateFaq(req.params.id, req.body, req);
  return ok(res, { code: 'FAQ_UPDATE_SUCCESS', data: item });
}

async function deleteFaq(req, res) {
  await service.deleteFaq(req.params.id, req);
  return ok(res, { code: 'FAQ_DELETE_SUCCESS', data: null });
}

async function getNextDisplayOrder(req, res) {
  const displayOrder = await service.getNextDisplayOrder(req.query.categoryId);
  return ok(res, { code: 'FAQ_NEXT_DISPLAY_ORDER_SUCCESS', data: { displayOrder } });
}

module.exports = {
  listFaqs,
  getFaqById,
  createFaq,
  updateFaq,
  deleteFaq,
  getNextDisplayOrder,
};
