const { z } = require('zod');

const conversationIdSchema = z.object({
  conversationId: z.coerce.bigint().positive(),
});

const adIdSchema = z.object({
  adId: z.coerce.number().int().positive(),
});

const conversationListSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
  q: z.string().trim().max(120).optional(),
});

const messageListSchema = z.object({
  beforeId: z.coerce.bigint().positive().optional(),
  afterId: z.coerce.bigint().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(40),
}).refine((value) => !(value.beforeId && value.afterId), {
  message: 'beforeId and afterId cannot be used together',
});

const sendMessageSchema = z.object({
  clientMessageId: z.string()
    .trim()
    .min(8)
    .max(80)
    .regex(/^[A-Za-z0-9._:-]+$/),
  body: z.string()
    .trim()
    .min(1)
    .max(2000)
    .refine((value) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value), {
      message: 'Message contains unsupported control characters',
    }),
});

module.exports = {
  adIdSchema,
  conversationIdSchema,
  conversationListSchema,
  messageListSchema,
  sendMessageSchema,
};
