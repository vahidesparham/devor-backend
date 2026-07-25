const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createClassifiedAttributeSchema,
  updateClassifiedAttributeSchema,
} = require('../src/modules/classified-attributes/classifiedAttribute.schemas');

function baseAttribute(overrides = {}) {
  return {
    categoryId: 1,
    code: 'brand',
    title: 'Brand',
    type: 'SELECT',
    displayOrder: 10,
    options: [
      {
        code: 'apple',
        title: 'Apple',
        color: '#111827',
        displayOrder: 10,
        isActive: true,
      },
    ],
    ...overrides,
  };
}

test('classified attribute create accepts inline selection options', () => {
  const result = createClassifiedAttributeSchema.parse(baseAttribute());

  assert.equal(result.options.length, 1);
  assert.equal(result.options[0].code, 'apple');
});

test('classified attribute rejects duplicate inline option codes', () => {
  const result = createClassifiedAttributeSchema.safeParse(baseAttribute({
    options: [
      { code: 'apple', title: 'Apple' },
      { code: 'apple', title: 'Apple Pro' },
    ],
  }));

  assert.equal(result.success, false);
  assert.deepEqual(result.error.issues[0].path, ['options', 1, 'code']);
});

test('classified attribute rejects options for a non-selection type', () => {
  const result = updateClassifiedAttributeSchema.safeParse({
    type: 'TEXT',
    options: [{ code: 'unexpected', title: 'Unexpected' }],
  });

  assert.equal(result.success, false);
  assert.deepEqual(result.error.issues[0].path, ['options']);
});

test('classified attribute accepts dependent options with parent mappings', () => {
  const result = createClassifiedAttributeSchema.parse(baseAttribute({
    code: 'model',
    dependsOnAttributeId: 9,
    options: [
      {
        code: 'camry',
        title: 'Camry',
        parentOptionId: 91,
      },
    ],
  }));

  assert.equal(result.dependsOnAttributeId, 9);
  assert.equal(result.options[0].parentOptionId, 91);
});

test('classified attribute requires a parent mapping for dependent options', () => {
  const result = createClassifiedAttributeSchema.safeParse(baseAttribute({
    code: 'model',
    dependsOnAttributeId: 9,
  }));

  assert.equal(result.success, false);
  assert.deepEqual(result.error.issues[0].path, ['options', 0, 'parentOptionId']);
});
