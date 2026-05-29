const { ok } = require('../../shared/http/response');
const service = require('./businessOfferingOption.service');

async function list(req, res) {
  const result = await service.listBusinessOfferingOptions(req.query);
  return ok(res, { code: 'BUSINESS_OFFERING_OPTION_LIST_SUCCESS', data: result.items, meta: result.meta });
}
async function detail(req, res) {
  const item = await service.getBusinessOfferingOptionById(req.params.id);
  return ok(res, { code: 'BUSINESS_OFFERING_OPTION_DETAIL_SUCCESS', data: item });
}
async function create(req, res) {
  const item = await service.createBusinessOfferingOption(req.body, req);
  return ok(res, { code: 'BUSINESS_OFFERING_OPTION_CREATE_SUCCESS', data: item }, 201);
}
async function update(req, res) {
  const item = await service.updateBusinessOfferingOption(req.params.id, req.body, req);
  return ok(res, { code: 'BUSINESS_OFFERING_OPTION_UPDATE_SUCCESS', data: item });
}
async function remove(req, res) {
  await service.deleteBusinessOfferingOption(req.params.id, req);
  return ok(res, { code: 'BUSINESS_OFFERING_OPTION_DELETE_SUCCESS', data: null });
}
async function nextDisplayOrder(req, res) {
  const value = await service.getNextDisplayOrder(req.query.groupId);
  return ok(res, { code: 'BUSINESS_OFFERING_OPTION_NEXT_DISPLAY_ORDER_SUCCESS', data: { value } });
}

module.exports = { list, detail, create, update, remove, nextDisplayOrder };
