const { ok } = require('../../shared/http/response');
const service = require('./appPublic.service');

async function bootstrap(_req, res) {
  const data = await service.getBootstrap();
  return ok(res, { code: 'APP_BOOTSTRAP', data });
}

async function home(req, res) {
  const data = await service.getHome(req.query);
  return ok(res, { code: 'APP_HOME', data, meta: { lang: data.lang } });
}

async function explore(req, res) {
  const data = await service.getExplore(req.query, req.appUser?.id || null);
  return ok(res, { code: 'APP_EXPLORE', data, meta: { lang: data.lang } });
}

async function businesses(req, res) {
  const data = await service.listBusinesses(req.query, req.appUser?.id || null);
  return ok(res, { code: 'APP_BUSINESS_LIST', data: data.items, meta: data.meta });
}

async function businessFilters(req, res) {
  const data = await service.getBusinessFilters(req.query);
  return ok(res, { code: 'APP_BUSINESS_FILTERS', data, meta: { lang: data.lang } });
}

async function onboardingPages(req, res) {
  const data = await service.listOnboardingPages(req.query.lang);
  return ok(res, { code: 'APP_ONBOARDING_PAGES', data: data.items, meta: { lang: data.lang } });
}

async function contentPage(req, res) {
  const data = await service.getContentPage(req.params.slug, req.query.lang);
  return ok(res, { code: 'APP_CONTENT_PAGE', data, meta: { lang: data.lang } });
}

async function contactPage(req, res) {
  const data = await service.getContactPage(req.query.lang);
  return ok(res, { code: 'APP_CONTACT_PAGE', data, meta: { lang: data.lang } });
}

async function faqs(req, res) {
  const data = await service.listFaqs(req.query.lang);
  return ok(res, { code: 'APP_FAQ_LIST', data: data.items, meta: { lang: data.lang } });
}

async function countries(req, res) {
  const data = await service.listCountries(req.query.lang);
  return ok(res, { code: 'APP_COUNTRY_LIST', data: data.items, meta: { lang: data.lang } });
}

async function cities(req, res) {
  const data = await service.listCities(req.query.lang);
  return ok(res, { code: 'APP_CITY_LIST', data: data.items, meta: { lang: data.lang } });
}

async function blogPosts(req, res) {
  const data = await service.listBlogPosts(req.query);
  return ok(res, { code: 'APP_BLOG_POST_LIST', data: data.items, meta: data.meta });
}

async function blogPost(req, res) {
  const data = await service.getBlogPost(req.params.id, req.query.lang);
  return ok(res, { code: 'APP_BLOG_POST_DETAIL', data, meta: { lang: data.lang } });
}

async function businessReviews(req, res) {
  const data = await service.listBusinessReviews(req.params.id, req.query);
  return ok(res, { code: 'APP_BUSINESS_REVIEW_LIST', data: data.items, meta: data.meta });
}

async function businessDetail(req, res) {
  const data = await service.getBusinessDetail(req.params.id, req.query, req.appUser?.id || null);
  return ok(res, { code: 'APP_BUSINESS_DETAIL', data, meta: { lang: data.lang } });
}

async function favoriteBusinesses(req, res) {
  const data = await service.listFavoriteBusinesses(req.appUser.id, req.query);
  return ok(res, { code: 'APP_FAVORITE_BUSINESS_LIST', data: data.items, meta: data.meta });
}

async function myReviews(req, res) {
  const data = await service.listMyReviews(req.appUser.id, req.query);
  return ok(res, { code: 'APP_MY_REVIEW_LIST', data: data.items, meta: data.meta });
}

async function createBusinessReview(req, res) {
  const data = await service.createBusinessReview(req.appUser.id, req.params.id, req.body);
  return ok(res, { code: 'APP_BUSINESS_REVIEW_SAVED', data });
}

async function addBusinessFavorite(req, res) {
  const data = await service.addBusinessFavorite(req.appUser.id, req.params.id);
  return ok(res, { code: 'APP_BUSINESS_FAVORITE_ADDED', data });
}

async function removeBusinessFavorite(req, res) {
  const data = await service.removeBusinessFavorite(req.appUser.id, req.params.id);
  return ok(res, { code: 'APP_BUSINESS_FAVORITE_REMOVED', data });
}

module.exports = {
  bootstrap,
  home,
  explore,
  businesses,
  businessFilters,
  onboardingPages,
  contentPage,
  contactPage,
  faqs,
  countries,
  cities,
  blogPosts,
  blogPost,
  businessDetail,
  businessReviews,
  favoriteBusinesses,
  myReviews,
  createBusinessReview,
  addBusinessFavorite,
  removeBusinessFavorite,
};
