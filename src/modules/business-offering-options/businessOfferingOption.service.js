const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const { audit } = require('../../shared/audit/audit');

async function assertGroup(id) {
  const exists = await prisma.businessOfferingOptionGroup.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', { errors: [{ path: 'groupId', message: 'Option group not found' }] });
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
const normalize = (item) => ({ id: item.id, groupId: item.groupId, title: item.title, priceDelta: item.priceDelta === null || item.priceDelta === undefined ? null : Number(item.priceDelta), displayOrder: item.displayOrder, isActive: item.isActive });
const mapDecimal = (item) => item ? { ...item, priceDelta: item.priceDelta === null || item.priceDelta === undefined ? null : Number(item.priceDelta) } : item;

async function listBusinessOfferingOptions(query) {
  const selectedLang = await resolveSelectedLang(query.lang);
  const skip = (query.page - 1) * query.pageSize;
  const where = {};
  if (query.groupId) where.groupId = query.groupId;
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.q) where.OR = [{ title: { contains: query.q } }, { translations: { some: { title: { contains: query.q } } } }];
  const [items, total] = await Promise.all([
    prisma.businessOfferingOption.findMany({ where, skip, take: query.pageSize, orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }], include: { translations: { where: { lang: selectedLang }, take: 1 } } }),
    prisma.businessOfferingOption.count({ where }),
  ]);
  return { items: items.map((item) => mapDecimal({ ...item, selectedTranslation: item.translations[0] || null, title: item.translations[0]?.title || item.title, translations: undefined })), meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize), lang: selectedLang } };
}

async function getBusinessOfferingOptionById(id) {
  const item = await prisma.businessOfferingOption.findUnique({ where: { id }, include: { translations: { orderBy: { lang: 'asc' } }, group: { include: { offering: true } } } });
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Offering option not found');
  return mapDecimal(item);
}

async function createBusinessOfferingOption(data, req) {
  await assertGroup(data.groupId);
  await assertLanguages([...new Set(data.translations.map((item) => item.lang))]);
  const created = await prisma.businessOfferingOption.create({ data: { groupId: data.groupId, title: chooseTitle(data.translations), priceDelta: data.priceDelta ?? null, displayOrder: data.displayOrder ?? 0, isActive: data.isActive ?? true, translations: { create: data.translations } }, include: { translations: true } });
  await audit(req, { action: 'CREATE', entity: 'BusinessOfferingOption', entityId: created.id, after: normalize(created) });
  return mapDecimal(created);
}

async function updateBusinessOfferingOption(id, data, req) {
  const existing = await prisma.businessOfferingOption.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Offering option not found');
  if (data.groupId) await assertGroup(data.groupId);
  if (data.translations) await assertLanguages([...new Set(data.translations.map((item) => item.lang))]);
  const updated = await prisma.$transaction(async (tx) => {
    const updateData = {};
    ['groupId', 'priceDelta', 'displayOrder', 'isActive'].forEach((field) => { if (data[field] !== undefined) updateData[field] = data[field]; });
    if (data.translations) updateData.title = chooseTitle(data.translations, existing.title);
    if (Object.keys(updateData).length) await tx.businessOfferingOption.update({ where: { id }, data: updateData });
    if (Array.isArray(data.translations)) {
      for (const item of data.translations) await tx.businessOfferingOptionTranslation.upsert({ where: { optionId_lang: { optionId: id, lang: item.lang } }, update: item, create: { ...item, optionId: id } });
      await tx.businessOfferingOptionTranslation.deleteMany({ where: { optionId: id, lang: { notIn: data.translations.map((item) => item.lang) } } });
    }
    return tx.businessOfferingOption.findUnique({ where: { id }, include: { translations: true } });
  });
  await audit(req, { action: 'UPDATE', entity: 'BusinessOfferingOption', entityId: id, before: normalize(existing), after: normalize(updated) });
  return mapDecimal(updated);
}

async function deleteBusinessOfferingOption(id, req) {
  const existing = await prisma.businessOfferingOption.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Offering option not found');
  await prisma.businessOfferingOption.delete({ where: { id } });
  await audit(req, { action: 'DELETE', entity: 'BusinessOfferingOption', entityId: id, before: normalize(existing) });
}

async function getNextDisplayOrder(groupId) {
  const where = groupId ? { groupId: Number(groupId) } : {};
  const aggregate = await prisma.businessOfferingOption.aggregate({ where, _max: { displayOrder: true } });
  return (aggregate._max.displayOrder || 0) + 10;
}

module.exports = { listBusinessOfferingOptions, getBusinessOfferingOptionById, createBusinessOfferingOption, updateBusinessOfferingOption, deleteBusinessOfferingOption, getNextDisplayOrder };
