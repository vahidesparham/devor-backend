const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const { audit } = require('../../shared/audit/audit');

async function assertOffering(id) {
  const exists = await prisma.businessOffering.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', { errors: [{ path: 'offeringId', message: 'Offering not found' }] });
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

const chooseTitle = (translations, fallback = '') => translations?.[0]?.title || fallback || '';
const normalize = (item) => ({ id: item.id, offeringId: item.offeringId, title: item.title, selectionMode: item.selectionMode, isRequired: item.isRequired, minSelect: item.minSelect, maxSelect: item.maxSelect, displayOrder: item.displayOrder, isActive: item.isActive });

async function listBusinessOfferingOptionGroups(query) {
  const selectedLang = await resolveSelectedLang(query.lang);
  const skip = (query.page - 1) * query.pageSize;
  const where = {};
  if (query.offeringId) where.offeringId = query.offeringId;
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.q) where.OR = [{ title: { contains: query.q } }, { translations: { some: { title: { contains: query.q } } } }];
  const [items, total] = await Promise.all([
    prisma.businessOfferingOptionGroup.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
      include: { translations: { where: { lang: selectedLang }, take: 1 }, _count: { select: { options: true } } },
    }),
    prisma.businessOfferingOptionGroup.count({ where }),
  ]);
  return { items: items.map((item) => ({ ...item, selectedTranslation: item.translations[0] || null, title: item.translations[0]?.title || item.title, translations: undefined })), meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize), lang: selectedLang } };
}

async function getBusinessOfferingOptionGroupById(id) {
  const item = await prisma.businessOfferingOptionGroup.findUnique({ where: { id }, include: { translations: { orderBy: { lang: 'asc' } }, offering: true, options: { orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }] } } });
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Offering option group not found');
  return item;
}

async function createBusinessOfferingOptionGroup(data, req) {
  await assertOffering(data.offeringId);
  await assertLanguages([...new Set(data.translations.map((item) => item.lang))]);
  const created = await prisma.businessOfferingOptionGroup.create({ data: { offeringId: data.offeringId, title: chooseTitle(data.translations), selectionMode: data.selectionMode || 'MULTIPLE', isRequired: data.isRequired ?? false, minSelect: data.minSelect ?? 0, maxSelect: data.maxSelect ?? null, displayOrder: data.displayOrder ?? 0, isActive: data.isActive ?? true, translations: { create: data.translations } }, include: { translations: true } });
  await audit(req, { action: 'CREATE', entity: 'BusinessOfferingOptionGroup', entityId: created.id, after: normalize(created) });
  return created;
}

async function updateBusinessOfferingOptionGroup(id, data, req) {
  const existing = await prisma.businessOfferingOptionGroup.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Offering option group not found');
  if (data.offeringId) await assertOffering(data.offeringId);
  if (data.translations) await assertLanguages([...new Set(data.translations.map((item) => item.lang))]);
  const updated = await prisma.$transaction(async (tx) => {
    const updateData = {};
    ['offeringId', 'selectionMode', 'isRequired', 'minSelect', 'maxSelect', 'displayOrder', 'isActive'].forEach((field) => { if (data[field] !== undefined) updateData[field] = data[field]; });
    if (data.translations) updateData.title = chooseTitle(data.translations, existing.title);
    if (Object.keys(updateData).length) await tx.businessOfferingOptionGroup.update({ where: { id }, data: updateData });
    if (Array.isArray(data.translations)) {
      for (const item of data.translations) await tx.businessOfferingOptionGroupTranslation.upsert({ where: { groupId_lang: { groupId: id, lang: item.lang } }, update: item, create: { ...item, groupId: id } });
      await tx.businessOfferingOptionGroupTranslation.deleteMany({ where: { groupId: id, lang: { notIn: data.translations.map((item) => item.lang) } } });
    }
    return tx.businessOfferingOptionGroup.findUnique({ where: { id }, include: { translations: true } });
  });
  await audit(req, { action: 'UPDATE', entity: 'BusinessOfferingOptionGroup', entityId: id, before: normalize(existing), after: normalize(updated) });
  return updated;
}

async function deleteBusinessOfferingOptionGroup(id, req) {
  const existing = await prisma.businessOfferingOptionGroup.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Offering option group not found');
  await prisma.businessOfferingOptionGroup.delete({ where: { id } });
  await audit(req, { action: 'DELETE', entity: 'BusinessOfferingOptionGroup', entityId: id, before: normalize(existing) });
}

async function getNextDisplayOrder(offeringId) {
  const where = offeringId ? { offeringId: Number(offeringId) } : {};
  const aggregate = await prisma.businessOfferingOptionGroup.aggregate({ where, _max: { displayOrder: true } });
  return (aggregate._max.displayOrder || 0) + 10;
}

module.exports = { listBusinessOfferingOptionGroups, getBusinessOfferingOptionGroupById, createBusinessOfferingOptionGroup, updateBusinessOfferingOptionGroup, deleteBusinessOfferingOptionGroup, getNextDisplayOrder };
