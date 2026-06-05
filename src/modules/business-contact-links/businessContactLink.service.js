const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const { audit } = require('../../shared/audit/audit');

async function assertBusiness(id) {
  const exists = await prisma.business.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', { errors: [{ path: 'businessId', message: 'Business not found' }] });
}

function normalize(item) {
  return {
    id: item.id,
    businessId: item.businessId,
    type: item.type,
    label: item.label,
    value: item.value,
    url: item.url,
    displayOrder: item.displayOrder,
    isPrimary: item.isPrimary,
    isActive: item.isActive,
  };
}

async function enforcePrimary(tx, item) {
  if (!item.isPrimary) return;
  await tx.businessContactLink.updateMany({
    where: { businessId: item.businessId, id: { not: item.id }, isPrimary: true },
    data: { isPrimary: false },
  });
}

async function listBusinessContactLinks(query) {
  const skip = (query.page - 1) * query.pageSize;
  const where = {};
  if (query.businessId) where.businessId = query.businessId;
  if (query.type) where.type = query.type;
  if (query.isActive !== undefined) where.isActive = query.isActive;

  const [items, total] = await Promise.all([
    prisma.businessContactLink.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }, { id: 'asc' }],
    }),
    prisma.businessContactLink.count({ where }),
  ]);

  return { items, meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) } };
}

async function getBusinessContactLinkById(id) {
  const item = await prisma.businessContactLink.findUnique({ where: { id } });
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Business contact link not found');
  return item;
}

async function createBusinessContactLink(data, req) {
  await assertBusiness(data.businessId);
  const created = await prisma.$transaction(async (tx) => {
    const item = await tx.businessContactLink.create({ data });
    await enforcePrimary(tx, item);
    return item;
  });
  await audit(req, { action: 'CREATE', entity: 'BusinessContactLink', entityId: created.id, after: normalize(created) });
  return created;
}

async function updateBusinessContactLink(id, data, req) {
  const existing = await prisma.businessContactLink.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Business contact link not found');
  if (data.businessId) await assertBusiness(data.businessId);
  const updated = await prisma.$transaction(async (tx) => {
    const item = await tx.businessContactLink.update({ where: { id }, data });
    await enforcePrimary(tx, item);
    return item;
  });
  await audit(req, { action: 'UPDATE', entity: 'BusinessContactLink', entityId: id, before: normalize(existing), after: normalize(updated) });
  return updated;
}

async function deleteBusinessContactLink(id, req) {
  const existing = await prisma.businessContactLink.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Business contact link not found');
  await prisma.businessContactLink.delete({ where: { id } });
  await audit(req, { action: 'DELETE', entity: 'BusinessContactLink', entityId: id, before: normalize(existing) });
}

async function getNextDisplayOrder(businessId) {
  const where = businessId ? { businessId: Number(businessId) } : {};
  const aggregate = await prisma.businessContactLink.aggregate({ where, _max: { displayOrder: true } });
  return (aggregate._max.displayOrder || 0) + 10;
}

module.exports = {
  listBusinessContactLinks,
  getBusinessContactLinkById,
  createBusinessContactLink,
  updateBusinessContactLink,
  deleteBusinessContactLink,
  getNextDisplayOrder,
};
