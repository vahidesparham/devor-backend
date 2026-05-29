const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const { audit } = require('../../shared/audit/audit');

async function assertBusiness(id) {
  const exists = await prisma.business.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', { errors: [{ path: 'businessId', message: 'Business not found' }] });
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
  return { id: item.id, businessId: item.businessId, title: item.title, image: item.image, displayOrder: item.displayOrder, isActive: item.isActive };
}

async function listBusinessOfferingCategories(query) {
  const selectedLang = await resolveSelectedLang(query.lang);
  const skip = (query.page - 1) * query.pageSize;
  const where = {};
  if (query.businessId) where.businessId = query.businessId;
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.q) where.OR = [{ title: { contains: query.q } }, { translations: { some: { title: { contains: query.q } } } }];

  const [items, total] = await Promise.all([
    prisma.businessOfferingCategory.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [{ [query.sortBy]: query.sortDir }, { id: 'asc' }],
      include: {
        translations: { where: { lang: selectedLang }, take: 1 },
        _count: { select: { offerings: true } },
      },
    }),
    prisma.businessOfferingCategory.count({ where }),
  ]);

  return {
    items: items.map((item) => {
      const selectedTranslation = item.translations[0] || null;
      return { ...item, selectedTranslation, title: selectedTranslation?.title || item.title, translations: undefined };
    }),
    meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize), lang: selectedLang },
  };
}

async function getBusinessOfferingCategoryById(id) {
  const item = await prisma.businessOfferingCategory.findUnique({
    where: { id },
    include: { translations: { orderBy: { lang: 'asc' } }, _count: { select: { offerings: true } } },
  });
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Offering category not found');
  return item;
}

async function createBusinessOfferingCategory(data, req) {
  await assertBusiness(data.businessId);
  await assertLanguages([...new Set(data.translations.map((item) => item.lang))]);
  const created = await prisma.businessOfferingCategory.create({
    data: { businessId: data.businessId, title: chooseTitle(data.translations), image: data.image ?? null, displayOrder: data.displayOrder ?? 0, isActive: data.isActive ?? true, translations: { create: data.translations } },
    include: { translations: true },
  });
  await audit(req, { action: 'CREATE', entity: 'BusinessOfferingCategory', entityId: created.id, after: normalize(created) });
  return created;
}

async function updateBusinessOfferingCategory(id, data, req) {
  const existing = await prisma.businessOfferingCategory.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Offering category not found');
  if (data.businessId) await assertBusiness(data.businessId);
  if (data.translations) await assertLanguages([...new Set(data.translations.map((item) => item.lang))]);

  const updated = await prisma.$transaction(async (tx) => {
    const updateData = {};
    ['businessId', 'image', 'displayOrder', 'isActive'].forEach((field) => { if (data[field] !== undefined) updateData[field] = data[field]; });
    if (data.translations) updateData.title = chooseTitle(data.translations, existing.title);
    if (Object.keys(updateData).length) await tx.businessOfferingCategory.update({ where: { id }, data: updateData });
    if (Array.isArray(data.translations)) {
      for (const item of data.translations) {
        await tx.businessOfferingCategoryTranslation.upsert({ where: { categoryId_lang: { categoryId: id, lang: item.lang } }, update: item, create: { ...item, categoryId: id } });
      }
      await tx.businessOfferingCategoryTranslation.deleteMany({ where: { categoryId: id, lang: { notIn: data.translations.map((item) => item.lang) } } });
    }
    return tx.businessOfferingCategory.findUnique({ where: { id }, include: { translations: true } });
  });
  await audit(req, { action: 'UPDATE', entity: 'BusinessOfferingCategory', entityId: id, before: normalize(existing), after: normalize(updated) });
  return updated;
}

async function deleteBusinessOfferingCategory(id, req) {
  const existing = await prisma.businessOfferingCategory.findUnique({ where: { id }, include: { _count: { select: { offerings: true } } } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Offering category not found');
  await prisma.businessOfferingCategory.delete({ where: { id } });
  await audit(req, { action: 'DELETE', entity: 'BusinessOfferingCategory', entityId: id, before: normalize(existing), details: { offeringCount: existing._count.offerings } });
}

async function getNextDisplayOrder(businessId) {
  const where = businessId ? { businessId: Number(businessId) } : {};
  const aggregate = await prisma.businessOfferingCategory.aggregate({ where, _max: { displayOrder: true } });
  return (aggregate._max.displayOrder || 0) + 10;
}

module.exports = { listBusinessOfferingCategories, getBusinessOfferingCategoryById, createBusinessOfferingCategory, updateBusinessOfferingCategory, deleteBusinessOfferingCategory, getNextDisplayOrder };
