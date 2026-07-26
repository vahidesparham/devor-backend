const test = require('node:test');
const assert = require('node:assert/strict');
const prisma = require('../src/prisma');
const categoryService = require('../src/modules/classified-categories/classifiedCategory.service');
const attributeService = require('../src/modules/classified-attributes/classifiedAttribute.service');

test.after(async () => {
  await prisma.$disconnect();
});

test('classified database foundation is migrated and seeded', async () => {
  const [settings, permissions, imageConfigs, checks] = await Promise.all([
    prisma.classifiedSetting.findUnique({ where: { id: 1 } }),
    prisma.permission.findMany({
      where: { key: { startsWith: 'classified_' } },
      select: { key: true },
    }),
    prisma.imageConfig.findMany({
      where: { code: { startsWith: 'classified_' } },
      select: { code: true },
    }),
    prisma.$queryRawUnsafe(`
      SELECT CONSTRAINT_NAME AS constraintName
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND CONSTRAINT_TYPE = 'CHECK'
        AND CONSTRAINT_NAME LIKE 'chk_cls_%'
    `),
  ]);

  assert.equal(settings.contentLanguage, 'fa');
  assert.equal(settings.currency, 'TJS');
  assert.equal(settings.allowBusinessClassifieds, false);
  assert.equal(settings.publicBrowseEnabled, true);
  assert.equal(settings.appUserPostingEnabled, true);
  assert.equal(settings.allowChatContact, true);
  assert.equal(settings.chatStarterMessageLimit, 3);
  assert.equal(settings.maxReportsPerUserPerDay, 10);
  assert.equal(permissions.length, 20);
  assert.ok(permissions.some((item) => item.key === 'classified_chats.read'));
  assert.ok(permissions.some((item) => item.key === 'classified_chats.moderate'));
  assert.ok(permissions.some((item) => item.key === 'classified_operations.read'));
  assert.ok(permissions.some((item) => item.key === 'classified_operations.run'));
  assert.deepEqual(
    new Set(imageConfigs.map((item) => item.code)),
    new Set([
      'classified_ad_image',
      'classified_category_image',
      'classified_attribute_option_image',
    ]),
  );
  assert.deepEqual(
    new Set(checks.map((item) => item.constraintName)),
    new Set([
      'chk_cls_settings_publication',
      'chk_cls_settings_images',
      'chk_cls_settings_limits',
      'chk_cls_attribute_number_range',
      'chk_cls_attribute_length_range',
      'chk_cls_category_posting_fee',
      'chk_cls_ad_price',
      'chk_cls_ad_posting_fee',
      'chk_cls_ad_coordinates_pair',
      'chk_cls_ad_coordinates_range',
      'chk_cls_ad_counters',
      'chk_cls_ad_image_order',
      'chk_cls_ad_image_dimensions',
      'chk_cls_status_history_change',
      'chk_cls_daily_counters',
      'chk_cls_report_version',
      'chk_cls_settings_report_limit',
      'chk_cls_settings_media_grace',
    ]),
  );
});

test('classified database rejects unsafe settings', async () => {
  await assert.rejects(
    prisma.classifiedSetting.update({
      where: { id: 1 },
      data: { publicationDays: 0 },
    }),
  );
  await assert.rejects(
    prisma.classifiedSetting.update({
      where: { id: 1 },
      data: { maxImagesPerAd: 101 },
    }),
  );

  const settings = await prisma.classifiedSetting.findUnique({ where: { id: 1 } });
  assert.equal(settings.publicationDays, 30);
  assert.equal(settings.maxImagesPerAd, 10);
});

test('classified taxonomy services enforce hierarchy and inherited attribute contracts', async () => {
  const suffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const traceId = `classified-taxonomy-test-${suffix}`;
  const req = {
    admin: null,
    traceId,
    method: 'TEST',
    originalUrl: '/tests/classified-taxonomy',
    ip: '127.0.0.1',
    get: () => null,
  };
  let root;
  let child;

  try {
    root = await categoryService.createClassifiedCategory({
      parentId: null,
      code: `root_${suffix}`,
      slug: `root-${suffix.replace(/_/g, '-')}`,
      title: `Root ${suffix}`,
      description: null,
      image: null,
      color: '#0f766e',
      displayOrder: 10,
      isActive: true,
      allowAds: false,
      postingFee: 0,
    }, req);
    child = await categoryService.createClassifiedCategory({
      parentId: root.id,
      code: `child_${suffix}`,
      slug: `child-${suffix.replace(/_/g, '-')}`,
      title: `Child ${suffix}`,
      description: null,
      image: null,
      color: '#486b9a',
      displayOrder: 10,
      isActive: true,
      allowAds: true,
      postingFee: 1000,
    }, req);
    assert.equal(root.postingFee, 0);
    assert.equal(child.postingFee, 1000);
    assert.equal(child.postingFeeCurrency, 'TJS');

    await assert.rejects(
      categoryService.updateClassifiedCategory(root.id, { parentId: child.id }, req),
      (error) => error.code === 'CLASSIFIED_CATEGORY_CYCLE',
    );

    const parentAttribute = await attributeService.createClassifiedAttribute({
      categoryId: root.id,
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
        code: `new_${suffix}`,
        title: 'New',
        image: null,
        color: '#0f766e',
        displayOrder: 10,
        isActive: true,
      }],
    }, req);
    assert.equal(parentAttribute.options.length, 1);

    const syncedParentAttribute = await attributeService.updateClassifiedAttribute(parentAttribute.id, {
      options: [
        {
          id: parentAttribute.options[0].id,
          code: `new_${suffix}`,
          title: 'Brand new',
          image: null,
          color: '#0f766e',
          displayOrder: 10,
          isActive: true,
        },
        {
          code: `used_${suffix}`,
          title: 'Used',
          image: null,
          color: '#486b9a',
          displayOrder: 20,
          isActive: true,
        },
      ],
    }, req);
    assert.deepEqual(syncedParentAttribute.options.map((option) => option.title), ['Brand new', 'Used']);

    const childOverride = await attributeService.createClassifiedAttribute({
      categoryId: child.id,
      code: `condition_${suffix}`,
      title: 'Detailed condition',
      type: 'SELECT',
      unit: null,
      placeholder: null,
      isRequired: true,
      showInFilters: true,
      displayOrder: 20,
      isActive: true,
      minValue: null,
      maxValue: null,
      minLength: null,
      maxLength: null,
    }, req);

    const inherited = await attributeService.listClassifiedAttributes({
      page: 1,
      pageSize: 50,
      categoryId: child.id,
      includeInherited: true,
      sortBy: 'displayOrder',
      sortDir: 'asc',
    });
    assert.equal(inherited.items.length, 1);
    assert.equal(inherited.items[0].id, childOverride.id);
    assert.equal(inherited.items[0].inherited, false);

    await assert.rejects(
      attributeService.updateClassifiedAttribute(childOverride.id, { type: 'TEXT' }, req),
      (error) => error.code === 'CLASSIFIED_ATTRIBUTE_TYPE_CONFLICT',
    );
  } finally {
    if (child?.id) {
      await prisma.classifiedCategory.delete({ where: { id: child.id } }).catch(() => {});
    }
    if (root?.id) {
      await prisma.classifiedCategory.delete({ where: { id: root.id } }).catch(() => {});
    }
    await prisma.auditLog.deleteMany({ where: { traceId } });
  }
});

test('classified attribute services persist and protect dependent option mappings', async () => {
  const suffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const traceId = `classified-dependency-test-${suffix}`;
  const req = {
    admin: null,
    traceId,
    method: 'TEST',
    originalUrl: '/tests/classified-dependencies',
    ip: '127.0.0.1',
    get: () => null,
  };
  let category;
  let brand;
  let model;

  try {
    category = await categoryService.createClassifiedCategory({
      parentId: null,
      code: `dependency_${suffix}`,
      slug: `dependency-${suffix.replace(/_/g, '-')}`,
      title: `Dependency ${suffix}`,
      description: null,
      image: null,
      color: '#0f766e',
      displayOrder: 10,
      isActive: true,
      allowAds: true,
      postingFee: 0,
    }, req);
    brand = await attributeService.createClassifiedAttribute({
      categoryId: category.id,
      code: `brand_${suffix}`,
      title: 'Brand',
      type: 'SELECT',
      isRequired: true,
      showInFilters: true,
      displayOrder: 10,
      isActive: true,
      options: [
        { code: `toyota_${suffix}`, title: 'Toyota', displayOrder: 10, isActive: true },
        { code: `hyundai_${suffix}`, title: 'Hyundai', displayOrder: 20, isActive: true },
      ],
    }, req);
    model = await attributeService.createClassifiedAttribute({
      categoryId: category.id,
      dependsOnAttributeId: brand.id,
      code: `model_${suffix}`,
      title: 'Model',
      type: 'SELECT',
      isRequired: true,
      showInFilters: true,
      displayOrder: 20,
      isActive: true,
      options: [{
        code: `camry_${suffix}`,
        title: 'Camry',
        parentOptionId: brand.options[0].id,
        displayOrder: 10,
        isActive: true,
      }],
    }, req);

    assert.equal(model.dependsOnAttributeId, brand.id);
    assert.equal(model.options[0].parentOptionId, brand.options[0].id);
    assert.equal(model.dependsOnAttribute.title, 'Brand');

    await assert.rejects(
      attributeService.deleteClassifiedAttribute(brand.id, req),
      (error) => error.code === 'CLASSIFIED_ATTRIBUTE_HAS_DEPENDENTS',
    );
    await assert.rejects(
      attributeService.updateClassifiedAttribute(brand.id, {
        options: [brand.options[1]],
      }, req),
      (error) => error.code === 'CLASSIFIED_ATTRIBUTE_OPTION_HAS_DEPENDENTS',
    );
  } finally {
    if (model?.id) {
      await prisma.classifiedAttribute.delete({ where: { id: model.id } }).catch(() => {});
    }
    if (brand?.id) {
      await prisma.classifiedAttribute.delete({ where: { id: brand.id } }).catch(() => {});
    }
    if (category?.id) {
      await prisma.classifiedCategory.delete({ where: { id: category.id } }).catch(() => {});
    }
    await prisma.auditLog.deleteMany({ where: { traceId } });
  }
});
