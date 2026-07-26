const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const { DEFAULT_CLASSIFIED_SETTINGS } = require('./classifiedSettings');

const FEATURE_ERRORS = Object.freeze({
  publicBrowseEnabled: {
    code: 'CLASSIFIED_BROWSE_DISABLED',
    message: 'Classified browsing is temporarily unavailable',
  },
  appUserPostingEnabled: {
    code: 'CLASSIFIED_POSTING_DISABLED',
    message: 'Classified posting is temporarily unavailable',
  },
  favoritesEnabled: {
    code: 'CLASSIFIED_FAVORITES_DISABLED',
    message: 'Classified favorites are temporarily unavailable',
  },
  reportsEnabled: {
    code: 'CLASSIFIED_REPORTS_DISABLED',
    message: 'Classified reporting is temporarily unavailable',
  },
});

function requireClassifiedFeature(feature) {
  if (!FEATURE_ERRORS[feature]) {
    throw new Error(`Unknown classified feature: ${feature}`);
  }
  return async (_req, _res, next) => {
    const row = await prisma.classifiedSetting.findUnique({ where: { id: 1 } });
    const settings = { ...DEFAULT_CLASSIFIED_SETTINGS, ...(row || {}) };
    if (!settings[feature]) {
      const error = FEATURE_ERRORS[feature];
      throw new AppError(503, error.code, error.message, {
        details: { maintenanceMessage: settings.maintenanceMessage || null },
      });
    }
    next();
  };
}

module.exports = {
  FEATURE_ERRORS,
  requireClassifiedFeature,
};
