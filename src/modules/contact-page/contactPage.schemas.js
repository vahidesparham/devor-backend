const { z } = require('zod');

const langCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(20)
  .regex(/^[a-z0-9-]+$/, 'lang must contain only lowercase letters, numbers, and "-"');

const optionalText = (max) => z.string().trim().max(max).optional().nullable();

const translationSchema = z.object({
  lang: langCodeSchema,
  title: z.string().trim().min(1).max(255),
  body: z.string().trim().min(1),
  phoneNumber: optionalText(80),
  address: optionalText(1000),
  workingHours: optionalText(1000),
  isActive: z.boolean().optional().default(true),
});

function validateUniqueLangs(data, ctx) {
  const langs = (data.translations || []).map((item) => item.lang);
  if (langs.length !== new Set(langs).size) {
    ctx.addIssue({
      code: 'custom',
      path: ['translations'],
      message: 'Each translation language must be unique',
    });
  }
}

const updateContactPageSchema = z
  .object({
    instagram: optionalText(500),
    telegram: optionalText(500),
    whatsapp: optionalText(500),
    youtube: optionalText(500),
    tiktok: optionalText(500),
    email: optionalText(191),
    supportPhoneNumber: optionalText(80),
    translations: z.array(translationSchema).min(1).optional(),
  })
  .superRefine((data, ctx) => {
    const hasCore = ['instagram', 'telegram', 'whatsapp', 'youtube', 'tiktok', 'email', 'supportPhoneNumber'].some(
      (field) => data[field] !== undefined
    );
    const hasTranslations = Array.isArray(data.translations) && data.translations.length > 0;

    if (!hasCore && !hasTranslations) {
      ctx.addIssue({ code: 'custom', message: 'At least one field is required for update' });
    }

    if (hasTranslations) validateUniqueLangs(data, ctx);
  });

module.exports = {
  updateContactPageSchema,
};
