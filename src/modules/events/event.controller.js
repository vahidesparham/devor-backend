const { ok } = require('../../shared/http/response');
const service = require('./event.service');

async function listEvents(req, res) {
  const result = await service.listEvents(req.query, req.get('x-lang') || null);
  return ok(res, { code: 'EVENT_LIST_SUCCESS', data: result.items, meta: result.meta });
}

async function getEventById(req, res) {
  const item = await service.getEventById(req.params.id);
  return ok(res, { code: 'EVENT_DETAIL_SUCCESS', data: item });
}

async function createEvent(req, res) {
  const item = await service.createEvent(req.body, req);
  return ok(res, { code: 'EVENT_CREATE_SUCCESS', data: item }, 201);
}

async function updateEvent(req, res) {
  const item = await service.updateEvent(req.params.id, req.body, req);
  return ok(res, { code: 'EVENT_UPDATE_SUCCESS', data: item });
}

async function updateEventStatus(req, res) {
  const item = await service.updateEventStatus(req.params.id, req.body, req);
  return ok(res, { code: 'EVENT_STATUS_UPDATE_SUCCESS', data: item });
}

async function deleteEvent(req, res) {
  await service.deleteEvent(req.params.id, req);
  return ok(res, { code: 'EVENT_DELETE_SUCCESS', data: null });
}

module.exports = {
  listEvents,
  getEventById,
  createEvent,
  updateEvent,
  updateEventStatus,
  deleteEvent,
};
