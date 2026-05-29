const { z } = require('zod');

const keySchema = z.string().trim().toLowerCase().min(2).max(120).regex(/^[a-z0-9_/-]+$/);
const nullableString = (max) => z.preprocess((val) => (val === '' ? null : val), z.string().trim().max(max).nullable().optional());

const optionSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  key: keySchema,
  title: z.string().trim().min(1).max(160),
  icon: nullableString(120),
  color: nullableString(30),
  displayOrder: z.coerce.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

const baseBodySchema = z.object({
  serviceTypeId: z.coerce.number().int().positive(),
  code: keySchema,
  title: z.string().trim().min(1).max(160),
  icon: nullableString(120),
  selectionMode: z.enum(['SINGLE', 'MULTIPLE']).optional().default('MULTIPLE'),
  displayOrder: z.coerce.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
  options: z.array(optionSchema).optional().default([]),
});

function refineUniqueOptions(data, ctx) {
  if (!Array.isArray(data.options)) return;
  const keys = data.options.map((item) => item.key);
  if (keys.length !== new Set(keys).size) {
    ctx.addIssue({ code: 'custom', path: ['options'], message: 'Option keys must be unique' });
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
