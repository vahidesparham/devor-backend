const test = require('node:test');
const assert = require('node:assert/strict');
const {
  publicEventCategoryListSchema,
  publicEventDetailQuerySchema,
  publicEventListSchema,
  publicEventParamSchema,
} = require('../src/modules/app-events-public/appEventPublic.schemas');
const {
  endExpiredEvents,
} = require('../src/modules/events/eventLifecycle.service');

test('public event list applies stable defaults and parses supported filters', () => {
  const result = publicEventListSchema.safeParse({
    page: '2',
    pageSize: '10',
    categoryId: '4',
    cityId: '8',
    areaId: '12',
    startFrom: '2030-01-01T00:00:00.000Z',
    startTo: '2030-01-31T23:59:59.000Z',
    priceType: 'PAID',
    isFeatured: 'true',
    sort: 'newest',
    lang: 'FA',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.page, 2);
  assert.equal(result.data.pageSize, 10);
  assert.equal(result.data.categoryId, 4);
  assert.equal(result.data.cityId, 8);
  assert.equal(result.data.areaId, 12);
  assert.equal(result.data.priceType, 'PAID');
  assert.equal(result.data.isFeatured, true);
  assert.equal(result.data.sort, 'newest');
  assert.equal(result.data.lang, 'fa');
  assert.ok(result.data.startFrom instanceof Date);
  assert.ok(result.data.startTo instanceof Date);
});

test('public event schemas reject invalid ranges, enums, and identifiers', () => {
  assert.equal(publicEventListSchema.safeParse({
    startFrom: '2030-02-01T00:00:00.000Z',
    startTo: '2030-01-01T00:00:00.000Z',
  }).success, false);
  assert.equal(publicEventListSchema.safeParse({ priceType: 'NEGOTIABLE' }).success, false);
  assert.equal(publicEventListSchema.safeParse({ pageSize: 51 }).success, false);
  assert.equal(publicEventParamSchema.safeParse({ id: '0' }).success, false);
});

test('public event category and detail language queries stay intentionally small', () => {
  assert.equal(publicEventCategoryListSchema.safeParse({ lang: 'tg' }).success, true);
  assert.equal(publicEventDetailQuerySchema.safeParse({}).success, true);
  assert.equal(publicEventDetailQuerySchema.safeParse({ unexpected: 'value' }).success, false);
});

test('event lifecycle ends only the published due batch', async () => {
  const now = new Date('2030-01-02T00:00:00.000Z');
  const calls = [];
  const db = {
    event: {
      findMany: async (args) => {
        calls.push(['findMany', args]);
        return [{ id: 7 }, { id: 9 }];
      },
      updateMany: async (args) => {
        calls.push(['updateMany', args]);
        return { count: 2 };
      },
    },
  };

  const result = await endExpiredEvents({ now, batchSize: 2, db });

  assert.deepEqual(result, {
    scannedCount: 2,
    endedCount: 2,
    hasMore: true,
  });
  assert.deepEqual(calls[0][1].where, {
    status: 'PUBLISHED',
    endsAt: { lte: now },
  });
  assert.deepEqual(calls[1][1].where.id.in, [7, 9]);
  assert.equal(calls[1][1].data.status, 'ENDED');
});

test('event lifecycle skips writes when no events are due', async () => {
  let updated = false;
  const db = {
    event: {
      findMany: async () => [],
      updateMany: async () => {
        updated = true;
        return { count: 0 };
      },
    },
  };

  const result = await endExpiredEvents({ db });

  assert.deepEqual(result, {
    scannedCount: 0,
    endedCount: 0,
    hasMore: false,
  });
  assert.equal(updated, false);
});
