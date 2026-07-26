const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createEventCategorySchema,
  updateEventCategorySchema,
} = require('../src/modules/event-categories/eventCategory.schemas');
const {
  createEventSchema,
  updateEventSchema,
  updateEventStatusSchema,
} = require('../src/modules/events/event.schemas');

const baseEvent = () => ({
  categoryId: 1,
  cityId: 1,
  startsAt: '2030-01-01T08:00:00.000Z',
  endsAt: '2030-01-01T10:00:00.000Z',
  priceType: 'FREE',
  translations: [
    { lang: 'fa', title: 'رویداد نمونه' },
    { lang: 'en', title: 'Sample event' },
  ],
});

test('event category is multilingual and rejects hierarchical fields', () => {
  const valid = createEventCategorySchema.safeParse({
    code: 'technology',
    translations: [
      { lang: 'fa', title: 'فناوری' },
      { lang: 'en', title: 'Technology' },
    ],
  });
  assert.equal(valid.success, true);

  const hierarchical = createEventCategorySchema.safeParse({
    code: 'technology',
    parentId: 12,
    translations: [{ lang: 'fa', title: 'فناوری' }],
  });
  assert.equal(hierarchical.success, false);

  const duplicateLanguage = createEventCategorySchema.safeParse({
    code: 'technology',
    translations: [
      { lang: 'fa', title: 'فناوری' },
      { lang: 'fa', title: 'تکنولوژی' },
    ],
  });
  assert.equal(duplicateLanguage.success, false);
});

test('event validation enforces dates, coordinates, and paid price', () => {
  assert.equal(createEventSchema.safeParse(baseEvent()).success, true);
  assert.equal(createEventSchema.safeParse({ ...baseEvent(), startsAt: null }).success, false);

  const invalidDate = baseEvent();
  invalidDate.endsAt = invalidDate.startsAt;
  assert.equal(createEventSchema.safeParse(invalidDate).success, false);

  const missingLongitude = { ...baseEvent(), latitude: 38.57 };
  assert.equal(createEventSchema.safeParse(missingLongitude).success, false);

  const paidWithoutPrice = { ...baseEvent(), priceType: 'PAID' };
  assert.equal(createEventSchema.safeParse(paidWithoutPrice).success, false);

  const paid = { ...baseEvent(), priceType: 'PAID', price: 150 };
  assert.equal(createEventSchema.safeParse(paid).success, true);
});

test('event create and update keep ownership, currency, and status outside generic payloads', () => {
  assert.equal(createEventSchema.safeParse({ ...baseEvent(), currency: 'USD' }).success, false);
  assert.equal(createEventSchema.safeParse({ ...baseEvent(), status: 'PUBLISHED' }).success, false);
  assert.equal(createEventSchema.safeParse({ ...baseEvent(), organizerType: 'BUSINESS' }).success, false);
  assert.equal(updateEventSchema.safeParse({ status: 'PUBLISHED' }).success, false);
  assert.equal(updateEventSchema.safeParse({ currency: 'USD' }).success, false);
});

test('event status changes use the dedicated status schema', () => {
  assert.equal(updateEventStatusSchema.safeParse({ status: 'PUBLISHED', note: 'Ready' }).success, true);
  assert.equal(updateEventStatusSchema.safeParse({ status: 'UNKNOWN' }).success, false);
  assert.equal(updateEventCategorySchema.safeParse({}).success, false);
});
