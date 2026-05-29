const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const { audit } = require('../../shared/audit/audit');

function normalize(item) {
  return {
    serviceTypeId: item.serviceTypeId,
    key: item.key,
    title: item.title,
    icon: item.icon,
    displayOrder: item.displayOrder,
    isActive: item.isActive,
  };
}

async function assertServiceType(id) {
  const exists = await prisma.serviceType.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', { errors: [{ path: 'serviceTypeId', message: 'Service type not found' }] });
}

async function listFeatureDefinitions(query) {
  const skip = (query.page - 1) * query.pageSize;
  const where = {};
  if (query.serviceTypeId) where.serviceTypeId = query.serviceTypeId;
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.q) {
    where.OR = [
      { key: { contains: query.q } },
      { title: { contains: query.q } },
      { description: { contains: query.q } },
      { serviceType: { title: { contains: query.q } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.featureDefinition.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [{ [query.sortBy]: query.sortDir }, { id: 'asc' }],
      include: { serviceType: { select: { id: true, code: true, title: true, icon: true, color: true } }, _count: { select: { businessFeatures: true } } },
    }),
    prisma.featureDefinition.count({ where }),
  ]);

  return { items, meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) } };
}

async function getFeatureDefinitionById(id) {
  const item = await prisma.featureDefinition.findUnique({
    where: { id },
    include: { serviceType: { select: { id: true, code: true, title: true, icon: true, color: true } }, _count: { select: { businessFeatures: true } } },
  });
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Feature definition not found');
  return item;
}

async function createFeatureDefinition(data, req) {
  await assertServiceType(data.serviceTypeId);
  const created = await prisma.featureDefinition.create({ data });
  await audit(req, { action: 'CREATE', entity: 'FeatureDefinition', entityId: created.id, after: normalize(created) });
  return created;
}

async function updateFeatureDefinition(id, data, req) {
  const existing = await prisma.featureDefinition.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Feature definition not found');
  if (data.serviceTypeId) await assertServiceType(data.serviceTypeId);
  const updated = await prisma.featureDefinition.update({ where: { id }, data });
  await audit(req, { action: 'UPDATE', entity: 'FeatureDefinition', entityId: id, before: normalize(existing), after: normalize(updated) });
  return updated;
}

async function deleteFeatureDefinition(id, req) {
  const existing = await prisma.featureDefinition.findUnique({ where: { id }, include: { _count: { select: { businessFeatures: true } } } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Feature definition not found');
  if (existing._count.businessFeatures > 0) throw new AppError(409, 'FEATURE_IN_USE', 'Feature is used by businesses and cannot be deleted');
  await prisma.featureDefinition.delete({ where: { id } });
  await audit(req, { action: 'DELETE', entity: 'FeatureDefinition', entityId: id, before: normalize(existing) });
}

async function getNextDisplayOrder(serviceTypeId) {
  const where = serviceTypeId ? { serviceTypeId: Number(serviceTypeId) } : {};
  const aggregate = await prisma.featureDefinition.aggregate({ where, _max: { displayOrder: true } });
  return (aggregate._max.displayOrder || 0) + 10;
}

module.exports = {
  listFeatureDefinitions,
  getFeatureDefinitionById,
  createFeatureDefinition,
  updateFeatureDefinition,
  deleteFeatureDefinition,
  getNextDisplayOrder,
};
