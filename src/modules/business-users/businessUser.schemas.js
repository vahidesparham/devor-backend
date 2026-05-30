const { z } = require('zod');

const optionalText = (max = 100) => z.preprocess((val) => (val === '' ? null : val), z.string().trim().min(1).max(max).nullable().optional());
const nullableString = (max) => z.preprocess((val) => (val === '' ? null : val), z.string().trim().max(max).nullable().optional());

const baseBodySchema = z.object({
  businessId: z.coerce.number().int().positive(),
  email: z.string().trim().toLowerCase().email().max(191),
  phone: nullableString(80),
  password: z.string().min(6).max(100).optional(),
  firstName: optionalText(100),
  lastName: optionalText(100),
  role: z.enum(['OWNER', 'MANAGER', 'STAFF']).optional().default('STAFF'),
  isActive: z.boolean().optional().default(true),
});

const createBusinessUserSchema = baseBodySchema;

const updateBusinessUserSchema = baseBodySchema.partial().superRefine((data, ctx) => {
  if (Object.keys(data).length === 0) {
    ctx.addIssue({ code: 'custom', message: 'At least one field is required for update' });
  }
});

const createBusinessMembershipSchema = z.object({
  businessId: z.coerce.number().int().positive(),
  userId: z.coerce.number().int().positive(),
  role: z.enum(['OWNER', 'MANAGER', 'STAFF']).optional().default('STAFF'),
  isActive: z.boolean().optional().default(true),
});

const updateBusinessMembershipSchema = createBusinessMembershipSchema.partial().superRefine((data, ctx) => {
  if (Object.keys(data).length === 0) {
    ctx.addIssue({ code: 'custom', message: 'At least one field is required for update' });
  }
});

const accountBodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(191),
  phone: nullableString(80),
  password: z.string().min(6).max(100).optional(),
  firstName: optionalText(100),
  lastName: optionalText(100),
  isActive: z.boolean().optional().default(true),
});

const createBusinessUserAccountSchema = accountBodySchema.extend({
  password: z.string().min(6).max(100),
});

const updateBusinessUserAccountSchema = accountBodySchema.partial().superRefine((data, ctx) => {
  if (Object.keys(data).length === 0) {
    ctx.addIssue({ code: 'custom', message: 'At least one field is required for update' });
  }
});

const listBusinessUsersSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  q: z.string().trim().max(255).optional(),
  businessId: z.coerce.number().int().positive().optional(),
  role: z.enum(['OWNER', 'MANAGER', 'STAFF']).optional(),
  isActive: z.preprocess((val) => {
    if (val === undefined || val === '') return undefined;
    if (val === 'true') return true;
    if (val === 'false') return false;
    return val;
  }, z.boolean()).optional(),
});

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

module.exports = {
  createBusinessMembershipSchema,
  createBusinessUserAccountSchema,
  createBusinessUserSchema,
  updateBusinessMembershipSchema,
  updateBusinessUserAccountSchema,
  updateBusinessUserSchema,
  listBusinessUsersSchema,
  idParamSchema,
};
