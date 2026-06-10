const { ok } = require('../../shared/http/response');
const service = require('./contentPage.service');

async function listContentPages(req, res) {
  const lang = req.get('x-lang') || null;
  const result = await service.listContentPages(req.query, lang);
  return ok(res, { code: 'CONTENT_PAGE_LIST_SUCCESS', data: result.items, meta: result.meta });
}

async function getContentPageById(req, res) {
  const item = await service.getContentPageById(req.params.id);
  return ok(res, { code: 'CONTENT_PAGE_DETAIL_SUCCESS', data: item });
}

async function createContentPage(req, res) {
  const item = await service.createContentPage(req.body, req);
  return ok(res, { code: 'CONTENT_PAGE_CREATE_SUCCESS', data: item }, 201);
}

async function updateContentPage(req, res) {
  const item = await service.updateContentPage(req.params.id, req.body, req);
  return ok(res, { code: 'CONTENT_PAGE_UPDATE_SUCCESS', data: item });
}

async function deleteContentPage(req, res) {
  await service.deleteContentPage(req.params.id, req);
  return ok(res, { code: 'CONTENT_PAGE_DELETE_SUCCESS', data: null });
}

module.exports = {
  listContentPages,
  getContentPageById,
  createContentPage,
  updateContentPage,
  deleteContentPage,
};
