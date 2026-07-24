const { z } = require('zod');

const adStatusSchema = z.enum([
  'DRAFT',
  'PENDING_REVIEW',
  'PUBLISHED',
  'REJECTED',
  'PAUSED',
  'SOLD',
  'EXPIRED',
  'ARCHIVED',
  'SUSPENDED',
]);

const optionalDate = z.preprocess(
  (value) => (value === undefined || value === '' ? undefined : value),
  z.coerce.date().optional(),
);

const listClassifiedAdsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  q: z.string().trim().max(255).optional(),
  status: adStatusSchema.optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  cityId: z.coerce.number().int().positive().optional(),
  appUserId: z.coerce.number().int().positive().optional(),
  ownerType: z.enum(['APP_USER', 'BUSINESS']).optional(),
  reportState: z.enum(['OPEN', 'ANY', 'NONE']).optional(),
  submittedFrom: optionalDate,
  submittedTo: optionalDate,
  sortBy: z.enum([
    'id',
    'createdAt',
    'updatedAt',
    'submittedAt',
    'publishedAt',
    'expiresAt',
    'viewCount',
    'reportCount',
  ]).optional().default('submittedAt'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
});

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const baseActionSchema = z.object({
  expectedVersion: z.coerce.number().int().positive(),
  note: z.string().trim().max(1000).optional().nullable(),
}).strict();

const approveSchema = baseActionSchema;
const rejectSchema = baseActionSchema.superRefine((data, ctx) => {
  if (!data.note || data.note.length < 3) {
    ctx.addIssue({ code: 'custom', path: ['note'], message: 'A rejection reason of at least 3 characters is required' });
  }
});
const suspendSchema = baseActionSchema.superRefine((data, ctx) => {
  if (!data.note || data.note.length < 3) {
    ctx.addIssue({ code: 'custom', path: ['note'], message: 'A suspension reason of at least 3 characters is required' });
  }
});
const restoreSchema = baseActionSchema;
const archiveSchema = baseActionSchema;

module.exports = {
  approveSchema,
  archiveSchema,
  idParamSchema,
  listClassifiedAdsSchema,
  rejectSchema,
  restoreSchema,
  suspendSchema,
};
