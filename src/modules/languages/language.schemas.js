const { z } = require('zod');

const codeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(20)
  .regex(/^[a-z0-9-]+$/, 'code must contain only lowercase letters, numbers, and "-"');

const directionSchema = z.enum(['LTR', 'RTL']);

const createLanguageSchema = z.object({
  code: codeSchema,
  name: z.string().trim().min(1).max(100),
  nativeName: z.string().trim().max(100).optional().nullable(),
  direction: directionSchema.optional().default('LTR'),
  isActive: z.boolean().optional().default(true),
  isDefault: z.boolean().optional().default(false)
});

const updateLanguageSchema = z
  .object({
    code: codeSchema.optional(),
    name: z.string().trim().min(1).max(100).optional(),
    nativeName: z.string().trim().max(100).optional().nullable(),
    direction: directionSchema.optional(),
    isActive: z.boolean().optional(),
    isDefault: z.boolean().optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required for update'
  });

const idParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

const listLanguagesQuerySchema = z.object({
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
    .optional(),
  direction: directionSchema.optional(),
  sortBy: z.enum(['id', 'code', 'name', 'direction', 'isActive', 'isDefault', 'createdAt', 'updatedAt']).optional().default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc')
});

module.exports = {
  listLanguagesQuerySchema,
  createLanguageSchema,
  updateLanguageSchema,
  idParamSchema
};

