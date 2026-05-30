const { z } = require('zod');

const langCodeSchema = z.string().trim().toLowerCase().min(2).max(20).regex(/^[a-z0-9-]+$/);
const nullableString = (max) => z.preprocess((val) => (val === '' ? null : val), z.string().trim().max(max).nullable().optional());
const nullableText = z.preprocess((val) => (val === '' ? null : val), z.string().trim().nullable().optional());

const translationSchema = z.object({
  lang: langCodeSchema,
  title: z.string().trim().min(1).max(255),
  summary: nullableString(500),
  description: nullableText,
  address: nullableString(500),
  isActive: z.boolean().optional().default(true),
});

const gallerySchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  image: z.string().trim().min(1).max(500),
  alt: nullableString(255),
  displayOrder: z.coerce.number().int().min(0).optional().default(0),
});

const slideshowSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  image: z.string().trim().min(1).max(500),
  displayOrder: z.coerce.number().int().min(0).optional().default(0),
});

const baseBodySchema = z.object({
  serviceTypeId: z.coerce.number().int().positive(),
  countryId: z.preprocess((val) => (val === '' || val === null ? null : val), z.coerce.number().int().positive().nullable().optional()),
  cityId: z.preprocess((val) => (val === '' || val === null ? null : val), z.coerce.number().int().positive().nullable().optional()),
  areaId: z.preprocess((val) => (val === '' || val === null ? null : val), z.coerce.number().int().positive().nullable().optional()),
  slug: z.string().trim().toLowerCase().min(2).max(160).regex(/^[a-z0-9-]+$/),
  logoImage: nullableString(500),
  coverImage: nullableString(500),
  phone: nullableString(80),
  email: nullableString(191).refine((value) => !value || z.string().email().safeParse(value).success, 'Invalid email address'),
  website: nullableString(500),
  latitude: z.preprocess((val) => (val === '' || val === null ? null : val), z.coerce.number().min(-90).max(90).nullable().optional()),
  longitude: z.preprocess((val) => (val === '' || val === null ? null : val), z.coerce.number().min(-180).max(180).nullable().optional()),
  economicLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().default('MEDIUM'),
  operationMode: z.enum(['INFO_ONLY', 'SHOWCASE', 'ORDERING', 'BOOKING', 'ORDERING_AND_BOOKING']).optional().default('INFO_ONLY'),
  displayOrder: z.coerce.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
  isFeatured: z.boolean().optional().default(false),
  showInLatest: z.boolean().optional().default(false),
  translations: z.array(translationSchema).min(1),
  gallery: z.array(gallerySchema).optional().default([]),
  slideshows: z.array(slideshowSchema).optional().default([]),
  attributeOptionIds: z.array(z.coerce.number().int().positive()).optional().default([]),
});

function refineBusiness(data, ctx) {
  if (Array.isArray(data.translations)) {
    const langs = data.translations.map((item) => item.lang);
    if (langs.length !== new Set(langs).size) {
      ctx.addIssue({ code: 'custom', path: ['translations'], message: 'Each translation language must be unique' });
    }
  }
  if ((data.latitude === null && data.longitude !== null && data.longitude !== undefined) || (data.longitude === null && data.latitude !== null && data.latitude !== undefined)) {
    ctx.addIssue({ code: 'custom', path: ['latitude'], message: 'Latitude and longitude must be set together' });
  }
}

const bodySchema = baseBodySchema.superRefine(refineBusiness);

const createBusinessSchema = bodySchema;
const updateBusinessSchema = baseBodySchema.partial().superRefine((data, ctx) => {
  if (Object.keys(data).length === 0) {
    ctx.addIssue({ code: 'custom', message: 'At least one field is required for update' });
  }
  refineBusiness(data, ctx);
});

const listBusinessesSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  q: z.string().trim().max(255).optional(),
  serviceTypeId: z.coerce.number().int().positive().optional(),
  countryId: z.coerce.number().int().positive().optional(),
  cityId: z.coerce.number().int().positive().optional(),
  areaId: z.coerce.number().int().positive().optional(),
  isActive: z.preprocess((val) => {
    if (val === undefined || val === '') return undefined;
    if (val === 'true') return true;
    if (val === 'false') return false;
    return val;
  }, z.boolean()).optional(),
  isFeatured: z.preprocess((val) => {
    if (val === undefined || val === '') return undefined;
    if (val === 'true') return true;
    if (val === 'false') return false;
    return val;
  }, z.boolean()).optional(),
  sortBy: z.enum(['id', 'slug', 'displayOrder', 'createdAt', 'updatedAt']).optional().default('displayOrder'),
  sortDir: z.enum(['asc', 'desc']).optional().default('asc'),
});

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

module.exports = {
  createBusinessSchema,
  updateBusinessSchema,
  listBusinessesSchema,
  idParamSchema,
};
