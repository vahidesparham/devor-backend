const { z } = require('zod');

const langCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(20)
  .regex(/^[a-z0-9-]+$/, 'lang must contain only lowercase letters, numbers, and "-"')
  .optional();

const booleanQuerySchema = z
  .preprocess((value) => {
    if (value === undefined || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
    }
    return value;
  }, z.boolean())
  .optional();

const optionalDateSchema = z.preprocess(
  (value) => (value === undefined || value === null || value === '' ? undefined : value),
  z.coerce.date().optional(),
);

const publicEventCategoryListSchema = z
  .object({
    lang: langCodeSchema,
  })
  .strict();

const publicEventListSchema = z
  .object({
    lang: langCodeSchema,
    page: z.coerce.number().int().min(1).optional().default(1),
    pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
    q: z.string().trim().min(1).max(120).optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    cityId: z.coerce.number().int().positive().optional(),
    areaId: z.coerce.number().int().positive().optional(),
    startFrom: optionalDateSchema,
    startTo: optionalDateSchema,
    priceType: z.enum(['FREE', 'PAID']).optional(),
    isFeatured: booleanQuerySchema,
    sort: z.enum(['upcoming', 'newest']).optional().default('upcoming'),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.startFrom && data.startTo && data.startTo < data.startFrom) {
      ctx.addIssue({
        code: 'custom',
        path: ['startTo'],
        message: 'startTo must not be earlier than startFrom',
      });
    }
  });

const publicEventParamSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .strict();

const publicEventDetailQuerySchema = z
  .object({
    lang: langCodeSchema,
  })
  .strict();

module.exports = {
  publicEventCategoryListSchema,
  publicEventListSchema,
  publicEventParamSchema,
  publicEventDetailQuerySchema,
};
