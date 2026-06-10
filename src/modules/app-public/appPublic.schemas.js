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

module.exports = {
  langQuerySchema,
};
