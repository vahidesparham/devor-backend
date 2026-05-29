const { ok } = require('../../shared/http/response');
const auditLogService = require('./auditLog.service');

async function listAuditLogs(req, res) {
  const result = await auditLogService.listAuditLogs(req.query);
  return ok(res, {
    code: 'AUDIT_LOG_LIST_SUCCESS',
    data: result.items,
    meta: result.meta,
  });
}

async function getAuditLogById(req, res) {
  const item = await auditLogService.getAuditLogById(req.params.id);
  return ok(res, {
    code: 'AUDIT_LOG_DETAIL_SUCCESS',
    data: item,
    meta: null,
  });
}

async function deleteAllAuditLogs(req, res) {
  const result = await auditLogService.deleteAllAuditLogs();
  return ok(res, {
    code: 'AUDIT_LOGS_DELETE_ALL_SUCCESS',
    data: result,
    meta: null,
  });
}

module.exports = {
  listAuditLogs,
  getAuditLogById,
  deleteAllAuditLogs,
};
