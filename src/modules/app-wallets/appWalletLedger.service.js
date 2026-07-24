const { Prisma } = require('../../generated/prisma-client');
const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');

const DEFAULT_CURRENCY = 'TJS';

async function ensureWalletForAppUser(appUserId, tx = prisma) {
  const userId = Number(appUserId);
  const user = await tx.appUser.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) throw new AppError(404, 'APP_USER_NOT_FOUND', 'App user not found');

  return tx.appWallet.upsert({
    where: { appUserId: userId },
    update: {},
    create: { appUserId: userId, currency: DEFAULT_CURRENCY },
  });
}

async function debitAppWallet(tx, {
  appUserId,
  amount,
  currency,
  reason,
  note,
  referenceType,
  referenceId,
}) {
  const userId = Number(appUserId);
  const debitAmount = new Prisma.Decimal(amount);
  if (!debitAmount.isPositive()) {
    throw new AppError(500, 'WALLET_DEBIT_AMOUNT_INVALID', 'Wallet debit amount must be positive');
  }

  const wallet = await ensureWalletForAppUser(userId, tx);
  if (wallet.currency !== currency) {
    throw new AppError(409, 'WALLET_CURRENCY_MISMATCH', 'Wallet currency does not match the required payment currency', {
      details: { walletCurrency: wallet.currency, requiredCurrency: currency },
    });
  }

  const debited = await tx.appWallet.updateMany({
    where: {
      id: wallet.id,
      currency,
      balance: { gte: debitAmount },
    },
    data: { balance: { decrement: debitAmount } },
  });

  if (debited.count !== 1) {
    const current = await tx.appWallet.findUnique({ where: { id: wallet.id } });
    throw new AppError(409, 'WALLET_INSUFFICIENT_BALANCE', 'Wallet balance is insufficient for this payment', {
      details: {
        requiredAmount: Number(debitAmount),
        availableBalance: Number(current?.balance || 0),
        currency,
      },
    });
  }

  const updatedWallet = await tx.appWallet.findUnique({ where: { id: wallet.id } });
  const balanceAfter = new Prisma.Decimal(updatedWallet.balance);
  const balanceBefore = balanceAfter.plus(debitAmount);
  const transaction = await tx.appWalletTransaction.create({
    data: {
      walletId: wallet.id,
      appUserId: userId,
      adminId: null,
      type: 'DEBIT',
      amount: debitAmount,
      balanceBefore,
      balanceAfter,
      currency,
      reason: reason || null,
      note: note || null,
      referenceType: referenceType || null,
      referenceId: referenceId || null,
    },
  });

  return { wallet: updatedWallet, transaction };
}

module.exports = {
  DEFAULT_CURRENCY,
  debitAppWallet,
  ensureWalletForAppUser,
};
