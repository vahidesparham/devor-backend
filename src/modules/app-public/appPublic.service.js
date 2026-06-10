const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');

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

  const [items, cityCenters] = await Promise.all([
    prisma.city.findMany({
      where: { isActive: true, country: { isActive: true } },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        countryId: true,
        code: true,
        title: true,
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
      },
    }),
    prisma.business.groupBy({
      by: ['cityId'],
      where: {
        isActive: true,
        cityId: { not: null },
        latitude: { not: null },
        longitude: { not: null },
      },
      _avg: { latitude: true, longitude: true },
      _count: { _all: true },
    }),
  ]);

  const centerByCityId = new Map(
    cityCenters
      .filter((center) => center.cityId)
      .map((center) => [
        center.cityId,
        {
          latitude: center._avg.latitude === null ? null : Number(center._avg.latitude),
          longitude: center._avg.longitude === null ? null : Number(center._avg.longitude),
          businessCount: center._count._all,
        },
      ]),
  );

  return {
    lang: selectedLanguage.code,
    items: items.map((item) => {
      const translation = pickTranslation(item.translations, selectedLanguage, fallbackLanguage);
      const countryTranslation = pickTranslation(item.country.translations, selectedLanguage, fallbackLanguage);
      const center = centerByCityId.get(item.id) || {};
      return {
        id: item.id,
        countryId: item.countryId,
        code: item.code,
        title: translation?.title || item.title,
        latitude: center.latitude ?? null,
        longitude: center.longitude ?? null,
        businessCount: center.businessCount ?? 0,
        country: {
          id: item.country.id,
          code: item.country.code,
          title: countryTranslation?.title || item.country.title,
        },
      };
    }),
  };
}

function pickTranslation(translations, selectedLanguage, fallbackLanguage) {
  const selectedTranslation = translations.find((translation) => translation.lang === selectedLanguage.code);
  const fallbackTranslation = translations.find((translation) => translation.lang === fallbackLanguage.code);
  return selectedTranslation || fallbackTranslation || null;
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
  listOnboardingPages,
  getContentPage,
  getContactPage,
  listFaqs,
  listCountries,
  listCities,
  listBlogPosts,
  getBlogPost,
};
