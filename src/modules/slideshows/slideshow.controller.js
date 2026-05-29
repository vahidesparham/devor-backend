const { ok } = require('../../shared/http/response');
const slideshowService = require('./slideshow.service');

async function listSlideshows(req, res) {
  const lang = req.get('x-lang') || null;
  const result = await slideshowService.listSlideshows(req.query, lang);

  return ok(res, {
    code: 'SLIDESHOW_LIST_SUCCESS',
    data: result.items,
    meta: result.meta,
  });
}

async function getSlideshowById(req, res) {
  const lang = req.get('x-lang') || null;
  const item = await slideshowService.getSlideshowById(req.params.id, lang);

  return ok(res, {
    code: 'SLIDESHOW_DETAIL_SUCCESS',
    data: item,
  });
}

async function createSlideshow(req, res) {
  const item = await slideshowService.createSlideshow(req.body, req);

  return ok(
    res,
    {
      code: 'SLIDESHOW_CREATE_SUCCESS',
      data: item,
    },
    201,
  );
}

async function updateSlideshow(req, res) {
  const item = await slideshowService.updateSlideshow(req.params.id, req.body, req);

  return ok(res, {
    code: 'SLIDESHOW_UPDATE_SUCCESS',
    data: item,
  });
}

async function deleteSlideshow(req, res) {
  await slideshowService.deleteSlideshow(req.params.id, req);

  return ok(res, {
    code: 'SLIDESHOW_DELETE_SUCCESS',
    data: null,
  });
}

module.exports = {
  listSlideshows,
  getSlideshowById,
  createSlideshow,
  updateSlideshow,
  deleteSlideshow,
};
