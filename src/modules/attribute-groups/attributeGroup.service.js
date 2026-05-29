const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const { audit } = require('../../shared/audit/audit');

function normalize(item) {
  return {
    serviceTypeId: item.serviceTypeId,
    code: item.code,
    title: item.title,
    selectionMode: item.selectionMode,
    displayOrder: item.displayOrder,
    isActive: item.isActive,
  };
}

async function assertServiceType(id) {
  const exists = await prisma.serviceType.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', { errors: [{ path: 'serviceTypeId', message: 'Service type not found' }] });
}

async function listAttributeGroups(query) {
  const skip = (query.page - 1) * query.pageSize;
  const where = {};
  if (query.serviceTypeId) where.serviceTypeId = query.serviceTypeId;
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.q) {
    where.OR = [
      { code: { contains: query.q } },
      { title: { contains: query.q } },
      { serviceType: { title: { contains: query.q } } },
      { options: { some: { title: { contains: query.q } } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.attributeGroup.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [{ [query.sortBy]: query.sortDir }, { id: 'asc' }],
      include: {
        serviceType: { select: { id: true, code: true, title: true, icon: true, color: true } },
        options: { orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }] },
        _count: { select: { options: true } },
      },
    }),
    prisma.attributeGroup.count({ where }),
  ]);

  return { items, meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) } };
}

async function getAttributeGroupById(id) {
  const item = await prisma.attributeGroup.findUnique({
    where: { id },
    include: {
      serviceType: { select: { id: true, code: true, title: true, icon: true, color: true } },
      options: { orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }] },
    },
  });
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Attribute group not found');
  return item;
}

function splitGroupData(data) {
  const { options, ...groupData } = data;
  return { groupData, options };
}

async function createAttributeGroup(data, req) {
  await assertServiceType(data.serviceTypeId);
  const { groupData, options } = splitGroupData(data);
  const created = await prisma.attributeGroup.create({
    data: {
      ...groupData,
      options: options?.length ? { create: options.map(({ id: _id, ...item }) => item) } : undefined,
    },
    include: { options: true },
  });
  await audit(req, { action: 'CREATE', entity: 'AttributeGroup', entityId: created.id, after: normalize(created), details: { optionCount: created.options.length } });
  return created;
}

async function updateAttributeGroup(id, data, req) {
  const existing = await prisma.attributeGroup.findUnique({ where: { id }, include: { options: true } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Attribute group not found');
  if (data.serviceTypeId) await assertServiceType(data.serviceTypeId);
  const { groupData, options } = splitGroupData(data);

  const updated = await prisma.$transaction(async (tx) => {
    if (Object.keys(groupData).length) {
      await tx.attributeGroup.update({ where: { id }, data: groupData });
    }

    if (Array.isArray(options)) {
      const keepIds = [];
      for (const option of options) {
        const { id: optionId, ...optionData } = option;
        if (optionId) {
          keepIds.push(optionId);
          await tx.attributeOption.update({ where: { id: optionId }, data: optionData });
        } else {
          const createdOption = await tx.attributeOption.create({ data: { ...optionData, groupId: id } });
          keepIds.push(createdOption.id);
        }
      }
      await tx.attributeOption.deleteMany({ where: { groupId: id, id: { notIn: keepIds } } });
    }

    return tx.attributeGroup.findUnique({ where: { id }, include: { options: true } });
  });

  await audit(req, { action: 'UPDATE', entity: 'AttributeGroup', entityId: id, before: normalize(existing), after: normalize(updated), details: { optionCount: updated.options.length } });
  return updated;
}

async function deleteAttributeGroup(id, req) {
  const existing = await prisma.attributeGroup.findUnique({
    where: { id },
    include: { options: { include: { _count: { select: { businessAttributes: true } } } } },
  });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Attribute group not found');
  if (existing.options.some((option) => option._count.businessAttributes > 0)) {
    throw new AppError(409, 'ATTRIBUTE_GROUP_IN_USE', 'Attribute group has options used by businesses and cannot be deleted');
  }
  await prisma.attributeGroup.delete({ where: { id } });
  await audit(req, { action: 'DELETE', entity: 'AttributeGroup', entityId: id, before: normalize(existing) });
}

async function getNextDisplayOrder(serviceTypeId) {
  const where = serviceTypeId ? { serviceTypeId: Number(serviceTypeId) } : {};
  const aggregate = await prisma.attributeGroup.aggregate({ where, _max: { displayOrder: true } });
  return (aggregate._max.displayOrder || 0) + 10;
}

module.exports = {
  listAttributeGroups,
  getAttributeGroupById,
  createAttributeGroup,
  updateAttributeGroup,
  deleteAttributeGroup,
  getNextDisplayOrder,
};
