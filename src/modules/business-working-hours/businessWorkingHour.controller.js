const { ok } = require('../../shared/http/response');
const service = require('./businessWorkingHour.service');

async function list(req, res) {
  const result = await service.listBusinessWorkingHours(req.query);
  return ok(res, { code: 'BUSINESS_WORKING_HOUR_LIST_SUCCESS', data: result.items, meta: result.meta });
}

async function detail(req, res) {
  const item = await service.getBusinessWorkingHourById(req.params.id);
  return ok(res, { code: 'BUSINESS_WORKING_HOUR_DETAIL_SUCCESS', data: item });
}

async function create(req, res) {
  const item = await service.createBusinessWorkingHour(req.body, req);
  return ok(res, { code: 'BUSINESS_WORKING_HOUR_CREATE_SUCCESS', data: item }, 201);
}

async function update(req, res) {
  const item = await service.updateBusinessWorkingHour(req.params.id, req.body, req);
  return ok(res, { code: 'BUSINESS_WORKING_HOUR_UPDATE_SUCCESS', data: item });
}

async function remove(req, res) {
  await service.deleteBusinessWorkingHour(req.params.id, req);
  return ok(res, { code: 'BUSINESS_WORKING_HOUR_DELETE_SUCCESS', data: null });
}

async function nextDisplayOrder(req, res) {
  const value = await service.getNextDisplayOrder(req.query.businessId, req.query.dayOfWeek);
  return ok(res, { code: 'BUSINESS_WORKING_HOUR_NEXT_DISPLAY_ORDER_SUCCESS', data: { value } });
}

module.exports = { list, detail, create, update, remove, nextDisplayOrder };
