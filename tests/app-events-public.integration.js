const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const prisma = require('../src/prisma');
const {
  endExpiredEvents,
} = require('../src/modules/events/eventLifecycle.service');

test('public event API localizes, filters, paginates, and hides unavailable events', async (t) => {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const requestedLang = `zz-${suffix.slice(-10)}`;
  const created = {
    adminId: null,
    languageCode: null,
    fallbackLanguageCode: null,
    createdFallbackLanguage: false,
    countryId: null,
    categoryId: null,
    eventIds: [],
  };
  let server;

  try {
    let fallbackLanguage = await prisma.language.findFirst({
      where: { isActive: true, isDefault: true },
      orderBy: { id: 'asc' },
      select: { code: true },
    });
    if (!fallbackLanguage) {
      fallbackLanguage = await prisma.language.findFirst({
        where: { isActive: true },
        orderBy: { id: 'asc' },
        select: { code: true },
      });
    }
    if (!fallbackLanguage) {
      fallbackLanguage = await prisma.language.create({
        data: {
          code: `fb-${suffix.slice(-10)}`,
          name: `Fallback ${suffix}`,
          nativeName: 'Fallback',
          isActive: true,
          isDefault: true,
        },
        select: { code: true },
      });
      created.createdFallbackLanguage = true;
    }
    created.fallbackLanguageCode = fallbackLanguage.code;

    await prisma.language.create({
      data: {
        code: requestedLang,
        name: `Requested ${suffix}`,
        nativeName: 'Requested',
        isActive: true,
        isDefault: false,
      },
    });
    created.languageCode = requestedLang;

    const admin = await prisma.adminUser.create({
      data: {
        email: `public.events.${suffix}@example.test`,
        passwordHash: 'integration-test-not-login-capable',
        firstName: 'Public',
        lastName: 'Events',
        isActive: true,
      },
    });
    created.adminId = admin.id;

    const country = await prisma.country.create({
      data: {
        code: `E${suffix.slice(-8)}`,
        title: `Event country ${suffix}`,
        phoneCode: '+992',
        isActive: true,
        cities: {
          create: {
            code: `event_city_${suffix}`,
            title: `Event city ${suffix}`,
            isActive: true,
            areas: {
              create: {
                code: `event_area_${suffix}`,
                title: `Event area ${suffix}`,
                isActive: true,
              },
            },
          },
        },
      },
      include: {
        cities: {
          include: { areas: true },
        },
      },
    });
    created.countryId = country.id;
    const city = country.cities[0];
    const area = city.areas[0];

    await prisma.cityTranslation.createMany({
      data: [
        {
          cityId: city.id,
          lang: fallbackLanguage.code,
          title: 'Fallback city',
          isActive: true,
        },
        {
          cityId: city.id,
          lang: requestedLang,
          title: 'Requested city',
          isActive: true,
        },
      ],
    });
    await prisma.areaTranslation.createMany({
      data: [
        {
          areaId: area.id,
          lang: fallbackLanguage.code,
          title: 'Fallback area',
          isActive: true,
        },
        {
          areaId: area.id,
          lang: requestedLang,
          title: 'Requested area',
          isActive: true,
        },
      ],
    });

    const category = await prisma.eventCategory.create({
      data: {
        code: `public-events-${suffix}`,
        displayOrder: 10,
        isActive: true,
        translations: {
          create: [
            {
              lang: fallbackLanguage.code,
              title: 'Fallback category',
              isActive: true,
            },
            {
              lang: requestedLang,
              title: 'Requested category',
              isActive: true,
            },
          ],
        },
      },
    });
    created.categoryId = category.id;

    const now = new Date();
    const hour = 60 * 60 * 1000;
    const baseEventData = {
      categoryId: category.id,
      cityId: city.id,
      areaId: area.id,
      createdByAdminId: admin.id,
      organizerType: 'ADMIN',
      currency: 'TJS',
      isActive: true,
    };

    async function createEvent(data) {
      const event = await prisma.event.create({ data });
      created.eventIds.push(event.id);
      return event;
    }

    const requestedEvent = await createEvent({
      ...baseEventData,
      startsAt: new Date(now.getTime() + (24 * hour)),
      endsAt: new Date(now.getTime() + (27 * hour)),
      priceType: 'PAID',
      price: 125,
      isFeatured: true,
      status: 'PUBLISHED',
      publishedAt: new Date(now.getTime() - hour),
      contactPhone: '+992900000001',
      latitude: 38.573,
      longitude: 68.786,
      translations: {
        create: {
          lang: requestedLang,
          title: `Requested public event ${suffix}`,
          summary: 'Requested summary',
          description: 'Requested description',
          address: 'Requested address',
          isActive: true,
        },
      },
    });
    const fallbackEvent = await createEvent({
      ...baseEventData,
      startsAt: new Date(now.getTime() + (48 * hour)),
      endsAt: new Date(now.getTime() + (51 * hour)),
      priceType: 'FREE',
      isFeatured: false,
      status: 'PUBLISHED',
      publishedAt: new Date(now.getTime() - (2 * hour)),
      translations: {
        create: {
          lang: fallbackLanguage.code,
          title: `Fallback public event ${suffix}`,
          summary: 'Fallback summary',
          isActive: true,
        },
      },
    });
    const expiredEvent = await createEvent({
      ...baseEventData,
      startsAt: new Date(now.getTime() - (4 * hour)),
      endsAt: new Date(now.getTime() - hour),
      status: 'PUBLISHED',
      publishedAt: new Date(now.getTime() - (5 * hour)),
      translations: {
        create: {
          lang: requestedLang,
          title: `Expired event ${suffix}`,
          isActive: true,
        },
      },
    });
    await createEvent({
      ...baseEventData,
      startsAt: new Date(now.getTime() + (72 * hour)),
      endsAt: new Date(now.getTime() + (75 * hour)),
      status: 'DRAFT',
      translations: {
        create: {
          lang: requestedLang,
          title: `Draft event ${suffix}`,
          isActive: true,
        },
      },
    });
    await createEvent({
      ...baseEventData,
      startsAt: new Date(now.getTime() + (96 * hour)),
      endsAt: new Date(now.getTime() + (99 * hour)),
      status: 'PUBLISHED',
      isActive: false,
      publishedAt: new Date(),
      translations: {
        create: {
          lang: requestedLang,
          title: `Inactive event ${suffix}`,
          isActive: true,
        },
      },
    });

    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}/v1/app/events`;

    async function request(path) {
      const response = await fetch(`${baseUrl}${path}`);
      return {
        status: response.status,
        payload: await response.json(),
      };
    }

    const categories = await request(`/categories?lang=${requestedLang}`);
    assert.equal(categories.status, 200);
    const localizedCategory = categories.payload.data.find((item) => item.id === category.id);
    assert.equal(localizedCategory.title, 'Requested category');
    assert.equal(localizedCategory.lang, requestedLang);

    const pageOne = await request(
      `?lang=${requestedLang}&categoryId=${category.id}&cityId=${city.id}&areaId=${area.id}&page=1&pageSize=1`,
    );
    assert.equal(pageOne.status, 200);
    assert.equal(pageOne.payload.meta.total, 2);
    assert.equal(pageOne.payload.meta.pageCount, 2);
    assert.equal(pageOne.payload.data[0].id, requestedEvent.id);
    assert.equal(pageOne.payload.data[0].city.title, 'Requested city');
    assert.equal(pageOne.payload.data[0].area.title, 'Requested area');

    const pageTwo = await request(
      `?lang=${requestedLang}&categoryId=${category.id}&page=2&pageSize=1`,
    );
    assert.equal(pageTwo.status, 200);
    assert.equal(pageTwo.payload.data[0].id, fallbackEvent.id);
    assert.equal(pageTwo.payload.data[0].lang, fallbackLanguage.code);
    assert.equal(pageTwo.payload.data[0].title, `Fallback public event ${suffix}`);

    const paidFeatured = await request(
      `?lang=${requestedLang}&categoryId=${category.id}&priceType=PAID&isFeatured=true`,
    );
    assert.equal(paidFeatured.status, 200);
    assert.deepEqual(paidFeatured.payload.data.map((item) => item.id), [requestedEvent.id]);

    const dateFiltered = await request(
      `?lang=${requestedLang}&categoryId=${category.id}&startFrom=${encodeURIComponent(new Date(now.getTime() + (20 * hour)).toISOString())}&startTo=${encodeURIComponent(new Date(now.getTime() + (30 * hour)).toISOString())}`,
    );
    assert.equal(dateFiltered.status, 200);
    assert.deepEqual(dateFiltered.payload.data.map((item) => item.id), [requestedEvent.id]);

    const detail = await request(`/${requestedEvent.id}?lang=${requestedLang}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.payload.data.description, 'Requested description');
    assert.equal(detail.payload.data.price, 125);
    assert.equal(detail.payload.data.currency, 'TJS');
    assert.deepEqual(detail.payload.data.location, {
      latitude: 38.573,
      longitude: 68.786,
    });

    const expiredDetail = await request(`/${expiredEvent.id}?lang=${requestedLang}`);
    assert.equal(expiredDetail.status, 404);
    assert.equal(expiredDetail.payload.code, 'EVENT_NOT_FOUND');

    const invalidLanguage = await request('?lang=xx-missing');
    assert.equal(invalidLanguage.status, 400);
    assert.equal(invalidLanguage.payload.code, 'LANGUAGE_NOT_AVAILABLE');

    const scopedDb = {
      event: {
        findMany: (args) => prisma.event.findMany({
          ...args,
          where: {
            AND: [
              args.where,
              { id: expiredEvent.id },
            ],
          },
        }),
        updateMany: (args) => prisma.event.updateMany({
          ...args,
          where: {
            AND: [
              args.where,
              { id: expiredEvent.id },
            ],
          },
        }),
      },
    };
    const lifecycle = await endExpiredEvents({ now: new Date(), db: scopedDb });
    assert.equal(lifecycle.endedCount, 1);
    const refreshedExpired = await prisma.event.findUnique({
      where: { id: expiredEvent.id },
      select: { status: true },
    });
    const refreshedFuture = await prisma.event.findUnique({
      where: { id: requestedEvent.id },
      select: { status: true },
    });
    assert.equal(refreshedExpired.status, 'ENDED');
    assert.equal(refreshedFuture.status, 'PUBLISHED');
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (created.eventIds.length) {
      await prisma.event.deleteMany({ where: { id: { in: created.eventIds } } });
    }
    if (created.categoryId) {
      await prisma.eventCategory.delete({ where: { id: created.categoryId } }).catch(() => {});
    }
    if (created.countryId) {
      await prisma.country.delete({ where: { id: created.countryId } }).catch(() => {});
    }
    if (created.adminId) {
      await prisma.adminUser.delete({ where: { id: created.adminId } }).catch(() => {});
    }
    if (created.languageCode) {
      await prisma.language.delete({ where: { code: created.languageCode } }).catch(() => {});
    }
    if (created.createdFallbackLanguage && created.fallbackLanguageCode) {
      await prisma.language.delete({ where: { code: created.fallbackLanguageCode } }).catch(() => {});
    }
  }
});

test.after(async () => {
  await prisma.$disconnect();
});
