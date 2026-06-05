const { ok } = require('../../shared/http/response');
const service = require('./onboardingPage.service');

async function listOnboardingPages(req, res) {
  const lang = req.get('x-lang') || null;
  const result = await service.listOnboardingPages(req.query, lang);
  return ok(res, { code: 'ONBOARDING_PAGE_LIST_SUCCESS', data: result.items, meta: result.meta });
}

async function getOnboardingPageById(req, res) {
  const item = await service.getOnboardingPageById(req.params.id);
  return ok(res, { code: 'ONBOARDING_PAGE_DETAIL_SUCCESS', data: item });
}

async function createOnboardingPage(req, res) {
  const item = await service.createOnboardingPage(req.body, req);
  return ok(res, { code: 'ONBOARDING_PAGE_CREATE_SUCCESS', data: item }, 201);
}

async function updateOnboardingPage(req, res) {
  const item = await service.updateOnboardingPage(req.params.id, req.body, req);
  return ok(res, { code: 'ONBOARDING_PAGE_UPDATE_SUCCESS', data: item });
}

async function deleteOnboardingPage(req, res) {
  await service.deleteOnboardingPage(req.params.id, req);
  return ok(res, { code: 'ONBOARDING_PAGE_DELETE_SUCCESS', data: null });
}

async function getNextDisplayOrder(req, res) {
  const displayOrder = await service.getNextDisplayOrder();
  return ok(res, { code: 'ONBOARDING_PAGE_NEXT_DISPLAY_ORDER_SUCCESS', data: { displayOrder } });
}

module.exports = {
  listOnboardingPages,
  getOnboardingPageById,
  createOnboardingPage,
  updateOnboardingPage,
  deleteOnboardingPage,
  getNextDisplayOrder,
};
