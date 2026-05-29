const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./slideshow.controller');
const {
  createSlideshowSchema,
  updateSlideshowSchema,
  listSlideshowsSchema,
  idParamSchema,
} = require('./slideshow.schemas');

const router = express.Router();

router.get('/', auth, requirePermission('slideshows.read'), validate(listSlideshowsSchema, 'query'), controller.listSlideshows);
router.get('/:id', auth, requirePermission('slideshows.read'), validate(idParamSchema, 'params'), controller.getSlideshowById);
router.post('/', auth, requirePermission('slideshows.create'), validate(createSlideshowSchema), controller.createSlideshow);
router.patch('/:id', auth, requirePermission('slideshows.update'), validate(idParamSchema, 'params'), validate(updateSlideshowSchema), controller.updateSlideshow);
router.delete('/:id', auth, requirePermission('slideshows.delete'), validate(idParamSchema, 'params'), controller.deleteSlideshow);

module.exports = router;
