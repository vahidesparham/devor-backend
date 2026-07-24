const { ok } = require('../../shared/http/response');
const service = require('./classifiedCategory.service');

async function list(req, res) {
  const result = await service.listClassifiedCategories(req.query);
  return ok(res, { code: 'CLASSIFIED_CATEGORY_LIST_SUCCESS', data: result.items, meta: result.meta });
}

async function tree(_req, res) {
  const items = await service.getClassifiedCategoryTree();
  return ok(res, { code: 'CLASSIFIED_CATEGORY_TREE_SUCCESS', data: items });
}

async function options(req, res) {
  const items = await service.getClassifiedCategoryOptions(req.query);
  return ok(res, { code: 'CLASSIFIED_CATEGORY_OPTIONS_SUCCESS', data: items });
}

async function detail(req, res) {
  const item = await service.getClassifiedCategoryById(req.params.id);
  return ok(res, { code: 'CLASSIFIED_CATEGORY_DETAIL_SUCCESS', data: item });
}

async function create(req, res) {
  const item = await service.createClassifiedCategory(req.body, req);
  return ok(res, { code: 'CLASSIFIED_CATEGORY_CREATE_SUCCESS', data: item }, 201);
}

async function update(req, res) {
  const item = await service.updateClassifiedCategory(req.params.id, req.body, req);
  return ok(res, { code: 'CLASSIFIED_CATEGORY_UPDATE_SUCCESS', data: item });
}

async function remove(req, res) {
  await service.deleteClassifiedCategory(req.params.id, req);
  return ok(res, { code: 'CLASSIFIED_CATEGORY_DELETE_SUCCESS' });
}

async function nextDisplayOrder(req, res) {
  const value = await service.getNextDisplayOrder(req.query.parentId);
  return ok(res, { code: 'CLASSIFIED_CATEGORY_NEXT_DISPLAY_ORDER_SUCCESS', data: { value } });
}

module.exports = { create, detail, list, nextDisplayOrder, options, remove, tree, update };
