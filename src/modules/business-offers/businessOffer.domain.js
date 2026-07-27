const EFFECTIVE_STATUSES = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  EXPIRED: 'EXPIRED',
};

const DISCOUNT_RANGES = Object.freeze([
  Object.freeze({ key: 'UP_TO_10', minPercent: 1, maxPercent: 10 }),
  Object.freeze({ key: 'FROM_11_TO_20', minPercent: 11, maxPercent: 20 }),
  Object.freeze({ key: 'FROM_21_TO_30', minPercent: 21, maxPercent: 30 }),
  Object.freeze({ key: 'FROM_31_TO_50', minPercent: 31, maxPercent: 50 }),
  Object.freeze({ key: 'OVER_50', minPercent: 51, maxPercent: 100 }),
]);

function getEffectiveOfferStatus(offer, now = new Date()) {
  if (offer.publicationStatus === 'DRAFT') return EFFECTIVE_STATUSES.DRAFT;
  if (offer.publicationStatus === 'PAUSED') return EFFECTIVE_STATUSES.PAUSED;

  const startsAt = new Date(offer.startsAt);
  const endsAt = new Date(offer.endsAt);
  if (startsAt.getTime() > now.getTime()) return EFFECTIVE_STATUSES.SCHEDULED;
  if (endsAt.getTime() <= now.getTime()) return EFFECTIVE_STATUSES.EXPIRED;
  return EFFECTIVE_STATUSES.ACTIVE;
}

function calculateDiscountedPrice(basePrice, discountPercent) {
  if (basePrice === null || basePrice === undefined) return null;
  const numericPrice = Number(basePrice);
  const numericPercent = Number(discountPercent);
  if (!Number.isFinite(numericPrice) || !Number.isFinite(numericPercent)) return null;
  return Math.round((numericPrice * (100 - numericPercent) / 100) * 100) / 100;
}

function findDiscountRange(value) {
  const percent = Number(value);
  if (!Number.isFinite(percent)) return null;
  return DISCOUNT_RANGES.find(
    (range) => percent >= range.minPercent && percent <= range.maxPercent,
  ) || null;
}

function discountBelongsToRange(value, rangeKey) {
  const range = DISCOUNT_RANGES.find((item) => item.key === rangeKey);
  if (!range) return false;
  const percent = Number(value);
  return Number.isFinite(percent)
    && percent >= range.minPercent
    && percent <= range.maxPercent;
}

function dateRangesOverlap(firstStart, firstEnd, secondStart, secondEnd) {
  return new Date(firstStart).getTime() < new Date(secondEnd).getTime()
    && new Date(firstEnd).getTime() > new Date(secondStart).getTime();
}

function intersects(first, second) {
  const secondSet = new Set(second || []);
  return (first || []).some((value) => secondSet.has(value));
}

function scopesConflict(first, second) {
  if (first.scope === 'ALL' || second.scope === 'ALL') return true;

  if (first.scope === 'CATEGORY' && second.scope === 'CATEGORY') {
    return Number(first.categoryId) === Number(second.categoryId);
  }

  if (first.scope === 'OFFERINGS' && second.scope === 'OFFERINGS') {
    return intersects(first.offeringIds, second.offeringIds);
  }

  const categoryScope = first.scope === 'CATEGORY' ? first : second;
  const offeringScope = first.scope === 'OFFERINGS' ? first : second;
  return (offeringScope.offeringCategoryIds || []).some(
    (categoryId) => Number(categoryId) === Number(categoryScope.categoryId),
  );
}

module.exports = {
  EFFECTIVE_STATUSES,
  DISCOUNT_RANGES,
  getEffectiveOfferStatus,
  calculateDiscountedPrice,
  findDiscountRange,
  discountBelongsToRange,
  dateRangesOverlap,
  scopesConflict,
};
