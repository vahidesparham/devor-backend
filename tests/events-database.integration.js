const test = require('node:test');
const assert = require('node:assert/strict');
const prisma = require('../src/prisma');

test('event phase-one schema persists multilingual categories and admin-owned events', async (t) => {
  const [admin, language, city] = await Promise.all([
    prisma.adminUser.findFirst({ where: { isActive: true }, select: { id: true } }),
    prisma.language.findFirst({ where: { isActive: true }, select: { code: true } }),
    prisma.city.findFirst({ where: { isActive: true }, select: { id: true } }),
  ]);

  if (!admin || !language || !city) {
    t.skip('Seeded admin, language, and city records are required');
    return;
  }

  const code = `event-test-${Date.now()}`;
  let category;
  let event;

  try {
    category = await prisma.eventCategory.create({
      data: {
        code,
        translations: {
          create: {
            lang: language.code,
            title: 'Integration event category',
          },
        },
      },
      include: { translations: true },
    });

    event = await prisma.event.create({
      data: {
        categoryId: category.id,
        cityId: city.id,
        createdByAdminId: admin.id,
        startsAt: new Date('2030-01-01T08:00:00.000Z'),
        endsAt: new Date('2030-01-01T10:00:00.000Z'),
        translations: {
          create: {
            lang: language.code,
            title: 'Integration event',
          },
        },
      },
      include: { translations: true },
    });

    assert.equal(category.translations.length, 1);
    assert.equal(event.translations.length, 1);
    assert.equal(event.organizerType, 'ADMIN');
    assert.equal(event.status, 'DRAFT');
    assert.equal(event.priceType, 'FREE');
    assert.equal(event.currency, 'TJS');
  } finally {
    if (event) await prisma.event.delete({ where: { id: event.id } });
    if (category) await prisma.eventCategory.delete({ where: { id: category.id } });
  }
});

test.after(async () => {
  await prisma.$disconnect();
});
