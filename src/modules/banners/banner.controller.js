const { ok } = require('../../shared/http/response');
const bannerService = require('./banner.service');

async function listBanners(req, res) {
  const lang = req.get('x-lang') || null;
  const result = await bannerService.listBanners(req.query, lang);

  return ok(res, {
    code: 'BANNER_LIST_SUCCESS',
    data: result.items,
    meta: result.meta,
  });
}

async function getBannerById(req, res) {
  const lang = req.get('x-lang') || null;
  const item = await bannerService.getBannerById(req.params.id, lang);

  return ok(res, {
    code: 'BANNER_DETAIL_SUCCESS',
    data: item,
  });
}

async function createBanner(req, res) {
  const item = await bannerService.createBanner(req.body, req);

  return ok(
    res,
    {
      code: 'BANNER_CREATE_SUCCESS',
      data: item,
    },
    201,
  );
}

async function updateBanner(req, res) {
  const item = await bannerService.updateBanner(req.params.id, req.body, req);

  return ok(res, {
    code: 'BANNER_UPDATE_SUCCESS',
    data: item,
  });
}

async function deleteBanner(req, res) {
  await bannerService.deleteBanner(req.params.id, req);

  return ok(res, {
    code: 'BANNER_DELETE_SUCCESS',
    data: null,
  });
}

module.exports = {
  listBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
};
