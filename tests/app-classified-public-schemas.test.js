const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createAdSchema,
  publicAdListSchema,
  publicCategoryListSchema,
} = require('../src/modules/app-classifieds/appClassified.schemas');
const {
  publicAreaListQuerySchema,
} = require('../src/modules/app-public/appPublic.schemas');

test('public category list accepts roots and positive parent IDs', () => {
  assert.equal(publicCategoryListSchema.safeParse({}).success, true);

  const childQuery = publicCategoryListSchema.safeParse({ parentId: '72' });
  assert.equal(childQuery.success, true);
  assert.equal(childQuery.data.parentId, 72);
});

test('public category list rejects invalid parent IDs', () => {
  assert.equal(
    publicCategoryListSchema.safeParse({ parentId: '0' }).success,
    false,
  );
  assert.equal(
    publicCategoryListSchema.safeParse({ parentId: 'invalid' }).success,
    false,
  );
});

test('public ad filters parse price range and multiple neighborhoods', () => {
  const result = publicAdListSchema.safeParse({
    minPrice: '1000',
    maxPrice: '5000',
    areaIds: '2,4,8',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.minPrice, 1000);
  assert.equal(result.data.maxPrice, 5000);
  assert.deepEqual(result.data.areaIds, [2, 4, 8]);
});

test('public ad filters reject an inverted price range', () => {
  assert.equal(
    publicAdListSchema.safeParse({ minPrice: '5000', maxPrice: '1000' }).success,
    false,
  );
});

test('public ad filters parse typed classified attribute filters', () => {
  const result = publicAdListSchema.safeParse({
    categoryId: '73',
    attributeFilters: JSON.stringify([
      { attributeId: 43, optionIds: [1, 2] },
      { attributeId: 44, minNumber: 2000, maxNumber: 2025 },
      { attributeId: 46, booleanValue: true },
    ]),
  });

  assert.equal(result.success, true);
  assert.deepEqual(result.data.attributeFilters, [
    { attributeId: 43, optionIds: [1, 2] },
    { attributeId: 44, minNumber: 2000, maxNumber: 2025 },
    { attributeId: 46, booleanValue: true },
  ]);
});

test('public classified attribute filters require a category and one value type', () => {
  assert.equal(
    publicAdListSchema.safeParse({
      attributeFilters: JSON.stringify([
        { attributeId: 43, optionIds: [1] },
      ]),
    }).success,
    false,
  );
  assert.equal(
    publicAdListSchema.safeParse({
      categoryId: 73,
      attributeFilters: JSON.stringify([
        { attributeId: 43, optionIds: [1], booleanValue: true },
      ]),
    }).success,
    false,
  );
});

test('new classified ads require a neighborhood', () => {
  const result = createAdSchema.safeParse({
    categoryId: 1,
    countryId: 1,
    cityId: 1,
  });

  assert.equal(result.success, false);
  assert.equal(
    result.error.issues.some((item) => item.path.join('.') === 'areaId'),
    true,
  );
});

test('public neighborhood list requires a city', () => {
  assert.equal(publicAreaListQuerySchema.safeParse({ cityId: '26' }).success, true);
  assert.equal(publicAreaListQuerySchema.safeParse({}).success, false);
});
