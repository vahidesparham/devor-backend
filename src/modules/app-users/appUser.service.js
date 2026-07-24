const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const { audit } = require('../../shared/audit/audit');

function fullName(item) {
  return [item.firstName, item.lastName].filter(Boolean).join(' ').trim();
}

function mapAppUser(item) {
  const wallet = item.wallet || null;
  return {
    id: item.id,
    phone: item.phone,
    countryCode: item.countryCode,
    phoneCode: item.phoneCode,
    avatar: item.avatar,
    email: item.email,
    firstName: item.firstName,
    lastName: item.lastName,
    displayName: fullName(item) || item.phone,
    isActive: item.isActive,
    wallet: wallet ? {
      id: wallet.id,
      balance: Number(wallet.balance || 0),
      currency: wallet.currency,
      transactionCount: wallet._count?.transactions ?? 0,
      updatedAt: wallet.updatedAt,
    } : {
      id: null,
      balance: 0,
      currency: 'TJS',
      transactionCount: 0,
      updatedAt: null,
    },
    refreshTokenCount: item._count?.refreshTokens ?? 0,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function normalizeCore(item) {
  return {
    phone: item.phone,
    countryCode: item.countryCode,
    phoneCode: item.phoneCode,
    avatar: item.avatar,
    email: item.email,
    firstName: item.firstName,
    lastName: item.lastName,
    isActive: item.isActive,
  };
}

async function listAppUsers(query) {
  const skip = (query.page - 1) * query.pageSize;
  const where = {};

  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.countryCode) where.countryCode = query.countryCode;
  if (query.q) {
    where.OR = [
      { phone: { contains: query.q } },
      { email: { contains: query.q } },
      { firstName: { contains: query.q } },
      { lastName: { contains: query.q } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.appUser.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [{ [query.sortBy]: query.sortDir }, { id: 'desc' }],
      include: {
        wallet: { include: { _count: { select: { transactions: true } } } },
        _count: { select: { refreshTokens: true } },
      },
    }),
    prisma.appUser.count({ where }),
  ]);

  return {
    items: items.map(mapAppUser),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      pageCount: Math.ceil(total / query.pageSize),
    },
  };
}

async function getAppUserById(id) {
  const item = await prisma.appUser.findUnique({
    where: { id },
    include: {
      wallet: { include: { _count: { select: { transactions: true } } } },
      _count: { select: { refreshTokens: true } },
    },
  });
  if (!item) throw new AppError(404, 'NOT_FOUND', 'App user not found');
  return mapAppUser(item);
}

async function createAppUser(data, req) {
  const phone = data.phone.trim();
  const email = data.email ? data.email.trim().toLowerCase() : null;

  const existingPhone = await prisma.appUser.findUnique({ where: { phone } });
  if (existingPhone) {
    throw new AppError(409, 'DUPLICATE_APP_USER_PHONE', 'Another app user already uses this phone');
  }

  if (email) {
    const existingEmail = await prisma.appUser.findUnique({ where: { email } });
    if (existingEmail) {
      throw new AppError(409, 'DUPLICATE_APP_USER_EMAIL', 'Another app user already uses this email');
    }
  }

  const created = await prisma.appUser.create({
    data: {
      phone,
      countryCode: data.countryCode || null,
      phoneCode: data.phoneCode || null,
      avatar: data.avatar || null,
      email,
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      isActive: data.isActive ?? true,
      wallet: { create: { currency: 'TJS' } },
    },
    include: {
      wallet: { include: { _count: { select: { transactions: true } } } },
      _count: { select: { refreshTokens: true } },
    },
  });

  await audit(req, {
    action: 'CREATE',
    entity: 'AppUser',
    entityId: created.id,
    before: null,
    after: normalizeCore(created),
  });

  return mapAppUser(created);
}

async function updateAppUser(id, data, req) {
  const existing = await prisma.appUser.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'App user not found');

  const updateData = {};
  if (data.avatar !== undefined) updateData.avatar = data.avatar || null;
  if (data.firstName !== undefined) updateData.firstName = data.firstName || null;
  if (data.lastName !== undefined) updateData.lastName = data.lastName || null;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.email !== undefined) {
    const nextEmail = data.email || null;
    if (nextEmail) {
      const owner = await prisma.appUser.findUnique({ where: { email: nextEmail } });
      if (owner && owner.id !== id) {
        throw new AppError(409, 'DUPLICATE_APP_USER_EMAIL', 'Another app user already uses this email');
      }
    }
    updateData.email = nextEmail;
  }

  const updated = await prisma.appUser.update({ where: { id }, data: updateData });
  await audit(req, {
    action: 'UPDATE',
    entity: 'AppUser',
    entityId: id,
    before: normalizeCore(existing),
    after: normalizeCore(updated),
  });
  return getAppUserById(id);
}

module.exports = {
  listAppUsers,
  getAppUserById,
  createAppUser,
  updateAppUser,
};
