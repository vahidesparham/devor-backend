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
  assert.equal(permissions.length, 16);
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

  const settings = await prisma.classifiedSetting.findUnique({ where: { id: 1 } });
  assert.equal(settings.publicationDays, 30);
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
