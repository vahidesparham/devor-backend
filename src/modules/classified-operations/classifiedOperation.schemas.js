const { z } = require('zod');

const updateSettingsSchema = z.object({
  publicBrowseEnabled: z.boolean().optional(),
  appUserPostingEnabled: z.boolean().optional(),
  favoritesEnabled: z.boolean().optional(),
  reportsEnabled: z.boolean().optional(),
  notificationsEnabled: z.boolean().optional(),
  allowChatContact: z.boolean().optional(),
  maxReportsPerUserPerDay: z.coerce.number().int().min(1).max(100).optional(),
  mediaCleanupGraceHours: z.coerce.number().int().min(1).max(720).optional(),
  chatStarterMessageLimit: z.coerce.number().int().min(1).max(10).optional(),
  maintenanceMessage: z.string().trim().max(500).optional().nullable(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one setting is required',
});

const reconcileMediaSchema = z.object({
  execute: z.boolean().optional().default(false),
}).strict();

module.exports = {
  reconcileMediaSchema,
  updateSettingsSchema,
};
