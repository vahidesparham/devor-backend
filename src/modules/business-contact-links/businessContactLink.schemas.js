const { z } = require('zod');

const contactTypeSchema = z.enum(['PHONE', 'MOBILE', 'WHATSAPP', 'TELEGRAM', 'INSTAGRAM', 'WEBSITE', 'EMAIL', 'MAP', 'CUSTOM']);
const nullableString = (max) => z.preprocess((val) => (val === '' ? null : val), z.string().trim().max(max).nullable().optional());

const baseBodySchema = z.object({
  businessId: z.coerce.number().int().positive(),
  type: contactTypeSchema,
  label: nullableString(120),
  value: nullableString(255),
  url: nullableString(500),
  displayOrder: z.coerce.number().int().min(0).optional().default(0),
  isPrimary: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

function refineContactLink(data, ctx) {
  if (!data.value && !data.url) {
    ctx.addIssue({ code: 'custom', path: ['value'], message: 'Value or URL is required' });
  }
  if (data.type === 'EMAIL' && data.value && !z.string().email().safeParse(data.value).success) {
    ctx.addIssue({ code: 'custom', path: ['value'], message: 'Invalid email address' });
  }
}

const createBusinessContactLinkSchema = baseBodySchema.superRefine(refineContactLink);
const updateBusinessContactLinkSchema = baseBodySchema.partial().superRefine((data, ctx) => {
  if (Object.keys(data).length === 0) ctx.addIssue({ code: 'custom', message: 'At least one field is required for update' });
  refineContactLink(data, ctx);
});

const listBusinessContactLinksSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  businessId: z.coerce.number().int().positive().optional(),
  type: contactTypeSchema.optional(),
  isActive: z.preprocess((val) => {
    if (val === undefined || val === '') return undefined;
    if (val === 'true') return true;
    if (val === 'false') return false;
    return val;
  }, z.boolean()).optional(),
});

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

module.exports = {
  createBusinessContactLinkSchema,
  updateBusinessContactLinkSchema,
  listBusinessContactLinksSchema,
  idParamSchema,
};
