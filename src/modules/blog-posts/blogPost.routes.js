const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./blogPost.controller');
const {
  createBlogPostSchema,
  updateBlogPostSchema,
  listBlogPostsSchema,
  idParamSchema,
} = require('./blogPost.schemas');

const router = express.Router();

router.get('/', auth, requirePermission('blog_posts.read'), validate(listBlogPostsSchema, 'query'), controller.listBlogPosts);
router.get('/:id', auth, requirePermission('blog_posts.read'), validate(idParamSchema, 'params'), controller.getBlogPostById);
router.post('/', auth, requirePermission('blog_posts.create'), validate(createBlogPostSchema), controller.createBlogPost);
router.patch('/:id', auth, requirePermission('blog_posts.update'), validate(idParamSchema, 'params'), validate(updateBlogPostSchema), controller.updateBlogPost);
router.delete('/:id', auth, requirePermission('blog_posts.delete'), validate(idParamSchema, 'params'), controller.deleteBlogPost);

module.exports = router;
