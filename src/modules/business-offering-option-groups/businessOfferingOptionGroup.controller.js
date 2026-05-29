const { ok } = require('../../shared/http/response');
const service = require('./businessOfferingOptionGroup.service');

async function list(req, res) {
  const result = await service.listBusinessOfferingOptionGroups(req.query);
  return ok(res, { code: 'BUSINESS_OFFERING_OPTION_GROUP_LIST_SUCCESS', data: result.items, meta: result.meta });
}
async function detail(req, res) {
  const item = await service.getBusinessOfferingOptionGroupById(req.params.id);
  return ok(res, { code: 'BUSINESS_OFFERING_OPTION_GROUP_DETAIL_SUCCESS', data: item });
}
async function create(req, res) {
  const item = await service.createBusinessOfferingOptionGroup(req.body, req);
  return ok(res, { code: 'BUSINESS_OFFERING_OPTION_GROUP_CREATE_SUCCESS', data: item }, 201);
}
async function update(req, res) {
  const item = await service.updateBusinessOfferingOptionGroup(req.params.id, req.body, req);
  return ok(res, { code: 'BUSINESS_OFFERING_OPTION_GROUP_UPDATE_SUCCESS', data: item });
}
async function remove(req, res) {
  await service.deleteBusinessOfferingOptionGroup(req.params.id, req);
  return ok(res, { code: 'BUSINESS_OFFERING_OPTION_GROUP_DELETE_SUCCESS', data: null });
}
async function nextDisplayOrder(req, res) {
  const value = await service.getNextDisplayOrder(req.query.offeringId);
  return ok(res, { code: 'BUSINESS_OFFERING_OPTION_GROUP_NEXT_DISPLAY_ORDER_SUCCESS', data: { value } });
}

module.exports = { list, detail, create, update, remove, nextDisplayOrder };
