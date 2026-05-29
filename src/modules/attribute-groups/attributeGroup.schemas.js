const { z } = require('zod');

const langCodeSchema = z.string().trim().toLowerCase().min(2).max(20).regex(/^[a-z0-9-]+$/);
const keySchema = z.string().trim().toLowerCase().min(2).max(120).regex(/^[a-z0-9_/-]+$/);
const nullableString = (max) => z.preprocess((val) => (val === '' ? null : val), z.string().trim().max(max).nullable().optional());

const translationSchema = z.object({
  lang: langCodeSchema,
  title: z.string().trim().min(1).max(160),
  isActive: z.boolean().optional().default(true),
});

const optionSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  key: keySchema.optional(),
  title: z.string().trim().min(1).max(160).optional(),
  image: nullableString(500),
  color: nullableString(30),
  displayOrder: z.coerce.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
  translations: z.array(translationSchema).min(1),
});

const baseBodySchema = z.object({
  serviceTypeId: z.coerce.number().int().positive(),
  code: keySchema,
  title: z.string().trim().min(1).max(160).optional(),
  image: nullableString(500),
  selectionMode: z.enum(['SINGLE', 'MULTIPLE']).optional().default('MULTIPLE'),
  displayOrder: z.coerce.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
  translations: z.array(translationSchema).min(1),
  options: z.array(optionSchema).optional().default([]),
});

function refineUniqueOptions(data, ctx) {
  if (!Array.isArray(data.options)) return;
  const keys = data.options.map((item) => item.key).filter(Boolean);
  if (keys.length !== new Set(keys).size) {
    ctx.addIssue({ code: 'custom', path: ['options'], message: 'Option keys must be unique' });
  }
  data.options.forEach((option, index) => {
    const langs = (option.translations || []).map((item) => item.lang);
    if (langs.length !== new Set(langs).size) {
      ctx.addIssue({ code: 'custom', path: ['options', index, 'translations'], message: 'Each option translation language must be unique' });
    }
  });
  if (Array.isArray(data.translations)) {
    const langs = data.translations.map((item) => item.lang);
    if (langs.length !== new Set(langs).size) {
      ctx.addIssue({ code: 'custom', path: ['translations'], message: 'Each group translation language must be unique' });
    }
  }
}

const bodySchema = baseBodySchema.superRefine(refineUniqueOptions);

const createAttributeGroupSchema = bodySchema;
const updateAttributeGroupSchema = baseBodySchema.partial().superRefine((data, ctx) => {
  if (Object.keys(data).length === 0) {
    ctx.addIssue({ code: 'custom', message: 'At least one field is required for update' });
  }
  refineUniqueOptions(data, ctx);
});

const listAttributeGroupsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  q: z.string().trim().max(255).optional(),
  lang: langCodeSchema.optional(),
  serviceTypeId: z.coerce.number().int().positive().optional(),
  isActive: z.preprocess((val) => {
    if (val === undefined || val === '') return undefined;
    if (val === 'true') return true;
    if (val === 'false') return false;
    return val;
  }, z.boolean()).optional(),
  sortBy: z.enum(['id', 'code', 'title', 'displayOrder', 'createdAt', 'updatedAt']).optional().default('displayOrder'),
  sortDir: z.enum(['asc', 'desc']).optional().default('asc'),
});

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

module.exports = {
  createAttributeGroupSchema,
  updateAttributeGroupSchema,
  listAttributeGroupsSchema,
  idParamSchema,
};
