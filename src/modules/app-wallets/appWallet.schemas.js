const { z } = require('zod');

const booleanQuerySchema = z
  .preprocess((val) => {
    if (val === undefined || val === '') return undefined;
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
      if (val.toLowerCase() === 'true') return true;
      if (val.toLowerCase() === 'false') return false;
    }
    return val;
  }, z.boolean())
  .optional();

const walletAmountSchema = z.preprocess(
  (val) => (typeof val === 'string' ? val.replace(/,/g, '') : val),
  z.coerce.number().positive().max(999999999999.99),
);

const listAppWalletsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  q: z.string().trim().max(255).optional(),
  isActive: booleanQuerySchema,
  countryCode: z.string().trim().max(10).optional(),
  sortBy: z.enum(['id', 'phone', 'email', 'firstName', 'lastName', 'createdAt', 'updatedAt']).optional().default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
});

const listWalletTransactionsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  type: z.enum(['CREDIT', 'DEBIT', 'ADJUSTMENT']).optional(),
});

const adjustWalletSchema = z.object({
  type: z.enum(['CREDIT', 'DEBIT']),
  amount: walletAmountSchema,
  reason: z.string().trim().max(160).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
  referenceType: z.string().trim().max(80).optional().nullable(),
  referenceId: z.string().trim().max(120).optional().nullable(),
});

const appUserIdParamSchema = z.object({
  appUserId: z.coerce.number().int().positive(),
});

module.exports = {
  adjustWalletSchema,
  appUserIdParamSchema,
  listAppWalletsSchema,
  listWalletTransactionsSchema,
};
