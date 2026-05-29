const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const { audit } = require('../../shared/audit/audit');

const DAY_ORDER = {
  SATURDAY: 10,
  SUNDAY: 20,
  MONDAY: 30,
  TUESDAY: 40,
  WEDNESDAY: 50,
  THURSDAY: 60,
  FRIDAY: 70,
};

async function assertBusiness(id) {
  const exists = await prisma.business.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', { errors: [{ path: 'businessId', message: 'Business not found' }] });
}

function cleanData(data) {
  const next = { ...data };
  if (next.isClosed) {
    next.opensAt = null;
    next.closesAt = null;
  }
  if (next.displayOrder === undefined && next.dayOfWeek) {
    next.displayOrder = DAY_ORDER[next.dayOfWeek] || 0;
  }
  return next;
}

function normalize(item) {
  return {
    id: item.id,
    businessId: item.businessId,
    dayOfWeek: item.dayOfWeek,
    opensAt: item.opensAt,
    closesAt: item.closesAt,
    isClosed: item.isClosed,
    displayOrder: item.displayOrder,
  };
}

async function listBusinessWorkingHours(query) {
  const skip = (query.page - 1) * query.pageSize;
  const where = {};
  if (query.businessId) where.businessId = query.businessId;
  if (query.dayOfWeek) where.dayOfWeek = query.dayOfWeek;
  if (query.isClosed !== undefined) where.isClosed = query.isClosed;

  const [items, total] = await Promise.all([
    prisma.businessWorkingHour.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [{ displayOrder: 'asc' }, { opensAt: 'asc' }, { id: 'asc' }],
    }),
    prisma.businessWorkingHour.count({ where }),
  ]);

  return { items, meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) } };
}

async function getBusinessWorkingHourById(id) {
  const item = await prisma.businessWorkingHour.findUnique({ where: { id } });
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Working hour not found');
  return item;
}

async function createBusinessWorkingHour(data, req) {
  await assertBusiness(data.businessId);
  const created = await prisma.businessWorkingHour.create({ data: cleanData(data) });
  await audit(req, { action: 'CREATE', entity: 'BusinessWorkingHour', entityId: created.id, after: normalize(created) });
  return created;
}

async function updateBusinessWorkingHour(id, data, req) {
  const existing = await prisma.businessWorkingHour.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Working hour not found');
  if (data.businessId) await assertBusiness(data.businessId);
  const updated = await prisma.businessWorkingHour.update({ where: { id }, data: cleanData(data) });
  await audit(req, { action: 'UPDATE', entity: 'BusinessWorkingHour', entityId: id, before: normalize(existing), after: normalize(updated) });
  return updated;
}

async function deleteBusinessWorkingHour(id, req) {
  const existing = await prisma.businessWorkingHour.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Working hour not found');
  await prisma.businessWorkingHour.delete({ where: { id } });
  await audit(req, { action: 'DELETE', entity: 'BusinessWorkingHour', entityId: id, before: normalize(existing) });
}

async function getNextDisplayOrder(businessId, dayOfWeek) {
  const where = {};
  if (businessId) where.businessId = Number(businessId);
  if (dayOfWeek) where.dayOfWeek = dayOfWeek;
  const aggregate = await prisma.businessWorkingHour.aggregate({ where, _max: { displayOrder: true } });
  if (aggregate._max.displayOrder === null || aggregate._max.displayOrder === undefined) {
    return DAY_ORDER[dayOfWeek] || 10;
  }
  return aggregate._max.displayOrder + 10;
}

module.exports = {
  listBusinessWorkingHours,
  getBusinessWorkingHourById,
  createBusinessWorkingHour,
  updateBusinessWorkingHour,
  deleteBusinessWorkingHour,
  getNextDisplayOrder,
};
