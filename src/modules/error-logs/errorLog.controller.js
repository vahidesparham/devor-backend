const { ok } = require('../../shared/http/response');
const errorLogService = require('./errorLog.service');

async function listErrorLogs(req, res) {
  const result = await errorLogService.listErrorLogs(req.query);
  return ok(res, {
    code: 'ERROR_LOG_LIST_SUCCESS',
    data: result.items,
    meta: result.meta,
  });
}

async function getErrorLogById(req, res) {
  const item = await errorLogService.getErrorLogById(req.params.id);
  return ok(res, {
    code: 'ERROR_LOG_DETAIL_SUCCESS',
    data: item,
    meta: null,
  });
}

async function deleteAllErrorLogs(req, res) {
  const result = await errorLogService.deleteAllErrorLogs();
  return ok(res, {
    code: 'ERROR_LOGS_DELETE_ALL_SUCCESS',
    data: result,
    meta: null,
  });
}

module.exports = {
  listErrorLogs,
  getErrorLogById,
  deleteAllErrorLogs,
};
