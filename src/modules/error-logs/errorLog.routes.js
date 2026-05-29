const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./errorLog.controller');
const { listErrorLogsQuerySchema, idParamSchema } = require('./errorLog.schemas');

const router = express.Router();

router.get('/', auth, requirePermission('error_logs.read'), validate(listErrorLogsQuerySchema, 'query'), controller.listErrorLogs);
router.delete('/', auth, requirePermission('error_logs.read'), controller.deleteAllErrorLogs);
router.get('/:id', auth, requirePermission('error_logs.read'), validate(idParamSchema, 'params'), controller.getErrorLogById);

module.exports = router;
