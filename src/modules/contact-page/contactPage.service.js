const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const { audit } = require('../../shared/audit/audit');

const SINGLETON_ID = 1;
const SOCIAL_FIELDS = ['instagram', 'telegram', 'whatsapp', 'youtube', 'tiktok', 'email', 'supportPhoneNumber'];

function cleanOptional(value) {
  if (value === undefined) return undefined;
  const cleaned = String(value || '').trim();
  return cleaned || null;
}

function normalizeCore(item) {
  return {
    instagram: item.instagram,
    telegram: item.telegram,
    whatsapp: item.whatsapp,
    youtube: item.youtube,
    tiktok: item.tiktok,
    email: item.email,
    supportPhoneNumber: item.supportPhoneNumber,
  };
}

async function assertLanguagesExist(codes) {
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

async function ensureContactPage() {
  return prisma.contactPage.upsert({
    where: { id: SINGLETON_ID },
    update: {},
    create: { id: SINGLETON_ID },
    include: { translations: { orderBy: { lang: 'asc' } } },
  });
}

async function getContactPage() {
  return ensureContactPage();
}

async function updateContactPage(data, req) {
  const existing = await ensureContactPage();

  if (Array.isArray(data.translations)) {
    await assertLanguagesExist([...new Set(data.translations.map((item) => item.lang))]);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const coreData = {};
    for (const field of SOCIAL_FIELDS) {
      if (data[field] !== undefined) coreData[field] = cleanOptional(data[field]);
    }

    await tx.contactPage.update({
      where: { id: SINGLETON_ID },
      data: coreData,
    });

    if (Array.isArray(data.translations)) {
      for (const item of data.translations) {
        await tx.contactPageTranslation.upsert({
          where: { contactPageId_lang: { contactPageId: SINGLETON_ID, lang: item.lang } },
          update: {
            title: item.title,
            body: item.body,
            phoneNumber: cleanOptional(item.phoneNumber),
            address: cleanOptional(item.address),
            workingHours: cleanOptional(item.workingHours),
            isActive: item.isActive ?? true,
          },
          create: {
            contactPageId: SINGLETON_ID,
            lang: item.lang,
            title: item.title,
            body: item.body,
            phoneNumber: cleanOptional(item.phoneNumber),
            address: cleanOptional(item.address),
            workingHours: cleanOptional(item.workingHours),
            isActive: item.isActive ?? true,
          },
        });
      }

      await tx.contactPageTranslation.deleteMany({
        where: { contactPageId: SINGLETON_ID, lang: { notIn: data.translations.map((item) => item.lang) } },
      });
    }

    return tx.contactPage.findUnique({
      where: { id: SINGLETON_ID },
      include: { translations: { orderBy: { lang: 'asc' } } },
    });
  });

  await audit(req, {
    action: 'UPDATE',
    entity: 'ContactPage',
    entityId: String(SINGLETON_ID),
    before: normalizeCore(existing),
    after: normalizeCore(updated),
    details: { translationLangs: updated.translations.map((item) => item.lang) },
  });

  return updated;
}

module.exports = {
  getContactPage,
  updateContactPage,
};
