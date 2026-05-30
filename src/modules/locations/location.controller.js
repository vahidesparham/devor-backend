const { ok } = require('../../shared/http/response');
const service = require('./location.service');

const types = {
  countries: 'country',
  cities: 'city',
  areas: 'area',
};

function typeFrom(req) {
  return types[req.baseUrl.split('/').pop()] || req.locationType;
}

async function list(req, res) {
  const result = await service.list(typeFrom(req), req.query);
  return ok(res, { code: 'LOCATION_LIST_SUCCESS', data: result.items, meta: result.meta });
}

async function detail(req, res) {
  const item = await service.getById(typeFrom(req), req.params.id);
  return ok(res, { code: 'LOCATION_DETAIL_SUCCESS', data: item });
}

async function create(req, res) {
  const item = await service.create(typeFrom(req), req.body, req);
  return ok(res, { code: 'LOCATION_CREATE_SUCCESS', data: item }, 201);
}

async function update(req, res) {
  const item = await service.update(typeFrom(req), req.params.id, req.body, req);
  return ok(res, { code: 'LOCATION_UPDATE_SUCCESS', data: item });
}

async function remove(req, res) {
  await service.remove(typeFrom(req), req.params.id, req);
  return ok(res, { code: 'LOCATION_DELETE_SUCCESS', data: null });
}

async function nextDisplayOrder(req, res) {
  const value = await service.getNextDisplayOrder(typeFrom(req), req.query);
  return ok(res, { code: 'LOCATION_NEXT_DISPLAY_ORDER_SUCCESS', data: { value } });
}

module.exports = { list, detail, create, update, remove, nextDisplayOrder };
