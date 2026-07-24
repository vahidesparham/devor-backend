const { z } = require('zod');

const keySchema = z.string().trim().toLowerCase().min(2).max(80).regex(/^[a-z0-9_-]+$/);
const slugSchema = z.string().trim().toLowerCase().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const nullableString = (max) => z.preprocess(
  (value) => (value === '' ? null : value),
  z.string().trim().max(max).nullable().optional(),
);
const nullablePositiveInt = z.preprocess((value) => {
  if (value === undefined || value === '' || value === null) return null;
  return value;
}, z.coerce.number().int().positive().nullable().optional());
const optionalBoolean = z.preprocess((value) => {
  if (value === undefined || value === '') return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}, z.boolean()).optional();
const postingFeeSchema = z.coerce.number().finite().min(0).max(999999999999.99);

const baseBodySchema = z.object({
  parentId: nullablePositiveInt,
  code: keySchema,
  slug: slugSchema,
  title: z.string().trim().min(2).max(160),
  description: nullableString(500),
  image: nullableString(500),
  color: nullableString(30),
  displayOrder: z.coerce.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
  allowAds: z.boolean().optional().default(true),
  postingFee: postingFeeSchema.optional().default(0),
});

const createClassifiedCategorySchema = baseBodySchema;
const updateClassifiedCategorySchema = baseBodySchema.partial().superRefine((data, ctx) => {
  if (Object.keys(data).length === 0) {
    ctx.addIssue({ code: 'custom', message: 'At least one field is required for update' });
  }
});

const listClassifiedCategoriesSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(500).optional().default(50),
  q: z.string().trim().max(255).optional(),
  parentId: nullablePositiveInt,
  rootOnly: optionalBoolean,
  isActive: optionalBoolean,
  allowAds: optionalBoolean,
  sortBy: z.enum(['id', 'code', 'slug', 'title', 'displayOrder', 'createdAt', 'updatedAt']).optional().default('displayOrder'),
  sortDir: z.enum(['asc', 'desc']).optional().default('asc'),
});

const categoryOptionsSchema = z.object({
  excludeId: nullablePositiveInt,
  activeOnly: optionalBoolean,
});

const nextDisplayOrderSchema = z.object({
  parentId: nullablePositiveInt,
});

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

module.exports = {
  categoryOptionsSchema,
  createClassifiedCategorySchema,
  idParamSchema,
  listClassifiedCategoriesSchema,
  nextDisplayOrderSchema,
  updateClassifiedCategorySchema,
};
