const { ok } = require('../../shared/http/response');
const service = require('./classifiedAttribute.service');

async function list(req, res) {
  const result = await service.listClassifiedAttributes(req.query);
  return ok(res, { code: 'CLASSIFIED_ATTRIBUTE_LIST_SUCCESS', data: result.items, meta: result.meta });
}

async function detail(req, res) {
  const item = await service.getClassifiedAttributeById(req.params.id);
  return ok(res, { code: 'CLASSIFIED_ATTRIBUTE_DETAIL_SUCCESS', data: item });
}

async function create(req, res) {
  const item = await service.createClassifiedAttribute(req.body, req);
  return ok(res, { code: 'CLASSIFIED_ATTRIBUTE_CREATE_SUCCESS', data: item }, 201);
}

async function update(req, res) {
  const item = await service.updateClassifiedAttribute(req.params.id, req.body, req);
  return ok(res, { code: 'CLASSIFIED_ATTRIBUTE_UPDATE_SUCCESS', data: item });
}

async function remove(req, res) {
  await service.deleteClassifiedAttribute(req.params.id, req);
  return ok(res, { code: 'CLASSIFIED_ATTRIBUTE_DELETE_SUCCESS' });
}

async function nextDisplayOrder(req, res) {
  const value = await service.getNextDisplayOrder(req.query.categoryId);
  return ok(res, { code: 'CLASSIFIED_ATTRIBUTE_NEXT_DISPLAY_ORDER_SUCCESS', data: { value } });
}

async function listOptions(req, res) {
  const result = await service.listClassifiedAttributeOptions(req.params.id);
  return ok(res, {
    code: 'CLASSIFIED_ATTRIBUTE_OPTION_LIST_SUCCESS',
    data: result.options,
    meta: { attribute: result.attribute },
  });
}

async function optionDetail(req, res) {
  const item = await service.getClassifiedAttributeOption(req.params.id, req.params.optionId);
  return ok(res, { code: 'CLASSIFIED_ATTRIBUTE_OPTION_DETAIL_SUCCESS', data: item });
}

async function createOption(req, res) {
  const item = await service.createClassifiedAttributeOption(req.params.id, req.body, req);
  return ok(res, { code: 'CLASSIFIED_ATTRIBUTE_OPTION_CREATE_SUCCESS', data: item }, 201);
}

async function updateOption(req, res) {
  const item = await service.updateClassifiedAttributeOption(req.params.id, req.params.optionId, req.body, req);
  return ok(res, { code: 'CLASSIFIED_ATTRIBUTE_OPTION_UPDATE_SUCCESS', data: item });
}

async function removeOption(req, res) {
  await service.deleteClassifiedAttributeOption(req.params.id, req.params.optionId, req);
  return ok(res, { code: 'CLASSIFIED_ATTRIBUTE_OPTION_DELETE_SUCCESS' });
}

async function nextOptionDisplayOrder(req, res) {
  const value = await service.getNextOptionDisplayOrder(req.query.attributeId);
  return ok(res, { code: 'CLASSIFIED_ATTRIBUTE_OPTION_NEXT_DISPLAY_ORDER_SUCCESS', data: { value } });
}

module.exports = {
  create,
  createOption,
  detail,
  list,
  listOptions,
  nextDisplayOrder,
  nextOptionDisplayOrder,
  optionDetail,
  remove,
  removeOption,
  update,
  updateOption,
};
