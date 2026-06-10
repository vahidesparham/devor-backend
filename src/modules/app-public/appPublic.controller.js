const { ok } = require('../../shared/http/response');
const service = require('./appPublic.service');

async function bootstrap(_req, res) {
  const data = await service.getBootstrap();
  return ok(res, { code: 'APP_BOOTSTRAP', data });
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

module.exports = {
  bootstrap,
  onboardingPages,
  contentPage,
  contactPage,
  faqs,
  countries,
  cities,
  blogPosts,
  blogPost,
};
