const { z } = require('zod');

const booleanQuerySchema = z
  .preprocess((val) => {
    if (val === undefined) return undefined;
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
      if (val.toLowerCase() === 'true') return true;
      if (val.toLowerCase() === 'false') return false;
    }
    return val;
  }, z.boolean())
  .optional();

const optionalText = (max) => z.string().trim().max(max).optional().nullable();

const listAppUsersSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  q: z.string().trim().max(255).optional(),
  isActive: booleanQuerySchema,
  countryCode: z.string().trim().max(10).optional(),
  sortBy: z.enum(['id', 'phone', 'email', 'firstName', 'lastName', 'createdAt', 'updatedAt']).optional().default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
});

const updateAppUserSchema = z
  .object({
    avatar: optionalText(500),
    email: optionalText(191),
    firstName: optionalText(100),
    lastName: optionalText(100),
    isActive: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (!Object.keys(data).some((key) => data[key] !== undefined)) {
      ctx.addIssue({ code: 'custom', message: 'At least one field is required for update' });
    }
  });

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

module.exports = {
  listAppUsersSchema,
  updateAppUserSchema,
  idParamSchema,
};
