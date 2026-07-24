const { z } = require('zod');

const reportStatusSchema = z.enum(['OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED']);

const listClassifiedReportsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  q: z.string().trim().max(255).optional(),
  status: reportStatusSchema.optional(),
  adId: z.coerce.number().int().positive().optional(),
  reasonCode: z.string().trim().max(80).optional(),
  sortBy: z.enum(['id', 'createdAt', 'updatedAt', 'reviewedAt']).optional().default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
});

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const reviewActionSchema = z.object({
  expectedVersion: z.coerce.number().int().positive(),
  note: z.string().trim().max(1000).optional().nullable(),
}).strict();

const closeActionSchema = z.object({
  expectedVersion: z.coerce.number().int().positive(),
  note: z.string().trim().min(3).max(1000),
}).strict();

module.exports = {
  closeActionSchema,
  idParamSchema,
  listClassifiedReportsSchema,
  reviewActionSchema,
};
