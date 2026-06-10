const { z } = require('zod');

const langCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(20)
  .regex(/^[a-z0-9-]+$/, 'lang must contain only lowercase letters, numbers, and "-"');

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must contain lowercase letters, numbers and hyphens');

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
  title: z.string().trim().min(1).max(255),
  body: z.string().trim().min(1),
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

const createContentPageSchema = z
  .object({
    slug: slugSchema,
    image: z.string().trim().max(500).optional().nullable(),
    isActive: z.boolean().optional().default(true),
    translations: z.array(translationSchema).min(1),
  })
  .superRefine(validateUniqueLangs);

const updateContentPageSchema = z
  .object({
    slug: slugSchema.optional(),
    image: z.string().trim().max(500).optional().nullable(),
    isActive: z.boolean().optional(),
    translations: z.array(translationSchema).min(1).optional(),
  })
  .superRefine((data, ctx) => {
    const hasCore = data.slug !== undefined || data.image !== undefined || data.isActive !== undefined;
    const hasTranslations = Array.isArray(data.translations) && data.translations.length > 0;

    if (!hasCore && !hasTranslations) {
      ctx.addIssue({ code: 'custom', message: 'At least one field is required for update' });
    }

    if (hasTranslations) validateUniqueLangs(data, ctx);
  });

const listContentPagesSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  q: z.string().trim().max(255).optional(),
  isActive: booleanQuerySchema,
  sortBy: z.enum(['id', 'slug', 'createdAt', 'updatedAt']).optional().default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
});

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

module.exports = {
  createContentPageSchema,
  updateContentPageSchema,
  listContentPagesSchema,
  idParamSchema,
};
