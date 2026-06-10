const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./contentPage.controller');
const {
  createContentPageSchema,
  updateContentPageSchema,
  listContentPagesSchema,
  idParamSchema,
} = require('./contentPage.schemas');

const router = express.Router();

router.get('/', auth, requirePermission('content_pages.read'), validate(listContentPagesSchema, 'query'), controller.listContentPages);
router.get('/:id', auth, requirePermission('content_pages.read'), validate(idParamSchema, 'params'), controller.getContentPageById);
router.post('/', auth, requirePermission('content_pages.create'), validate(createContentPageSchema), controller.createContentPage);
router.patch('/:id', auth, requirePermission('content_pages.update'), validate(idParamSchema, 'params'), validate(updateContentPageSchema), controller.updateContentPage);
router.delete('/:id', auth, requirePermission('content_pages.delete'), validate(idParamSchema, 'params'), controller.deleteContentPage);

module.exports = router;
