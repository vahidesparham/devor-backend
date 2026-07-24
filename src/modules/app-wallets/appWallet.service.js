const { Prisma } = require('../../generated/prisma-client');
const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const { audit } = require('../../shared/audit/audit');
const {
  DEFAULT_CURRENCY,
  ensureWalletForAppUser,
} = require('./appWalletLedger.service');

function toMoney(value) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function fullName(user) {
  return [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
}

function mapAppUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    phone: user.phone,
    countryCode: user.countryCode,
    phoneCode: user.phoneCode,
    avatar: user.avatar,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: fullName(user) || user.phone,
    isActive: user.isActive,
  };
}

function mapWallet(wallet, user = wallet?.appUser) {
  return {
    id: wallet?.id || null,
    appUserId: user?.id || wallet?.appUserId || null,
    balance: toMoney(wallet?.balance),
    currency: wallet?.currency || DEFAULT_CURRENCY,
    transactionCount: wallet?._count?.transactions ?? 0,
    appUser: mapAppUser(user),
    createdAt: wallet?.createdAt || null,
    updatedAt: wallet?.updatedAt || null,
  };
}

function mapTransaction(item) {
  return {
    id: String(item.id),
    walletId: item.walletId,
    appUserId: item.appUserId,
    adminId: item.adminId,
    type: item.type,
    amount: toMoney(item.amount),
    balanceBefore: toMoney(item.balanceBefore),
    balanceAfter: toMoney(item.balanceAfter),
    currency: item.currency,
    reason: item.reason,
    note: item.note,
    referenceType: item.referenceType,
    referenceId: item.referenceId,
    admin: item.admin ? {
      id: item.admin.id,
      email: item.admin.email,
      firstName: item.admin.firstName,
      lastName: item.admin.lastName,
      displayName: fullName(item.admin) || item.admin.email,
    } : null,
    createdAt: item.createdAt,
  };
}

function userWhereFromQuery(query) {
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
  return where;
}

async function listAppWallets(query) {
  const skip = (query.page - 1) * query.pageSize;
  const where = userWhereFromQuery(query);

  const [users, total] = await Promise.all([
    prisma.appUser.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [{ [query.sortBy]: query.sortDir }, { id: 'desc' }],
      include: {
        wallet: { include: { _count: { select: { transactions: true } } } },
      },
    }),
    prisma.appUser.count({ where }),
  ]);

  return {
    items: users.map((user) => mapWallet(user.wallet, user)),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      pageCount: Math.ceil(total / query.pageSize),
    },
  };
}

async function getAppWalletByUserId(appUserId) {
  const wallet = await ensureWalletForAppUser(appUserId);
  const item = await prisma.appWallet.findUnique({
    where: { id: wallet.id },
    include: {
      appUser: true,
      _count: { select: { transactions: true } },
    },
  });
  return mapWallet(item);
}

async function listWalletTransactions(appUserId, query) {
  const wallet = await ensureWalletForAppUser(appUserId);
  const skip = (query.page - 1) * query.pageSize;
  const where = {
    walletId: wallet.id,
    ...(query.type ? { type: query.type } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.appWalletTransaction.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: { admin: { select: { id: true, email: true, firstName: true, lastName: true } } },
    }),
    prisma.appWalletTransaction.count({ where }),
  ]);

  return {
    items: items.map(mapTransaction),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      pageCount: Math.ceil(total / query.pageSize),
    },
  };
}

async function adjustAppWallet(appUserId, data, req) {
  const result = await prisma.$transaction(async (tx) => {
    const wallet = await ensureWalletForAppUser(appUserId, tx);
    const current = await tx.appWallet.findUnique({ where: { id: wallet.id } });
    const amount = new Prisma.Decimal(data.amount);
    const balanceBefore = new Prisma.Decimal(current.balance);
    const delta = data.type === 'DEBIT' ? amount.negated() : amount;
    const balanceAfter = balanceBefore.plus(delta);

    if (balanceAfter.lessThan(0)) {
      throw new AppError(400, 'WALLET_INSUFFICIENT_BALANCE', 'Wallet balance cannot become negative');
    }

    const updatedWallet = await tx.appWallet.update({
      where: { id: wallet.id },
      data: { balance: balanceAfter },
    });

    const transaction = await tx.appWalletTransaction.create({
      data: {
        walletId: wallet.id,
        appUserId: Number(appUserId),
        adminId: req.admin?.id || null,
        type: data.type,
        amount,
        balanceBefore,
        balanceAfter,
        currency: current.currency || DEFAULT_CURRENCY,
        reason: data.reason || null,
        note: data.note || null,
        referenceType: data.referenceType || null,
        referenceId: data.referenceId || null,
      },
      include: { admin: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });

    return { wallet: updatedWallet, transaction };
  });

  await audit(req, {
    action: 'UPDATE',
    entity: 'AppWallet',
    entityId: String(result.wallet.id),
    before: { appUserId: Number(appUserId), balance: toMoney(result.transaction.balanceBefore), currency: result.transaction.currency },
    after: { appUserId: Number(appUserId), balance: toMoney(result.transaction.balanceAfter), currency: result.transaction.currency },
    details: { transactionId: String(result.transaction.id), type: result.transaction.type, amount: toMoney(result.transaction.amount), reason: result.transaction.reason },
  });

  return {
    wallet: await getAppWalletByUserId(appUserId),
    transaction: mapTransaction(result.transaction),
  };
}

async function getPublicWallet(appUserId) {
  const wallet = await ensureWalletForAppUser(appUserId);
  const item = await prisma.appWallet.findUnique({ where: { id: wallet.id } });
  return {
    id: item.id,
    balance: toMoney(item.balance),
    currency: item.currency,
    updatedAt: item.updatedAt,
  };
}

async function listPublicWalletTransactions(appUserId, query) {
  const wallet = await ensureWalletForAppUser(appUserId);
  const skip = (query.page - 1) * query.pageSize;
  const where = {
    walletId: wallet.id,
    ...(query.type ? { type: query.type } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.appWalletTransaction.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    }),
    prisma.appWalletTransaction.count({ where }),
  ]);

  return {
    items: items.map((item) => {
      const mapped = mapTransaction(item);
      return { ...mapped, admin: undefined, adminId: undefined };
    }),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      pageCount: Math.ceil(total / query.pageSize),
    },
  };
}

module.exports = {
  adjustAppWallet,
  getAppWalletByUserId,
  getPublicWallet,
  listAppWallets,
  listPublicWalletTransactions,
  listWalletTransactions,
};
