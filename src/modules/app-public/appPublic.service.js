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

module.exports = {
  getBootstrap,
  listOnboardingPages,
};
