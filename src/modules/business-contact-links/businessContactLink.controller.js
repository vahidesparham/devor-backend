const { ok } = require('../../shared/http/response');
const service = require('./businessContactLink.service');

async function list(req, res) {
  const result = await service.listBusinessContactLinks(req.query);
  return ok(res, { code: 'BUSINESS_CONTACT_LINK_LIST_SUCCESS', data: result.items, meta: result.meta });
}

async function detail(req, res) {
  const item = await service.getBusinessContactLinkById(req.params.id);
  return ok(res, { code: 'BUSINESS_CONTACT_LINK_DETAIL_SUCCESS', data: item });
}

async function create(req, res) {
  const item = await service.createBusinessContactLink(req.body, req);
  return ok(res, { code: 'BUSINESS_CONTACT_LINK_CREATE_SUCCESS', data: item }, 201);
}

async function update(req, res) {
  const item = await service.updateBusinessContactLink(req.params.id, req.body, req);
  return ok(res, { code: 'BUSINESS_CONTACT_LINK_UPDATE_SUCCESS', data: item });
}

async function remove(req, res) {
  await service.deleteBusinessContactLink(req.params.id, req);
  return ok(res, { code: 'BUSINESS_CONTACT_LINK_DELETE_SUCCESS', data: null });
}

async function nextDisplayOrder(req, res) {
  const value = await service.getNextDisplayOrder(req.query.businessId);
  return ok(res, { code: 'BUSINESS_CONTACT_LINK_NEXT_DISPLAY_ORDER_SUCCESS', data: { value } });
}

module.exports = { list, detail, create, update, remove, nextDisplayOrder };
