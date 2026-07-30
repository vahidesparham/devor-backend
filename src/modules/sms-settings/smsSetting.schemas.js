const { z } = require('zod');

const nullableUrl = z.union([
  z.string().trim().url().max(500),
  z.literal(''),
]).optional().nullable();

const nullableTemplateId = z.union([
  z.string().trim().uuid(),
  z.literal(''),
]).optional().nullable();

const updateSmsSettingSchema = z.object({
  isEnabled: z.boolean().optional(),
  apiBaseUrl: nullableUrl,
  apiToken: z.string().trim().min(8).max(4000).optional(),
  clearApiToken: z.boolean().optional(),
  senderName: z.union([
    z.string().trim().regex(/^[A-Za-z0-9]{1,11}$/),
    z.literal(''),
  ]).optional().nullable(),
  sendMode: z.enum(['TEMPLATE', 'TEXT']).optional(),
  templateId: nullableTemplateId,
  templateCodeVariable: z.string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[A-Za-z_][A-Za-z0-9_]*$/)
    .optional(),
  textTemplate: z.string().trim().min(1).max(500).optional(),
  requestTimeoutMs: z.coerce.number().int().min(1000).max(30000).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one SMS setting is required',
});

module.exports = {
  updateSmsSettingSchema,
};
