const { AppError } = require('../../shared/http/response');

const OWNER_TYPES = Object.freeze({
  APP_USER: 'APP_USER',
  BUSINESS: 'BUSINESS',
});

function normalizeId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validateClassifiedOwnerReferences(owner, { allowBusinessClassifieds = false } = {}) {
  const ownerType = owner?.ownerType;
  const appUserId = normalizeId(owner?.appUserId);
  const businessId = normalizeId(owner?.businessId);

  if (ownerType === OWNER_TYPES.APP_USER && appUserId && !businessId) {
    return { ownerType, appUserId, businessId: null };
  }

  if (ownerType === OWNER_TYPES.BUSINESS && businessId && !appUserId) {
    if (!allowBusinessClassifieds) {
      throw new AppError(403, 'CLASSIFIED_BUSINESS_POSTING_DISABLED', 'Business classified posting is not enabled');
    }
    return { ownerType, appUserId: null, businessId };
  }

  throw new AppError(
    400,
    'CLASSIFIED_OWNER_INVALID',
    'A classified ad must have exactly one owner matching its owner type',
  );
}

function appUserOwnerContext(appUser) {
  const appUserId = normalizeId(appUser?.id);
  if (!appUserId) throw new AppError(401, 'UNAUTHORIZED', 'Authenticated app user is required');
  return { ownerType: OWNER_TYPES.APP_USER, appUserId, businessId: null };
}

function businessOwnerContext({ businessId, businessUserId }) {
  const normalizedBusinessId = normalizeId(businessId);
  const normalizedBusinessUserId = normalizeId(businessUserId);
  if (!normalizedBusinessId || !normalizedBusinessUserId) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authenticated business membership is required');
  }
  return {
    ownerType: OWNER_TYPES.BUSINESS,
    appUserId: null,
    businessId: normalizedBusinessId,
    businessUserId: normalizedBusinessUserId,
  };
}

function canManageClassified(ownerContext, ad) {
  if (!ownerContext || !ad || ownerContext.ownerType !== ad.ownerType) return false;
  if (ownerContext.ownerType === OWNER_TYPES.APP_USER) {
    return normalizeId(ownerContext.appUserId) === normalizeId(ad.appUserId);
  }
  if (ownerContext.ownerType === OWNER_TYPES.BUSINESS) {
    return normalizeId(ownerContext.businessId) === normalizeId(ad.businessId);
  }
  return false;
}

function assertCanManageClassified(ownerContext, ad) {
  if (!canManageClassified(ownerContext, ad)) {
    throw new AppError(403, 'CLASSIFIED_FORBIDDEN', 'You cannot manage this classified ad');
  }
}

function displayName(entity, fallback) {
  if (!entity) return fallback;
  if (entity.displayName) return entity.displayName;
  const fullName = [entity.firstName, entity.lastName].filter(Boolean).join(' ').trim();
  return fullName || entity.title || entity.phone || fallback;
}

function mapClassifiedOwner(ad) {
  if (ad.ownerType === OWNER_TYPES.APP_USER && ad.appUser) {
    return {
      type: OWNER_TYPES.APP_USER,
      id: ad.appUser.id,
      displayName: displayName(ad.appUser, 'App user'),
      avatar: ad.appUser.avatar || null,
      isVerified: ad.appUser.isActive === true,
    };
  }

  if (ad.ownerType === OWNER_TYPES.BUSINESS && ad.business) {
    return {
      type: OWNER_TYPES.BUSINESS,
      id: ad.business.id,
      displayName: displayName(ad.business, 'Business'),
      avatar: ad.business.logoImage || null,
      isVerified: ad.business.isActive === true,
    };
  }

  throw new AppError(500, 'CLASSIFIED_OWNER_BROKEN', 'Classified owner data is incomplete');
}

module.exports = {
  OWNER_TYPES,
  appUserOwnerContext,
  assertCanManageClassified,
  businessOwnerContext,
  canManageClassified,
  mapClassifiedOwner,
  validateClassifiedOwnerReferences,
};
