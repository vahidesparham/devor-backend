const { z } = require('zod');

const langCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(20)
  .regex(/^[a-z0-9-]+$/, 'lang must contain only lowercase letters, numbers, and "-"');

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

const translationSchema = z.object({
  lang: langCodeSchema,
  question: z.string().trim().min(1).max(500),
  answer: z.string().trim().min(1),
  isActive: z.boolean().optional().default(true),
});

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

const createFaqSchema = z
  .object({
    categoryId: z.coerce.number().int().positive(),
    displayOrder: z.coerce.number().int().min(0).optional().default(0),
    isActive: z.boolean().optional().default(true),
    translations: z.array(translationSchema).min(1),
  })
  .superRefine(validateUniqueLangs);

const updateFaqSchema = z
  .object({
    categoryId: z.coerce.number().int().positive().optional(),
    displayOrder: z.coerce.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
    translations: z.array(translationSchema).min(1).optional(),
  })
  .superRefine((data, ctx) => {
    const hasCore = data.categoryId !== undefined || data.displayOrder !== undefined || data.isActive !== undefined;
    const hasTranslations = Array.isArray(data.translations) && data.translations.length > 0;

    if (!hasCore && !hasTranslations) {
      ctx.addIssue({ code: 'custom', message: 'At least one field is required for update' });
    }

    if (hasTranslations) validateUniqueLangs(data, ctx);
  });

const listFaqsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  q: z.string().trim().max(255).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  isActive: booleanQuerySchema,
  sortBy: z.enum(['id', 'displayOrder', 'createdAt', 'updatedAt']).optional().default('displayOrder'),
  sortDir: z.enum(['asc', 'desc']).optional().default('asc'),
});

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

module.exports = {
  createFaqSchema,
  updateFaqSchema,
  listFaqsSchema,
  idParamSchema,
};
