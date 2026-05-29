const { z } = require('zod');

const optionalText = z.string().trim().min(1).max(100).optional().nullable();

const avatarSchema = z.string().trim().max(500).optional().nullable();

const roleIdsSchema = z
  .array(z.coerce.number().int().positive())
  .optional()
  .superRefine((arr, ctx) => {
    if (!arr) return;
    const unique = new Set(arr);
    if (unique.size !== arr.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'roleIds must be unique'
      });
    }
  });

const createAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(100),
  firstName: optionalText,
  lastName: optionalText,
  avatar: avatarSchema,
  isActive: z.boolean().optional().default(true),
  roleIds: roleIdsSchema
});

const updateAdminSchema = z
  .object({
    email: z.string().email().optional(),
    password: z.string().min(6).max(100).optional(),
    firstName: optionalText,
    lastName: optionalText,
    avatar: avatarSchema,
    isActive: z.boolean().optional(),
    roleIds: roleIdsSchema
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required for update'
  });

const idParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

const listAdminsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  q: z.string().trim().max(255).optional(),
  isActive: z
    .preprocess((val) => {
      if (val === undefined) return undefined;
      if (typeof val === 'boolean') return val;
      if (typeof val === 'string') {
        if (val.toLowerCase() === 'true') return true;
        if (val.toLowerCase() === 'false') return false;
      }
      return val;
    }, z.boolean())
    .optional()
});

module.exports = {
  listAdminsQuerySchema,
  createAdminSchema,
  updateAdminSchema,
  idParamSchema
};
