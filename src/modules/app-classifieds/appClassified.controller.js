const { ok } = require('../../shared/http/response');
const service = require('./appClassified.service');

async function postingConfig(req, res) {
  const data = await service.getPostingConfig(req.appUser);
  return ok(res, { code: 'CLASSIFIED_POSTING_CONFIG_SUCCESS', data });
}

async function publicCategories(req, res) {
  const data = await service.listPublicCategories(req.query);
  return ok(res, { code: 'CLASSIFIED_PUBLIC_CATEGORIES_SUCCESS', data });
}

async function publicCategoryFilters(req, res) {
  const data = await service.getPublicCategoryFilters(req.params.categoryId);
  return ok(res, { code: 'CLASSIFIED_PUBLIC_CATEGORY_FILTERS_SUCCESS', data });
}

async function publicAds(req, res) {
  const result = await service.listPublicAds(req.query);
  return ok(res, {
    code: 'CLASSIFIED_PUBLIC_AD_LIST_SUCCESS',
    data: result.items,
    meta: result.meta,
  });
}

async function publicAdDetail(req, res) {
  const data = await service.getPublicAd(req.params.id);
  return ok(res, { code: 'CLASSIFIED_PUBLIC_AD_DETAIL_SUCCESS', data });
}

async function categoryAttributes(req, res) {
  const data = await service.getCategoryAttributes(req.params.categoryId);
  return ok(res, { code: 'CLASSIFIED_CATEGORY_ATTRIBUTES_SUCCESS', data });
}

async function list(req, res) {
  const result = await service.listMyAds(req.appUser, req.query);
  return ok(res, { code: 'CLASSIFIED_MY_AD_LIST_SUCCESS', data: result.items, meta: result.meta });
}

async function detail(req, res) {
  const data = await service.getMyAd(req.appUser, req.params.id);
  return ok(res, { code: 'CLASSIFIED_MY_AD_DETAIL_SUCCESS', data });
}

async function create(req, res) {
  const data = await service.createDraft(req.appUser, req.body);
  return ok(res, { code: 'CLASSIFIED_DRAFT_CREATE_SUCCESS', data }, 201);
}

async function update(req, res) {
  const data = await service.updateMyAd(req.appUser, req.params.id, req.body);
  return ok(res, { code: 'CLASSIFIED_DRAFT_UPDATE_SUCCESS', data });
}

async function saveAttributes(req, res) {
  const data = await service.saveAttributeValues(req.appUser, req.params.id, req.body);
  return ok(res, { code: 'CLASSIFIED_ATTRIBUTE_VALUES_SAVE_SUCCESS', data });
}

async function uploadImage(req, res) {
  const data = await service.uploadAdImage(req.appUser, req.params.id, req.body.expectedVersion, req.file);
  return ok(res, { code: 'CLASSIFIED_IMAGE_UPLOAD_SUCCESS', data }, 201);
}

async function reorderImages(req, res) {
  const data = await service.reorderAdImages(req.appUser, req.params.id, req.body);
  return ok(res, { code: 'CLASSIFIED_IMAGE_REORDER_SUCCESS', data });
}

async function deleteImage(req, res) {
  const data = await service.deleteAdImage(
    req.appUser,
    req.params.id,
    req.params.imageId,
    req.query.expectedVersion,
  );
  return ok(res, { code: 'CLASSIFIED_IMAGE_DELETE_SUCCESS', data });
}

async function readiness(req, res) {
  const data = await service.getMyAdReadiness(req.appUser, req.params.id);
  return ok(res, { code: 'CLASSIFIED_READINESS_SUCCESS', data });
}

function action(method, code) {
  return async (req, res) => {
    const data = await service[method](req.appUser, req.params.id, req.body.expectedVersion);
    return ok(res, { code, data });
  };
}

module.exports = {
  archive: action('archiveMyAd', 'CLASSIFIED_ARCHIVE_SUCCESS'),
  categoryAttributes,
  create,
  deleteImage,
  detail,
  list,
  markSold: action('markMyAdSold', 'CLASSIFIED_MARK_SOLD_SUCCESS'),
  pause: action('pauseMyAd', 'CLASSIFIED_PAUSE_SUCCESS'),
  postingConfig,
  publicAdDetail,
  publicAds,
  publicCategories,
  publicCategoryFilters,
  readiness,
  renew: action('renewMyAd', 'CLASSIFIED_RENEW_SUCCESS'),
  reorderImages,
  resume: action('resumeMyAd', 'CLASSIFIED_RESUME_SUCCESS'),
  saveAttributes,
  submit: action('submitMyAd', 'CLASSIFIED_SUBMIT_SUCCESS'),
  update,
  uploadImage,
};
