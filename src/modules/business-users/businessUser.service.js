const bcrypt = require('bcryptjs');
const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const { audit } = require('../../shared/audit/audit');

function normalizeMembership(item) {
  return {
    id: item.id,
    businessId: item.businessId,
    userId: item.userId,
    role: item.role,
    isActive: item.isActive,
  };
}

function normalizeUser(item) {
  return {
    id: item.id,
    email: item.email,
    phone: item.phone,
    firstName: item.firstName,
    lastName: item.lastName,
    isActive: item.isActive,
  };
}

function mapBusinessUserMembership(item) {
  const user = item.user || {};
  return {
    id: item.id,
    businessId: item.businessId,
    userId: item.userId,
    email: user.email,
    phone: user.phone,
    firstName: user.firstName,
    lastName: user.lastName,
    role: item.role,
    isActive: item.isActive,
    accountIsActive: user.isActive,
    business: item.business || undefined,
    user: item.user ? normalizeUser(item.user) : undefined,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function mapBusinessUserAccount(item) {
  return {
    id: item.id,
    email: item.email,
    phone: item.phone,
    firstName: item.firstName,
    lastName: item.lastName,
    isActive: item.isActive,
    memberships: (item.memberships || []).map(mapBusinessUserMembership),
    membershipCount: item._count?.memberships ?? item.memberships?.length ?? 0,
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

function accountInclude() {
  return {
    memberships: {
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        user: { select: { id: true, email: true, phone: true, firstName: true, lastName: true, isActive: true, createdAt: true, updatedAt: true } },
        business: {
          select: {
            id: true,
            slug: true,
            translations: { take: 1, orderBy: { lang: 'asc' }, select: { title: true, lang: true } },
          },
        },
      },
    },
    _count: { select: { memberships: true } },
  };
}

function membershipInclude() {
  return {
    user: { select: { id: true, email: true, phone: true, firstName: true, lastName: true, isActive: true, createdAt: true, updatedAt: true } },
    business: {
      select: {
        id: true,
        slug: true,
        translations: { take: 1, orderBy: { lang: 'asc' }, select: { title: true, lang: true } },
      },
    },
  };
}

async function listBusinessUserAccounts(query) {
  const page = query.page;
  const pageSize = query.pageSize;
  const skip = (page - 1) * pageSize;
  const where = {};

  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.businessId || query.role) {
    where.memberships = {
      some: {
        ...(query.businessId ? { businessId: query.businessId } : {}),
        ...(query.role ? { role: query.role } : {}),
      },
    };
  }
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
      include: accountInclude(),
    }),
    prisma.businessUser.count({ where }),
  ]);

  return {
    items: items.map(mapBusinessUserAccount),
    meta: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) },
  };
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
    where.user = {
      OR: [
        { email: { contains: query.q } },
        { phone: { contains: query.q } },
        { firstName: { contains: query.q } },
        { lastName: { contains: query.q } },
      ],
    };
  }

  const [items, total] = await Promise.all([
    prisma.businessMembership.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: membershipInclude(),
    }),
    prisma.businessMembership.count({ where }),
  ]);

  return {
    items: items.map(mapBusinessUserMembership),
    meta: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) },
  };
}

async function getBusinessUserAccountById(id) {
  const item = await prisma.businessUser.findUnique({
    where: { id },
    include: accountInclude(),
  });
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Business user account not found');
  return mapBusinessUserAccount(item);
}

async function getBusinessUserById(id) {
  const item = await prisma.businessMembership.findUnique({
    where: { id },
    include: membershipInclude(),
  });
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Business member not found');
  return mapBusinessUserMembership(item);
}

async function createBusinessUserAccount(data, req) {
  const existing = await prisma.businessUser.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new AppError(409, 'DUPLICATE_BUSINESS_USER_EMAIL', 'Another business user already uses this email');
  }

  const created = await prisma.businessUser.create({
    data: {
      email: data.email,
      phone: data.phone ?? null,
      passwordHash: await bcrypt.hash(data.password, 12),
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      isActive: data.isActive ?? true,
    },
  });
  await audit(req, { action: 'CREATE', entity: 'BusinessUser', entityId: created.id, after: normalizeUser(created) });
  return getBusinessUserAccountById(created.id);
}

async function createBusinessUser(data, req) {
  await assertBusiness(data.businessId);

  const created = await prisma.$transaction(async (tx) => {
    let user = await tx.businessUser.findUnique({ where: { email: data.email } });
    if (!user) {
      if (!data.password) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
          errors: [{ path: 'password', message: 'Password is required for a new business user' }],
        });
      }
      user = await tx.businessUser.create({
        data: {
          email: data.email,
          phone: data.phone ?? null,
          passwordHash: await bcrypt.hash(data.password, 12),
          firstName: data.firstName ?? null,
          lastName: data.lastName ?? null,
          isActive: true,
        },
      });
    } else {
      const userUpdate = {};
      if (data.phone) userUpdate.phone = data.phone;
      if (data.firstName) userUpdate.firstName = data.firstName;
      if (data.lastName) userUpdate.lastName = data.lastName;
      if (data.password) userUpdate.passwordHash = await bcrypt.hash(data.password, 12);
      if (Object.keys(userUpdate).length) {
        user = await tx.businessUser.update({ where: { id: user.id }, data: userUpdate });
      }
    }

    const existingMembership = await tx.businessMembership.findUnique({
      where: { businessId_userId: { businessId: data.businessId, userId: user.id } },
    });
    if (existingMembership) {
      throw new AppError(409, 'DUPLICATE_BUSINESS_MEMBER', 'This user is already a member of this business');
    }

    return tx.businessMembership.create({
      data: {
        businessId: data.businessId,
        userId: user.id,
        role: data.role || 'STAFF',
        isActive: data.isActive ?? true,
      },
    });
  });

  await audit(req, { action: 'CREATE', entity: 'BusinessMembership', entityId: created.id, after: normalizeMembership(created) });
  return getBusinessUserById(created.id);
}

async function createBusinessMembership(data, req) {
  await assertBusiness(data.businessId);
  const user = await prisma.businessUser.findUnique({ where: { id: data.userId } });
  if (!user) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
      errors: [{ path: 'userId', message: 'Business user account not found' }],
    });
  }

  const existingMembership = await prisma.businessMembership.findUnique({
    where: { businessId_userId: { businessId: data.businessId, userId: data.userId } },
  });
  if (existingMembership) {
    throw new AppError(409, 'DUPLICATE_BUSINESS_MEMBER', 'This user is already a member of this business');
  }

  const created = await prisma.businessMembership.create({
    data: {
      businessId: data.businessId,
      userId: data.userId,
      role: data.role || 'STAFF',
      isActive: data.isActive ?? true,
    },
  });
  await audit(req, { action: 'CREATE', entity: 'BusinessMembership', entityId: created.id, after: normalizeMembership(created) });
  return getBusinessUserById(created.id);
}

async function updateBusinessUserAccount(id, data, req) {
  const existing = await prisma.businessUser.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Business user account not found');

  const updateData = {};
  if (data.email !== undefined) {
    const emailOwner = await prisma.businessUser.findUnique({ where: { email: data.email } });
    if (emailOwner && emailOwner.id !== id) {
      throw new AppError(409, 'DUPLICATE_BUSINESS_USER_EMAIL', 'Another business user already uses this email');
    }
    updateData.email = data.email;
  }
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.password !== undefined) updateData.passwordHash = await bcrypt.hash(data.password, 12);

  const updated = await prisma.businessUser.update({ where: { id }, data: updateData });
  await audit(req, { action: 'UPDATE', entity: 'BusinessUser', entityId: id, before: normalizeUser(existing), after: normalizeUser(updated) });
  return getBusinessUserAccountById(id);
}

async function updateBusinessUser(id, data, req) {
  const existing = await prisma.businessMembership.findUnique({ where: { id }, include: { user: true } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Business member not found');
  if (data.businessId !== undefined) await assertBusiness(data.businessId);

  const updated = await prisma.$transaction(async (tx) => {
    const membershipData = {};
    if (data.businessId !== undefined) membershipData.businessId = data.businessId;
    if (data.role !== undefined) membershipData.role = data.role;
    if (data.isActive !== undefined) membershipData.isActive = data.isActive;

    const userData = {};
    if (data.email !== undefined) {
      const emailOwner = await tx.businessUser.findUnique({ where: { email: data.email } });
      if (emailOwner && emailOwner.id !== existing.userId) {
        throw new AppError(409, 'DUPLICATE_BUSINESS_USER_EMAIL', 'Another business user already uses this email');
      }
      userData.email = data.email;
    }
    if (data.phone !== undefined) userData.phone = data.phone;
    if (data.firstName !== undefined) userData.firstName = data.firstName;
    if (data.lastName !== undefined) userData.lastName = data.lastName;
    if (data.password !== undefined) userData.passwordHash = await bcrypt.hash(data.password, 12);

    if (Object.keys(userData).length) await tx.businessUser.update({ where: { id: existing.userId }, data: userData });
    if (Object.keys(membershipData).length) return tx.businessMembership.update({ where: { id }, data: membershipData });
    return existing;
  });

  await audit(req, {
    action: 'UPDATE',
    entity: 'BusinessMembership',
    entityId: id,
    before: { ...normalizeMembership(existing), user: normalizeUser(existing.user) },
    after: normalizeMembership(updated),
  });
  return getBusinessUserById(id);
}

async function updateBusinessMembership(id, data, req) {
  const existing = await prisma.businessMembership.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Business member not found');
  if (data.businessId !== undefined) await assertBusiness(data.businessId);
  if (data.userId !== undefined) {
    const user = await prisma.businessUser.findUnique({ where: { id: data.userId } });
    if (!user) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
        errors: [{ path: 'userId', message: 'Business user account not found' }],
      });
    }
  }

  const updateData = {};
  const nextBusinessId = data.businessId ?? existing.businessId;
  const nextUserId = data.userId ?? existing.userId;
  if (nextBusinessId !== existing.businessId || nextUserId !== existing.userId) {
    const duplicate = await prisma.businessMembership.findUnique({
      where: { businessId_userId: { businessId: nextBusinessId, userId: nextUserId } },
    });
    if (duplicate && duplicate.id !== id) {
      throw new AppError(409, 'DUPLICATE_BUSINESS_MEMBER', 'This user is already a member of this business');
    }
  }
  if (data.businessId !== undefined) updateData.businessId = data.businessId;
  if (data.userId !== undefined) updateData.userId = data.userId;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const updated = await prisma.businessMembership.update({ where: { id }, data: updateData });
  await audit(req, { action: 'UPDATE', entity: 'BusinessMembership', entityId: id, before: normalizeMembership(existing), after: normalizeMembership(updated) });
  return getBusinessUserById(id);
}

async function deleteBusinessUserAccount(id, req) {
  const existing = await prisma.businessUser.findUnique({ where: { id }, include: { _count: { select: { memberships: true } } } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Business user account not found');
  if (existing._count.memberships > 0) {
    throw new AppError(409, 'BUSINESS_USER_HAS_MEMBERSHIPS', 'Remove this user from all businesses before deleting the account');
  }
  await prisma.businessUser.delete({ where: { id } });
  await audit(req, {
    action: 'DELETE',
    entity: 'BusinessUser',
    entityId: id,
    before: { ...normalizeUser(existing), membershipCount: existing._count.memberships },
  });
}

async function deleteBusinessUser(id, req) {
  const existing = await prisma.businessMembership.findUnique({ where: { id }, include: { user: true } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Business member not found');
  await prisma.businessMembership.delete({ where: { id } });
  await audit(req, {
    action: 'DELETE',
    entity: 'BusinessMembership',
    entityId: id,
    before: { ...normalizeMembership(existing), user: normalizeUser(existing.user) },
  });
}

module.exports = {
  listBusinessUserAccounts,
  listBusinessUsers,
  getBusinessUserAccountById,
  getBusinessUserById,
  createBusinessUserAccount,
  createBusinessUser,
  createBusinessMembership,
  updateBusinessUserAccount,
  updateBusinessUser,
  updateBusinessMembership,
  deleteBusinessUserAccount,
  deleteBusinessUser,
};
