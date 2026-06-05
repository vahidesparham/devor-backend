const { z } = require('zod');

const codeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9_-]+$/, 'code must contain lowercase letters, numbers, _ or -');

const nullableString = (max) => z.preprocess((val) => (val === '' ? null : val), z.string().trim().max(max).nullable().optional());

const permissionIdsSchema = z.array(z.coerce.number().int().positive()).optional().default([]).superRefine((items, ctx) => {
  if (new Set(items).size !== items.length) {
    ctx.addIssue({ code: 'custom', message: 'permissionIds must be unique' });
  }
});

const baseRoleSchema = z.object({
  businessId: z.coerce.number().int().positive(),
  code: codeSchema,
  title: z.string().trim().min(1).max(160),
  description: nullableString(255),
  icon: nullableString(120),
  color: nullableString(30),
  isOwnerRole: z.boolean().optional().default(false),
  displayOrder: z.coerce.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
  permissionIds: permissionIdsSchema,
});

const createBusinessRoleSchema = baseRoleSchema;

const updateBusinessRoleSchema = baseRoleSchema.partial().superRefine((data, ctx) => {
  if (Object.keys(data).length === 0) {
    ctx.addIssue({ code: 'custom', message: 'At least one field is required for update' });
  }
});

const listBusinessRolesSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  q: z.string().trim().max(255).optional(),
  businessId: z.coerce.number().int().positive().optional(),
  isActive: z.preprocess((val) => {
    if (val === undefined || val === '') return undefined;
    if (val === 'true') return true;
    if (val === 'false') return false;
    return val;
  }, z.boolean()).optional(),
  sortBy: z.enum(['id', 'code', 'title', 'displayOrder', 'createdAt', 'updatedAt']).optional().default('displayOrder'),
  sortDir: z.enum(['asc', 'desc']).optional().default('asc'),
});

const listBusinessPermissionsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).optional().default(100),
  q: z.string().trim().max(255).optional(),
  groupName: z.string().trim().max(80).optional(),
  businessId: z.coerce.number().int().positive().optional(),
  isActive: z.preprocess((val) => {
    if (val === undefined || val === '') return undefined;
    if (val === 'true') return true;
    if (val === 'false') return false;
    return val;
  }, z.boolean()).optional(),
});

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

module.exports = {
  createBusinessRoleSchema,
  updateBusinessRoleSchema,
  listBusinessRolesSchema,
  listBusinessPermissionsSchema,
  idParamSchema,
};
