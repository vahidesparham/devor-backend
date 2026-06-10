const { z } = require('zod');

const langQuerySchema = z.object({
  lang: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(20)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
});

const contentPageParamSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

const publicBlogListQuerySchema = langQuerySchema.extend({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(16).optional().default(16),
});

const publicBlogPostParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

module.exports = {
  langQuerySchema,
  contentPageParamSchema,
  publicBlogListQuerySchema,
  publicBlogPostParamSchema,
};
