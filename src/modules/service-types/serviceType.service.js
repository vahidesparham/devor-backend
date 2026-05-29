const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const { audit } = require('../../shared/audit/audit');

function normalize(item) {
  return {
    code: item.code,
    title: item.title,
    icon: item.icon,
    color: item.color,
    displayOrder: item.displayOrder,
    isActive: item.isActive,
  };
}

async function listServiceTypes(query) {
  const skip = (query.page - 1) * query.pageSize;
  const where = {};

  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.q) {
    where.OR = [
      { code: { contains: query.q } },
      { title: { contains: query.q } },
      { description: { contains: query.q } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.serviceType.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [{ [query.sortBy]: query.sortDir }, { id: 'asc' }],
      include: {
        _count: {
          select: {
            featureDefinitions: true,
            attributeGroups: true,
            businesses: true,
          },
        },
      },
    }),
    prisma.serviceType.count({ where }),
  ]);

  return {
    items,
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      pageCount: Math.ceil(total / query.pageSize),
    },
  };
}

async function getServiceTypeById(id) {
  const item = await prisma.serviceType.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          featureDefinitions: true,
          attributeGroups: true,
          businesses: true,
        },
      },
    },
  });
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Service type not found');
  return item;
}

async function createServiceType(data, req) {
  const created = await prisma.serviceType.create({ data });
  await audit(req, { action: 'CREATE', entity: 'ServiceType', entityId: created.id, after: normalize(created) });
  return created;
}

async function updateServiceType(id, data, req) {
  const existing = await prisma.serviceType.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Service type not found');

  const updated = await prisma.serviceType.update({ where: { id }, data });
  await audit(req, { action: 'UPDATE', entity: 'ServiceType', entityId: id, before: normalize(existing), after: normalize(updated) });
  return updated;
}

async function deleteServiceType(id, req) {
  const existing = await prisma.serviceType.findUnique({
    where: { id },
    include: { _count: { select: { businesses: true, featureDefinitions: true, attributeGroups: true } } },
  });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Service type not found');
  if (existing._count.businesses > 0) {
    throw new AppError(409, 'SERVICE_TYPE_IN_USE', 'Service type has businesses and cannot be deleted');
  }

  await prisma.serviceType.delete({ where: { id } });
  await audit(req, { action: 'DELETE', entity: 'ServiceType', entityId: id, before: normalize(existing) });
}

async function getNextDisplayOrder() {
  const aggregate = await prisma.serviceType.aggregate({ _max: { displayOrder: true } });
  return (aggregate._max.displayOrder || 0) + 10;
}

module.exports = {
  listServiceTypes,
  getServiceTypeById,
  createServiceType,
  updateServiceType,
  deleteServiceType,
  getNextDisplayOrder,
};
