const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./auditLog.controller');
const { listAuditLogsQuerySchema, idParamSchema } = require('./auditLog.schemas');

const router = express.Router();

router.get('/', auth, requirePermission('audit_logs.read'), validate(listAuditLogsQuerySchema, 'query'), controller.listAuditLogs);
router.delete('/', auth, requirePermission('audit_logs.read'), controller.deleteAllAuditLogs);
router.get('/:id', auth, requirePermission('audit_logs.read'), validate(idParamSchema, 'params'), controller.getAuditLogById);

module.exports = router;
