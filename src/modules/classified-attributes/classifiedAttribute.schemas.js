const { z } = require('zod');

const keySchema = z.string().trim().toLowerCase().min(2).max(120).regex(/^[a-z0-9_-]+$/);
const nullableString = (max) => z.preprocess(
  (value) => (value === '' ? null : value),
  z.string().trim().max(max).nullable().optional(),
);
const nullableNumber = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return null;
  return value;
}, z.coerce.number().finite().nullable().optional());
const nullableNonNegativeInt = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return null;
  return value;
}, z.coerce.number().int().min(0).nullable().optional());
const optionalBoolean = z.preprocess((value) => {
  if (value === undefined || value === '') return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}, z.boolean()).optional();

const optionBodySchema = z.object({
  code: keySchema,
  title: z.string().trim().min(1).max(160),
  image: nullableString(500),
  color: nullableString(30),
  displayOrder: z.coerce.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

const inlineOptionSchema = optionBodySchema.extend({
  id: z.coerce.number().int().positive().optional(),
});

const baseAttributeSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
  code: keySchema,
  title: z.string().trim().min(2).max(160),
  type: z.enum(['SELECT', 'MULTI_SELECT', 'TEXT', 'NUMBER', 'BOOLEAN']),
  unit: nullableString(60),
  placeholder: nullableString(255),
  isRequired: z.boolean().optional().default(false),
  showInFilters: z.boolean().optional().default(false),
  displayOrder: z.coerce.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
  minValue: nullableNumber,
  maxValue: nullableNumber,
  minLength: nullableNonNegativeInt,
  maxLength: nullableNonNegativeInt,
  options: z.array(inlineOptionSchema).max(200).optional(),
});

function refineAttribute(data, ctx) {
  if (data.minValue != null && data.maxValue != null && data.minValue > data.maxValue) {
    ctx.addIssue({ code: 'custom', path: ['maxValue'], message: 'Maximum value must be greater than or equal to minimum value' });
  }
  if (data.minLength != null && data.maxLength != null && data.minLength > data.maxLength) {
    ctx.addIssue({ code: 'custom', path: ['maxLength'], message: 'Maximum length must be greater than or equal to minimum length' });
  }
  if (data.options?.length && data.type && !['SELECT', 'MULTI_SELECT'].includes(data.type)) {
    ctx.addIssue({ code: 'custom', path: ['options'], message: 'Options are only supported for selection attributes' });
  }

  const optionCodes = new Map();
  for (const [index, option] of (data.options || []).entries()) {
    const existingIndex = optionCodes.get(option.code);
    if (existingIndex !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['options', index, 'code'],
        message: `Option code duplicates row ${existingIndex + 1}`,
      });
    } else {
      optionCodes.set(option.code, index);
    }
  }
}

const createClassifiedAttributeSchema = baseAttributeSchema.superRefine(refineAttribute);
const updateClassifiedAttributeSchema = baseAttributeSchema.partial().superRefine((data, ctx) => {
  if (Object.keys(data).length === 0) {
    ctx.addIssue({ code: 'custom', message: 'At least one field is required for update' });
  }
  refineAttribute(data, ctx);
});

const listClassifiedAttributesSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).optional().default(50),
  q: z.string().trim().max(255).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  includeInherited: optionalBoolean,
  isActive: optionalBoolean,
  type: z.enum(['SELECT', 'MULTI_SELECT', 'TEXT', 'NUMBER', 'BOOLEAN']).optional(),
  sortBy: z.enum(['id', 'code', 'title', 'type', 'displayOrder', 'createdAt', 'updatedAt']).optional().default('displayOrder'),
  sortDir: z.enum(['asc', 'desc']).optional().default('asc'),
}).superRefine((data, ctx) => {
  if (data.includeInherited && !data.categoryId) {
    ctx.addIssue({ code: 'custom', path: ['categoryId'], message: 'categoryId is required when inherited attributes are requested' });
  }
});

const createClassifiedAttributeOptionSchema = optionBodySchema;
const updateClassifiedAttributeOptionSchema = optionBodySchema.partial().superRefine((data, ctx) => {
  if (Object.keys(data).length === 0) {
    ctx.addIssue({ code: 'custom', message: 'At least one field is required for update' });
  }
});

const nextDisplayOrderSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
});
const nextOptionDisplayOrderSchema = z.object({
  attributeId: z.coerce.number().int().positive(),
});
const idParamSchema = z.object({ id: z.coerce.number().int().positive() });
const optionParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  optionId: z.coerce.number().int().positive(),
});

module.exports = {
  createClassifiedAttributeOptionSchema,
  createClassifiedAttributeSchema,
  idParamSchema,
  listClassifiedAttributesSchema,
  nextDisplayOrderSchema,
  nextOptionDisplayOrderSchema,
  optionParamSchema,
  updateClassifiedAttributeOptionSchema,
  updateClassifiedAttributeSchema,
};
