const CLASSIFIED_SETTINGS_ID = 1;

const DEFAULT_CLASSIFIED_SETTINGS = Object.freeze({
  id: CLASSIFIED_SETTINGS_ID,
  contentLanguage: 'fa',
  currency: 'TJS',
  publicationDays: 30,
  maxImagesPerAd: 10,
  minImagesPerAd: 1,
  maxActiveAdsPerAppUser: 5,
  maxDraftAdsPerAppUser: 10,
  maxTitleLength: 100,
  maxDescriptionLength: 2000,
  requireModeration: true,
  allowPhoneContact: true,
  allowChatContact: false,
  allowBusinessClassifieds: false,
  viewDeduplicationMinutes: 30,
});

function validateClassifiedSettings(settings) {
  const merged = { ...DEFAULT_CLASSIFIED_SETTINGS, ...settings };
  const issues = [];

  const positiveIntegerFields = [
    'publicationDays',
    'maxImagesPerAd',
    'maxActiveAdsPerAppUser',
    'maxDraftAdsPerAppUser',
    'maxTitleLength',
    'maxDescriptionLength',
    'viewDeduplicationMinutes',
  ];

  for (const field of positiveIntegerFields) {
    if (!Number.isInteger(merged[field]) || merged[field] <= 0) {
      issues.push({ field, message: `${field} must be a positive integer` });
    }
  }

  if (!Number.isInteger(merged.minImagesPerAd) || merged.minImagesPerAd < 0) {
    issues.push({ field: 'minImagesPerAd', message: 'minImagesPerAd must be a non-negative integer' });
  }

  if (merged.minImagesPerAd > merged.maxImagesPerAd) {
    issues.push({ field: 'minImagesPerAd', message: 'minImagesPerAd cannot exceed maxImagesPerAd' });
  }

  if (!String(merged.contentLanguage || '').trim()) {
    issues.push({ field: 'contentLanguage', message: 'contentLanguage is required' });
  }

  if (!String(merged.currency || '').trim()) {
    issues.push({ field: 'currency', message: 'currency is required' });
  }

  return issues;
}

module.exports = {
  CLASSIFIED_SETTINGS_ID,
  DEFAULT_CLASSIFIED_SETTINGS,
  validateClassifiedSettings,
};
