const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const { audit } = require('../../shared/audit/audit');

const config = {
  country: {
    model: prisma.country,
    translationModel: prisma.countryTranslation,
    entity: 'Country',
    parentField: null,
    translationParentField: 'countryId',
    includeList: { translations: true, _count: { select: { cities: true, businesses: true } } },
    countSelect: { cities: true, businesses: true },
  },
  city: {
    model: prisma.city,
    translationModel: prisma.cityTranslation,
    entity: 'City',
    parentField: 'countryId',
    translationParentField: 'cityId',
    parentModel: prisma.country,
    parentName: 'Country',
    includeList: { country: { select: { id: true, code: true, title: true } }, translations: true, _count: { select: { areas: true, businesses: true } } },
    countSelect: { areas: true, businesses: true },
  },
  area: {
    model: prisma.area,
    translationModel: prisma.areaTranslation,
    entity: 'Area',
    parentField: 'cityId',
    translationParentField: 'areaId',
    parentModel: prisma.city,
    parentName: 'City',
    includeList: { city: { select: { id: true, code: true, title: true, countryId: true, country: { select: { id: true, code: true, title: true } } } }, translations: true, _count: { select: { businesses: true } } },
    countSelect: { businesses: true },
  },
};

async function assertLanguages(codes) {
  if (!codes.length) return;
  const existing = await prisma.language.findMany({ where: { code: { in: codes }, isActive: true }, select: { code: true } });
  const existingCodes = new Set(existing.map((item) => item.code));
  const missing = codes.filter((code) => !existingCodes.has(code));
  if (missing.length) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
      errors: missing.map((code) => ({ path: 'translations.lang', message: `Language "${code}" is not available` })),
    });
  }
}

async function assertParent(type, id) {
  const cfg = config[type];
  if (!cfg.parentModel || !id) return;
  const exists = await cfg.parentModel.findUnique({ where: { id }, select: { id: true } });
  if (!exists) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
      errors: [{ path: cfg.parentField, message: `${cfg.parentName} not found` }],
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

function splitData(data) {
  const { translations, ...core } = data;
  return { core, translations };
}

function normalize(item) {
  return {
    code: item.code,
    title: item.title,
    phoneCode: item.phoneCode,
    flagImage: item.flagImage,
    displayOrder: item.displayOrder,
    isActive: item.isActive,
  };
}

function makeSearchWhere(type, query) {
  const where = {};
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (type === 'city' && query.countryId) where.countryId = query.countryId;
  if (type === 'area' && query.cityId) where.cityId = query.cityId;
  if (type === 'area' && query.countryId) where.city = { countryId: query.countryId };
  if (query.q) {
    where.OR = [
      { code: { contains: query.q } },
      { title: { contains: query.q } },
      { translations: { some: { title: { contains: query.q } } } },
    ];
    if (type === 'country') where.OR.push({ phoneCode: { contains: query.q } });
  }
  return where;
}

function mapLocalized(item) {
  const selectedTranslation = item.translations?.[0] || null;
  return {
    ...item,
    selectedTranslation,
    title: selectedTranslation?.title || item.title,
    translations: undefined,
  };
}

async function list(type, query) {
  const cfg = config[type];
  const selectedLang = await resolveSelectedLang(query.lang);
  const skip = (query.page - 1) * query.pageSize;
  const where = makeSearchWhere(type, query);
  const [items, total] = await Promise.all([
    cfg.model.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [{ [query.sortBy]: query.sortDir }, { id: 'asc' }],
      include: {
        ...cfg.includeList,
        translations: { where: { lang: selectedLang }, take: 1 },
      },
    }),
    cfg.model.count({ where }),
  ]);
  return {
    items: items.map(mapLocalized),
    meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize), lang: selectedLang },
  };
}

async function getById(type, id) {
  const cfg = config[type];
  const item = await cfg.model.findUnique({
    where: { id },
    include: {
      ...cfg.includeList,
      translations: { orderBy: { lang: 'asc' } },
    },
  });
  if (!item) throw new AppError(404, 'NOT_FOUND', `${cfg.entity} not found`);
  return item;
}

async function create(type, data, req) {
  const cfg = config[type];
  const { core, translations } = splitData(data);
  await assertParent(type, core[cfg.parentField]);
  await assertLanguages([...new Set(translations.map((item) => item.lang))]);
  const created = await cfg.model.create({
    data: {
      ...core,
      title: chooseFallbackTitle(translations),
      translations: { create: translations },
    },
    include: { translations: true },
  });
  await audit(req, { action: 'CREATE', entity: cfg.entity, entityId: created.id, after: normalize(created) });
  return created;
}

async function update(type, id, data, req) {
  const cfg = config[type];
  const existing = await cfg.model.findUnique({ where: { id }, include: { translations: true } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', `${cfg.entity} not found`);
  const { core, translations } = splitData(data);
  if (cfg.parentField && core[cfg.parentField] !== undefined) await assertParent(type, core[cfg.parentField]);
  if (translations) await assertLanguages([...new Set(translations.map((item) => item.lang))]);

  const updated = await prisma.$transaction(async (tx) => {
    if (Object.keys(core).length || translations) {
      await tx[cfg.entity.charAt(0).toLowerCase() + cfg.entity.slice(1)].update({
        where: { id },
        data: {
          ...core,
          ...(translations ? { title: chooseFallbackTitle(translations, existing.title) } : {}),
        },
      });
    }
    if (Array.isArray(translations)) {
      for (const item of translations) {
        await tx[cfg.entity.charAt(0).toLowerCase() + cfg.entity.slice(1) + 'Translation'].upsert({
          where: { [`${cfg.translationParentField}_lang`]: { [cfg.translationParentField]: id, lang: item.lang } },
          update: item,
          create: { ...item, [cfg.translationParentField]: id },
        });
      }
      await tx[cfg.entity.charAt(0).toLowerCase() + cfg.entity.slice(1) + 'Translation'].deleteMany({
        where: { [cfg.translationParentField]: id, lang: { notIn: translations.map((item) => item.lang) } },
      });
    }
    return tx[cfg.entity.charAt(0).toLowerCase() + cfg.entity.slice(1)].findUnique({ where: { id }, include: { translations: true } });
  });
  await audit(req, { action: 'UPDATE', entity: cfg.entity, entityId: id, before: normalize(existing), after: normalize(updated) });
  return updated;
}

async function remove(type, id, req) {
  const cfg = config[type];
  const existing = await cfg.model.findUnique({ where: { id }, include: { _count: { select: cfg.countSelect } } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', `${cfg.entity} not found`);
  const counts = Object.values(existing._count || {});
  if (counts.some((count) => count > 0)) {
    throw new AppError(409, `${cfg.entity.toUpperCase()}_IN_USE`, `${cfg.entity} is in use and cannot be deleted`);
  }
  await cfg.model.delete({ where: { id } });
  await audit(req, { action: 'DELETE', entity: cfg.entity, entityId: id, before: normalize(existing) });
}

async function getNextDisplayOrder(type, query) {
  const where = {};
  if (type === 'city' && query.countryId) where.countryId = Number(query.countryId);
  if (type === 'area' && query.cityId) where.cityId = Number(query.cityId);
  const aggregate = await config[type].model.aggregate({ where, _max: { displayOrder: true } });
  return (aggregate._max.displayOrder || 0) + 10;
}

module.exports = { list, getById, create, update, remove, getNextDisplayOrder };
