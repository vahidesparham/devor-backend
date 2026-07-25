const dotenv = require('dotenv');
const { PrismaClient } = require('../src/generated/prisma-client');
const {
  resolveInheritedClassifiedAttributes,
} = require('../src/modules/classifieds-domain/classifiedCategoryHierarchy');

dotenv.config();

const prisma = new PrismaClient();

function numericDemoValue(attribute, sequence) {
  const minimum = attribute.minValue == null ? 0 : Number(attribute.minValue);
  const maximum = attribute.maxValue == null
    ? Number.POSITIVE_INFINITY
    : Number(attribute.maxValue);
  let value;

  if (attribute.code.includes('year')) {
    value = 1995 + (sequence % 28);
  } else if (attribute.code.includes('area')) {
    value = 55 + (sequence % 12) * 10;
  } else if (attribute.code.includes('floor')) {
    value = sequence % 12;
  } else {
    value = minimum + sequence;
  }

  return Math.max(minimum, Math.min(maximum, value));
}

function demoRows(ad, attributes, sequence) {
  const rows = [];
  for (const attribute of attributes) {
    if (!attribute.showInFilters) continue;

    if (attribute.type === 'SELECT' || attribute.type === 'MULTI_SELECT') {
      if (!attribute.options.length) continue;
      const option = attribute.options[sequence % attribute.options.length];
      rows.push({
        adId: ad.id,
        attributeId: attribute.id,
        optionId: option.id,
      });
      continue;
    }

    if (attribute.type === 'NUMBER') {
      rows.push({
        adId: ad.id,
        attributeId: attribute.id,
        numberValue: numericDemoValue(attribute, sequence),
      });
      continue;
    }

    if (attribute.type === 'BOOLEAN') {
      rows.push({
        adId: ad.id,
        attributeId: attribute.id,
        booleanValue: sequence % 2 === 0,
      });
    }
  }
  return rows;
}

async function main() {
  const [ads, categories, attributes] = await Promise.all([
    prisma.classifiedAd.findMany({
      where: { publicCode: { startsWith: 'DEMO' } },
      orderBy: { publicCode: 'asc' },
      select: { id: true, categoryId: true },
    }),
    prisma.classifiedCategory.findMany({
      select: { id: true, parentId: true, isActive: true },
    }),
    prisma.classifiedAttribute.findMany({
      where: { isActive: true, showInFilters: true },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
      include: {
        options: {
          where: { isActive: true },
          orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        },
      },
    }),
  ]);

  for (let index = 0; index < ads.length; index += 1) {
    const ad = ads[index];
    const sequence = index + 1 + Math.floor(index / 10);
    const resolved = resolveInheritedClassifiedAttributes(
      categories,
      attributes,
      ad.categoryId,
    );
    const rows = demoRows(ad, resolved, sequence);
    await prisma.$transaction([
      prisma.classifiedAdAttributeValue.deleteMany({ where: { adId: ad.id } }),
      ...(rows.length
        ? [prisma.classifiedAdAttributeValue.createMany({ data: rows })]
        : []),
    ]);
  }

  console.log(`Classified demo attribute values seeded for ${ads.length} ads.`);
}

main()
  .catch((error) => {
    console.error('Classified demo attribute value seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
