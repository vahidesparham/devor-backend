const { z } = require('zod');

const langCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(20)
  .regex(/^[a-z0-9-]+$/, 'lang must contain only lowercase letters, numbers, and "-"');

const nullable500 = z.string().trim().max(500).optional().nullable();

const coerceNullableDate = z.preprocess((val) => {
  if (val === undefined) return undefined;
  if (val === null || val === '') return null;
  return val;
}, z.coerce.date().nullable());

const slideshowTranslationSchema = z.object({
  lang: langCodeSchema,
  title: z.string().trim().min(1).max(255),
  link: nullable500,
  image: z.string().trim().min(1).max(500),
  isActive: z.boolean().optional().default(true),
});

const createSlideshowSchema = z
  .object({
    fromDate: coerceNullableDate.optional(),
    toDate: coerceNullableDate.optional(),
    translations: z.array(slideshowTranslationSchema).min(1),
  })
  .superRefine((data, ctx) => {
    const langs = data.translations.map((item) => item.lang);
    const uniqueLangs = new Set(langs);
    if (langs.length !== uniqueLangs.size) {
      ctx.addIssue({
        code: 'custom',
        path: ['translations'],
        message: 'Each translation language must be unique',
      });
    }

    if (data.fromDate && data.toDate && data.toDate < data.fromDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['toDate'],
        message: 'toDate must be greater than or equal to fromDate',
      });
    }
  });

const updateSlideshowSchema = z
  .object({
    fromDate: coerceNullableDate.optional(),
    toDate: coerceNullableDate.optional(),
    translations: z.array(slideshowTranslationSchema).min(1).optional(),
  })
  .superRefine((data, ctx) => {
    const hasCore = data.fromDate !== undefined || data.toDate !== undefined;
    const hasTranslations = Array.isArray(data.translations) && data.translations.length > 0;

    if (!hasCore && !hasTranslations) {
      ctx.addIssue({
        code: 'custom',
        message: 'At least one field is required for update',
      });
    }

    if (hasTranslations) {
      const langs = data.translations.map((item) => item.lang);
      const uniqueLangs = new Set(langs);
      if (langs.length !== uniqueLangs.size) {
        ctx.addIssue({
          code: 'custom',
          path: ['translations'],
          message: 'Each translation language must be unique',
        });
      }
    }

    const nextFrom = data.fromDate;
    const nextTo = data.toDate;
    if (nextFrom !== undefined && nextTo !== undefined && nextFrom && nextTo && nextTo < nextFrom) {
      ctx.addIssue({
        code: 'custom',
        path: ['toDate'],
        message: 'toDate must be greater than or equal to fromDate',
      });
    }
  });

const listSlideshowsSchema = z.object({
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
  activeAt: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    return val;
  }, z.coerce.date()).optional(),
  sortBy: z.enum(['id', 'fromDate', 'toDate', 'createdAt', 'updatedAt']).optional().default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
});

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

module.exports = {
  createSlideshowSchema,
  updateSlideshowSchema,
  listSlideshowsSchema,
  idParamSchema,
};
