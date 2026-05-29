const { z } = require('zod');

const langCodeSchema = z.string().trim().toLowerCase().min(2).max(20).regex(/^[a-z0-9-]+$/);
const translationSchema = z.object({ lang: langCodeSchema, title: z.string().trim().min(1).max(160), isActive: z.boolean().optional().default(true) });

const baseBodySchema = z.object({
  offeringId: z.coerce.number().int().positive(),
  selectionMode: z.enum(['SINGLE', 'MULTIPLE']).optional().default('MULTIPLE'),
  isRequired: z.boolean().optional().default(false),
  minSelect: z.coerce.number().int().min(0).optional().default(0),
  maxSelect: z.preprocess((val) => (val === '' || val === null ? null : val), z.coerce.number().int().min(1).nullable().optional()),
  displayOrder: z.coerce.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
  translations: z.array(translationSchema).min(1),
});

function refine(data, ctx) {
  if (Array.isArray(data.translations)) {
    const langs = data.translations.map((item) => item.lang);
    if (langs.length !== new Set(langs).size) ctx.addIssue({ code: 'custom', path: ['translations'], message: 'Each translation language must be unique' });
  }
  if (data.maxSelect && data.minSelect !== undefined && data.maxSelect < data.minSelect) ctx.addIssue({ code: 'custom', path: ['maxSelect'], message: 'maxSelect must be greater than or equal to minSelect' });
  if (data.selectionMode === 'SINGLE' && data.maxSelect && data.maxSelect > 1) ctx.addIssue({ code: 'custom', path: ['maxSelect'], message: 'Single-select groups cannot allow more than one option' });
}

const createBusinessOfferingOptionGroupSchema = baseBodySchema.superRefine(refine);
const updateBusinessOfferingOptionGroupSchema = baseBodySchema.partial().superRefine((data, ctx) => {
  if (Object.keys(data).length === 0) ctx.addIssue({ code: 'custom', message: 'At least one field is required for update' });
  refine(data, ctx);
});
const listBusinessOfferingOptionGroupsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  q: z.string().trim().max(255).optional(),
  lang: langCodeSchema.optional(),
  offeringId: z.coerce.number().int().positive().optional(),
  isActive: z.preprocess((val) => {
    if (val === undefined || val === '') return undefined;
    if (val === 'true') return true;
    if (val === 'false') return false;
    return val;
  }, z.boolean()).optional(),
});
const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

module.exports = { createBusinessOfferingOptionGroupSchema, updateBusinessOfferingOptionGroupSchema, listBusinessOfferingOptionGroupsSchema, idParamSchema };
