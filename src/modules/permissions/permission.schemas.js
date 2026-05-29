const { z } = require('zod');

const listPermissionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  q: z.string().trim().max(255).optional(),
  sortBy: z.enum(['id', 'key', 'createdAt']).optional().default('key'),
  sortDir: z.enum(['asc', 'desc']).optional().default('asc')
});

module.exports = {
  listPermissionsQuerySchema
};
