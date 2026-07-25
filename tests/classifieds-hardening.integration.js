const test = require('node:test');
const assert = require('node:assert/strict');
const prisma = require('../src/prisma');
const categoryService = require('../src/modules/classified-categories/classifiedCategory.service');
const attributeService = require('../src/modules/classified-attributes/classifiedAttribute.service');
const appClassifiedService = require('../src/modules/app-classifieds/appClassified.service');
const {
  expireDueClassifiedAds,
} = require('../src/modules/classifieds-domain/classifiedExpiry.service');

test.after(async () => {
  await prisma.$disconnect();
});

function auditRequest(traceId) {
  return {
    admin: null,
    traceId,
    method: 'TEST',
    originalUrl: '/tests/classified-hardening',
    ip: '127.0.0.1',
    get: () => null,
  };
}

async function createLocation(suffix) {
  return prisma.country.create({
    data: {
      code: `H${suffix.slice(-7)}`,
      title: `Hardening country ${suffix}`,
      phoneCode: '+992',
      isActive: true,
      cities: {
        create: {
          code: `hardening_city_${suffix}`,
          title: `Hardening city ${suffix}`,
          isActive: true,
          areas: {
            create: {
              code: `hardening_area_${suffix}`,
              title: `Hardening area ${suffix}`,
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
}

function baseAdData({
  publicCode,
  categoryId,
  appUserId,
  countryId,
  cityId,
  areaId,
  phone,
}) {
  return {
    publicCode,
    categoryId,
    ownerType: 'APP_USER',
    appUserId,
    businessId: null,
    countryId,
    cityId,
    areaId,
    title: 'Hardening classified ad',
    description: 'A complete classified description used by hardening tests.',
    priceType: 'CONTACT',
    price: null,
    currency: 'TJS',
    contactName: 'Hardening owner',
    contactPhone: phone,
    allowPhone: true,
    allowChat: false,
  };
}

test('classified expiry sweep transitions every due operational state with history', async () => {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  let user;
  let country;
  let category;
  const adIds = [];

  try {
    user = await prisma.appUser.create({
      data: { phone: `+99293${suffix.slice(-7)}`, isActive: true },
    });
    country = await createLocation(suffix);
    const city = country.cities[0];
    const area = city.areas[0];
    category = await prisma.classifiedCategory.create({
      data: {
        code: `expiry_${suffix}`,
        slug: `expiry-${suffix}`,
        title: `Expiry ${suffix}`,
        isActive: true,
        allowAds: true,
      },
    });

    const now = new Date();
    for (const [index, status] of ['PUBLISHED', 'PAUSED', 'SUSPENDED'].entries()) {
      const ad = await prisma.classifiedAd.create({
        data: {
          ...baseAdData({
            publicCode: `EX${index}${suffix.slice(-10)}`,
            categoryId: category.id,
            appUserId: user.id,
            countryId: country.id,
            cityId: city.id,
            areaId: area.id,
            phone: user.phone,
          }),
          status,
          publishedAt: new Date(now.getTime() - 2 * 86400000),
          expiresAt: new Date(now.getTime() - 60000),
        },
      });
      adIds.push(ad.id);
    }
    const futureAd = await prisma.classifiedAd.create({
      data: {
        ...baseAdData({
          publicCode: `EF${suffix.slice(-11)}`,
          categoryId: category.id,
          appUserId: user.id,
          countryId: country.id,
          cityId: city.id,
          areaId: area.id,
          phone: user.phone,
        }),
        status: 'PUBLISHED',
        publishedAt: now,
        expiresAt: new Date(now.getTime() + 86400000),
      },
    });
    adIds.push(futureAd.id);

    const result = await expireDueClassifiedAds({ now });
    assert.equal(result.expiredCount, 3);

    const rows = await prisma.classifiedAd.findMany({
      where: { id: { in: adIds } },
      orderBy: { id: 'asc' },
      select: { id: true, status: true, version: true },
    });
    const dueRows = rows.filter((row) => row.id !== futureAd.id);
    assert.equal(dueRows.every((row) => row.status === 'EXPIRED' && row.version === 2), true);
    assert.equal(rows.find((row) => row.id === futureAd.id).status, 'PUBLISHED');
    assert.equal(await prisma.classifiedAdStatusHistory.count({
      where: {
        adId: { in: adIds },
        actorType: 'SYSTEM',
        reasonCode: 'PUBLICATION_EXPIRED',
      },
    }), 3);
  } finally {
    if (adIds.length) await prisma.classifiedAd.deleteMany({ where: { id: { in: adIds } } });
    if (category?.id) await prisma.classifiedCategory.delete({ where: { id: category.id } }).catch(() => {});
    if (country?.id) await prisma.country.delete({ where: { id: country.id } }).catch(() => {});
    if (user?.id) await prisma.appUser.delete({ where: { id: user.id } }).catch(() => {});
  }
});

test('taxonomy changes cannot invalidate operational classified ads', async () => {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const traceId = `classified-taxonomy-hardening-${suffix}`;
  const req = auditRequest(traceId);
  let user;
  let country;
  let activeRoot;
  let inactiveRoot;
  let child;
  let ad;

  try {
    user = await prisma.appUser.create({
      data: { phone: `+99294${suffix.slice(-7)}`, isActive: true },
    });
    country = await createLocation(suffix);
    const city = country.cities[0];
    const area = city.areas[0];
    activeRoot = await categoryService.createClassifiedCategory({
      parentId: null,
      code: `active_root_${suffix}`,
      slug: `active-root-${suffix}`,
      title: 'Active root',
      description: null,
      image: null,
      color: '#0f766e',
      displayOrder: 10,
      isActive: true,
      allowAds: false,
      postingFee: 0,
    }, req);
    inactiveRoot = await categoryService.createClassifiedCategory({
      parentId: null,
      code: `inactive_root_${suffix}`,
      slug: `inactive-root-${suffix}`,
      title: 'Inactive root',
      description: null,
      image: null,
      color: '#486b9a',
      displayOrder: 20,
      isActive: false,
      allowAds: false,
      postingFee: 0,
    }, req);
    child = await categoryService.createClassifiedCategory({
      parentId: activeRoot.id,
      code: `live_child_${suffix}`,
      slug: `live-child-${suffix}`,
      title: 'Live child',
      description: null,
      image: null,
      color: '#0f766e',
      displayOrder: 10,
      isActive: true,
      allowAds: true,
      postingFee: 0,
    }, req);
    const attribute = await attributeService.createClassifiedAttribute({
      categoryId: child.id,
      code: `condition_${suffix}`,
      title: 'Condition',
      type: 'SELECT',
      unit: null,
      placeholder: null,
      isRequired: true,
      showInFilters: true,
      displayOrder: 10,
      isActive: true,
      minValue: null,
      maxValue: null,
      minLength: null,
      maxLength: null,
      options: [{
        code: `used_${suffix}`,
        title: 'Used',
        image: null,
        color: '#0f766e',
        displayOrder: 10,
        isActive: true,
      }],
    }, req);
    const option = attribute.options[0];

    ad = await prisma.classifiedAd.create({
      data: {
        ...baseAdData({
          publicCode: `TX${suffix.slice(-12)}`,
          categoryId: child.id,
          appUserId: user.id,
          countryId: country.id,
          cityId: city.id,
          areaId: area.id,
          phone: user.phone,
        }),
        status: 'PUBLISHED',
        publishedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        attributeValues: {
          create: {
            attributeId: attribute.id,
            optionId: option.id,
          },
        },
      },
    });

    await assert.rejects(
      categoryService.updateClassifiedCategory(child.id, { parentId: inactiveRoot.id }, req),
      (error) => error.code === 'CLASSIFIED_CATEGORY_OPERATIONAL_MOVE_BLOCKED',
    );
    await assert.rejects(
      attributeService.updateClassifiedAttribute(attribute.id, { code: `changed_${suffix}` }, req),
      (error) => error.code === 'CLASSIFIED_ATTRIBUTE_IN_USE',
    );
    await assert.rejects(
      attributeService.updateClassifiedAttribute(attribute.id, { isRequired: false }, req),
      (error) => error.code === 'CLASSIFIED_ATTRIBUTE_OPERATIONAL_ADS',
    );
    await assert.rejects(
      attributeService.updateClassifiedAttributeOption(attribute.id, option.id, { isActive: false }, req),
      (error) => error.code === 'CLASSIFIED_ATTRIBUTE_OPTION_IN_USE',
    );
  } finally {
    if (ad?.id) await prisma.classifiedAd.delete({ where: { id: ad.id } }).catch(() => {});
    if (child?.id) await prisma.classifiedCategory.delete({ where: { id: child.id } }).catch(() => {});
    if (inactiveRoot?.id) await prisma.classifiedCategory.delete({ where: { id: inactiveRoot.id } }).catch(() => {});
    if (activeRoot?.id) await prisma.classifiedCategory.delete({ where: { id: activeRoot.id } }).catch(() => {});
    if (country?.id) await prisma.country.delete({ where: { id: country.id } }).catch(() => {});
    if (user?.id) await prisma.appUser.delete({ where: { id: user.id } }).catch(() => {});
    await prisma.auditLog.deleteMany({ where: { traceId } });
  }
});

test('classified draft and active quotas remain exact under concurrent requests', async () => {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  let draftUser;
  let activeUser;
  let country;
  let category;

  try {
    [draftUser, activeUser] = await Promise.all([
      prisma.appUser.create({
        data: { phone: `+99295${suffix.slice(-7)}`, isActive: true },
      }),
      prisma.appUser.create({
        data: { phone: `+99296${suffix.slice(-7)}`, isActive: true },
      }),
    ]);
    country = await createLocation(suffix);
    const city = country.cities[0];
    const area = city.areas[0];
    category = await prisma.classifiedCategory.create({
      data: {
        code: `quota_${suffix}`,
        slug: `quota-${suffix}`,
        title: 'Quota category',
        isActive: true,
        allowAds: true,
        postingFee: 0,
      },
    });
    const settings = await prisma.classifiedSetting.findUnique({ where: { id: 1 } });

    await prisma.classifiedAd.createMany({
      data: Array.from({ length: settings.maxDraftAdsPerAppUser - 1 }, (_, index) => ({
        ...baseAdData({
          publicCode: `QD${index}${suffix.slice(-9)}`,
          categoryId: category.id,
          appUserId: draftUser.id,
          countryId: country.id,
          cityId: city.id,
          areaId: area.id,
          phone: draftUser.phone,
        }),
        title: '',
        description: '',
        status: 'DRAFT',
      })),
    });
    const draftInput = {
      categoryId: category.id,
      countryId: country.id,
      cityId: city.id,
      areaId: area.id,
      title: '',
      description: '',
      priceType: 'CONTACT',
      price: null,
      contactName: null,
      contactPhone: draftUser.phone,
      allowPhone: true,
      allowChat: false,
      latitude: null,
      longitude: null,
      locationPrecision: 'APPROXIMATE',
    };
    const draftResults = await Promise.allSettled([
      appClassifiedService.createDraft(draftUser, draftInput),
      appClassifiedService.createDraft(draftUser, draftInput),
    ]);
    assert.equal(draftResults.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(
      draftResults.some((result) => result.status === 'rejected'
        && result.reason.code === 'CLASSIFIED_DRAFT_LIMIT_REACHED'),
      true,
    );
    assert.equal(await prisma.classifiedAd.count({
      where: {
        appUserId: draftUser.id,
        status: { in: ['DRAFT', 'REJECTED'] },
      },
    }), settings.maxDraftAdsPerAppUser);

    await prisma.classifiedAd.createMany({
      data: Array.from({ length: settings.maxActiveAdsPerAppUser - 1 }, (_, index) => ({
        ...baseAdData({
          publicCode: `QA${index}${suffix.slice(-9)}`,
          categoryId: category.id,
          appUserId: activeUser.id,
          countryId: country.id,
          cityId: city.id,
          areaId: area.id,
          phone: activeUser.phone,
        }),
        status: 'PUBLISHED',
        publishedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      })),
    });
    const candidateAds = [];
    for (const index of [1, 2]) {
      candidateAds.push(await prisma.classifiedAd.create({
        data: {
          ...baseAdData({
            publicCode: `QC${index}${suffix.slice(-9)}`,
            categoryId: category.id,
            appUserId: activeUser.id,
            countryId: country.id,
            cityId: city.id,
            areaId: area.id,
            phone: activeUser.phone,
          }),
          status: 'DRAFT',
          images: {
            create: {
              imageUrl: `/public/uploads/tests/${suffix}/candidate-${index}.webp`,
              thumbnailUrl: `/public/uploads/tests/${suffix}/candidate-${index}-thumb.webp`,
              width: 800,
              height: 600,
              displayOrder: 10,
              isCover: true,
            },
          },
        },
      }));
    }
    const activeResults = await Promise.allSettled(candidateAds.map((ad) => (
      appClassifiedService.submitMyAd(activeUser, ad.id, 1)
    )));
    assert.equal(activeResults.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(
      activeResults.some((result) => result.status === 'rejected'
        && result.reason.code === 'CLASSIFIED_ACTIVE_LIMIT_REACHED'),
      true,
    );
    assert.equal(await prisma.classifiedAd.count({
      where: {
        appUserId: activeUser.id,
        status: { in: ['PENDING_REVIEW', 'PUBLISHED', 'PAUSED', 'SUSPENDED'] },
      },
    }), settings.maxActiveAdsPerAppUser);
  } finally {
    const userIds = [draftUser?.id, activeUser?.id].filter(Boolean);
    if (userIds.length) await prisma.classifiedAd.deleteMany({ where: { appUserId: { in: userIds } } });
    if (category?.id) await prisma.classifiedCategory.delete({ where: { id: category.id } }).catch(() => {});
    if (country?.id) await prisma.country.delete({ where: { id: country.id } }).catch(() => {});
    if (userIds.length) await prisma.appUser.deleteMany({ where: { id: { in: userIds } } });
  }
});

test('public classified filters expose configured attributes and match stored values', async () => {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  let user;
  let country;
  let category;
  const adIds = [];

  try {
    user = await prisma.appUser.create({
      data: { phone: `+99297${suffix.slice(-7)}`, isActive: true },
    });
    country = await createLocation(suffix);
    const city = country.cities[0];
    const area = city.areas[0];
    category = await prisma.classifiedCategory.create({
      data: {
        code: `public_filter_${suffix}`,
        slug: `public-filter-${suffix}`,
        title: 'Public filter category',
        isActive: true,
        allowAds: true,
        postingFee: 0,
      },
    });
    const attribute = await prisma.classifiedAttribute.create({
      data: {
        categoryId: category.id,
        code: `condition_${suffix}`,
        title: 'Condition',
        type: 'SELECT',
        showInFilters: true,
        isActive: true,
        options: {
          create: [
            { code: `new_${suffix}`, title: 'New', isActive: true },
            { code: `used_${suffix}`, title: 'Used', isActive: true },
          ],
        },
      },
      include: { options: { orderBy: { id: 'asc' } } },
    });

    for (const [index, option] of attribute.options.entries()) {
      const ad = await prisma.classifiedAd.create({
        data: {
          ...baseAdData({
            publicCode: `PF${index}${suffix.slice(-10)}`,
            categoryId: category.id,
            appUserId: user.id,
            countryId: country.id,
            cityId: city.id,
            areaId: area.id,
            phone: user.phone,
          }),
          status: 'PUBLISHED',
          publishedAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
          attributeValues: {
            create: {
              attributeId: attribute.id,
              optionId: option.id,
            },
          },
        },
      });
      adIds.push(ad.id);
    }

    const metadata = await appClassifiedService.getPublicCategoryFilters(category.id);
    assert.equal(metadata.attributes.length, 1);
    assert.equal(metadata.attributes[0].id, attribute.id);
    assert.equal(metadata.attributes[0].showInFilters, true);

    const result = await appClassifiedService.listPublicAds({
      page: 1,
      pageSize: 20,
      categoryId: category.id,
      attributeFilters: [{
        attributeId: attribute.id,
        optionIds: [attribute.options[0].id],
      }],
    });
    assert.equal(result.meta.total, 1);
    assert.equal(result.items[0].id, adIds[0]);

    await assert.rejects(
      appClassifiedService.listPublicAds({
        page: 1,
        pageSize: 20,
        categoryId: category.id,
        attributeFilters: [{
          attributeId: attribute.id,
          optionIds: [999999999],
        }],
      }),
      (error) => error.code === 'CLASSIFIED_ATTRIBUTE_FILTER_INVALID',
    );
  } finally {
    if (adIds.length) {
      await prisma.classifiedAd.deleteMany({ where: { id: { in: adIds } } });
    }
    if (category?.id) {
      await prisma.classifiedCategory.delete({ where: { id: category.id } }).catch(() => {});
    }
    if (country?.id) {
      await prisma.country.delete({ where: { id: country.id } }).catch(() => {});
    }
    if (user?.id) {
      await prisma.appUser.delete({ where: { id: user.id } }).catch(() => {});
    }
  }
});

test('public classified detail exposes presentation data without private moderation fields', async () => {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  let user;
  let country;
  let category;
  let attribute;
  let ad;

  try {
    user = await prisma.appUser.create({
      data: {
        phone: `+99298${suffix.slice(-7)}`,
        firstName: 'Public',
        lastName: 'Seller',
        isActive: true,
      },
    });
    country = await createLocation(suffix);
    const city = country.cities[0];
    const area = city.areas[0];
    category = await prisma.classifiedCategory.create({
      data: {
        code: `public_detail_${suffix}`,
        slug: `public-detail-${suffix}`,
        title: 'Public detail category',
        isActive: true,
        allowAds: true,
      },
    });
    attribute = await prisma.classifiedAttribute.create({
      data: {
        categoryId: category.id,
        code: `surface_${suffix}`,
        title: 'Surface',
        type: 'NUMBER',
        unit: 'm2',
        isActive: true,
      },
    });
    ad = await prisma.classifiedAd.create({
      data: {
        ...baseAdData({
          publicCode: `PD${suffix.slice(-12)}`,
          categoryId: category.id,
          appUserId: user.id,
          countryId: country.id,
          cityId: city.id,
          areaId: area.id,
          phone: user.phone,
        }),
        status: 'PUBLISHED',
        moderationNote: 'Must stay private',
        publishedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        images: {
          create: {
            imageUrl: '/uploads/classifieds/public-detail.jpg',
            thumbnailUrl: '/uploads/classifieds/public-detail-thumb.jpg',
            isCover: true,
          },
        },
        attributeValues: {
          create: {
            attributeId: attribute.id,
            numberValue: 92,
          },
        },
      },
    });

    const detail = await appClassifiedService.getPublicAd(ad.id);
    assert.equal(detail.id, ad.id);
    assert.equal(detail.description, 'A complete classified description used by hardening tests.');
    assert.equal(detail.contactPhone, user.phone);
    assert.equal(detail.seller.name, 'Public Seller');
    assert.equal(detail.images.length, 1);
    assert.equal(detail.attributeValues[0].numberValue, 92);
    assert.equal('moderationNote' in detail, false);
    assert.equal('statusHistory' in detail, false);

    await prisma.classifiedAd.update({
      where: { id: ad.id },
      data: { allowPhone: false },
    });
    const privateContact = await appClassifiedService.getPublicAd(ad.id);
    assert.equal(privateContact.contactPhone, null);

    await prisma.classifiedAd.update({
      where: { id: ad.id },
      data: { status: 'PAUSED' },
    });
    await assert.rejects(
      appClassifiedService.getPublicAd(ad.id),
      (error) => error.code === 'CLASSIFIED_NOT_FOUND',
    );
  } finally {
    if (ad?.id) {
      await prisma.classifiedAd.delete({ where: { id: ad.id } }).catch(() => {});
    }
    if (attribute?.id) {
      await prisma.classifiedAttribute.delete({ where: { id: attribute.id } }).catch(() => {});
    }
    if (category?.id) {
      await prisma.classifiedCategory.delete({ where: { id: category.id } }).catch(() => {});
    }
    if (country?.id) {
      await prisma.country.delete({ where: { id: country.id } }).catch(() => {});
    }
    if (user?.id) {
      await prisma.appUser.delete({ where: { id: user.id } }).catch(() => {});
    }
  }
});
