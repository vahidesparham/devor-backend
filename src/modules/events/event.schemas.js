const { z } = require('zod');

const EVENT_STATUSES = ['DRAFT', 'PUBLISHED', 'CANCELLED', 'ENDED'];
const EVENT_PRICE_TYPES = ['FREE', 'PAID'];

const langCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(20)
  .regex(/^[a-z0-9-]+$/, 'lang must contain only lowercase letters, numbers, and "-"');

const booleanQuerySchema = z
  .preprocess((value) => {
    if (value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
    }
    return value;
  }, z.boolean())
  .optional();

const nullableString = (max) => z.string().trim().max(max).optional().nullable();
const requiredDate = z.preprocess(
  (value) => (value === null || value === '' ? undefined : value),
  z.coerce.date(),
);
const optionalDate = z.preprocess(
  (value) => (value === null || value === '' ? undefined : value),
  z.coerce.date().optional(),
);
const nullableUrl = z.preprocess(
  (value) => (value === '' ? null : value),
  z.string().trim().url().max(500).optional().nullable(),
);

const translationSchema = z
  .object({
    lang: langCodeSchema,
    title: z.string().trim().min(1).max(255),
    summary: nullableString(500),
    description: nullableString(20000),
    address: nullableString(500),
    isActive: z.boolean().optional().default(true),
  })
  .strict();

const eventCoreShape = {
  categoryId: z.coerce.number().int().positive(),
  cityId: z.coerce.number().int().positive(),
  areaId: z.coerce.number().int().positive().optional().nullable(),
  coverImage: nullableString(500),
  startsAt: requiredDate,
  endsAt: requiredDate,
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  priceType: z.enum(EVENT_PRICE_TYPES).optional().default('FREE'),
  price: z.coerce.number().min(0).max(999999999999.99).optional().nullable(),
  contactPhone: nullableString(80),
  externalUrl: nullableUrl,
  isFeatured: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  translations: z.array(translationSchema).min(1),
};

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

function validateCoreRules(data, ctx) {
  if (data.startsAt && data.endsAt && data.endsAt <= data.startsAt) {
    ctx.addIssue({
      code: 'custom',
      path: ['endsAt'],
      message: 'endsAt must be later than startsAt',
    });
  }

  if (data.priceType === 'PAID' && !(Number(data.price) > 0)) {
    ctx.addIssue({
      code: 'custom',
      path: ['price'],
      message: 'A positive price is required for paid events',
    });
  }

  if (data.priceType === 'FREE' && Number(data.price || 0) > 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['price'],
      message: 'Free events cannot have a positive price',
    });
  }

  const hasLatitude = data.latitude !== undefined && data.latitude !== null;
  const hasLongitude = data.longitude !== undefined && data.longitude !== null;
  if (hasLatitude !== hasLongitude) {
    ctx.addIssue({
      code: 'custom',
      path: hasLatitude ? ['longitude'] : ['latitude'],
      message: 'latitude and longitude must be provided together',
    });
  }

  if (data.translations) validateUniqueLangs(data, ctx);
}

const createEventSchema = z.object(eventCoreShape).strict().superRefine(validateCoreRules);

const updateEventSchema = z
  .object({
    categoryId: eventCoreShape.categoryId.optional(),
    cityId: eventCoreShape.cityId.optional(),
    areaId: eventCoreShape.areaId,
    coverImage: eventCoreShape.coverImage,
    startsAt: eventCoreShape.startsAt.optional(),
    endsAt: eventCoreShape.endsAt.optional(),
    latitude: eventCoreShape.latitude,
    longitude: eventCoreShape.longitude,
    priceType: z.enum(EVENT_PRICE_TYPES).optional(),
    price: eventCoreShape.price,
    contactPhone: eventCoreShape.contactPhone,
    externalUrl: eventCoreShape.externalUrl,
    isFeatured: z.boolean().optional(),
    isActive: z.boolean().optional(),
    translations: z.array(translationSchema).min(1).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!Object.keys(data).length) {
      ctx.addIssue({ code: 'custom', message: 'At least one field is required for update' });
    }
    validateCoreRules(data, ctx);
  });

const listEventsSchema = z
  .object({
    page: z.coerce.number().int().min(1).optional().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
    q: z.string().trim().max(255).optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    cityId: z.coerce.number().int().positive().optional(),
    areaId: z.coerce.number().int().positive().optional(),
    status: z.enum(EVENT_STATUSES).optional(),
    priceType: z.enum(EVENT_PRICE_TYPES).optional(),
    isFeatured: booleanQuerySchema,
    isActive: booleanQuerySchema,
    startFrom: optionalDate,
    startTo: optionalDate,
    sortBy: z.enum(['id', 'startsAt', 'endsAt', 'createdAt', 'updatedAt']).optional().default('createdAt'),
    sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.startFrom && data.startTo && data.startTo < data.startFrom) {
      ctx.addIssue({ code: 'custom', path: ['startTo'], message: 'startTo must not be earlier than startFrom' });
    }
  });

const idParamSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .strict();

const updateEventStatusSchema = z
  .object({
    status: z.enum(EVENT_STATUSES),
    note: nullableString(500),
  })
  .strict();

module.exports = {
  EVENT_STATUSES,
  EVENT_PRICE_TYPES,
  createEventSchema,
  updateEventSchema,
  listEventsSchema,
  updateEventStatusSchema,
  idParamSchema,
};
