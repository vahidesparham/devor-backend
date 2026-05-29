const { ok } = require('../../shared/http/response');
const service = require('./businessOfferingCategory.service');

async function list(req, res) {
  const result = await service.listBusinessOfferingCategories(req.query);
  return ok(res, { code: 'BUSINESS_OFFERING_CATEGORY_LIST_SUCCESS', data: result.items, meta: result.meta });
}

async function detail(req, res) {
  const item = await service.getBusinessOfferingCategoryById(req.params.id);
  return ok(res, { code: 'BUSINESS_OFFERING_CATEGORY_DETAIL_SUCCESS', data: item });
}

async function create(req, res) {
  const item = await service.createBusinessOfferingCategory(req.body, req);
  return ok(res, { code: 'BUSINESS_OFFERING_CATEGORY_CREATE_SUCCESS', data: item }, 201);
}

async function update(req, res) {
  const item = await service.updateBusinessOfferingCategory(req.params.id, req.body, req);
  return ok(res, { code: 'BUSINESS_OFFERING_CATEGORY_UPDATE_SUCCESS', data: item });
}

async function remove(req, res) {
  await service.deleteBusinessOfferingCategory(req.params.id, req);
  return ok(res, { code: 'BUSINESS_OFFERING_CATEGORY_DELETE_SUCCESS', data: null });
}

async function nextDisplayOrder(req, res) {
  const value = await service.getNextDisplayOrder(req.query.businessId);
  return ok(res, { code: 'BUSINESS_OFFERING_CATEGORY_NEXT_DISPLAY_ORDER_SUCCESS', data: { value } });
}

module.exports = { list, detail, create, update, remove, nextDisplayOrder };
