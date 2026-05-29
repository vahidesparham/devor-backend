const bcrypt = require('bcryptjs');
const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const { audit } = require('../../shared/audit/audit');

function normalize(item) {
  return {
    id: item.id,
    businessId: item.businessId,
    email: item.email,
    phone: item.phone,
    firstName: item.firstName,
    lastName: item.lastName,
    role: item.role,
    isActive: item.isActive,
  };
}

function mapBusinessUser(item) {
  return {
    id: item.id,
    businessId: item.businessId,
    email: item.email,
    phone: item.phone,
    firstName: item.firstName,
    lastName: item.lastName,
    role: item.role,
    isActive: item.isActive,
    business: item.business || undefined,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

async function assertBusiness(id) {
  const business = await prisma.business.findUnique({
    where: { id },
    select: { id: true, slug: true, translations: { take: 1, orderBy: { lang: 'asc' }, select: { title: true, lang: true } } },
  });
  if (!business) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
      errors: [{ path: 'businessId', message: 'Business not found' }],
    });
  }
  return business;
}

async function listBusinessUsers(query) {
  const page = query.page;
  const pageSize = query.pageSize;
  const skip = (page - 1) * pageSize;
  const where = {};

  if (query.businessId) where.businessId = query.businessId;
  if (query.role) where.role = query.role;
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.q) {
    where.OR = [
      { email: { contains: query.q } },
      { phone: { contains: query.q } },
      { firstName: { contains: query.q } },
      { lastName: { contains: query.q } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.businessUser.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        business: {
          select: {
            id: true,
            slug: true,
            translations: { take: 1, orderBy: { lang: 'asc' }, select: { title: true, lang: true } },
          },
        },
      },
    }),
    prisma.businessUser.count({ where }),
  ]);

  return {
    items: items.map(mapBusinessUser),
    meta: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) },
  };
}

async function getBusinessUserById(id) {
  const item = await prisma.businessUser.findUnique({
    where: { id },
    include: {
      business: {
        select: {
          id: true,
          slug: true,
          translations: { take: 1, orderBy: { lang: 'asc' }, select: { title: true, lang: true } },
        },
      },
    },
  });
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Business user not found');
  return mapBusinessUser(item);
}

async function createBusinessUser(data, req) {
  await assertBusiness(data.businessId);
  const passwordHash = await bcrypt.hash(data.password, 12);

  const created = await prisma.businessUser.create({
    data: {
      businessId: data.businessId,
      email: data.email,
      phone: data.phone ?? null,
      passwordHash,
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      role: data.role || 'STAFF',
      isActive: data.isActive ?? true,
    },
  });

  await audit(req, { action: 'CREATE', entity: 'BusinessUser', entityId: created.id, after: normalize(created) });
  return getBusinessUserById(created.id);
}

async function updateBusinessUser(id, data, req) {
  const existing = await prisma.businessUser.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Business user not found');
  if (data.businessId !== undefined) await assertBusiness(data.businessId);

  const updateData = {};
  if (data.businessId !== undefined) updateData.businessId = data.businessId;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.password !== undefined) updateData.passwordHash = await bcrypt.hash(data.password, 12);

  const updated = await prisma.businessUser.update({ where: { id }, data: updateData });
  await audit(req, { action: 'UPDATE', entity: 'BusinessUser', entityId: id, before: normalize(existing), after: normalize(updated) });
  return getBusinessUserById(id);
}

async function deleteBusinessUser(id, req) {
  const existing = await prisma.businessUser.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Business user not found');
  await prisma.businessUser.delete({ where: { id } });
  await audit(req, { action: 'DELETE', entity: 'BusinessUser', entityId: id, before: normalize(existing) });
}

module.exports = {
  listBusinessUsers,
  getBusinessUserById,
  createBusinessUser,
  updateBusinessUser,
  deleteBusinessUser,
};
