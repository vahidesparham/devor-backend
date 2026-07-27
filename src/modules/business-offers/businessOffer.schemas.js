const { z } = require('zod');

const langCodeSchema = z.string().trim().toLowerCase().min(2).max(20).regex(/^[a-z0-9-]+$/);
const nullableString = (max) => z.preprocess(
  (value) => (value === '' ? null : value),
  z.string().trim().max(max).nullable().optional(),
);
const nullablePositiveId = z.preprocess(
  (value) => (value === '' || value === null ? null : value),
  z.coerce.number().int().positive().nullable().optional(),
);

const translationSchema = z.object({
  lang: langCodeSchema,
  title: z.string().trim().min(1).max(180),
  description: nullableString(500),
  isActive: z.boolean().optional().default(true),
});

const baseBodySchema = z.object({
  businessId: z.coerce.number().int().positive(),
  categoryId: nullablePositiveId,
  offeringIds: z.array(z.coerce.number().int().positive()).max(500).optional().default([]),
  image: nullableString(500),
  discountPercent: z.coerce.number().int().min(1).max(100),
  scope: z.enum(['ALL', 'CATEGORY', 'OFFERINGS']),
  publicationStatus: z.enum(['DRAFT', 'PUBLISHED', 'PAUSED']).optional().default('DRAFT'),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  displayOrder: z.coerce.number().int().min(0).optional().default(0),
  translations: z.array(translationSchema).min(1),
});

function refineOffer(data, ctx) {
  if (data.startsAt && data.endsAt && data.endsAt.getTime() <= data.startsAt.getTime()) {
    ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'End date must be after start date' });
  }

  if (data.scope === 'CATEGORY' && !data.categoryId) {
    ctx.addIssue({ code: 'custom', path: ['categoryId'], message: 'Category is required for category scope' });
  }

  if (data.scope === 'OFFERINGS' && (!Array.isArray(data.offeringIds) || data.offeringIds.length === 0)) {
    ctx.addIssue({ code: 'custom', path: ['offeringIds'], message: 'Select at least one offering' });
  }

  if (Array.isArray(data.offeringIds) && data.offeringIds.length !== new Set(data.offeringIds).size) {
    ctx.addIssue({ code: 'custom', path: ['offeringIds'], message: 'Offering selection must be unique' });
  }

  if (Array.isArray(data.translations)) {
    const langs = data.translations.map((item) => item.lang);
    if (langs.length !== new Set(langs).size) {
      ctx.addIssue({ code: 'custom', path: ['translations'], message: 'Each translation language must be unique' });
    }
  }
}

const createBusinessOfferSchema = baseBodySchema.superRefine(refineOffer);
const updateBusinessOfferSchema = baseBodySchema.partial().superRefine((data, ctx) => {
  if (Object.keys(data).length === 0) {
    ctx.addIssue({ code: 'custom', message: 'At least one field is required for update' });
  }
  refineOffer(data, ctx);
});

const listBusinessOffersSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  q: z.string().trim().max(255).optional(),
  lang: langCodeSchema.optional(),
  businessId: z.coerce.number().int().positive().optional(),
  effectiveStatus: z.enum(['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'EXPIRED']).optional(),
  scope: z.enum(['ALL', 'CATEGORY', 'OFFERINGS']).optional(),
  sortBy: z.enum(['id', 'title', 'discountPercent', 'startsAt', 'endsAt', 'displayOrder', 'createdAt', 'updatedAt']).optional().default('startsAt'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
});

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

module.exports = {
  createBusinessOfferSchema,
  updateBusinessOfferSchema,
  listBusinessOffersSchema,
  idParamSchema,
};
