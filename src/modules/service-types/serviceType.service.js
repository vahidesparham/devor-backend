const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const { audit } = require('../../shared/audit/audit');
const { isDescendantServiceType } = require('./serviceTypeHierarchy');

function normalize(item) {
  return {
    parentId: item.parentId ?? null,
    code: item.code,
    title: item.title,
    image: item.image,
    pinIconImage: item.pinIconImage,
    color: item.color,
    displayOrder: item.displayOrder,
    isActive: item.isActive,
  };
}

async function assertLanguages(codes) {
  if (!codes.length) return;
  const existing = await prisma.language.findMany({
    where: { code: { in: codes }, isActive: true },
    select: { code: true },
  });
  const existingCodes = new Set(existing.map((item) => item.code));
  const missing = codes.filter((code) => !existingCodes.has(code));
  if (missing.length) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
      errors: missing.map((code) => ({ path: 'translations.lang', message: `Language "${code}" is not available` })),
    });
  }
}

async function resolveSelectedLang(lang) {
  if (lang) return lang;
  const fallback = await prisma.language.findFirst({
    where: { isActive: true },
    orderBy: [{ isDefault: 'desc' }, { code: 'asc' }],
    select: { code: true },
  });
  return fallback?.code || 'en';
}

function splitData(data) {
  const { translations, ...core } = data;
  return { core, translations };
}

function chooseFallbackTitle(translations, fallback) {
  return translations?.[0]?.title || fallback || '';
}

function chooseFallbackDescription(translations, fallback) {
  return translations?.find((item) => item.description)?.description ?? fallback ?? null;
}

async function assertParentServiceType(parentId, currentId = null) {
  if (!parentId) return;
  const numericParentId = Number(parentId);
  const numericCurrentId = currentId ? Number(currentId) : null;
  if (numericCurrentId && numericParentId === numericCurrentId) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', { errors: [{ path: 'parentId', message: 'A service type cannot be its own parent' }] });
  }
  const parent = await prisma.serviceType.findUnique({ where: { id: numericParentId }, select: { id: true } });
  if (!parent) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', { errors: [{ path: 'parentId', message: 'Parent service type not found' }] });
  }
  if (numericCurrentId && await isDescendantServiceType(numericParentId, numericCurrentId)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', { errors: [{ path: 'parentId', message: 'A service type cannot use its descendant as parent' }] });
  }
}

async function listServiceTypes(query, lang) {
  const selectedLang = await resolveSelectedLang(query.lang || lang);
  const skip = (query.page - 1) * query.pageSize;
  const where = {};

  if (query.rootOnly) where.parentId = null;
  else if (query.parentId !== undefined && query.parentId !== null) where.parentId = query.parentId;
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.q) {
    where.OR = [
      { code: { contains: query.q } },
      { title: { contains: query.q } },
      { description: { contains: query.q } },
      { translations: { some: { OR: [{ title: { contains: query.q } }, { description: { contains: query.q } }] } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.serviceType.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [{ [query.sortBy]: query.sortDir }, { id: 'asc' }],
      include: {
        parent: {
          select: {
            id: true,
            code: true,
            title: true,
            translations: { where: { lang: selectedLang }, take: 1 },
          },
        },
        translations: {
          where: { lang: selectedLang },
          take: 1,
        },
        _count: {
          select: {
            attributeGroups: true,
            businesses: true,
            children: true,
          },
        },
      },
    }),
    prisma.serviceType.count({ where }),
  ]);

  return {
    items: items.map((item) => {
      const selectedTranslation = item.translations[0] || null;
      return {
        ...item,
        parent: item.parent ? {
          id: item.parent.id,
          code: item.parent.code,
          title: item.parent.translations?.[0]?.title || item.parent.title,
        } : null,
        selectedTranslation,
        title: selectedTranslation?.title || item.title,
        description: selectedTranslation?.description ?? item.description,
        translations: undefined,
      };
    }),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      pageCount: Math.ceil(total / query.pageSize),
      lang: selectedLang,
    },
  };
}

async function getServiceTypeById(id) {
  const item = await prisma.serviceType.findUnique({
    where: { id },
    include: {
      translations: {
        orderBy: { lang: 'asc' },
      },
      _count: {
        select: {
          attributeGroups: true,
          businesses: true,
          children: true,
        },
      },
    },
  });
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Service type not found');
  return item;
}

async function createServiceType(data, req) {
  const { core, translations } = splitData(data);
  await assertParentServiceType(core.parentId);
  await assertLanguages([...new Set(translations.map((item) => item.lang))]);
  const created = await prisma.serviceType.create({
    data: {
      ...core,
      title: chooseFallbackTitle(translations),
      description: chooseFallbackDescription(translations),
      translations: { create: translations },
    },
    include: { translations: true },
  });
  await audit(req, { action: 'CREATE', entity: 'ServiceType', entityId: created.id, after: normalize(created) });
  return created;
}

async function updateServiceType(id, data, req) {
  const existing = await prisma.serviceType.findUnique({ where: { id }, include: { translations: true } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Service type not found');

  const { core, translations } = splitData(data);
  if (Object.prototype.hasOwnProperty.call(core, 'parentId')) await assertParentServiceType(core.parentId, id);
  if (translations) await assertLanguages([...new Set(translations.map((item) => item.lang))]);

  const updated = await prisma.$transaction(async (tx) => {
    if (Object.keys(core).length || translations) {
      await tx.serviceType.update({
        where: { id },
        data: {
          ...core,
          ...(translations ? {
            title: chooseFallbackTitle(translations, existing.title),
            description: chooseFallbackDescription(translations, existing.description),
          } : {}),
        },
      });
    }

    if (Array.isArray(translations)) {
      for (const item of translations) {
        await tx.serviceTypeTranslation.upsert({
          where: { serviceTypeId_lang: { serviceTypeId: id, lang: item.lang } },
          update: item,
          create: { ...item, serviceTypeId: id },
        });
      }
      await tx.serviceTypeTranslation.deleteMany({
        where: { serviceTypeId: id, lang: { notIn: translations.map((item) => item.lang) } },
      });
    }

    return tx.serviceType.findUnique({ where: { id }, include: { translations: true } });
  });
  await audit(req, { action: 'UPDATE', entity: 'ServiceType', entityId: id, before: normalize(existing), after: normalize(updated) });
  return updated;
}

async function deleteServiceType(id, req) {
  const existing = await prisma.serviceType.findUnique({
    where: { id },
    include: { _count: { select: { businesses: true, attributeGroups: true, children: true } } },
  });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Service type not found');
  if (existing._count.children > 0) {
    throw new AppError(409, 'SERVICE_TYPE_HAS_CHILDREN', 'Service type has children and cannot be deleted');
  }
  if (existing._count.businesses > 0) {
    throw new AppError(409, 'SERVICE_TYPE_IN_USE', 'Service type has businesses and cannot be deleted');
  }
  if (existing._count.attributeGroups > 0) {
    throw new AppError(409, 'SERVICE_TYPE_HAS_ATTRIBUTE_GROUPS', 'Service type has attribute groups and cannot be deleted');
  }

  await prisma.serviceType.delete({ where: { id } });
  await audit(req, { action: 'DELETE', entity: 'ServiceType', entityId: id, before: normalize(existing) });
}

async function getNextDisplayOrder() {
  const aggregate = await prisma.serviceType.aggregate({ _max: { displayOrder: true } });
  return (aggregate._max.displayOrder || 0) + 10;
}

module.exports = {
  listServiceTypes,
  getServiceTypeById,
  createServiceType,
  updateServiceType,
  deleteServiceType,
  getNextDisplayOrder,
};
