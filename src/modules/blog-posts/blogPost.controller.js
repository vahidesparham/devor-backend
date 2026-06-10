const { ok } = require('../../shared/http/response');
const service = require('./blogPost.service');

async function listBlogPosts(req, res) {
  const lang = req.get('x-lang') || null;
  const result = await service.listBlogPosts(req.query, lang);
  return ok(res, { code: 'BLOG_POST_LIST_SUCCESS', data: result.items, meta: result.meta });
}

async function getBlogPostById(req, res) {
  const item = await service.getBlogPostById(req.params.id);
  return ok(res, { code: 'BLOG_POST_DETAIL_SUCCESS', data: item });
}

async function createBlogPost(req, res) {
  const item = await service.createBlogPost(req.body, req);
  return ok(res, { code: 'BLOG_POST_CREATE_SUCCESS', data: item }, 201);
}

async function updateBlogPost(req, res) {
  const item = await service.updateBlogPost(req.params.id, req.body, req);
  return ok(res, { code: 'BLOG_POST_UPDATE_SUCCESS', data: item });
}

async function deleteBlogPost(req, res) {
  await service.deleteBlogPost(req.params.id, req);
  return ok(res, { code: 'BLOG_POST_DELETE_SUCCESS', data: null });
}

module.exports = {
  listBlogPosts,
  getBlogPostById,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
};
