const { z } = require('zod');

const roleNameSchema = z
  .string()
  .trim()
  .min(2)
  .max(191)
  .regex(/^[A-Za-z0-9_\-]+$/, 'name must contain letters, numbers, _ or -');

const textSchema = z.string().trim().min(1).max(255).optional().nullable();

const permissionIdsSchema = z
  .array(z.coerce.number().int().positive())
  .optional()
  .superRefine((arr, ctx) => {
    if (!arr) return;
    const unique = new Set(arr);
    if (unique.size !== arr.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'permissionIds must be unique'
      });
    }
  });

const createRoleSchema = z.object({
  name: roleNameSchema,
  title: z.string().trim().max(120).optional().nullable(),
  icon: z.string().trim().max(120).optional().nullable(),
  color: z.string().trim().max(30).optional().nullable(),
  description: textSchema,
  permissionIds: permissionIdsSchema
});

const updateRoleSchema = z
  .object({
    name: roleNameSchema.optional(),
    title: z.string().trim().max(120).optional().nullable(),
    icon: z.string().trim().max(120).optional().nullable(),
    color: z.string().trim().max(30).optional().nullable(),
    description: textSchema,
    permissionIds: permissionIdsSchema
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required for update'
  });

const idParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

const listRolesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  q: z.string().trim().max(255).optional(),
  sortBy: z.enum(['id', 'name', 'title', 'createdAt', 'updatedAt']).optional().default('name'),
  sortDir: z.enum(['asc', 'desc']).optional().default('asc')
});

module.exports = {
  listRolesQuerySchema,
  createRoleSchema,
  updateRoleSchema,
  idParamSchema
};
