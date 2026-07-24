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
  areaId: nullablePositiveInt.optional(),
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
  areaId: nullablePositiveInt.optional(),
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

const publicAdListSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
  categoryId: z.coerce.number().int().positive().optional(),
  cityId: z.coerce.number().int().positive().optional(),
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
  idParamSchema,
  imageDeleteQuerySchema,
  imageParamSchema,
  imageUploadBodySchema,
  listMyAdsSchema,
  publicAdListSchema,
  reorderImagesSchema,
  saveAttributeValuesSchema,
  updateAdSchema,
};
