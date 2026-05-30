const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const { audit } = require('../../shared/audit/audit');

async function assertBusiness(id) {
  const exists = await prisma.business.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', { errors: [{ path: 'businessId', message: 'Business not found' }] });
}

async function assertCategory(categoryId, businessId) {
  if (!categoryId) return;
  const exists = await prisma.businessOfferingCategory.findFirst({ where: { id: categoryId, businessId }, select: { id: true } });
  if (!exists) throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', { errors: [{ path: 'categoryId', message: 'Offering category does not belong to this business' }] });
}

async function assertLanguages(codes) {
  const existing = await prisma.language.findMany({ where: { code: { in: codes }, isActive: true }, select: { code: true } });
  const set = new Set(existing.map((item) => item.code));
  const missing = codes.filter((code) => !set.has(code));
  if (missing.length) throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', { errors: missing.map((code) => ({ path: 'translations.lang', message: `Language "${code}" is not available` })) });
}

async function resolveSelectedLang(lang) {
  if (lang) return lang;
  const fallback = await prisma.language.findFirst({ where: { isActive: true }, orderBy: [{ isDefault: 'desc' }, { code: 'asc' }], select: { code: true } });
  return fallback?.code || 'en';
}

function chooseTitle(translations, fallback = '') {
  return translations?.[0]?.title || fallback || '';
}

function normalize(item) {
  return {
    id: item.id,
    businessId: item.businessId,
    categoryId: item.categoryId,
    title: item.title,
    image: item.image,
    basePrice: item.basePrice === null || item.basePrice === undefined ? null : Number(item.basePrice),
    oldPrice: item.oldPrice === null || item.oldPrice === undefined ? null : Number(item.oldPrice),
    preparationMinutes: item.preparationMinutes,
    isFeatured: item.isFeatured,
    isPopular: item.isPopular,
    isNew: item.isNew,
    isUnavailable: item.isUnavailable,
    displayOrder: item.displayOrder,
    isActive: item.isActive,
  };
}

function mapDecimal(item) {
  if (!item) return item;
  return {
    ...item,
    basePrice: item.basePrice === null || item.basePrice === undefined ? null : Number(item.basePrice),
    oldPrice: item.oldPrice === null || item.oldPrice === undefined ? null : Number(item.oldPrice),
  };
}

async function listBusinessOfferings(query) {
  const selectedLang = await resolveSelectedLang(query.lang);
  const skip = (query.page - 1) * query.pageSize;
  const where = {};
  if (query.businessId) where.businessId = query.businessId;
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.q) where.OR = [{ title: { contains: query.q } }, { translations: { some: { OR: [{ title: { contains: query.q } }, { description: { contains: query.q } }] } } }];

  const [items, total] = await Promise.all([
    prisma.businessOffering.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [{ [query.sortBy]: query.sortDir }, { id: 'asc' }],
      include: {
        translations: { where: { lang: selectedLang }, take: 1 },
        category: { include: { translations: { where: { lang: selectedLang }, take: 1 } } },
        _count: { select: { optionGroups: true } },
      },
    }),
    prisma.businessOffering.count({ where }),
  ]);

  return {
    items: items.map((item) => {
      const selectedTranslation = item.translations[0] || null;
      const categoryTranslation = item.category?.translations?.[0] || null;
      return mapDecimal({
        ...item,
        selectedTranslation,
        title: selectedTranslation?.title || item.title,
        category: item.category ? { ...item.category, title: categoryTranslation?.title || item.category.title, translations: undefined } : null,
        translations: undefined,
      });
    }),
    meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize), lang: selectedLang },
  };
}

async function getBusinessOfferingById(id) {
  const item = await prisma.businessOffering.findUnique({
    where: { id },
    include: {
      translations: { orderBy: { lang: 'asc' } },
      category: true,
      optionGroups: { orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }], include: { translations: { orderBy: { lang: 'asc' } }, options: { orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }], include: { translations: { orderBy: { lang: 'asc' } } } } } },
    },
  });
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Offering not found');
  return mapDecimal(item);
}

async function createBusinessOffering(data, req) {
  await assertBusiness(data.businessId);
  await assertCategory(data.categoryId, data.businessId);
  await assertLanguages([...new Set(data.translations.map((item) => item.lang))]);
  const created = await prisma.businessOffering.create({
    data: {
      businessId: data.businessId,
      categoryId: data.categoryId ?? null,
      title: chooseTitle(data.translations),
      image: data.image ?? null,
      basePrice: data.basePrice ?? null,
      oldPrice: data.oldPrice ?? null,
      preparationMinutes: data.preparationMinutes ?? null,
      isFeatured: data.isFeatured ?? false,
      isPopular: data.isPopular ?? false,
      isNew: data.isNew ?? false,
      isUnavailable: data.isUnavailable ?? false,
      displayOrder: data.displayOrder ?? 0,
      isActive: data.isActive ?? true,
      translations: { create: data.translations },
    },
    include: { translations: true },
  });
  await audit(req, { action: 'CREATE', entity: 'BusinessOffering', entityId: created.id, after: normalize(created) });
  return mapDecimal(created);
}

async function updateBusinessOffering(id, data, req) {
  const existing = await prisma.businessOffering.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Offering not found');
  const nextBusinessId = data.businessId || existing.businessId;
  if (data.businessId) await assertBusiness(data.businessId);
  if (data.categoryId !== undefined) await assertCategory(data.categoryId, nextBusinessId);
  if (data.translations) await assertLanguages([...new Set(data.translations.map((item) => item.lang))]);

  const updated = await prisma.$transaction(async (tx) => {
    const updateData = {};
    ['businessId', 'categoryId', 'image', 'basePrice', 'oldPrice', 'preparationMinutes', 'isFeatured', 'isPopular', 'isNew', 'isUnavailable', 'displayOrder', 'isActive'].forEach((field) => { if (data[field] !== undefined) updateData[field] = data[field]; });
    if (data.translations) updateData.title = chooseTitle(data.translations, existing.title);
    if (Object.keys(updateData).length) await tx.businessOffering.update({ where: { id }, data: updateData });
    if (Array.isArray(data.translations)) {
      for (const item of data.translations) {
        await tx.businessOfferingTranslation.upsert({ where: { offeringId_lang: { offeringId: id, lang: item.lang } }, update: item, create: { ...item, offeringId: id } });
      }
      await tx.businessOfferingTranslation.deleteMany({ where: { offeringId: id, lang: { notIn: data.translations.map((item) => item.lang) } } });
    }
    return tx.businessOffering.findUnique({ where: { id }, include: { translations: true } });
  });
  await audit(req, { action: 'UPDATE', entity: 'BusinessOffering', entityId: id, before: normalize(existing), after: normalize(updated) });
  return mapDecimal(updated);
}

async function deleteBusinessOffering(id, req) {
  const existing = await prisma.businessOffering.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Offering not found');
  await prisma.businessOffering.delete({ where: { id } });
  await audit(req, { action: 'DELETE', entity: 'BusinessOffering', entityId: id, before: normalize(existing) });
}

async function getNextDisplayOrder(businessId) {
  const where = businessId ? { businessId: Number(businessId) } : {};
  const aggregate = await prisma.businessOffering.aggregate({ where, _max: { displayOrder: true } });
  return (aggregate._max.displayOrder || 0) + 10;
}

module.exports = { listBusinessOfferings, getBusinessOfferingById, createBusinessOffering, updateBusinessOffering, deleteBusinessOffering, getNextDisplayOrder };
