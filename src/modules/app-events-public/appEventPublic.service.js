const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function resolveLanguage(lang, db = prisma) {
  const languages = await db.language.findMany({
    where: { isActive: true },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }, { id: 'asc' }],
    select: {
      code: true,
      isDefault: true,
    },
  });

  if (!languages.length) {
    throw new AppError(503, 'NO_ACTIVE_LANGUAGE', 'No active language is configured');
  }

  const fallbackLanguage = languages.find((item) => item.isDefault) || languages[0];
  const selectedLanguage = lang
    ? languages.find((item) => item.code === lang)
    : fallbackLanguage;

  if (!selectedLanguage) {
    throw new AppError(400, 'LANGUAGE_NOT_AVAILABLE', `Language "${lang}" is not available`);
  }

  return {
    selectedCode: selectedLanguage.code,
    fallbackCode: fallbackLanguage.code,
    languageCodes: [...new Set([selectedLanguage.code, fallbackLanguage.code])],
  };
}

function pickTranslation(translations, selectedCode, fallbackCode) {
  return translations.find((item) => item.lang === selectedCode)
    || translations.find((item) => item.lang === fallbackCode)
    || null;
}

function localizedEntity(entity, selectedCode, fallbackCode) {
  if (!entity) return null;
  const translation = pickTranslation(entity.translations || [], selectedCode, fallbackCode);
  return {
    id: entity.id,
    code: entity.code,
    title: translation?.title || entity.title || null,
    lang: translation?.lang || null,
  };
}

function eventVisibilityWhere(now, languageCodes) {
  return {
    status: 'PUBLISHED',
    isActive: true,
    endsAt: { gt: now },
    category: {
      isActive: true,
      translations: {
        some: {
          lang: { in: languageCodes },
          isActive: true,
        },
      },
    },
    city: { isActive: true },
    OR: [
      { areaId: null },
      { area: { isActive: true } },
    ],
    translations: {
      some: {
        lang: { in: languageCodes },
        isActive: true,
      },
    },
  };
}

function translationSelect(languageCodes) {
  return {
    where: {
      lang: { in: languageCodes },
      isActive: true,
    },
    select: {
      lang: true,
      title: true,
      summary: true,
      description: true,
      address: true,
    },
  };
}

function locationSelect(languageCodes) {
  return {
    select: {
      id: true,
      code: true,
      title: true,
      translations: {
        where: {
          lang: { in: languageCodes },
          isActive: true,
        },
        select: {
          lang: true,
          title: true,
        },
      },
    },
  };
}

function categorySelect(languageCodes) {
  return {
    select: {
      id: true,
      code: true,
      translations: {
        where: {
          lang: { in: languageCodes },
          isActive: true,
        },
        select: {
          lang: true,
          title: true,
        },
      },
    },
  };
}

function serializeEvent(item, languageContext, { detail = false } = {}) {
  const { selectedCode, fallbackCode } = languageContext;
  const translation = pickTranslation(item.translations, selectedCode, fallbackCode);
  const base = {
    id: item.id,
    title: translation.title,
    summary: translation.summary,
    lang: translation.lang,
    coverImage: item.coverImage,
    startsAt: item.startsAt,
    endsAt: item.endsAt,
    priceType: item.priceType,
    price: toNumber(item.price),
    currency: item.currency,
    isFeatured: item.isFeatured,
    organizerType: item.organizerType,
    category: localizedEntity(item.category, selectedCode, fallbackCode),
    city: localizedEntity(item.city, selectedCode, fallbackCode),
    area: localizedEntity(item.area, selectedCode, fallbackCode),
    address: translation.address,
  };

  if (!detail) return base;

  return {
    ...base,
    description: translation.description,
    location: {
      latitude: toNumber(item.latitude),
      longitude: toNumber(item.longitude),
    },
    contactPhone: item.contactPhone,
    externalUrl: item.externalUrl,
    publishedAt: item.publishedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

async function listCategories(query, db = prisma) {
  const languageContext = await resolveLanguage(query.lang, db);
  const { selectedCode, fallbackCode, languageCodes } = languageContext;
  const items = await db.eventCategory.findMany({
    where: {
      isActive: true,
      translations: {
        some: {
          lang: { in: languageCodes },
          isActive: true,
        },
      },
    },
    orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      code: true,
      displayOrder: true,
      translations: {
        where: {
          lang: { in: languageCodes },
          isActive: true,
        },
        select: {
          lang: true,
          title: true,
        },
      },
    },
  });

  return {
    items: items.map((item) => {
      const translation = pickTranslation(item.translations, selectedCode, fallbackCode);
      return {
        id: item.id,
        code: item.code,
        title: translation.title,
        lang: translation.lang,
        displayOrder: item.displayOrder,
      };
    }),
    meta: {
      lang: selectedCode,
      fallbackLang: fallbackCode,
    },
  };
}

async function listEvents(query, db = prisma, now = new Date()) {
  const languageContext = await resolveLanguage(query.lang, db);
  const { selectedCode, fallbackCode, languageCodes } = languageContext;
  const skip = (query.page - 1) * query.pageSize;
  const visibility = eventVisibilityWhere(now, languageCodes);
  const filters = {
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.cityId ? { cityId: query.cityId } : {}),
    ...(query.areaId ? { areaId: query.areaId } : {}),
    ...(query.priceType ? { priceType: query.priceType } : {}),
    ...(query.isFeatured !== undefined ? { isFeatured: query.isFeatured } : {}),
    ...(query.startFrom || query.startTo
      ? {
        startsAt: {
          ...(query.startFrom ? { gte: query.startFrom } : {}),
          ...(query.startTo ? { lte: query.startTo } : {}),
        },
      }
      : {}),
  };
  const where = {
    AND: [
      visibility,
      filters,
      ...(query.q
        ? [{
          translations: {
            some: {
              lang: { in: languageCodes },
              isActive: true,
              OR: [
                { title: { contains: query.q } },
                { summary: { contains: query.q } },
                { description: { contains: query.q } },
                { address: { contains: query.q } },
              ],
            },
          },
        }]
        : []),
    ],
  };
  const orderBy = query.sort === 'newest'
    ? [{ publishedAt: 'desc' }, { id: 'desc' }]
    : [{ startsAt: 'asc' }, { id: 'asc' }];

  const [items, total] = await Promise.all([
    db.event.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy,
      select: {
        id: true,
        coverImage: true,
        startsAt: true,
        endsAt: true,
        priceType: true,
        price: true,
        currency: true,
        isFeatured: true,
        organizerType: true,
        translations: translationSelect(languageCodes),
        category: categorySelect(languageCodes),
        city: locationSelect(languageCodes),
        area: locationSelect(languageCodes),
      },
    }),
    db.event.count({ where }),
  ]);

  return {
    items: items.map((item) => serializeEvent(item, languageContext)),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      pageCount: Math.ceil(total / query.pageSize),
      lang: selectedCode,
      fallbackLang: fallbackCode,
      generatedAt: now,
    },
  };
}

async function getEventDetail(id, query, db = prisma, now = new Date()) {
  const languageContext = await resolveLanguage(query.lang, db);
  const { selectedCode, fallbackCode, languageCodes } = languageContext;
  const item = await db.event.findFirst({
    where: {
      id,
      ...eventVisibilityWhere(now, languageCodes),
    },
    select: {
      id: true,
      coverImage: true,
      startsAt: true,
      endsAt: true,
      latitude: true,
      longitude: true,
      priceType: true,
      price: true,
      currency: true,
      contactPhone: true,
      externalUrl: true,
      isFeatured: true,
      organizerType: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      translations: translationSelect(languageCodes),
      category: categorySelect(languageCodes),
      city: locationSelect(languageCodes),
      area: locationSelect(languageCodes),
    },
  });

  if (!item) {
    throw new AppError(404, 'EVENT_NOT_FOUND', 'Event was not found');
  }

  return {
    item: serializeEvent(item, languageContext, { detail: true }),
    meta: {
      lang: selectedCode,
      fallbackLang: fallbackCode,
    },
  };
}

module.exports = {
  eventVisibilityWhere,
  getEventDetail,
  listCategories,
  listEvents,
  pickTranslation,
  resolveLanguage,
};
