const { z } = require('zod');

const statusSchema = z.enum([
  'DRAFT',
  'PENDING_REVIEW',
  'PUBLISHED',
  'REJECTED',
  'PAUSED',
  'SOLD',
  'EXPIRED',
  'ARCHIVED',
  'SUSPENDED',
]);
const priceTypeSchema = z.enum(['FIXED', 'NEGOTIABLE', 'FREE', 'CONTACT']);
const reportReasonSchema = z.enum([
  'MISLEADING',
  'PROHIBITED',
  'FRAUD',
  'DUPLICATE',
  'UNAVAILABLE',
  'OTHER',
]);
const nullablePositiveInt = z.preprocess((value) => {
  if (value === undefined || value === '' || value === null) return null;
  return value;
}, z.coerce.number().int().positive().nullable());
const nullableNumber = z.preprocess((value) => {
  if (value === undefined || value === '' || value === null) return null;
  return value;
}, z.coerce.number().finite().nullable());
const nullableString = (max) => z.preprocess(
  (value) => (value === '' || value === null ? null : value),
  z.string().trim().max(max).nullable().optional(),
);
const optionalBoolean = z.preprocess((value) => {
  if (value === undefined || value === '') return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}, z.boolean()).optional();

const locationShape = {
  countryId: z.coerce.number().int().positive(),
  cityId: z.coerce.number().int().positive(),
  areaId: z.coerce.number().int().positive(),
  latitude: nullableNumber.optional(),
  longitude: nullableNumber.optional(),
  locationPrecision: z.enum(['APPROXIMATE', 'EXACT']).optional().default('APPROXIMATE'),
};

function refineCoordinates(data, ctx) {
  const hasLatitude = data.latitude != null;
  const hasLongitude = data.longitude != null;
  if (hasLatitude !== hasLongitude) {
    ctx.addIssue({
      code: 'custom',
      path: [hasLatitude ? 'longitude' : 'latitude'],
      message: 'Latitude and longitude must be provided together',
    });
  }
  if (hasLatitude && (data.latitude < -90 || data.latitude > 90)) {
    ctx.addIssue({ code: 'custom', path: ['latitude'], message: 'Latitude must be between -90 and 90' });
  }
  if (hasLongitude && (data.longitude < -180 || data.longitude > 180)) {
    ctx.addIssue({ code: 'custom', path: ['longitude'], message: 'Longitude must be between -180 and 180' });
  }
}

const createAdSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
  ...locationShape,
  title: z.string().trim().max(120).optional().default(''),
  description: z.string().trim().max(10000).optional().default(''),
  priceType: priceTypeSchema.optional().default('CONTACT'),
  price: nullableNumber.optional(),
  contactName: nullableString(120),
  contactPhone: z.string().trim().max(80).optional(),
  allowPhone: z.boolean().optional(),
  allowChat: z.boolean().optional().default(false),
}).strict().superRefine(refineCoordinates);

const updateAdSchema = z.object({
  expectedVersion: z.coerce.number().int().positive(),
  categoryId: z.coerce.number().int().positive().optional(),
  countryId: z.coerce.number().int().positive().optional(),
  cityId: z.coerce.number().int().positive().optional(),
  areaId: z.coerce.number().int().positive().optional(),
  title: z.string().trim().max(120).optional(),
  description: z.string().trim().max(10000).optional(),
  priceType: priceTypeSchema.optional(),
  price: nullableNumber.optional(),
  contactName: nullableString(120),
  contactPhone: z.string().trim().max(80).optional(),
  allowPhone: z.boolean().optional(),
  allowChat: z.boolean().optional(),
  latitude: nullableNumber.optional(),
  longitude: nullableNumber.optional(),
  locationPrecision: z.enum(['APPROXIMATE', 'EXACT']).optional(),
}).strict().superRefine((data, ctx) => {
  if (Object.keys(data).length === 1) {
    ctx.addIssue({ code: 'custom', message: 'At least one ad field is required for update' });
  }
  refineCoordinates(data, ctx);
});

const listMyAdsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
  q: z.string().trim().max(255).optional(),
  status: statusSchema.optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'submittedAt', 'publishedAt', 'expiresAt']).optional().default('updatedAt'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
});

const csvPositiveIntArraySchema = z.preprocess((value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return undefined;
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}, z.array(z.coerce.number().int().positive()).max(100).optional());

const publicAttributeFilterSchema = z.object({
  attributeId: z.coerce.number().int().positive(),
  optionIds: z.array(z.coerce.number().int().positive()).min(1).max(100).optional(),
  minNumber: z.coerce.number().finite().optional(),
  maxNumber: z.coerce.number().finite().optional(),
  booleanValue: z.boolean().optional(),
}).strict().superRefine((data, ctx) => {
  const hasOptions = data.optionIds !== undefined;
  const hasNumber = data.minNumber !== undefined || data.maxNumber !== undefined;
  const hasBoolean = data.booleanValue !== undefined;
  if ([hasOptions, hasNumber, hasBoolean].filter(Boolean).length !== 1) {
    ctx.addIssue({
      code: 'custom',
      message: 'Each attribute filter must contain exactly one value type',
    });
  }
  if (
    data.minNumber !== undefined
    && data.maxNumber !== undefined
    && data.minNumber > data.maxNumber
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['maxNumber'],
      message: 'Maximum value must be greater than or equal to minimum value',
    });
  }
});

const publicAttributeFiltersSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch (_) {
    return value;
  }
}, z.array(publicAttributeFilterSchema).max(30).optional());

const publicAdListSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
  categoryId: z.coerce.number().int().positive().optional(),
  cityId: z.coerce.number().int().positive().optional(),
  areaIds: csvPositiveIntArraySchema,
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  attributeFilters: publicAttributeFiltersSchema,
}).superRefine((data, ctx) => {
  if (
    data.minPrice !== undefined
    && data.maxPrice !== undefined
    && data.minPrice > data.maxPrice
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['maxPrice'],
      message: 'Maximum price must be greater than or equal to minimum price',
    });
  }
  if (data.attributeFilters?.length && !data.categoryId) {
    ctx.addIssue({
      code: 'custom',
      path: ['categoryId'],
      message: 'A category is required when filtering by classified attributes',
    });
  }
  const attributeIds = (data.attributeFilters || []).map((item) => item.attributeId);
  if (attributeIds.length !== new Set(attributeIds).size) {
    ctx.addIssue({
      code: 'custom',
      path: ['attributeFilters'],
      message: 'Each classified attribute can be filtered only once',
    });
  }
});
const favoriteAdListSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
});
const publicCategoryListSchema = z.object({
  parentId: z.coerce.number().int().positive().optional(),
});

const attributeValueSchema = z.object({
  attributeId: z.coerce.number().int().positive(),
  optionIds: z.array(z.coerce.number().int().positive()).max(100).optional(),
  textValue: z.preprocess(
    (value) => (value === null ? null : value),
    z.string().trim().max(10000).nullable().optional(),
  ),
  numberValue: nullableNumber.optional(),
  booleanValue: z.boolean().nullable().optional(),
}).strict();

const saveAttributeValuesSchema = z.object({
  expectedVersion: z.coerce.number().int().positive(),
  values: z.array(attributeValueSchema).max(100),
}).strict().superRefine((data, ctx) => {
  const ids = data.values.map((item) => item.attributeId);
  if (ids.length !== new Set(ids).size) {
    ctx.addIssue({ code: 'custom', path: ['values'], message: 'Each attribute can appear only once' });
  }
});

const reorderImagesSchema = z.object({
  expectedVersion: z.coerce.number().int().positive(),
  imageIds: z.array(z.coerce.number().int().positive()).min(1).max(100),
}).strict().superRefine((data, ctx) => {
  if (data.imageIds.length !== new Set(data.imageIds).size) {
    ctx.addIssue({ code: 'custom', path: ['imageIds'], message: 'Image IDs must be unique' });
  }
});

const imageUploadBodySchema = z.object({
  expectedVersion: z.coerce.number().int().positive(),
}).strict();
const imageDeleteQuerySchema = z.object({
  expectedVersion: z.coerce.number().int().positive(),
});
const actionBodySchema = z.object({
  expectedVersion: z.coerce.number().int().positive(),
}).strict();
const createReportSchema = z.object({
  reasonCode: reportReasonSchema,
  description: z.preprocess(
    (value) => (value === '' || value === null ? null : value),
    z.string().trim().max(1000).nullable().optional(),
  ),
}).strict().superRefine((data, ctx) => {
  if (data.reasonCode === 'OTHER' && (data.description?.length || 0) < 10) {
    ctx.addIssue({
      code: 'custom',
      path: ['description'],
      message: 'Please describe the issue in at least 10 characters',
    });
  }
});
const idParamSchema = z.object({ id: z.coerce.number().int().positive() });
const imageParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  imageId: z.coerce.number().int().positive(),
});
const categoryParamSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
});

module.exports = {
  actionBodySchema,
  categoryParamSchema,
  createAdSchema,
  createReportSchema,
  favoriteAdListSchema,
  idParamSchema,
  imageDeleteQuerySchema,
  imageParamSchema,
  imageUploadBodySchema,
  listMyAdsSchema,
  publicAdListSchema,
  publicCategoryListSchema,
  reorderImagesSchema,
  saveAttributeValuesSchema,
  updateAdSchema,
};
