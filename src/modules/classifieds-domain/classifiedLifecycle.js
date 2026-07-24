const { AppError } = require('../../shared/http/response');

const STATUSES = Object.freeze({
  DRAFT: 'DRAFT',
  PENDING_REVIEW: 'PENDING_REVIEW',
  PUBLISHED: 'PUBLISHED',
  REJECTED: 'REJECTED',
  PAUSED: 'PAUSED',
  SOLD: 'SOLD',
  EXPIRED: 'EXPIRED',
  ARCHIVED: 'ARCHIVED',
  SUSPENDED: 'SUSPENDED',
});

const ALLOWED_TRANSITIONS = Object.freeze({
  [STATUSES.DRAFT]: new Set([STATUSES.PENDING_REVIEW, STATUSES.ARCHIVED]),
  [STATUSES.PENDING_REVIEW]: new Set([STATUSES.PUBLISHED, STATUSES.REJECTED, STATUSES.ARCHIVED]),
  [STATUSES.PUBLISHED]: new Set([
    STATUSES.PENDING_REVIEW,
    STATUSES.PAUSED,
    STATUSES.SOLD,
    STATUSES.EXPIRED,
    STATUSES.ARCHIVED,
    STATUSES.SUSPENDED,
  ]),
  [STATUSES.REJECTED]: new Set([STATUSES.DRAFT, STATUSES.PENDING_REVIEW, STATUSES.ARCHIVED]),
  [STATUSES.PAUSED]: new Set([
    STATUSES.PENDING_REVIEW,
    STATUSES.PUBLISHED,
    STATUSES.EXPIRED,
    STATUSES.ARCHIVED,
    STATUSES.SUSPENDED,
  ]),
  [STATUSES.SOLD]: new Set([STATUSES.ARCHIVED]),
  [STATUSES.EXPIRED]: new Set([STATUSES.PENDING_REVIEW, STATUSES.ARCHIVED]),
  [STATUSES.ARCHIVED]: new Set(),
  [STATUSES.SUSPENDED]: new Set([STATUSES.PUBLISHED, STATUSES.EXPIRED, STATUSES.ARCHIVED]),
});

const MATERIAL_CHANGE_FIELDS = Object.freeze(new Set([
  'categoryId',
  'title',
  'description',
  'priceType',
  'price',
  'countryId',
  'cityId',
  'areaId',
  'latitude',
  'longitude',
  'locationPrecision',
  'contactName',
  'contactPhone',
  'allowPhone',
  'allowChat',
  'images',
  'attributeValues',
]));

function canTransitionClassified(fromStatus, toStatus) {
  return ALLOWED_TRANSITIONS[fromStatus]?.has(toStatus) === true;
}

function assertClassifiedTransition(fromStatus, toStatus) {
  if (!Object.prototype.hasOwnProperty.call(ALLOWED_TRANSITIONS, fromStatus)) {
    throw new AppError(400, 'CLASSIFIED_STATUS_INVALID', `Unknown classified status "${fromStatus}"`);
  }
  if (!Object.prototype.hasOwnProperty.call(ALLOWED_TRANSITIONS, toStatus)) {
    throw new AppError(400, 'CLASSIFIED_STATUS_INVALID', `Unknown classified status "${toStatus}"`);
  }
  if (!canTransitionClassified(fromStatus, toStatus)) {
    throw new AppError(
      409,
      'CLASSIFIED_TRANSITION_NOT_ALLOWED',
      `Classified ad cannot transition from ${fromStatus} to ${toStatus}`,
    );
  }
}

function classifiedPublicationExpiry(publishedAt, publicationDays) {
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, 'CLASSIFIED_PUBLICATION_DATE_INVALID', 'Published date is invalid');
  }
  if (!Number.isInteger(publicationDays) || publicationDays <= 0) {
    throw new AppError(400, 'CLASSIFIED_PUBLICATION_DAYS_INVALID', 'Publication days must be a positive integer');
  }
  date.setUTCDate(date.getUTCDate() + publicationDays);
  return date;
}

function hasMaterialClassifiedChanges(changes) {
  return Object.keys(changes || {}).some((field) => MATERIAL_CHANGE_FIELDS.has(field));
}

function isClassifiedPubliclyVisible(ad, now = new Date()) {
  if (!ad || ad.status !== STATUSES.PUBLISHED || ad.deletedAt) return false;
  if (!ad.publishedAt || !ad.expiresAt) return false;
  const currentTime = new Date(now).getTime();
  const publishedTime = new Date(ad.publishedAt).getTime();
  const expiryTime = new Date(ad.expiresAt).getTime();
  if ([currentTime, publishedTime, expiryTime].some(Number.isNaN)) return false;
  return publishedTime <= currentTime && expiryTime > currentTime;
}

module.exports = {
  ALLOWED_TRANSITIONS,
  MATERIAL_CHANGE_FIELDS,
  STATUSES,
  assertClassifiedTransition,
  canTransitionClassified,
  classifiedPublicationExpiry,
  hasMaterialClassifiedChanges,
  isClassifiedPubliclyVisible,
};
