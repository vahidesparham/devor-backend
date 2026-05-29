const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const { audit } = require('../../shared/audit/audit');

function normalize(item) {
  return {
    serviceTypeId: item.serviceTypeId,
    code: item.code,
    title: item.title,
    image: item.image,
    selectionMode: item.selectionMode,
    displayOrder: item.displayOrder,
    isActive: item.isActive,
  };
}

async function assertServiceType(id) {
  const exists = await prisma.serviceType.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', { errors: [{ path: 'serviceTypeId', message: 'Service type not found' }] });
}

async function assertLanguages(codes) {
  const existing = await prisma.language.findMany({ where: { code: { in: codes }, isActive: true }, select: { code: true } });
  const set = new Set(existing.map((item) => item.code));
  const missing = codes.filter((code) => !set.has(code));
  if (missing.length) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
      errors: missing.map((code) => ({ path: 'translations.lang', message: `Language "${code}" is not available` })),
    });
  }
}

async function resolveSelectedLang(lang) {
  if (lang) return lang;
  const fallback = await prisma.language.findFirst({ where: { isActive: true }, orderBy: [{ isDefault: 'desc' }, { code: 'asc' }], select: { code: true } });
  return fallback?.code || 'en';
}

function chooseFallbackTitle(translations, fallback = '') {
  return translations?.[0]?.title || fallback || '';
}

function slugifyKey(value, fallback) {
  const key = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);
  return key || fallback;
}

function collectLanguageCodes(groupTranslations, options = []) {
  const codes = [...(groupTranslations || []).map((item) => item.lang)];
  for (const option of options || []) {
    codes.push(...(option.translations || []).map((item) => item.lang));
  }
  return [...new Set(codes)];
}

async function listAttributeGroups(query) {
  const selectedLang = await resolveSelectedLang(query.lang);
  const skip = (query.page - 1) * query.pageSize;
  const where = {};
  if (query.serviceTypeId) where.serviceTypeId = query.serviceTypeId;
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.q) {
    where.OR = [
      { code: { contains: query.q } },
      { title: { contains: query.q } },
      { translations: { some: { title: { contains: query.q } } } },
      { serviceType: { title: { contains: query.q } } },
      { options: { some: { OR: [{ title: { contains: query.q } }, { translations: { some: { title: { contains: query.q } } } }] } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.attributeGroup.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [{ [query.sortBy]: query.sortDir }, { id: 'asc' }],
      include: {
        serviceType: { select: { id: true, code: true, title: true, image: true, color: true } },
        translations: { where: { lang: selectedLang }, take: 1 },
        options: {
          orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
          include: { translations: { where: { lang: selectedLang }, take: 1 } },
        },
        _count: { select: { options: true } },
      },
    }),
    prisma.attributeGroup.count({ where }),
  ]);

  return {
    items: items.map((item) => {
      const selectedTranslation = item.translations[0] || null;
      return {
        ...item,
        selectedTranslation,
        title: selectedTranslation?.title || item.title,
        translations: undefined,
        options: item.options.map((option) => {
          const optionTranslation = option.translations[0] || null;
          return { ...option, selectedTranslation: optionTranslation, title: optionTranslation?.title || option.title, translations: undefined };
        }),
      };
    }),
    meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize), lang: selectedLang },
  };
}

async function getAttributeGroupById(id) {
  const item = await prisma.attributeGroup.findUnique({
    where: { id },
    include: {
      serviceType: { select: { id: true, code: true, title: true, image: true, color: true } },
      translations: { orderBy: { lang: 'asc' } },
      options: { orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }], include: { translations: { orderBy: { lang: 'asc' } } } },
    },
  });
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Attribute group not found');
  return item;
}

function splitGroupData(data) {
  const { options, translations, ...groupData } = data;
  return { groupData, translations, options };
}

async function createAttributeGroup(data, req) {
  await assertServiceType(data.serviceTypeId);
  const { groupData, translations, options } = splitGroupData(data);
  await assertLanguages(collectLanguageCodes(translations, options));
  const preparedOptions = (options || []).map((option, index) => {
    const { translations: optionTranslations, ...optionData } = option;
    const title = chooseFallbackTitle(optionTranslations, optionData.title);
    return {
      ...optionData,
      key: optionData.key || slugifyKey(title, `option_${index + 1}`),
      title,
      translations: { create: optionTranslations },
    };
  });
  const created = await prisma.attributeGroup.create({
    data: {
      ...groupData,
      title: chooseFallbackTitle(translations, groupData.title),
      translations: { create: translations },
      options: preparedOptions.length ? { create: preparedOptions.map(({ id: _id, ...item }) => item) } : undefined,
    },
    include: { translations: true, options: { include: { translations: true } } },
  });
  await audit(req, { action: 'CREATE', entity: 'AttributeGroup', entityId: created.id, after: normalize(created), details: { optionCount: created.options.length } });
  return created;
}

async function updateAttributeGroup(id, data, req) {
  const existing = await prisma.attributeGroup.findUnique({ where: { id }, include: { options: true } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Attribute group not found');
  if (data.serviceTypeId) await assertServiceType(data.serviceTypeId);
  const { groupData, translations, options } = splitGroupData(data);
  await assertLanguages(collectLanguageCodes(translations, options));

  const updated = await prisma.$transaction(async (tx) => {
    if (Object.keys(groupData).length || translations) {
      await tx.attributeGroup.update({
        where: { id },
        data: {
          ...groupData,
          ...(translations ? { title: chooseFallbackTitle(translations, existing.title) } : {}),
        },
      });
    }

    if (Array.isArray(translations)) {
      for (const item of translations) {
        await tx.attributeGroupTranslation.upsert({
          where: { groupId_lang: { groupId: id, lang: item.lang } },
          update: item,
          create: { ...item, groupId: id },
        });
      }
      await tx.attributeGroupTranslation.deleteMany({ where: { groupId: id, lang: { notIn: translations.map((item) => item.lang) } } });
    }

    if (Array.isArray(options)) {
      const keepIds = [];
      for (let index = 0; index < options.length; index += 1) {
        const option = options[index];
        const { id: optionId, translations: optionTranslations, ...optionData } = option;
        const title = chooseFallbackTitle(optionTranslations, optionData.title);
        const nextOptionData = { ...optionData, key: optionData.key || slugifyKey(title, `option_${index + 1}`), title };
        if (optionId) {
          keepIds.push(optionId);
          await tx.attributeOption.update({ where: { id: optionId }, data: nextOptionData });
          for (const translation of optionTranslations || []) {
            await tx.attributeOptionTranslation.upsert({
              where: { optionId_lang: { optionId, lang: translation.lang } },
              update: translation,
              create: { ...translation, optionId },
            });
          }
          await tx.attributeOptionTranslation.deleteMany({ where: { optionId, lang: { notIn: (optionTranslations || []).map((item) => item.lang) } } });
        } else {
          const createdOption = await tx.attributeOption.create({
            data: {
              ...nextOptionData,
              groupId: id,
              translations: optionTranslations?.length ? { create: optionTranslations } : undefined,
            },
          });
          keepIds.push(createdOption.id);
        }
      }
      await tx.attributeOption.deleteMany({ where: { groupId: id, id: { notIn: keepIds } } });
    }

    return tx.attributeGroup.findUnique({ where: { id }, include: { translations: true, options: { include: { translations: true } } } });
  });

  await audit(req, { action: 'UPDATE', entity: 'AttributeGroup', entityId: id, before: normalize(existing), after: normalize(updated), details: { optionCount: updated.options.length } });
  return updated;
}

async function deleteAttributeGroup(id, req) {
  const existing = await prisma.attributeGroup.findUnique({
    where: { id },
    include: { options: { include: { _count: { select: { businessAttributes: true } } } } },
  });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Attribute group not found');
  if (existing.options.some((option) => option._count.businessAttributes > 0)) {
    throw new AppError(409, 'ATTRIBUTE_GROUP_IN_USE', 'Attribute group has options used by businesses and cannot be deleted');
  }
  await prisma.attributeGroup.delete({ where: { id } });
  await audit(req, { action: 'DELETE', entity: 'AttributeGroup', entityId: id, before: normalize(existing) });
}

async function getNextDisplayOrder(serviceTypeId) {
  const where = serviceTypeId ? { serviceTypeId: Number(serviceTypeId) } : {};
  const aggregate = await prisma.attributeGroup.aggregate({ where, _max: { displayOrder: true } });
  return (aggregate._max.displayOrder || 0) + 10;
}

module.exports = {
  listAttributeGroups,
  getAttributeGroupById,
  createAttributeGroup,
  updateAttributeGroup,
  deleteAttributeGroup,
  getNextDisplayOrder,
};
