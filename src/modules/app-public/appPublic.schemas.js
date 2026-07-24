const { z } = require('zod');

const langQuerySchema = z.object({
  lang: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(20)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
});

const contentPageParamSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

const publicBlogListQuerySchema = langQuerySchema.extend({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(16).optional().default(16),
});

const publicBlogPostParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const publicBusinessParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const publicHomeQuerySchema = langQuerySchema.extend({
  featuredLimit: z.coerce.number().int().min(1).max(12).optional().default(8),
  slideshowLimit: z.coerce.number().int().min(1).max(10).optional().default(4),
  bannerLimit: z.coerce.number().int().min(1).max(10).optional().default(4),
  cityId: z.coerce.number().int().positive().optional(),
});

const latitudeSchema = z.coerce.number().min(-90).max(90);
const longitudeSchema = z.coerce.number().min(-180).max(180);
const csvNumberArraySchema = z.preprocess((value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return undefined;
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}, z.array(z.coerce.number().int().positive()).optional());

const csvStringArraySchema = z.preprocess((value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return undefined;
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}, z.array(z.string().trim().min(1).max(80)).optional());

const publicExploreQuerySchema = langQuerySchema.extend({
  north: latitudeSchema.optional(),
  south: latitudeSchema.optional(),
  east: longitudeSchema.optional(),
  west: longitudeSchema.optional(),
  centerLat: latitudeSchema.optional(),
  centerLng: longitudeSchema.optional(),
  cityId: z.coerce.number().int().positive().optional(),
  serviceTypeId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(80).optional().default(50),
});

const publicBusinessListQuerySchema = langQuerySchema.extend({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
  search: z.string().trim().max(120).optional(),
  cityId: z.coerce.number().int().positive().optional(),
  serviceTypeId: z.coerce.number().int().positive().optional(),
  centerLat: latitudeSchema.optional(),
  centerLng: longitudeSchema.optional(),
  sort: z.enum(['default', 'rating_desc', 'nearest', 'newest']).optional().default('default'),
  minRating: z.coerce.number().min(1).max(5).optional(),
  economicLevels: csvStringArraySchema,
  attributeOptionIds: csvNumberArraySchema,
});

const publicBusinessFiltersQuerySchema = langQuerySchema.extend({
  serviceTypeId: z.coerce.number().int().positive().optional(),
});

const publicBusinessReviewListQuerySchema = langQuerySchema.extend({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(10),
});

const publicBusinessDetailQuerySchema = langQuerySchema;

const publicFavoriteBusinessListQuerySchema = langQuerySchema.extend({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
});

const publicMyReviewListQuerySchema = langQuerySchema.extend({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
});

const publicWalletTransactionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
  type: z.enum(['CREDIT', 'DEBIT', 'ADJUSTMENT']).optional(),
});

const createBusinessReviewSchema = z.object({
  rating: z.coerce.number().min(1).max(5),
  comment: z.string().trim().max(1000).optional().nullable(),
});

module.exports = {
  langQuerySchema,
  publicHomeQuerySchema,
  publicExploreQuerySchema,
  publicBusinessListQuerySchema,
  publicBusinessFiltersQuerySchema,
  contentPageParamSchema,
  publicBlogListQuerySchema,
  publicBlogPostParamSchema,
  publicBusinessParamSchema,
  publicBusinessDetailQuerySchema,
  publicBusinessReviewListQuerySchema,
  publicFavoriteBusinessListQuerySchema,
  publicMyReviewListQuerySchema,
  publicWalletTransactionListQuerySchema,
  createBusinessReviewSchema,
};
