const { ok } = require('../../shared/http/response');
const service = require('./contactPage.service');

async function getContactPage(_req, res) {
  const item = await service.getContactPage();
  return ok(res, { code: 'CONTACT_PAGE_GET_SUCCESS', data: item });
}

async function updateContactPage(req, res) {
  const item = await service.updateContactPage(req.body, req);
  return ok(res, { code: 'CONTACT_PAGE_UPDATE_SUCCESS', data: item });
}

module.exports = {
  getContactPage,
  updateContactPage,
};
