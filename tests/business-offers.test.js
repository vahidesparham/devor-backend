const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getEffectiveOfferStatus,
  calculateDiscountedPrice,
  findDiscountRange,
  discountBelongsToRange,
  dateRangesOverlap,
  scopesConflict,
} = require('../src/modules/business-offers/businessOffer.domain');
const {
  createBusinessOfferSchema,
} = require('../src/modules/business-offers/businessOffer.schemas');
const {
  publicOfferRangesQuerySchema,
  publicOfferBusinessListQuerySchema,
} = require('../src/modules/app-public/appPublic.schemas');

const baseOffer = {
  businessId: 1,
  categoryId: null,
  offeringIds: [],
  image: null,
  discountPercent: 20,
  scope: 'ALL',
  publicationStatus: 'PUBLISHED',
  startsAt: '2026-07-01T00:00:00.000Z',
  endsAt: '2026-08-01T00:00:00.000Z',
  displayOrder: 10,
  translations: [{ lang: 'fa', title: 'تخفیف تابستانی', isActive: true }],
};

test('business offer status is derived from publication and schedule', () => {
  const now = new Date('2026-07-15T00:00:00.000Z');

  assert.equal(getEffectiveOfferStatus({ ...baseOffer, publicationStatus: 'DRAFT' }, now), 'DRAFT');
  assert.equal(getEffectiveOfferStatus({ ...baseOffer, publicationStatus: 'PAUSED' }, now), 'PAUSED');
  assert.equal(getEffectiveOfferStatus(baseOffer, now), 'ACTIVE');
  assert.equal(getEffectiveOfferStatus({
    ...baseOffer,
    startsAt: '2026-07-20T00:00:00.000Z',
  }, now), 'SCHEDULED');
  assert.equal(getEffectiveOfferStatus({
    ...baseOffer,
    endsAt: '2026-07-10T00:00:00.000Z',
  }, now), 'EXPIRED');
});

test('percentage discounts preserve the base price and round the effective price', () => {
  assert.equal(calculateDiscountedPrice(100, 20), 80);
  assert.equal(calculateDiscountedPrice(49.99, 15), 42.49);
  assert.equal(calculateDiscountedPrice(null, 20), null);
});

test('discount ranges classify each business by one maximum active percentage', () => {
  assert.equal(findDiscountRange(10)?.key, 'UP_TO_10');
  assert.equal(findDiscountRange(11)?.key, 'FROM_11_TO_20');
  assert.equal(findDiscountRange(30)?.key, 'FROM_21_TO_30');
  assert.equal(findDiscountRange(50)?.key, 'FROM_31_TO_50');
  assert.equal(findDiscountRange(51)?.key, 'OVER_50');
  assert.equal(discountBelongsToRange(100, 'OVER_50'), true);
  assert.equal(discountBelongsToRange(20, 'FROM_21_TO_30'), false);
});

test('public offer queries validate range keys and pagination', () => {
  assert.equal(publicOfferRangesQuerySchema.safeParse({ lang: 'fa', cityId: '26' }).success, true);
  assert.equal(publicOfferBusinessListQuerySchema.safeParse({
    lang: 'fa',
    rangeKey: 'FROM_21_TO_30',
    page: '1',
    pageSize: '20',
  }).success, true);
  assert.equal(publicOfferBusinessListQuerySchema.safeParse({
    rangeKey: 'UNKNOWN',
  }).success, false);
});

test('offer overlap detects actual shared scope', () => {
  assert.equal(scopesConflict(
    { scope: 'ALL', offeringIds: [] },
    { scope: 'OFFERINGS', offeringIds: [4] },
  ), true);
  assert.equal(scopesConflict(
    { scope: 'CATEGORY', categoryId: 7 },
    { scope: 'OFFERINGS', offeringIds: [4], offeringCategoryIds: [7] },
  ), true);
  assert.equal(scopesConflict(
    { scope: 'OFFERINGS', offeringIds: [4, 5] },
    { scope: 'OFFERINGS', offeringIds: [6] },
  ), false);
  assert.equal(dateRangesOverlap(
    '2026-07-01T00:00:00.000Z',
    '2026-07-10T00:00:00.000Z',
    '2026-07-10T00:00:00.000Z',
    '2026-07-20T00:00:00.000Z',
  ), false);
});

test('offer validation requires a valid percentage, date range and scope target', () => {
  assert.equal(createBusinessOfferSchema.safeParse(baseOffer).success, true);
  assert.equal(createBusinessOfferSchema.safeParse({ ...baseOffer, discountPercent: 0 }).success, false);
  assert.equal(createBusinessOfferSchema.safeParse({
    ...baseOffer,
    scope: 'CATEGORY',
    categoryId: null,
  }).success, false);
  assert.equal(createBusinessOfferSchema.safeParse({
    ...baseOffer,
    startsAt: baseOffer.endsAt,
  }).success, false);
});
