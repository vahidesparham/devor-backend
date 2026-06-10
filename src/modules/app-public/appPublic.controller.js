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

module.exports = {
  bootstrap,
  onboardingPages,
};
