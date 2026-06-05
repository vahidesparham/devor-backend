const { z } = require('zod');

const updatePanelSettingSchema = z
  .object({
    panelTitle: z.string().trim().min(1).max(120).optional(),
    panelLogo: z.string().trim().max(500).optional().nullable(),
    panelFavicon: z.string().trim().max(500).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required for update',
  });

module.exports = {
  updatePanelSettingSchema,
};
