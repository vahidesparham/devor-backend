const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const { getDescendantServiceTypeIds, getRootServiceTypeId } = require('../service-types/serviceTypeHierarchy');
const {
  DISCOUNT_RANGES,
  calculateDiscountedPrice,
  discountBelongsToRange,
} = require('../business-offers/businessOffer.domain');

function toPublicAsset(url) {
  if (!url) return null;
  return url;
}

function normalizeLanguage(item) {
  if (!item) return null;
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    nativeName: item.nativeName,
    image: toPublicAsset(item.image),
    direction: item.direction,
    isDefault: item.isDefault,
  };
}

async function listActiveLanguages() {
  return prisma.language.findMany({
    where: { isActive: true },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      code: true,
      name: true,
      nativeName: true,
      image: true,
      direction: true,
      isDefault: true,
    },
  });
}

async function resolveLanguage(lang) {
  const languages = await listActiveLanguages();
  if (!languages.length) {
    throw new AppError(503, 'NO_ACTIVE_LANGUAGE', 'No active language is configured');
  }

  if (!lang) return { languages, selectedLanguage: languages[0] };

  const selectedLanguage = languages.find((item) => item.code === lang);
  if (!selectedLanguage) {
    throw new AppError(400, 'LANGUAGE_NOT_AVAILABLE', `Language "${lang}" is not available`);
  }

  return { languages, selectedLanguage };
}

async function getBootstrap() {
  const languages = await listActiveLanguages();
  return {
    languages: languages.map(normalizeLanguage),
    defaultLanguage: normalizeLanguage(languages.find((item) => item.isDefault) || languages[0] || null),
  };
}

async function getHome(query) {
  const { languages, selectedLanguage } = await resolveLanguage(query.lang);
  const fallbackLanguage = languages.find((item) => item.isDefault) || languages[0];
  const featuredLimit = query.featuredLimit;
  const slideshowLimit = query.slideshowLimit;
  const bannerLimit = query.bannerLimit;
  const cityId = query.cityId;
  const now = new Date();

  const [serviceTypes, slideshows, banners] = await Promise.all([
    prisma.serviceType.findMany({
      where: { parentId: null, isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        code: true,
        title: true,
        image: true,
        pinIconImage: true,
        color: true,
        translations: {
          where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
          select: { lang: true, title: true, description: true },
        },
        children: {
          where: { isActive: true },
          select: { id: true },
        },
      },
    }),
    prisma.slideshow.findMany({
      where: {
        AND: [
          { OR: [{ fromDate: null }, { fromDate: { lte: now } }] },
          { OR: [{ toDate: null }, { toDate: { gte: now } }] },
          {
            translations: {
              some: {
                lang: { in: [selectedLanguage.code, fallbackLanguage.code] },
                isActive: true,
              },
            },
          },
        ],
      },
      take: slideshowLimit,
      orderBy: [{ fromDate: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        translations: {
          where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
          select: { lang: true, title: true, link: true, image: true },
        },
      },
    }),
    prisma.banner.findMany({
      where: {
        AND: [
          { OR: [{ fromDate: null }, { fromDate: { lte: now } }] },
          { OR: [{ toDate: null }, { toDate: { gte: now } }] },
          {
            translations: {
              some: {
                lang: { in: [selectedLanguage.code, fallbackLanguage.code] },
                isActive: true,
              },
            },
          },
        ],
      },
      take: bannerLimit,
      orderBy: [{ fromDate: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        placement: true,
        translations: {
          where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
          select: { lang: true, title: true, link: true, image: true },
        },
      },
    }),
  ]);

  const categories = serviceTypes.map((serviceType) => {
    const translation = pickTranslation(serviceType.translations, selectedLanguage, fallbackLanguage);
    return {
      id: serviceType.id,
      code: serviceType.code,
      title: translation?.title || serviceType.title,
      image: toPublicAsset(serviceType.image),
      pinIconImage: toPublicAsset(serviceType.pinIconImage),
      color: serviceType.color,
    };
  });

  const nearbyWhere = {
    isActive: true,
    publicationStatus: 'PUBLISHED',
    ...(cityId ? { cityId } : {}),
    translations: {
      some: {
        lang: { in: [selectedLanguage.code, fallbackLanguage.code] },
        isActive: true,
      },
    },
  };

  const newPlacesWhere = {
    isActive: true,
    publicationStatus: 'PUBLISHED',
    translations: {
      some: {
        lang: { in: [selectedLanguage.code, fallbackLanguage.code] },
        isActive: true,
      },
    },
  };

  const [nearbyBusinesses, newPlaces] = await Promise.all([
    listHomeBusinesses({
      where: nearbyWhere,
      take: 4,
      orderBy: [{ isFeatured: 'desc' }, { displayOrder: 'asc' }, { id: 'desc' }],
      selectedLanguage,
      fallbackLanguage,
    }),
    listHomeBusinesses({
      where: newPlacesWhere,
      take: 4,
      orderBy: [{ showInLatest: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      selectedLanguage,
      fallbackLanguage,
    }),
  ]);

  const featuredSections = [];
  for (const serviceType of serviceTypes) {
    const translation = pickTranslation(serviceType.translations, selectedLanguage, fallbackLanguage);
    const serviceTypeIds = await getDescendantServiceTypeIds(serviceType.id, { activeOnly: true });
    const businesses = await listHomeBusinesses({
      where: {
        serviceTypeId: { in: serviceTypeIds },
        isActive: true,
        isFeatured: true,
        publicationStatus: 'PUBLISHED',
        translations: {
          some: {
            lang: { in: [selectedLanguage.code, fallbackLanguage.code] },
            isActive: true,
          },
        },
      },
      take: featuredLimit,
      orderBy: [{ displayOrder: 'asc' }, { publishedAt: 'desc' }, { id: 'desc' }],
      selectedLanguage,
      fallbackLanguage,
    });

    if (!businesses.length) continue;

    featuredSections.push({
      serviceType: {
        id: serviceType.id,
        code: serviceType.code,
        title: translation?.title || serviceType.title,
        image: toPublicAsset(serviceType.image),
        pinIconImage: toPublicAsset(serviceType.pinIconImage),
        color: serviceType.color,
      },
      title: translation?.title || serviceType.title,
      items: businesses,
    });
  }

  return {
    lang: selectedLanguage.code,
    categories,
    slideshows: slideshows
      .map((slideshow) => {
        const translation = pickTranslation(slideshow.translations, selectedLanguage, fallbackLanguage);
        if (!translation) return null;
        return {
          id: slideshow.id,
          title: translation.title,
          link: translation.link,
          image: toPublicAsset(translation.image),
        };
      })
      .filter(Boolean),
    banners: banners
      .map((banner) => {
        const translation = pickTranslation(banner.translations, selectedLanguage, fallbackLanguage);
        if (!translation) return null;
        return {
          id: banner.id,
          placement: banner.placement,
          title: translation.title,
          link: translation.link,
          image: toPublicAsset(translation.image),
        };
      })
      .filter(Boolean),
    nearbyBusinesses,
    featuredSections,
    newPlaces,
  };
}

async function listOnboardingPages(lang) {
  const { languages, selectedLanguage } = await resolveLanguage(lang);
  const fallbackLanguage = languages.find((item) => item.isDefault) || languages[0];

  const items = await prisma.onboardingPage.findMany({
    where: { isActive: true },
    orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      image: true,
      color: true,
      displayOrder: true,
      translations: {
        where: {
          lang: { in: [selectedLanguage.code, fallbackLanguage.code] },
          isActive: true,
        },
        select: {
          lang: true,
          title: true,
          description: true,
        },
      },
    },
  });

  return {
    lang: selectedLanguage.code,
    items: items
      .map((item) => {
        const selectedTranslation = item.translations.find((translation) => translation.lang === selectedLanguage.code);
        const fallbackTranslation = item.translations.find((translation) => translation.lang === fallbackLanguage.code);
        const translation = selectedTranslation || fallbackTranslation || null;

        if (!translation) return null;

        return {
          id: item.id,
          image: toPublicAsset(item.image),
          color: item.color,
          displayOrder: item.displayOrder,
          title: translation.title,
          description: translation.description,
        };
      })
      .filter(Boolean),
  };
}

async function getContentPage(slug, lang) {
  const { languages, selectedLanguage } = await resolveLanguage(lang);
  const fallbackLanguage = languages.find((item) => item.isDefault) || languages[0];

  const item = await prisma.contentPage.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true,
      slug: true,
      image: true,
      translations: {
        where: {
          lang: { in: [selectedLanguage.code, fallbackLanguage.code] },
          isActive: true,
        },
        select: {
          lang: true,
          title: true,
          body: true,
        },
      },
    },
  });

  if (!item) {
    throw new AppError(404, 'CONTENT_PAGE_NOT_FOUND', 'Content page not found');
  }

  const selectedTranslation = item.translations.find((translation) => translation.lang === selectedLanguage.code);
  const fallbackTranslation = item.translations.find((translation) => translation.lang === fallbackLanguage.code);
  const translation = selectedTranslation || fallbackTranslation || null;

  if (!translation) {
    throw new AppError(404, 'CONTENT_PAGE_TRANSLATION_NOT_FOUND', 'Content page translation not found');
  }

  return {
    id: item.id,
    slug: item.slug,
    image: toPublicAsset(item.image),
    lang: selectedLanguage.code,
    title: translation.title,
    body: translation.body,
  };
}

async function getContactPage(lang) {
  const { languages, selectedLanguage } = await resolveLanguage(lang);
  const fallbackLanguage = languages.find((item) => item.isDefault) || languages[0];

  const item = await prisma.contactPage.findUnique({
    where: { id: 1 },
    select: {
      id: true,
      instagram: true,
      telegram: true,
      whatsapp: true,
      youtube: true,
      tiktok: true,
      email: true,
      supportPhoneNumber: true,
      translations: {
        where: {
          lang: { in: [selectedLanguage.code, fallbackLanguage.code] },
          isActive: true,
        },
        select: {
          lang: true,
          title: true,
          body: true,
          phoneNumber: true,
          address: true,
          workingHours: true,
        },
      },
    },
  });

  if (!item) {
    throw new AppError(404, 'CONTACT_PAGE_NOT_FOUND', 'Contact page not found');
  }

  const selectedTranslation = item.translations.find((translation) => translation.lang === selectedLanguage.code);
  const fallbackTranslation = item.translations.find((translation) => translation.lang === fallbackLanguage.code);
  const translation = selectedTranslation || fallbackTranslation || null;

  return {
    id: item.id,
    lang: selectedLanguage.code,
    title: translation?.title || '',
    body: translation?.body || '',
    phoneNumber: translation?.phoneNumber || null,
    address: translation?.address || null,
    workingHours: translation?.workingHours || null,
    instagram: item.instagram,
    telegram: item.telegram,
    whatsapp: item.whatsapp,
    youtube: item.youtube,
    tiktok: item.tiktok,
    email: item.email,
    supportPhoneNumber: item.supportPhoneNumber,
  };
}

async function listFaqs(lang) {
  const { languages, selectedLanguage } = await resolveLanguage(lang);
  const fallbackLanguage = languages.find((item) => item.isDefault) || languages[0];

  const categories = await prisma.faqCategory.findMany({
    where: { isActive: true },
    orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      image: true,
      displayOrder: true,
      translations: {
        where: {
          lang: { in: [selectedLanguage.code, fallbackLanguage.code] },
          isActive: true,
        },
        select: {
          lang: true,
          title: true,
        },
      },
      faqs: {
        where: { isActive: true },
        orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          displayOrder: true,
          translations: {
            where: {
              lang: { in: [selectedLanguage.code, fallbackLanguage.code] },
              isActive: true,
            },
            select: {
              lang: true,
              question: true,
              answer: true,
            },
          },
        },
      },
    },
  });

  return {
    lang: selectedLanguage.code,
    items: categories
      .map((category) => {
        const selectedCategoryTranslation = category.translations.find(
          (translation) => translation.lang === selectedLanguage.code,
        );
        const fallbackCategoryTranslation = category.translations.find(
          (translation) => translation.lang === fallbackLanguage.code,
        );
        const categoryTranslation = selectedCategoryTranslation || fallbackCategoryTranslation || null;

        if (!categoryTranslation) return null;

        const questions = category.faqs
          .map((faq) => {
            const selectedFaqTranslation = faq.translations.find(
              (translation) => translation.lang === selectedLanguage.code,
            );
            const fallbackFaqTranslation = faq.translations.find(
              (translation) => translation.lang === fallbackLanguage.code,
            );
            const faqTranslation = selectedFaqTranslation || fallbackFaqTranslation || null;

            if (!faqTranslation) return null;

            return {
              id: faq.id,
              displayOrder: faq.displayOrder,
              question: faqTranslation.question,
              answer: faqTranslation.answer,
            };
          })
          .filter(Boolean);

        return {
          id: category.id,
          image: toPublicAsset(category.image),
          displayOrder: category.displayOrder,
          title: categoryTranslation.title,
          questions,
        };
      })
      .filter((category) => category && category.questions.length > 0),
  };
}

async function listCountries(lang) {
  const { languages, selectedLanguage } = await resolveLanguage(lang);
  const fallbackLanguage = languages.find((item) => item.isDefault) || languages[0];

  const items = await prisma.country.findMany({
    where: { isActive: true },
    orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      code: true,
      title: true,
      phoneCode: true,
      flagImage: true,
      translations: {
        where: {
          lang: { in: [selectedLanguage.code, fallbackLanguage.code] },
          isActive: true,
        },
        select: { lang: true, title: true },
      },
    },
  });

  return {
    lang: selectedLanguage.code,
    items: items.map((item) => {
      const selectedTranslation = item.translations.find((translation) => translation.lang === selectedLanguage.code);
      const fallbackTranslation = item.translations.find((translation) => translation.lang === fallbackLanguage.code);
      const translation = selectedTranslation || fallbackTranslation || null;
      return {
        id: item.id,
        code: item.code,
        title: translation?.title || item.title,
        phoneCode: item.phoneCode,
        flagImage: toPublicAsset(item.flagImage),
      };
    }),
  };
}

async function listCities(lang) {
  const { languages, selectedLanguage } = await resolveLanguage(lang);
  const fallbackLanguage = languages.find((item) => item.isDefault) || languages[0];

  const items = await prisma.city.findMany({
    where: { isActive: true, country: { isActive: true } },
    orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      countryId: true,
      code: true,
      title: true,
      latitude: true,
      longitude: true,
      country: {
        select: {
          id: true,
          code: true,
          title: true,
          translations: {
            where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
            select: { lang: true, title: true },
          },
        },
      },
      translations: {
        where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
        select: { lang: true, title: true },
      },
      _count: { select: { businesses: true } },
    },
  });

  return {
    lang: selectedLanguage.code,
    items: items.map((item) => {
      const translation = pickTranslation(item.translations, selectedLanguage, fallbackLanguage);
      const countryTranslation = pickTranslation(item.country.translations, selectedLanguage, fallbackLanguage);
      return {
        id: item.id,
        countryId: item.countryId,
        code: item.code,
        title: translation?.title || item.title,
        latitude: item.latitude === null ? null : Number(item.latitude),
        longitude: item.longitude === null ? null : Number(item.longitude),
        businessCount: item._count.businesses,
        country: {
          id: item.country.id,
          code: item.country.code,
          title: countryTranslation?.title || item.country.title,
        },
      };
    }),
  };
}

async function listAreas(query) {
  const { languages, selectedLanguage } = await resolveLanguage(query.lang);
  const fallbackLanguage = languages.find((item) => item.isDefault) || languages[0];

  const items = await prisma.area.findMany({
    where: {
      cityId: query.cityId,
      isActive: true,
      city: { isActive: true },
    },
    orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      cityId: true,
      code: true,
      title: true,
      translations: {
        where: {
          lang: { in: [selectedLanguage.code, fallbackLanguage.code] },
          isActive: true,
        },
        select: { lang: true, title: true },
      },
    },
  });

  return {
    lang: selectedLanguage.code,
    items: items.map((item) => {
      const translation = pickTranslation(
        item.translations,
        selectedLanguage,
        fallbackLanguage,
      );
      return {
        id: item.id,
        cityId: item.cityId,
        code: item.code,
        title: translation?.title || item.title,
      };
    }),
  };
}

function pickTranslation(translations, selectedLanguage, fallbackLanguage) {
  const selectedTranslation = translations.find((translation) => translation.lang === selectedLanguage.code);
  const fallbackTranslation = translations.find((translation) => translation.lang === fallbackLanguage.code);
  return selectedTranslation || fallbackTranslation || null;
}

function serviceTypePublicPayload(serviceType, selectedLanguage, fallbackLanguage) {
  const translation = pickTranslation(serviceType.translations || [], selectedLanguage, fallbackLanguage);
  return {
    id: serviceType.id,
    code: serviceType.code,
    title: translation?.title || serviceType.title,
    image: toPublicAsset(serviceType.image),
    pinIconImage: toPublicAsset(serviceType.pinIconImage),
    color: serviceType.color,
  };
}

async function getRootServiceTypeMap(serviceTypeIds, selectedLanguage, fallbackLanguage) {
  const ids = [...new Set((serviceTypeIds || []).filter(Boolean).map(Number))];
  if (!ids.length) return new Map();

  const rows = await prisma.serviceType.findMany({
    select: {
      id: true,
      parentId: true,
      code: true,
      title: true,
      image: true,
      pinIconImage: true,
      color: true,
      translations: {
        where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
        select: { lang: true, title: true },
      },
    },
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  const result = new Map();

  for (const id of ids) {
    let current = byId.get(id);
    if (!current) continue;
    const visited = new Set();
    while (current.parentId) {
      if (visited.has(current.id)) break;
      visited.add(current.id);
      const parent = byId.get(current.parentId);
      if (!parent) break;
      current = parent;
    }
    result.set(id, current);
  }

  return result;
}

function distanceInMeters(startLat, startLng, endLat, endLng) {
  if ([startLat, startLng, endLat, endLng].some((value) => value === null || value === undefined)) return null;
  const earthRadius = 6371000;
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const dLat = toRadians(endLat - startLat);
  const dLng = toRadians(endLng - startLng);
  const lat1 = toRadians(startLat);
  const lat2 = toRadians(endLat);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadius * c);
}

function boundsWhere(query) {
  const hasBounds = [query.north, query.south, query.east, query.west].every((value) => value !== undefined);
  if (!hasBounds) return [];

  const conditions = [
    { latitude: { gte: query.south, lte: query.north } },
  ];

  if (query.west <= query.east) {
    conditions.push({ longitude: { gte: query.west, lte: query.east } });
  } else {
    conditions.push({ OR: [{ longitude: { gte: query.west } }, { longitude: { lte: query.east } }] });
  }

  return conditions;
}

async function resolveExploreServiceTypeIds(serviceTypeId) {
  if (!serviceTypeId) return null;
  return getDescendantServiceTypeIds(serviceTypeId, { activeOnly: true });
}

async function getExplore(query, appUserId = null) {
  const { languages, selectedLanguage } = await resolveLanguage(query.lang);
  const fallbackLanguage = languages.find((item) => item.isDefault) || languages[0];
  const serviceTypeIds = await resolveExploreServiceTypeIds(query.serviceTypeId);

  const categoriesPromise = prisma.serviceType.findMany({
    where: { parentId: null, isActive: true },
    orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      code: true,
      title: true,
      image: true,
      pinIconImage: true,
      color: true,
      translations: {
        where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
        select: { lang: true, title: true },
      },
    },
  });

  const where = {
    isActive: true,
    publicationStatus: 'PUBLISHED',
    latitude: { not: null },
    longitude: { not: null },
    ...(query.cityId ? { cityId: query.cityId } : {}),
    ...(serviceTypeIds ? { serviceTypeId: { in: serviceTypeIds } } : {}),
    translations: {
      some: {
        lang: { in: [selectedLanguage.code, fallbackLanguage.code] },
        isActive: true,
      },
    },
  };

  const andConditions = boundsWhere(query);
  if (andConditions.length) where.AND = andConditions;

  const businessesPromise = prisma.business.findMany({
    where,
    take: query.limit,
    orderBy: [{ isFeatured: 'desc' }, { displayOrder: 'asc' }, { id: 'desc' }],
    select: {
      id: true,
      slug: true,
      logoImage: true,
      coverImage: true,
      verticalImage: true,
      economicLevel: true,
      latitude: true,
      longitude: true,
      translations: {
        where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
        select: { lang: true, title: true, summary: true, address: true },
      },
      serviceType: {
        select: {
          id: true,
          code: true,
          title: true,
          image: true,
          pinIconImage: true,
          color: true,
          translations: {
            where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
            select: { lang: true, title: true },
          },
          parent: {
            select: {
              id: true,
              code: true,
              title: true,
              image: true,
              pinIconImage: true,
              color: true,
              translations: {
                where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
                select: { lang: true, title: true },
              },
            },
          },
        },
      },
      city: {
        select: {
          id: true,
          title: true,
          translations: {
            where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
            select: { lang: true, title: true },
          },
        },
      },
      area: {
        select: {
          id: true,
          title: true,
          translations: {
            where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
            select: { lang: true, title: true },
          },
        },
      },
    },
  });

  const [categories, businesses] = await Promise.all([categoriesPromise, businessesPromise]);
  const reviewStats = await getBusinessReviewStats(businesses.map((business) => business.id));
  const favoriteIds = await getFavoriteBusinessIds(appUserId, businesses.map((business) => business.id));
  const rootServiceTypes = await getRootServiceTypeMap(businesses.map((business) => business.serviceType.id), selectedLanguage, fallbackLanguage);
  const centerLat = query.centerLat;
  const centerLng = query.centerLng;

  const items = businesses.map((business) =>
    normalizeExploreBusiness(
      { ...business, rootServiceType: rootServiceTypes.get(business.serviceType.id) },
      selectedLanguage,
      fallbackLanguage,
      reviewStats.get(business.id),
      favoriteIds.has(business.id),
      centerLat,
      centerLng,
    ),
  );

  if (centerLat !== undefined && centerLng !== undefined) {
    items.sort((a, b) => (a.distanceMeters ?? Number.MAX_SAFE_INTEGER) - (b.distanceMeters ?? Number.MAX_SAFE_INTEGER));
  }

  return {
    lang: selectedLanguage.code,
    categories: categories.map((item) => serviceTypePublicPayload(item, selectedLanguage, fallbackLanguage)),
    items,
  };
}

function businessPublicSelect(selectedLanguage, fallbackLanguage) {
  return {
    id: true,
    slug: true,
    logoImage: true,
    coverImage: true,
    verticalImage: true,
    economicLevel: true,
    latitude: true,
    longitude: true,
    createdAt: true,
    translations: {
      where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
      select: { lang: true, title: true, summary: true, address: true },
    },
    serviceType: {
      select: {
        id: true,
        code: true,
        title: true,
        image: true,
        pinIconImage: true,
        color: true,
        translations: {
          where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
          select: { lang: true, title: true },
        },
        parent: {
          select: {
            id: true,
            code: true,
            title: true,
            image: true,
            pinIconImage: true,
            color: true,
            translations: {
              where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
              select: { lang: true, title: true },
            },
          },
        },
      },
    },
    city: {
      select: {
        id: true,
        title: true,
        translations: {
          where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
          select: { lang: true, title: true },
        },
      },
    },
    area: {
      select: {
        id: true,
        title: true,
        translations: {
          where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
          select: { lang: true, title: true },
        },
      },
    },
  };
}

async function listBusinessCategories(serviceTypeId, selectedLanguage, fallbackLanguage) {
  let parentId = null;
  if (serviceTypeId) {
    const serviceType = await prisma.serviceType.findUnique({
      where: { id: Number(serviceTypeId) },
      select: {
        id: true,
        parentId: true,
        children: { where: { isActive: true }, select: { id: true } },
      },
    });
    parentId = serviceType?.children?.length ? serviceType.id : serviceType?.parentId ?? Number(serviceTypeId);
  }

  const categories = await prisma.serviceType.findMany({
    where: { parentId, isActive: true },
    orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      code: true,
      title: true,
      image: true,
      pinIconImage: true,
      color: true,
      translations: {
        where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
        select: { lang: true, title: true },
      },
    },
  });

  return categories.map((item) => serviceTypePublicPayload(item, selectedLanguage, fallbackLanguage));
}

function activeOfferWhere(now = new Date()) {
  return {
    publicationStatus: 'PUBLISHED',
    startsAt: { lte: now },
    endsAt: { gt: now },
  };
}

async function getActiveOfferSummaryRows({ businessIds, cityId, now = new Date() } = {}) {
  if (Array.isArray(businessIds) && businessIds.length === 0) return [];
  return prisma.businessOffer.groupBy({
    by: ['businessId'],
    where: {
      ...activeOfferWhere(now),
      ...(businessIds ? { businessId: { in: businessIds.map(Number) } } : {}),
      business: {
        isActive: true,
        publicationStatus: 'PUBLISHED',
        ...(cityId ? { cityId: Number(cityId) } : {}),
      },
    },
    _max: { discountPercent: true },
    _count: { _all: true },
  });
}

async function getActiveOfferSummaryMap(businessIds, now = new Date()) {
  const rows = await getActiveOfferSummaryRows({ businessIds, now });
  return new Map(rows.map((row) => [
    row.businessId,
    {
      maxDiscountPercent: row._max.discountPercent || null,
      activeOfferCount: row._count._all || 0,
    },
  ]));
}

async function listBusinesses(query, appUserId = null) {
  const { languages, selectedLanguage } = await resolveLanguage(query.lang);
  const fallbackLanguage = languages.find((item) => item.isDefault) || languages[0];
  const serviceTypeIds = await resolveExploreServiceTypeIds(query.serviceTypeId);
  const attributeOptionIds = query.attributeOptionIds || [];
  const economicLevels = query.economicLevels || [];
  const page = query.page;
  const pageSize = query.pageSize;
  const skip = (page - 1) * pageSize;

  const where = {
    isActive: true,
    publicationStatus: 'PUBLISHED',
    ...(query.cityId ? { cityId: query.cityId } : {}),
    ...(serviceTypeIds ? { serviceTypeId: { in: serviceTypeIds } } : {}),
    ...(economicLevels.length ? { economicLevel: { in: economicLevels.map((item) => item.toUpperCase()) } } : {}),
    translations: {
      some: {
        lang: { in: [selectedLanguage.code, fallbackLanguage.code] },
        isActive: true,
      },
    },
  };

  if (query.search) {
    where.OR = [
      { slug: { contains: query.search } },
      {
        translations: {
          some: {
            lang: { in: [selectedLanguage.code, fallbackLanguage.code] },
            isActive: true,
            OR: [
              { title: { contains: query.search } },
              { summary: { contains: query.search } },
              { address: { contains: query.search } },
            ],
          },
        },
      },
    ];
  }
  if (attributeOptionIds.length) {
    where.AND = attributeOptionIds.map((id) => ({ businessAttributes: { some: { attributeOptionId: id } } }));
  }

  const needsComputedSort = query.sort === 'rating_desc' || query.sort === 'nearest' || query.minRating !== undefined;
  const orderBy =
    query.sort === 'newest'
      ? [{ publishedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }]
      : [{ isFeatured: 'desc' }, { displayOrder: 'asc' }, { id: 'desc' }];

  const [categories, dbTotal, businesses] = await Promise.all([
    listBusinessCategories(query.serviceTypeId, selectedLanguage, fallbackLanguage),
    prisma.business.count({ where }),
    prisma.business.findMany({
      where,
      ...(needsComputedSort ? {} : { skip, take: pageSize }),
      orderBy,
      select: businessPublicSelect(selectedLanguage, fallbackLanguage),
    }),
  ]);

  const reviewStats = await getBusinessReviewStats(businesses.map((business) => business.id));
  const favoriteIds = await getFavoriteBusinessIds(appUserId, businesses.map((business) => business.id));
  const offerSummaries = await getActiveOfferSummaryMap(businesses.map((business) => business.id));
  const rootServiceTypes = await getRootServiceTypeMap(businesses.map((business) => business.serviceType.id), selectedLanguage, fallbackLanguage);
  let items = businesses.map((business) =>
    normalizeExploreBusiness(
      { ...business, rootServiceType: rootServiceTypes.get(business.serviceType.id) },
      selectedLanguage,
      fallbackLanguage,
      reviewStats.get(business.id),
      favoriteIds.has(business.id),
      query.centerLat,
      query.centerLng,
      offerSummaries.get(business.id),
    ),
  );

  if (query.minRating !== undefined) {
    items = items.filter((item) => item.averageRating >= query.minRating);
  }
  const total = needsComputedSort ? items.length : dbTotal;
  if (query.sort === 'rating_desc') {
    items.sort((a, b) => b.averageRating - a.averageRating || b.reviewCount - a.reviewCount || b.id - a.id);
  } else if (query.sort === 'nearest') {
    items.sort((a, b) => (a.distanceMeters ?? Number.MAX_SAFE_INTEGER) - (b.distanceMeters ?? Number.MAX_SAFE_INTEGER));
  }
  if (needsComputedSort) {
    items = items.slice(skip, skip + pageSize);
  }

  return {
    items,
    meta: {
      lang: selectedLanguage.code,
      page,
      pageSize,
      total,
      pageCount: Math.ceil(total / pageSize),
      categories,
    },
  };
}

async function listOfferRanges(query) {
  const { languages, selectedLanguage } = await resolveLanguage(query.lang);
  const fallbackLanguage = languages.find((item) => item.isDefault) || languages[0];
  const rows = await getActiveOfferSummaryRows({ cityId: query.cityId });
  const businessIds = rows.map((row) => row.businessId);
  const businesses = businessIds.length
    ? await prisma.business.findMany({
      where: { id: { in: businessIds } },
      select: {
        id: true,
        slug: true,
        logoImage: true,
        coverImage: true,
        verticalImage: true,
        translations: {
          where: {
            lang: { in: [selectedLanguage.code, fallbackLanguage.code] },
            isActive: true,
          },
          select: { lang: true, title: true },
        },
      },
    })
    : [];
  const businessMap = new Map(businesses.map((business) => [business.id, business]));

  const items = DISCOUNT_RANGES.map((range) => {
    const rangeRows = rows
      .filter((row) => discountBelongsToRange(row._max.discountPercent, range.key))
      .sort((first, second) => (
        (second._max.discountPercent || 0) - (first._max.discountPercent || 0)
        || second.businessId - first.businessId
      ));
    return {
      ...range,
      businessCount: rangeRows.length,
      previews: rangeRows.slice(0, 3).map((row) => {
        const business = businessMap.get(row.businessId);
        const translation = business
          ? pickTranslation(business.translations, selectedLanguage, fallbackLanguage)
          : null;
        return {
          id: row.businessId,
          title: translation?.title || business?.slug || '',
          image: toPublicAsset(
            business?.coverImage || business?.verticalImage || business?.logoImage,
          ),
        };
      }),
    };
  });

  return { lang: selectedLanguage.code, items };
}

async function listOfferBusinesses(query, appUserId = null) {
  const { languages, selectedLanguage } = await resolveLanguage(query.lang);
  const fallbackLanguage = languages.find((item) => item.isDefault) || languages[0];
  const page = query.page;
  const pageSize = query.pageSize;
  const rows = (await getActiveOfferSummaryRows({ cityId: query.cityId }))
    .filter((row) => discountBelongsToRange(row._max.discountPercent, query.rangeKey))
    .sort((first, second) => (
      (second._max.discountPercent || 0) - (first._max.discountPercent || 0)
      || second.businessId - first.businessId
    ));
  const total = rows.length;
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const businessIds = pageRows.map((row) => row.businessId);
  const businesses = businessIds.length
    ? await prisma.business.findMany({
      where: { id: { in: businessIds } },
      select: businessPublicSelect(selectedLanguage, fallbackLanguage),
    })
    : [];
  const businessMap = new Map(businesses.map((business) => [business.id, business]));
  const reviewStats = await getBusinessReviewStats(businessIds);
  const favoriteIds = await getFavoriteBusinessIds(appUserId, businessIds);
  const rootServiceTypes = await getRootServiceTypeMap(
    businesses.map((business) => business.serviceType.id),
    selectedLanguage,
    fallbackLanguage,
  );
  const rowMap = new Map(pageRows.map((row) => [
    row.businessId,
    {
      maxDiscountPercent: row._max.discountPercent || null,
      activeOfferCount: row._count._all || 0,
    },
  ]));

  const items = pageRows
    .map((row) => businessMap.get(row.businessId))
    .filter(Boolean)
    .map((business) => normalizeExploreBusiness(
      { ...business, rootServiceType: rootServiceTypes.get(business.serviceType.id) },
      selectedLanguage,
      fallbackLanguage,
      reviewStats.get(business.id),
      favoriteIds.has(business.id),
      undefined,
      undefined,
      rowMap.get(business.id),
    ));

  return {
    items,
    meta: {
      lang: selectedLanguage.code,
      page,
      pageSize,
      total,
      pageCount: Math.ceil(total / pageSize),
      rangeKey: query.rangeKey,
    },
  };
}

async function resolveFilterServiceTypeId(serviceTypeId) {
  if (!serviceTypeId) return null;
  return getRootServiceTypeId(serviceTypeId);
}

async function getBusinessFilters(query) {
  const { languages, selectedLanguage } = await resolveLanguage(query.lang);
  const fallbackLanguage = languages.find((item) => item.isDefault) || languages[0];
  const rootServiceTypeId = await resolveFilterServiceTypeId(query.serviceTypeId);
  const where = {
    showInFilters: true,
    isActive: true,
    ...(rootServiceTypeId ? { serviceTypeId: rootServiceTypeId } : {}),
  };

  const groups = await prisma.attributeGroup.findMany({
    where,
    orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      code: true,
      title: true,
      image: true,
      fieldType: true,
      translations: {
        where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
        select: { lang: true, title: true },
      },
      options: {
        where: { isActive: true },
        orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          key: true,
          title: true,
          image: true,
          color: true,
          translations: {
            where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
            select: { lang: true, title: true },
          },
        },
      },
    },
  });

  return {
    lang: selectedLanguage.code,
    sortOptions: [
      { key: 'default', title: 'Recommended' },
      { key: 'rating_desc', title: 'Highest rated' },
      { key: 'nearest', title: 'Nearest' },
      { key: 'newest', title: 'Newest' },
    ],
    economicLevels: [
      { key: 'LOW', title: '$' },
      { key: 'MEDIUM', title: '$$' },
      { key: 'HIGH', title: '$$$' },
    ],
    ratingOptions: [
      { key: '4', title: '4.0+' },
      { key: '4.5', title: '4.5+' },
      { key: '4.7', title: '4.7+' },
    ],
    attributeGroups: groups
      .filter((group) => group.options.length > 0)
      .map((group) => {
        const translation = pickTranslation(group.translations, selectedLanguage, fallbackLanguage);
        return {
          id: group.id,
          code: group.code,
          title: translation?.title || group.title,
          image: toPublicAsset(group.image),
          fieldType: group.fieldType,
          options: group.options.map((option) => {
            const optionTranslation = pickTranslation(option.translations, selectedLanguage, fallbackLanguage);
            return {
              id: option.id,
              key: option.key,
              title: optionTranslation?.title || option.title,
              image: toPublicAsset(option.image),
              color: option.color,
            };
          }),
        };
      }),
  };
}

function normalizeExploreBusiness(
  business,
  selectedLanguage,
  fallbackLanguage,
  reviewStats,
  isFavorite = false,
  centerLat,
  centerLng,
  offerSummary = null,
) {
  const translation = pickTranslation(business.translations, selectedLanguage, fallbackLanguage);
  const cityTranslation = business.city ? pickTranslation(business.city.translations, selectedLanguage, fallbackLanguage) : null;
  const areaTranslation = business.area ? pickTranslation(business.area.translations, selectedLanguage, fallbackLanguage) : null;
  const rootServiceType = business.rootServiceType || business.serviceType.parent || business.serviceType;
  const serviceTypePayload = serviceTypePublicPayload(business.serviceType, selectedLanguage, fallbackLanguage);
  const rootServiceTypePayload = serviceTypePublicPayload(rootServiceType, selectedLanguage, fallbackLanguage);
  const latitude = business.latitude === null ? null : Number(business.latitude);
  const longitude = business.longitude === null ? null : Number(business.longitude);
  const rating = reviewStats || { averageRating: 0, reviewCount: 0 };

  return {
    id: business.id,
    slug: business.slug,
    title: translation?.title || '',
    summary: translation?.summary || '',
    address: translation?.address || '',
    image: toPublicAsset(business.coverImage || business.verticalImage || business.logoImage),
    logoImage: toPublicAsset(business.logoImage),
    economicLevel: business.economicLevel,
    averageRating: Math.round(rating.averageRating * 10) / 10,
    reviewCount: rating.reviewCount,
    maxDiscountPercent: offerSummary?.maxDiscountPercent || null,
    activeOfferCount: offerSummary?.activeOfferCount || 0,
    latitude,
    longitude,
    distanceMeters: distanceInMeters(centerLat, centerLng, latitude, longitude),
    isFavorite,
    location: [areaTranslation?.title || business.area?.title, cityTranslation?.title || business.city?.title].filter(Boolean).join('، '),
    serviceType: serviceTypePayload,
    rootServiceType: rootServiceTypePayload,
    pin: {
      image: rootServiceTypePayload.pinIconImage || rootServiceTypePayload.image,
      color: rootServiceTypePayload.color,
    },
  };
}

async function getFavoriteBusinessIds(appUserId, businessIds) {
  if (!appUserId || !businessIds.length) return new Set();
  const rows = await prisma.appFavoriteBusiness.findMany({
    where: { appUserId: Number(appUserId), businessId: { in: businessIds } },
    select: { businessId: true },
  });
  return new Set(rows.map((row) => row.businessId));
}

async function addBusinessFavorite(appUserId, businessId) {
  await ensurePublicBusiness(businessId);
  await prisma.appFavoriteBusiness.upsert({
    where: { appUserId_businessId: { appUserId: Number(appUserId), businessId: Number(businessId) } },
    update: {},
    create: { appUserId: Number(appUserId), businessId: Number(businessId) },
  });
  return { businessId: Number(businessId), isFavorite: true };
}

async function removeBusinessFavorite(appUserId, businessId) {
  await prisma.appFavoriteBusiness.deleteMany({
    where: { appUserId: Number(appUserId), businessId: Number(businessId) },
  });
  return { businessId: Number(businessId), isFavorite: false };
}

async function listFavoriteBusinesses(appUserId, query) {
  const { languages, selectedLanguage } = await resolveLanguage(query.lang);
  const fallbackLanguage = languages.find((item) => item.isDefault) || languages[0];
  const page = query.page;
  const pageSize = query.pageSize;
  const skip = (page - 1) * pageSize;
  const where = {
    appUserId: Number(appUserId),
    business: {
      isActive: true,
      publicationStatus: 'PUBLISHED',
      translations: {
        some: {
          lang: { in: [selectedLanguage.code, fallbackLanguage.code] },
          isActive: true,
        },
      },
    },
  };

  const [rows, total] = await Promise.all([
    prisma.appFavoriteBusiness.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        business: {
          select: {
            id: true,
            slug: true,
            logoImage: true,
            coverImage: true,
            verticalImage: true,
            economicLevel: true,
            latitude: true,
            longitude: true,
            translations: {
              where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
              select: { lang: true, title: true, summary: true, address: true },
            },
            serviceType: {
              select: {
                id: true,
                code: true,
                title: true,
                image: true,
                pinIconImage: true,
                color: true,
                translations: {
                  where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
                  select: { lang: true, title: true },
                },
                parent: {
                  select: {
                    id: true,
                    code: true,
                    title: true,
                    image: true,
                    pinIconImage: true,
                    color: true,
                    translations: {
                      where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
                      select: { lang: true, title: true },
                    },
                  },
                },
              },
            },
            city: {
              select: {
                id: true,
                title: true,
                translations: {
                  where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
                  select: { lang: true, title: true },
                },
              },
            },
            area: {
              select: {
                id: true,
                title: true,
                translations: {
                  where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
                  select: { lang: true, title: true },
                },
              },
            },
          },
        },
      },
    }),
    prisma.appFavoriteBusiness.count({ where }),
  ]);

  const businesses = rows.map((row) => row.business);
  const reviewStats = await getBusinessReviewStats(businesses.map((business) => business.id));
  const rootServiceTypes = await getRootServiceTypeMap(businesses.map((business) => business.serviceType.id), selectedLanguage, fallbackLanguage);
  return {
    items: businesses.map((business) => normalizeExploreBusiness(
      { ...business, rootServiceType: rootServiceTypes.get(business.serviceType.id) },
      selectedLanguage,
      fallbackLanguage,
      reviewStats.get(business.id),
      true,
    )),
    meta: {
      page,
      pageSize,
      total,
      pageCount: Math.ceil(total / pageSize),
    },
  };
}

async function listMyReviews(appUserId, query) {
  const { languages, selectedLanguage } = await resolveLanguage(query.lang);
  const fallbackLanguage = languages.find((item) => item.isDefault) || languages[0];
  const page = query.page;
  const pageSize = query.pageSize;
  const skip = (page - 1) * pageSize;
  const where = {
    appUserId: Number(appUserId),
    isActive: true,
    business: {
      isActive: true,
      publicationStatus: 'PUBLISHED',
      translations: {
        some: {
          lang: { in: [selectedLanguage.code, fallbackLanguage.code] },
          isActive: true,
        },
      },
    },
  };

  const [items, total] = await Promise.all([
    prisma.businessReview.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        businessId: true,
        rating: true,
        comment: true,
        createdAt: true,
        business: {
          select: {
            id: true,
            slug: true,
            logoImage: true,
            translations: {
              where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
              select: { lang: true, title: true },
            },
          },
        },
      },
    }),
    prisma.businessReview.count({ where }),
  ]);

  return {
    items: items.map((item) => {
      const translation = pickTranslation(item.business.translations, selectedLanguage, fallbackLanguage);
      return {
        id: item.id,
        businessId: item.businessId,
        rating: Number(item.rating),
        comment: item.comment || '',
        createdAt: item.createdAt,
        business: {
          id: item.business.id,
          slug: item.business.slug,
          title: translation?.title || '',
          logoImage: toPublicAsset(item.business.logoImage),
        },
      };
    }),
    meta: {
      page,
      pageSize,
      total,
      pageCount: Math.ceil(total / pageSize),
    },
  };
}

async function listHomeBusinesses({ where, take, orderBy, selectedLanguage, fallbackLanguage }) {
  const businesses = await prisma.business.findMany({
    where,
    take,
    orderBy,
    select: {
      id: true,
      slug: true,
      logoImage: true,
      coverImage: true,
      verticalImage: true,
      economicLevel: true,
      translations: {
        where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
        select: { lang: true, title: true, summary: true, address: true },
      },
      serviceType: {
        select: {
          id: true,
          code: true,
          title: true,
          translations: {
            where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
            select: { lang: true, title: true },
          },
        },
      },
      city: {
        select: {
          id: true,
          title: true,
          translations: {
            where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
            select: { lang: true, title: true },
          },
        },
      },
      area: {
        select: {
          id: true,
          title: true,
          translations: {
            where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
            select: { lang: true, title: true },
          },
        },
      },
    },
  });

  const reviewStats = await getBusinessReviewStats(businesses.map((business) => business.id));

  return businesses.map((business) =>
    normalizeHomeBusiness(business, selectedLanguage, fallbackLanguage, reviewStats.get(business.id)),
  );
}

async function getBusinessReviewStats(businessIds) {
  if (!businessIds.length) return new Map();

  const rows = await prisma.businessReview.groupBy({
    by: ['businessId'],
    where: { businessId: { in: businessIds }, isActive: true },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return new Map(
    rows.map((row) => [
      row.businessId,
      {
        averageRating: row._avg.rating === null ? 0 : Number(row._avg.rating),
        reviewCount: row._count.rating || 0,
      },
    ]),
  );
}

function normalizeHomeBusiness(business, selectedLanguage, fallbackLanguage, reviewStats) {
  const translation = pickTranslation(business.translations, selectedLanguage, fallbackLanguage);
  const serviceTypeTranslation = pickTranslation(business.serviceType.translations, selectedLanguage, fallbackLanguage);
  const cityTranslation = business.city ? pickTranslation(business.city.translations, selectedLanguage, fallbackLanguage) : null;
  const areaTranslation = business.area ? pickTranslation(business.area.translations, selectedLanguage, fallbackLanguage) : null;
  const locationParts = [areaTranslation?.title || business.area?.title, cityTranslation?.title || business.city?.title].filter(Boolean);
  const rating = reviewStats || { averageRating: 0, reviewCount: 0 };

  return {
    id: business.id,
    slug: business.slug,
    title: translation?.title || '',
    summary: translation?.summary || '',
    address: translation?.address || '',
    image: toPublicAsset(business.coverImage || business.verticalImage || business.logoImage),
    logoImage: toPublicAsset(business.logoImage),
    economicLevel: business.economicLevel,
    averageRating: Math.round(rating.averageRating * 10) / 10,
    reviewCount: rating.reviewCount,
    location: locationParts.join('، '),
    serviceType: {
      id: business.serviceType.id,
      code: business.serviceType.code,
      title: serviceTypeTranslation?.title || business.serviceType.title,
      image: toPublicAsset(business.serviceType.image),
      pinIconImage: toPublicAsset(business.serviceType.pinIconImage),
      color: business.serviceType.color,
    },
  };
}

async function ensurePublicBusiness(businessId) {
  const business = await prisma.business.findFirst({
    where: {
      id: Number(businessId),
      isActive: true,
      publicationStatus: 'PUBLISHED',
    },
    select: { id: true },
  });

  if (!business) {
    throw new AppError(404, 'BUSINESS_NOT_FOUND', 'Business not found');
  }

  return business;
}

function normalizeWorkingHour(item) {
  return {
    id: item.id,
    dayOfWeek: item.dayOfWeek,
    opensAt: item.opensAt,
    closesAt: item.closesAt,
    isClosed: item.isClosed,
    note: item.note,
  };
}

function currentWeekDay() {
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  return days[new Date().getDay()];
}

function isOpenNow(workingHours) {
  const today = workingHours.find((item) => item.dayOfWeek === currentWeekDay());
  if (!today || today.isClosed || !today.opensAt || !today.closesAt) return false;
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const [openHour, openMinute] = today.opensAt.split(':').map(Number);
  const [closeHour, closeMinute] = today.closesAt.split(':').map(Number);
  const open = openHour * 60 + openMinute;
  const close = closeHour * 60 + closeMinute;
  if (close < open) return current >= open || current <= close;
  return current >= open && current <= close;
}

async function getReviewOverview(businessId) {
  const where = { businessId: Number(businessId), isActive: true };
  const [aggregate, rows] = await Promise.all([
    prisma.businessReview.aggregate({ where, _avg: { rating: true }, _count: { rating: true } }),
    prisma.businessReview.findMany({ where, select: { rating: true } }),
  ]);
  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of rows) {
    const star = Math.max(1, Math.min(5, Math.round(Number(row.rating))));
    breakdown[star] += 1;
  }
  return {
    averageRating: aggregate._avg.rating === null ? 0 : Math.round(Number(aggregate._avg.rating) * 10) / 10,
    reviewCount: aggregate._count.rating || 0,
    breakdown,
  };
}

async function getBusinessDetail(businessId, query, appUserId = null) {
  const { languages, selectedLanguage } = await resolveLanguage(query.lang);
  const fallbackLanguage = languages.find((item) => item.isDefault) || languages[0];
  const business = await prisma.business.findFirst({
    where: {
      id: Number(businessId),
      isActive: true,
      publicationStatus: 'PUBLISHED',
    },
    select: {
      ...businessPublicSelect(selectedLanguage, fallbackLanguage),
      phone: true,
      email: true,
      website: true,
      operationMode: true,
      translations: {
        where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
        select: { lang: true, title: true, summary: true, description: true, address: true },
      },
      slideshows: {
        orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        select: { id: true, image: true, displayOrder: true },
      },
      gallery: {
        orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        select: { id: true, image: true, alt: true, displayOrder: true },
      },
      workingHours: {
        orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        select: { id: true, dayOfWeek: true, opensAt: true, closesAt: true, isClosed: true, note: true },
      },
      contactLinks: {
        where: { isActive: true },
        orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        select: { id: true, type: true, label: true, value: true, url: true, isPrimary: true },
      },
      businessAttributes: {
        select: {
          attributeOption: {
            select: {
              id: true,
              key: true,
              title: true,
              image: true,
              color: true,
              translations: {
                where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
                select: { lang: true, title: true },
              },
              group: {
                select: {
                  id: true,
                  code: true,
                  title: true,
                  translations: {
                    where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
                    select: { lang: true, title: true },
                  },
                },
              },
            },
          },
        },
      },
      attributeValues: {
        select: {
          id: true,
          textValue: true,
          numberValue: true,
          booleanValue: true,
          group: {
            select: {
              id: true,
              code: true,
              title: true,
              translations: {
                where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
                select: { lang: true, title: true },
              },
            },
          },
        },
      },
      offeringCategories: {
        where: { isActive: true },
        orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          title: true,
          translations: {
            where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
            select: { lang: true, title: true },
          },
          offerings: {
            where: { isActive: true },
            orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
            take: 8,
            select: {
              id: true,
              title: true,
              image: true,
              basePrice: true,
              oldPrice: true,
              isFeatured: true,
              isPopular: true,
              isNew: true,
              isUnavailable: true,
              translations: {
                where: { lang: { in: [selectedLanguage.code, fallbackLanguage.code] }, isActive: true },
                select: { lang: true, title: true, shortDescription: true },
              },
            },
          },
        },
      },
    },
  });
  if (!business) throw new AppError(404, 'BUSINESS_NOT_FOUND', 'Business not found');

  const translation = pickTranslation(business.translations, selectedLanguage, fallbackLanguage);
  const rootServiceTypes = await getRootServiceTypeMap([business.serviceType.id], selectedLanguage, fallbackLanguage);
  const normalized = normalizeExploreBusiness(
    { ...business, rootServiceType: rootServiceTypes.get(business.serviceType.id) },
    selectedLanguage,
    fallbackLanguage,
    null,
    false,
  );
  const [reviewOverview, favoriteIds, activeOfferRows] = await Promise.all([
    getReviewOverview(business.id),
    getFavoriteBusinessIds(appUserId, [business.id]),
    prisma.businessOffer.findMany({
      where: {
        businessId: business.id,
        ...activeOfferWhere(),
      },
      orderBy: [{ discountPercent: 'desc' }, { displayOrder: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        discountPercent: true,
        scope: true,
        categoryId: true,
        startsAt: true,
        endsAt: true,
        translations: {
          where: {
            lang: { in: [selectedLanguage.code, fallbackLanguage.code] },
            isActive: true,
          },
          select: { lang: true, title: true, description: true },
        },
        targets: { select: { offeringId: true } },
      },
    }),
  ]);
  const activeOffers = activeOfferRows.map((offer) => {
    const offerTranslation = pickTranslation(
      offer.translations,
      selectedLanguage,
      fallbackLanguage,
    );
    return {
      targetIds: new Set(offer.targets.map((target) => target.offeringId)),
      payload: {
        id: offer.id,
        title: offerTranslation?.title || '',
        description: offerTranslation?.description || '',
        discountPercent: offer.discountPercent,
        scope: offer.scope,
        startsAt: offer.startsAt,
        endsAt: offer.endsAt,
      },
      categoryId: offer.categoryId,
      scope: offer.scope,
    };
  });
  const selectedAttributes = new Map();

  for (const item of business.businessAttributes) {
    const option = item.attributeOption;
    const groupTranslation = pickTranslation(option.group.translations, selectedLanguage, fallbackLanguage);
    const optionTranslation = pickTranslation(option.translations, selectedLanguage, fallbackLanguage);
    const key = option.group.id;
    if (!selectedAttributes.has(key)) {
      selectedAttributes.set(key, {
        id: option.group.id,
        code: option.group.code,
        title: groupTranslation?.title || option.group.title,
        values: [],
      });
    }
    selectedAttributes.get(key).values.push({
      id: option.id,
      title: optionTranslation?.title || option.title,
      image: toPublicAsset(option.image),
      color: option.color,
    });
  }

  const valueAttributes = business.attributeValues.map((item) => {
    const groupTranslation = pickTranslation(item.group.translations, selectedLanguage, fallbackLanguage);
    const rawValue = item.textValue ?? (item.numberValue === null ? null : Number(item.numberValue)) ?? item.booleanValue;
    return {
      id: item.group.id,
      code: item.group.code,
      title: groupTranslation?.title || item.group.title,
      value: rawValue,
    };
  });

  return {
    lang: selectedLanguage.code,
    ...normalized,
    isFavorite: favoriteIds.has(business.id),
    description: translation?.description || '',
    phone: business.phone,
    email: business.email,
    website: business.website,
    operationMode: business.operationMode,
    averageRating: reviewOverview.averageRating,
    reviewCount: reviewOverview.reviewCount,
    maxDiscountPercent: activeOffers[0]?.payload.discountPercent || null,
    activeOffers: activeOffers.map((offer) => offer.payload),
    ratingBreakdown: reviewOverview.breakdown,
    openNow: isOpenNow(business.workingHours),
    slideshows: business.slideshows.map((item) => ({ id: item.id, image: toPublicAsset(item.image), displayOrder: item.displayOrder })),
    gallery: business.gallery.map((item) => ({ id: item.id, image: toPublicAsset(item.image), title: item.alt || '' })),
    workingHours: business.workingHours.map(normalizeWorkingHour),
    contactLinks: business.contactLinks,
    attributes: [...selectedAttributes.values(), ...valueAttributes],
    offeringCategories: business.offeringCategories.map((category) => {
      const categoryTranslation = pickTranslation(category.translations, selectedLanguage, fallbackLanguage);
      return {
        id: category.id,
        title: categoryTranslation?.title || category.title,
        offerings: category.offerings.map((offering) => {
          const offeringTranslation = pickTranslation(offering.translations, selectedLanguage, fallbackLanguage);
          const basePrice = offering.basePrice === null ? null : Number(offering.basePrice);
          const effectiveOffer = activeOffers.find((offer) => (
            offer.scope === 'ALL'
            || (offer.scope === 'CATEGORY' && offer.categoryId === category.id)
            || (offer.scope === 'OFFERINGS' && offer.targetIds.has(offering.id))
          ));
          return {
            id: offering.id,
            title: offeringTranslation?.title || offering.title,
            description: offeringTranslation?.shortDescription || '',
            image: toPublicAsset(offering.image),
            basePrice,
            finalPrice: effectiveOffer
              ? calculateDiscountedPrice(basePrice, effectiveOffer.payload.discountPercent)
              : basePrice,
            oldPrice: offering.oldPrice === null ? null : Number(offering.oldPrice),
            offer: effectiveOffer?.payload || null,
            isFeatured: offering.isFeatured,
            isPopular: offering.isPopular,
            isNew: offering.isNew,
            isUnavailable: offering.isUnavailable,
          };
        }),
      };
    }),
  };
}

async function listBusinessReviews(businessId, query) {
  await ensurePublicBusiness(businessId);

  const page = query.page;
  const pageSize = query.pageSize;
  const skip = (page - 1) * pageSize;
  const where = {
    businessId: Number(businessId),
    isActive: true,
  };

  const [items, total, aggregate] = await Promise.all([
    prisma.businessReview.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        appUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    }),
    prisma.businessReview.count({ where }),
    prisma.businessReview.aggregate({
      where,
      _avg: { rating: true },
      _count: { rating: true },
    }),
  ]);

  return {
    items: items.map((item) => ({
      id: item.id,
      rating: Number(item.rating),
      comment: item.comment,
      createdAt: item.createdAt,
      user: {
        id: item.appUser.id,
        name: [item.appUser.firstName, item.appUser.lastName].filter(Boolean).join(' '),
        avatar: toPublicAsset(item.appUser.avatar),
      },
    })),
    meta: {
      page,
      pageSize,
      total,
      pageCount: Math.ceil(total / pageSize),
      averageRating: aggregate._avg.rating === null ? 0 : Math.round(Number(aggregate._avg.rating) * 10) / 10,
      reviewCount: aggregate._count.rating || 0,
    },
  };
}

async function createBusinessReview(appUserId, businessId, body) {
  await ensurePublicBusiness(businessId);

  const comment = body.comment ? body.comment.trim() : null;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentCount = await prisma.businessReview.count({
    where: {
      appUserId: Number(appUserId),
      createdAt: { gte: since },
    },
  });
  if (recentCount >= 2) {
    throw new AppError(429, 'REVIEW_RATE_LIMIT', 'You can submit at most 2 reviews every 24 hours');
  }

  const review = await prisma.businessReview.create({
    data: {
      businessId: Number(businessId),
      appUserId: Number(appUserId),
      rating: body.rating,
      comment,
      isActive: true,
    },
    select: {
      id: true,
      businessId: true,
      rating: true,
      comment: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return {
    ...review,
    rating: Number(review.rating),
  };
}

async function listBlogPosts(query) {
  const { languages, selectedLanguage } = await resolveLanguage(query.lang);
  const fallbackLanguage = languages.find((item) => item.isDefault) || languages[0];
  const page = query.page;
  const pageSize = query.pageSize;
  const skip = (page - 1) * pageSize;
  const where = {
    isActive: true,
    translations: {
      some: {
        lang: { in: [selectedLanguage.code, fallbackLanguage.code] },
        isActive: true,
      },
    },
  };

  const [items, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        image: true,
        readingMinutes: true,
        createdAt: true,
        translations: {
          where: {
            lang: { in: [selectedLanguage.code, fallbackLanguage.code] },
            isActive: true,
          },
          select: {
            lang: true,
            title: true,
            shortDescription: true,
          },
        },
      },
    }),
    prisma.blogPost.count({ where }),
  ]);

  return {
    lang: selectedLanguage.code,
    items: items
      .map((item) => {
        const translation = pickTranslation(item.translations, selectedLanguage, fallbackLanguage);
        if (!translation) return null;
        return {
          id: item.id,
          image: toPublicAsset(item.image),
          readingMinutes: item.readingMinutes,
          createdAt: item.createdAt,
          title: translation.title,
          shortDescription: translation.shortDescription,
        };
      })
      .filter(Boolean),
    meta: {
      page,
      pageSize,
      total,
      pageCount: Math.ceil(total / pageSize),
      lang: selectedLanguage.code,
    },
  };
}

async function getBlogPost(id, lang) {
  const { languages, selectedLanguage } = await resolveLanguage(lang);
  const fallbackLanguage = languages.find((item) => item.isDefault) || languages[0];

  const item = await prisma.blogPost.findFirst({
    where: { id, isActive: true },
    select: {
      id: true,
      image: true,
      readingMinutes: true,
      createdAt: true,
      translations: {
        where: {
          lang: { in: [selectedLanguage.code, fallbackLanguage.code] },
          isActive: true,
        },
        select: {
          lang: true,
          title: true,
          shortDescription: true,
          body: true,
        },
      },
    },
  });

  if (!item) {
    throw new AppError(404, 'BLOG_POST_NOT_FOUND', 'Blog post not found');
  }

  const translation = pickTranslation(item.translations, selectedLanguage, fallbackLanguage);
  if (!translation) {
    throw new AppError(404, 'BLOG_POST_TRANSLATION_NOT_FOUND', 'Blog post translation not found');
  }

  return {
    id: item.id,
    image: toPublicAsset(item.image),
    readingMinutes: item.readingMinutes,
    createdAt: item.createdAt,
    lang: selectedLanguage.code,
    title: translation.title,
    shortDescription: translation.shortDescription,
    body: translation.body,
  };
}

module.exports = {
  getBootstrap,
  getHome,
  getExplore,
  listBusinesses,
  listOfferRanges,
  listOfferBusinesses,
  getBusinessFilters,
  listOnboardingPages,
  getContentPage,
  getContactPage,
  listFaqs,
  listCountries,
  listCities,
  listAreas,
  listBlogPosts,
  getBlogPost,
  getBusinessDetail,
  listFavoriteBusinesses,
  listMyReviews,
  listBusinessReviews,
  createBusinessReview,
  addBusinessFavorite,
  removeBusinessFavorite,
};
