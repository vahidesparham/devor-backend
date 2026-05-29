const { ok } = require('../../shared/http/response');
const imageConfigService = require('./imageConfig.service');

async function listImageConfigs(req, res) {
  const result = await imageConfigService.listImageConfigs(req.query);
  return ok(res, {
    code: 'IMAGE_CONFIG_LIST_SUCCESS',
    data: result.items,
    meta: result.meta
  });
}

async function getImageConfigById(req, res) {
  const item = await imageConfigService.getImageConfigById(req.params.id);
  return ok(res, {
    code: 'IMAGE_CONFIG_GET_SUCCESS',
    data: item,
    meta: null
  });
}

async function createImageConfig(req, res) {
  const item = await imageConfigService.createImageConfig(req.body, req);
  return ok(
    res,
    {
      code: 'IMAGE_CONFIG_CREATE_SUCCESS',
      data: item,
      meta: null
    },
    201
  );
}

async function updateImageConfig(req, res) {
  const item = await imageConfigService.updateImageConfig(req.params.id, req.body, req);
  return ok(res, {
    code: 'IMAGE_CONFIG_UPDATE_SUCCESS',
    data: item,
    meta: null
  });
}

async function deleteImageConfig(req, res) {
  await imageConfigService.deleteImageConfig(req.params.id, req);
  return ok(res, {
    code: 'IMAGE_CONFIG_DELETE_SUCCESS',
    data: null,
    meta: null
  });
}

module.exports = {
  listImageConfigs,
  getImageConfigById,
  createImageConfig,
  updateImageConfig,
  deleteImageConfig
};
