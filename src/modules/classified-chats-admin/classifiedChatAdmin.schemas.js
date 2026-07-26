const { z } = require('zod');

const listSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  q: z.string().trim().max(120).optional(),
  status: z.enum(['ACTIVE', 'BLOCKED', 'CLOSED']).optional(),
});

const idSchema = z.object({
  id: z.coerce.bigint().positive(),
});

const blockSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

module.exports = {
  blockSchema,
  idSchema,
  listSchema,
};
