const { z } = require('zod');

const langCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(20)
  .regex(/^[a-z0-9-]+$/, 'lang must contain only lowercase letters, numbers, and "-"');

const booleanQuerySchema = z
  .preprocess((value) => {
    if (value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
    }
    return value;
  }, z.boolean())
  .optional();

const translationSchema = z
  .object({
    lang: langCodeSchema,
    title: z.string().trim().min(1).max(160),
    isActive: z.boolean().optional().default(true),
  })
  .strict();

function validateUniqueLangs(data, ctx) {
  const langs = (data.translations || []).map((item) => item.lang);
  if (langs.length !== new Set(langs).size) {
    ctx.addIssue({
      code: 'custom',
      path: ['translations'],
      message: 'Each translation language must be unique',
    });
  }
}

const createEventCategorySchema = z
  .object({
    code: z
      .string()
      .trim()
      .toLowerCase()
      .min(2)
      .max(80)
      .regex(/^[a-z0-9][a-z0-9_-]*$/, 'code must contain only lowercase letters, numbers, "_" and "-"'),
    displayOrder: z.coerce.number().int().min(0).optional().default(0),
    isActive: z.boolean().optional().default(true),
    translations: z.array(translationSchema).min(1),
  })
  .strict()
  .superRefine(validateUniqueLangs);

const updateEventCategorySchema = z
  .object({
    code: z
      .string()
      .trim()
      .toLowerCase()
      .min(2)
      .max(80)
      .regex(/^[a-z0-9][a-z0-9_-]*$/, 'code must contain only lowercase letters, numbers, "_" and "-"')
      .optional(),
    displayOrder: z.coerce.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
    translations: z.array(translationSchema).min(1).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!Object.keys(data).length) {
      ctx.addIssue({ code: 'custom', message: 'At least one field is required for update' });
    }
    if (data.translations) validateUniqueLangs(data, ctx);
  });

const listEventCategoriesSchema = z
  .object({
    page: z.coerce.number().int().min(1).optional().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
    q: z.string().trim().max(160).optional(),
    isActive: booleanQuerySchema,
    sortBy: z.enum(['id', 'code', 'displayOrder', 'createdAt', 'updatedAt']).optional().default('displayOrder'),
    sortDir: z.enum(['asc', 'desc']).optional().default('asc'),
  })
  .strict();

const idParamSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .strict();

module.exports = {
  createEventCategorySchema,
  updateEventCategorySchema,
  listEventCategoriesSchema,
  idParamSchema,
};
