const { z } = require('zod');

const listNotificationsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  unreadOnly: z.coerce.boolean().optional().default(false),
});

const notificationIdSchema = z.object({
  id: z.coerce.bigint().positive(),
});

module.exports = {
  listNotificationsSchema,
  notificationIdSchema,
};
