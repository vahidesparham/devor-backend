const { ok } = require('../../shared/http/response');
const service = require('./classifiedOperation.service');

async function status(_req, res) {
  return ok(res, {
    code: 'CLASSIFIED_OPERATION_STATUS_SUCCESS',
    data: await service.getOperationalStatus(),
  });
}

async function updateSettings(req, res) {
  return ok(res, {
    code: 'CLASSIFIED_OPERATION_SETTINGS_UPDATE_SUCCESS',
    data: await service.updateSettings(req.body, req),
  });
}

async function runExpiry(req, res) {
  return ok(res, {
    code: 'CLASSIFIED_OPERATION_EXPIRY_RUN_SUCCESS',
    data: await service.runExpiryNow(req),
  });
}

async function dispatchEvents(req, res) {
  return ok(res, {
    code: 'CLASSIFIED_OPERATION_EVENT_DISPATCH_SUCCESS',
    data: await service.dispatchEventsNow(req),
  });
}

async function reconcileMedia(req, res) {
  return ok(res, {
    code: 'CLASSIFIED_OPERATION_MEDIA_RECONCILE_SUCCESS',
    data: await service.reconcileMedia(req.body, req),
  });
}

async function retryDeadEvents(req, res) {
  return ok(res, {
    code: 'CLASSIFIED_OPERATION_EVENT_RETRY_SUCCESS',
    data: await service.retryDeadEvents(req),
  });
}

module.exports = {
  dispatchEvents,
  reconcileMedia,
  retryDeadEvents,
  runExpiry,
  status,
  updateSettings,
};
