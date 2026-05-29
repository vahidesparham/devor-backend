const { z } = require('zod');

const keySchema = z.string().trim().toLowerCase().min(2).max(80).regex(/^[a-z0-9_/-]+$/);
const nullableString = (max) => z.preprocess((val) => (val === '' ? null : val), z.string().trim().max(max).nullable().optional());

const serviceTypeBodySchema = z.object({
  code: keySchema,
  title: z.string().trim().min(1).max(160),
  icon: nullableString(120),
  color: nullableString(30),
  description: nullableString(500),
  displayOrder: z.coerce.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

const createServiceTypeSchema = serviceTypeBodySchema;
const updateServiceTypeSchema = serviceTypeBodySchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field is required for update',
});

const listServiceTypesSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  q: z.string().trim().max(255).optional(),
  isActive: z.preprocess((val) => {
    if (val === undefined || val === '') return undefined;
    if (val === 'true') return true;
    if (val === 'false') return false;
    return val;
  }, z.boolean()).optional(),
  sortBy: z.enum(['id', 'code', 'title', 'displayOrder', 'createdAt', 'updatedAt']).optional().default('displayOrder'),
  sortDir: z.enum(['asc', 'desc']).optional().default('asc'),
});

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

module.exports = {
  createServiceTypeSchema,
  updateServiceTypeSchema,
  listServiceTypesSchema,
  idParamSchema,
};
