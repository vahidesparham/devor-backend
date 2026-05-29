const { ok } = require('../../shared/http/response');
const languageService = require('./language.service');

async function listLanguages(req, res) {
  const result = await languageService.listLanguages(req.query);
  return ok(res, {
    code: 'LANGUAGE_LIST_SUCCESS',
    data: result.items,
    meta: result.meta
  });
}

async function getLanguageById(req, res) {
  const item = await languageService.getLanguageById(req.params.id);
  return ok(res, {
    code: 'LANGUAGE_GET_SUCCESS',
    data: item,
    meta: null
  });
}

async function createLanguage(req, res) {
  const language = await languageService.createLanguage(req.body, req);
  return ok(
    res,
    {
      code: 'LANGUAGE_CREATE_SUCCESS',
      data: language
    },
    201
  );
}

async function updateLanguage(req, res) {
  const language = await languageService.updateLanguage(req.params.id, req.body, req);
  return ok(res, {
    code: 'LANGUAGE_UPDATE_SUCCESS',
    data: language
  });
}

async function deleteLanguage(req, res) {
  await languageService.deleteLanguage(req.params.id, req);
  return ok(res, {
    code: 'LANGUAGE_DELETE_SUCCESS',
    data: null
  });
}

module.exports = {
  listLanguages,
  getLanguageById,
  createLanguage,
  updateLanguage,
  deleteLanguage
};
