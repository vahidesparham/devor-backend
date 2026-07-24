const test = require('node:test');
const assert = require('node:assert/strict');

const {
  assertValidCategoryParent,
  collectDescendantCategoryIds,
  getCategoryPath,
  isCategoryPubliclySelectable,
  resolveInheritedClassifiedAttributes,
  wouldCreateCategoryCycle,
} = require('../src/modules/classifieds-domain/classifiedCategoryHierarchy');
const {
  OWNER_TYPES,
  appUserOwnerContext,
  assertCanManageClassified,
  canManageClassified,
  mapClassifiedOwner,
  validateClassifiedOwnerReferences,
} = require('../src/modules/classifieds-domain/classifiedOwnership');
const {
  STATUSES,
  assertClassifiedTransition,
  canTransitionClassified,
  classifiedPublicationExpiry,
  hasMaterialClassifiedChanges,
  isClassifiedPubliclyVisible,
} = require('../src/modules/classifieds-domain/classifiedLifecycle');
const {
  evaluateClassifiedReadiness,
} = require('../src/modules/classifieds-domain/classifiedReadiness');
const {
  DEFAULT_CLASSIFIED_SETTINGS,
  validateClassifiedSettings,
} = require('../src/modules/classifieds-domain/classifiedSettings');

const categories = [
  { id: 1, parentId: null, title: 'Root', isActive: true, allowAds: false },
  { id: 2, parentId: 1, title: 'Vehicles', isActive: true, allowAds: false },
  { id: 3, parentId: 2, title: 'Cars', isActive: true, allowAds: true },
  { id: 4, parentId: 1, title: 'Inactive', isActive: false, allowAds: true },
];

test('classified category hierarchy resolves descendants and root-first paths', () => {
  assert.deepEqual(collectDescendantCategoryIds(categories, 1).sort(), [1, 2, 3, 4]);
  assert.deepEqual(getCategoryPath(categories, 3).map((item) => item.id), [1, 2, 3]);
  assert.equal(isCategoryPubliclySelectable(categories, 3), true);
  assert.equal(isCategoryPubliclySelectable(categories, 2), false);
  assert.equal(isCategoryPubliclySelectable(categories, 4), false);
});

test('classified category selection always requires a leaf category', () => {
  const rows = [
    ...categories,
    { id: 5, parentId: 3, title: 'Sedan', isActive: true, allowAds: true },
  ];
  assert.equal(isCategoryPubliclySelectable(rows, 3), false);
  assert.equal(isCategoryPubliclySelectable(rows, 5), true);
});

test('classified category hierarchy rejects self and descendant parents', () => {
  assert.equal(wouldCreateCategoryCycle(categories, 2, 2), true);
  assert.equal(wouldCreateCategoryCycle(categories, 2, 3), true);
  assert.equal(wouldCreateCategoryCycle(categories, 3, 1), false);
  assert.throws(() => assertValidCategoryParent(categories, 2, 3), {
    code: 'CLASSIFIED_CATEGORY_CYCLE',
  });
});

test('classified attributes inherit root-to-leaf and reject incompatible overrides', () => {
  const attributes = [
    { id: 1, categoryId: 1, code: 'condition', type: 'SELECT', isActive: true, displayOrder: 10 },
    { id: 2, categoryId: 3, code: 'mileage', type: 'NUMBER', isActive: true, displayOrder: 20 },
  ];
  assert.deepEqual(
    resolveInheritedClassifiedAttributes(categories, attributes, 3).map((item) => item.code),
    ['condition', 'mileage'],
  );

  assert.throws(
    () => resolveInheritedClassifiedAttributes(categories, [
      ...attributes,
      { id: 3, categoryId: 3, code: 'condition', type: 'TEXT', isActive: true, displayOrder: 30 },
    ], 3),
    { code: 'CLASSIFIED_ATTRIBUTE_TYPE_CONFLICT' },
  );
});

test('classified ownership enforces exactly one server-owned owner reference', () => {
  assert.deepEqual(
    validateClassifiedOwnerReferences({ ownerType: OWNER_TYPES.APP_USER, appUserId: 7 }),
    { ownerType: OWNER_TYPES.APP_USER, appUserId: 7, businessId: null },
  );
  assert.throws(
    () => validateClassifiedOwnerReferences({ ownerType: OWNER_TYPES.APP_USER, appUserId: 7, businessId: 2 }),
    { code: 'CLASSIFIED_OWNER_INVALID' },
  );
  assert.throws(
    () => validateClassifiedOwnerReferences({ ownerType: OWNER_TYPES.BUSINESS, businessId: 2 }),
    { code: 'CLASSIFIED_BUSINESS_POSTING_DISABLED' },
  );
  assert.deepEqual(
    validateClassifiedOwnerReferences(
      { ownerType: OWNER_TYPES.BUSINESS, businessId: 2 },
      { allowBusinessClassifieds: true },
    ),
    { ownerType: OWNER_TYPES.BUSINESS, appUserId: null, businessId: 2 },
  );
});

test('classified ownership checks management access and maps a stable public owner', () => {
  const context = appUserOwnerContext({ id: 7 });
  const ad = {
    ownerType: OWNER_TYPES.APP_USER,
    appUserId: 7,
    appUser: { id: 7, firstName: 'Vahid', lastName: 'Esparham', avatar: null, isActive: true },
  };
  assert.equal(canManageClassified(context, ad), true);
  assert.doesNotThrow(() => assertCanManageClassified(context, ad));
  assert.throws(() => assertCanManageClassified(appUserOwnerContext({ id: 8 }), ad), {
    code: 'CLASSIFIED_FORBIDDEN',
  });
  assert.deepEqual(mapClassifiedOwner(ad), {
    type: OWNER_TYPES.APP_USER,
    id: 7,
    displayName: 'Vahid Esparham',
    avatar: null,
    isVerified: true,
  });
});

test('classified lifecycle allows explicit transitions and rejects shortcuts', () => {
  assert.equal(canTransitionClassified(STATUSES.DRAFT, STATUSES.PENDING_REVIEW), true);
  assert.equal(canTransitionClassified(STATUSES.DRAFT, STATUSES.PUBLISHED), false);
  assert.doesNotThrow(() => assertClassifiedTransition(STATUSES.PUBLISHED, STATUSES.SOLD));
  assert.doesNotThrow(() => assertClassifiedTransition(STATUSES.SUSPENDED, STATUSES.EXPIRED));
  assert.throws(() => assertClassifiedTransition(STATUSES.ARCHIVED, STATUSES.PUBLISHED), {
    code: 'CLASSIFIED_TRANSITION_NOT_ALLOWED',
  });
});

test('classified lifecycle calculates expiry, material changes, and public visibility', () => {
  const publishedAt = new Date('2026-01-01T00:00:00.000Z');
  assert.equal(classifiedPublicationExpiry(publishedAt, 30).toISOString(), '2026-01-31T00:00:00.000Z');
  assert.equal(hasMaterialClassifiedChanges({ title: 'Changed' }), true);
  assert.equal(hasMaterialClassifiedChanges({ version: 2 }), false);
  assert.equal(isClassifiedPubliclyVisible({
    status: STATUSES.PUBLISHED,
    publishedAt,
    expiresAt: new Date('2026-02-01T00:00:00.000Z'),
    deletedAt: null,
  }, new Date('2026-01-15T00:00:00.000Z')), true);
  assert.equal(isClassifiedPubliclyVisible({
    status: STATUSES.PUBLISHED,
    publishedAt,
    expiresAt: new Date('2026-01-10T00:00:00.000Z'),
    deletedAt: null,
  }, new Date('2026-01-15T00:00:00.000Z')), false);
});

function readyFixture(overrides = {}) {
  return {
    settings: DEFAULT_CLASSIFIED_SETTINGS,
    ad: {
      ownerType: 'APP_USER',
      appUserId: 7,
      businessId: null,
      title: 'Clean used car',
      description: 'A detailed plain text description.',
      priceType: 'FIXED',
      price: 25000,
      countryId: 1,
      cityId: 2,
      areaId: 3,
      contactPhone: '9363490020',
      allowPhone: true,
      allowChat: false,
    },
    owner: { id: 7, isActive: true },
    category: categories[2],
    categoryPath: categories.slice(0, 3),
    country: { id: 1, isActive: true },
    city: { id: 2, countryId: 1, isActive: true },
    area: { id: 3, cityId: 2, isActive: true },
    images: [{ id: 1 }],
    attributes: [
      {
        id: 10,
        code: 'condition',
        title: 'Condition',
        type: 'SELECT',
        isRequired: true,
        isActive: true,
        options: [{ id: 100 }],
      },
      { id: 11, code: 'mileage', title: 'Mileage', type: 'NUMBER', isRequired: true, isActive: true, minValue: 0 },
    ],
    values: [
      { attributeId: 10, optionId: 100 },
      { attributeId: 11, numberValue: 120000 },
    ],
    ...overrides,
  };
}

test('classified readiness accepts a complete, typed, single-language ad', () => {
  assert.deepEqual(evaluateClassifiedReadiness(readyFixture()), {
    ready: true,
    issues: [],
  });
});

test('classified readiness reports actionable field issues', () => {
  const fixture = readyFixture({
    ad: {
      ...readyFixture().ad,
      description: '<b>html</b>',
      priceType: 'FREE',
      price: 1,
      allowPhone: false,
      allowChat: false,
    },
    images: [],
    values: [],
  });
  const result = evaluateClassifiedReadiness(fixture);
  const codes = new Set(result.issues.map((item) => item.code));
  assert.equal(result.ready, false);
  assert.equal(codes.has('CLASSIFIED_DESCRIPTION_HTML_NOT_ALLOWED'), true);
  assert.equal(codes.has('CLASSIFIED_PRICE_MUST_BE_EMPTY'), true);
  assert.equal(codes.has('CLASSIFIED_CONTACT_METHOD_REQUIRED'), true);
  assert.equal(codes.has('CLASSIFIED_IMAGE_REQUIRED'), true);
  assert.equal(codes.has('CLASSIFIED_ATTRIBUTE_REQUIRED'), true);
});

test('classified readiness rejects rows that mix typed value representations', () => {
  const fixture = readyFixture({
    values: [
      { attributeId: 10, optionId: 100, textValue: 'unexpected' },
      { attributeId: 11, numberValue: 120000 },
    ],
  });
  const result = evaluateClassifiedReadiness(fixture);
  assert.equal(result.ready, false);
  assert.equal(
    result.issues.some((item) => item.code === 'CLASSIFIED_ATTRIBUTE_VALUE_SHAPE_INVALID'),
    true,
  );
});

test('classified settings validation catches unsafe limits', () => {
  assert.deepEqual(validateClassifiedSettings(DEFAULT_CLASSIFIED_SETTINGS), []);
  const issues = validateClassifiedSettings({
    minImagesPerAd: 102,
    maxImagesPerAd: 101,
    maxTitleLength: 121,
    maxDescriptionLength: 10001,
    publicationDays: 0,
  });
  assert.deepEqual(
    new Set(issues.map((item) => item.field)),
    new Set([
      'publicationDays',
      'minImagesPerAd',
      'maxImagesPerAd',
      'maxTitleLength',
      'maxDescriptionLength',
    ]),
  );
});
