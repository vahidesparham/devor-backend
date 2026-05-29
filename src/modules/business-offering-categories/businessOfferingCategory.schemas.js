const { z } = require('zod');

const langCodeSchema = z.string().trim().toLowerCase().min(2).max(20).regex(/^[a-z0-9-]+$/);
const nullableString = (max) => z.preprocess((val) => (val === '' ? null : val), z.string().trim().max(max).nullable().optional());

const translationSchema = z.object({
  lang: langCodeSchema,
  title: z.string().trim().min(1).max(160),
  isActive: z.boolean().optional().default(true),
});

const baseBodySchema = z.object({
  businessId: z.coerce.number().int().positive(),
  image: nullableString(500),
  displayOrder: z.coerce.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
  translations: z.array(translationSchema).min(1),
});

function refineTranslations(data, ctx) {
  if (!Array.isArray(data.translations)) return;
  const langs = data.translations.map((item) => item.lang);
  if (langs.length !== new Set(langs).size) {
    ctx.addIssue({ code: 'custom', path: ['translations'], message: 'Each translation language must be unique' });
  }
}

const createBusinessOfferingCategorySchema = baseBodySchema.superRefine(refineTranslations);
const updateBusinessOfferingCategorySchema = baseBodySchema.partial().superRefine((data, ctx) => {
  if (Object.keys(data).length === 0) ctx.addIssue({ code: 'custom', message: 'At least one field is required for update' });
  refineTranslations(data, ctx);
});

const listBusinessOfferingCategoriesSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  q: z.string().trim().max(255).optional(),
  lang: langCodeSchema.optional(),
  businessId: z.coerce.number().int().positive().optional(),
  isActive: z.preprocess((val) => {
    if (val === undefined || val === '') return undefined;
    if (val === 'true') return true;
    if (val === 'false') return false;
    return val;
  }, z.boolean()).optional(),
  sortBy: z.enum(['id', 'title', 'displayOrder', 'createdAt', 'updatedAt']).optional().default('displayOrder'),
  sortDir: z.enum(['asc', 'desc']).optional().default('asc'),
});

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

module.exports = {
  createBusinessOfferingCategorySchema,
  updateBusinessOfferingCategorySchema,
  listBusinessOfferingCategoriesSchema,
  idParamSchema,
};
