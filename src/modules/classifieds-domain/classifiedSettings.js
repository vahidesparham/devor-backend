const CLASSIFIED_SETTINGS_ID = 1;
const CLASSIFIED_SETTING_LIMITS = Object.freeze({
  maxImagesPerAd: 100,
  maxTitleLength: 120,
  maxDescriptionLength: 10000,
  chatStarterMessageLimit: 10,
});

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
  allowChatContact: true,
  chatStarterMessageLimit: 3,
  allowBusinessClassifieds: false,
  viewDeduplicationMinutes: 30,
  publicBrowseEnabled: true,
  appUserPostingEnabled: true,
  favoritesEnabled: true,
  reportsEnabled: true,
  notificationsEnabled: true,
  maxReportsPerUserPerDay: 10,
  mediaCleanupGraceHours: 24,
  maintenanceMessage: null,
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
    'maxReportsPerUserPerDay',
    'mediaCleanupGraceHours',
    'chatStarterMessageLimit',
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
  for (const [field, maximum] of Object.entries(CLASSIFIED_SETTING_LIMITS)) {
    if (Number.isInteger(merged[field]) && merged[field] > maximum) {
      issues.push({ field, message: `${field} cannot exceed ${maximum}` });
    }
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
  CLASSIFIED_SETTING_LIMITS,
  DEFAULT_CLASSIFIED_SETTINGS,
  validateClassifiedSettings,
};
