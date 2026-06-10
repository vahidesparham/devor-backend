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
  title: z.string().trim().min(1).max(255),
  shortDescription: z.string().trim().max(500).optional().nullable(),
  body: z.string().trim().min(1),
  isActive: z.boolean().optional().default(true),
});

function validateUniqueLangs(data, ctx) {
  const langs = (data.translations || []).map((item) => item.lang);
  if (langs.length !== new Set(langs).size) {
    ctx.addIssue({ code: 'custom', path: ['translations'], message: 'Each translation language must be unique' });
  }
}

const createBlogPostSchema = z
  .object({
    image: z.string().trim().max(500).optional().nullable(),
    readingMinutes: z.coerce.number().int().min(1).max(10000).optional().nullable(),
    isActive: z.boolean().optional().default(true),
    translations: z.array(translationSchema).min(1),
  })
  .superRefine(validateUniqueLangs);

const updateBlogPostSchema = z
  .object({
    image: z.string().trim().max(500).optional().nullable(),
    readingMinutes: z.coerce.number().int().min(1).max(10000).optional().nullable(),
    isActive: z.boolean().optional(),
    translations: z.array(translationSchema).min(1).optional(),
  })
  .superRefine((data, ctx) => {
    const hasCore = data.image !== undefined || data.readingMinutes !== undefined || data.isActive !== undefined;
    const hasTranslations = Array.isArray(data.translations) && data.translations.length > 0;
    if (!hasCore && !hasTranslations) {
      ctx.addIssue({ code: 'custom', message: 'At least one field is required for update' });
    }
    if (hasTranslations) validateUniqueLangs(data, ctx);
  });

const listBlogPostsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  q: z.string().trim().max(255).optional(),
  isActive: booleanQuerySchema,
  sortBy: z.enum(['id', 'readingMinutes', 'createdAt', 'updatedAt']).optional().default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
});

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

module.exports = {
  createBlogPostSchema,
  updateBlogPostSchema,
  listBlogPostsSchema,
  idParamSchema,
};
