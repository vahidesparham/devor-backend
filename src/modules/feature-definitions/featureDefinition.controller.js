const { ok } = require('../../shared/http/response');
const service = require('./featureDefinition.service');

async function list(req, res) {
  const result = await service.listFeatureDefinitions(req.query);
  return ok(res, { code: 'FEATURE_DEFINITION_LIST_SUCCESS', data: result.items, meta: result.meta });
}

async function detail(req, res) {
  const item = await service.getFeatureDefinitionById(req.params.id);
  return ok(res, { code: 'FEATURE_DEFINITION_DETAIL_SUCCESS', data: item });
}

async function create(req, res) {
  const item = await service.createFeatureDefinition(req.body, req);
  return ok(res, { code: 'FEATURE_DEFINITION_CREATE_SUCCESS', data: item }, 201);
}

async function update(req, res) {
  const item = await service.updateFeatureDefinition(req.params.id, req.body, req);
  return ok(res, { code: 'FEATURE_DEFINITION_UPDATE_SUCCESS', data: item });
}

async function remove(req, res) {
  await service.deleteFeatureDefinition(req.params.id, req);
  return ok(res, { code: 'FEATURE_DEFINITION_DELETE_SUCCESS', data: null });
}

async function nextDisplayOrder(req, res) {
  const value = await service.getNextDisplayOrder(req.query.serviceTypeId);
  return ok(res, { code: 'FEATURE_DEFINITION_NEXT_DISPLAY_ORDER_SUCCESS', data: { value } });
}

module.exports = { list, detail, create, update, remove, nextDisplayOrder };
