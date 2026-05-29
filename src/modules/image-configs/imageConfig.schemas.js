const { z } = require('zod');

const imageConfigBase = {
  code: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9_-]+$/, 'code must contain lowercase letters, numbers, _ or -'),
  width: z.coerce.number().int().min(1).max(10000),
  height: z.coerce.number().int().min(1).max(10000),
  thumbnailWidth: z.coerce.number().int().min(1).max(5000),
  thumbnailHeight: z.coerce.number().int().min(1).max(5000),
  folderName: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9/_-]+$/, 'folderName must contain lowercase letters, numbers, /, _ or -')
};

const createImageConfigSchema = z.object(imageConfigBase);

const updateImageConfigSchema = z
  .object({
    code: imageConfigBase.code.optional(),
    width: imageConfigBase.width.optional(),
    height: imageConfigBase.height.optional(),
    thumbnailWidth: imageConfigBase.thumbnailWidth.optional(),
    thumbnailHeight: imageConfigBase.thumbnailHeight.optional(),
    folderName: imageConfigBase.folderName.optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required for update'
  });

const idParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  q: z.string().trim().max(255).optional(),
  sortBy: z.enum(['id', 'code', 'folderName', 'createdAt', 'updatedAt']).optional().default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc')
});

module.exports = {
  createImageConfigSchema,
  updateImageConfigSchema,
  idParamSchema,
  listQuerySchema
};
