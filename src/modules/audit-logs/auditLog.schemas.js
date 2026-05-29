const { z } = require('zod');

const listAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  q: z.string().trim().max(255).optional(),
  adminId: z.coerce.number().int().positive().optional(),
  action: z.enum(['CREATE', 'UPDATE', 'DELETE', 'BULK', 'LOGIN', 'LOGOUT', 'REFRESH']).optional(),
  entity: z.string().trim().max(120).optional(),
  sortBy: z.enum(['id', 'createdAt', 'action', 'entity', 'adminId']).optional().default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
});

const idParamSchema = z.object({
  id: z.string().trim().min(1),
});

module.exports = {
  listAuditLogsQuerySchema,
  idParamSchema,
};
