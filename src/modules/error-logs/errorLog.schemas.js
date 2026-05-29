const { z } = require('zod');

const listErrorLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  q: z.string().trim().max(255).optional(),
  adminId: z.coerce.number().int().positive().optional(),
  statusCode: z.coerce.number().int().min(100).max(599).optional(),
  code: z.string().trim().max(120).optional(),
  method: z.string().trim().max(10).optional(),
  sortBy: z.enum(['id', 'createdAt', 'statusCode', 'code', 'adminId']).optional().default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
});

const idParamSchema = z.object({
  id: z.string().trim().min(1),
});

module.exports = {
  listErrorLogsQuerySchema,
  idParamSchema,
};
