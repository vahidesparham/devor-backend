const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const { audit } = require('../../shared/audit/audit');

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

async function resolveSelectedLang(lang) {
  if (lang) {
    const language = await prisma.language.findFirst({ where: { code: lang, isActive: true }, select: { code: true } });
    if (!language) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
        errors: [{ path: 'x-lang', message: `Language "${lang}" is not available` }],
      });
    }
    return lang;
  }

  const fallback = await prisma.language.findFirst({
    where: { isActive: true },
    orderBy: [{ isDefault: 'desc' }, { code: 'asc' }],
    select: { code: true },
  });

  if (!fallback) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
      errors: [{ path: 'x-lang', message: 'No active language is configured' }],
    });
  }

  return fallback.code;
}

function toAdminDisplayName(admin) {
  if (!admin) return null;
  const fullName = [admin.firstName, admin.lastName].filter(Boolean).join(' ').trim();
  return fullName || admin.email || null;
}

function mapLastChange(log) {
  if (!log) return null;
  return {
    action: log.action,
    createdAt: log.createdAt,
    traceId: log.traceId,
    admin: log.admin
      ? {
          id: log.admin.id,
          email: log.admin.email,
          firstName: log.admin.firstName,
          lastName: log.admin.lastName,
          avatar: log.admin.avatar,
          displayName: toAdminDisplayName(log.admin),
        }
      : null,
  };
}

function normalizeCore(item) {
  return {
    slug: item.slug,
    image: item.image,
    isActive: item.isActive,
  };
}

function toListItem(item, selectedLang) {
  const selected = item.translations[0] || null;
  return {
    id: item.id,
    slug: item.slug,
    image: item.image,
    isActive: item.isActive,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    lang: selectedLang,
    title: selected?.title || null,
    body: selected?.body || null,
    translationIsActive: selected?.isActive ?? null,
  };
}

async function listContentPages(query, lang) {
  const selectedLang = await resolveSelectedLang(query.lang || lang);
  const skip = (query.page - 1) * query.pageSize;
  const where = {};

  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.q) {
    where.OR = [
      { slug: { contains: query.q } },
      { translations: { some: { OR: [{ title: { contains: query.q } }, { body: { contains: query.q } }] } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.contentPage.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [{ [query.sortBy]: query.sortDir }, { id: 'asc' }],
      include: {
        translations: {
          where: { lang: selectedLang },
          take: 1,
          select: { title: true, body: true, isActive: true },
        },
      },
    }),
    prisma.contentPage.count({ where }),
  ]);

  return {
    items: items.map((item) => toListItem(item, selectedLang)),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      pageCount: Math.ceil(total / query.pageSize),
      lang: selectedLang,
    },
  };
}

async function getContentPageById(id) {
  const [item, lastChangeLog] = await Promise.all([
    prisma.contentPage.findUnique({
      where: { id },
      include: { translations: { orderBy: { lang: 'asc' } } },
    }),
    prisma.auditLog.findFirst({
      where: { entity: 'ContentPage', entityId: String(id), action: { in: ['UPDATE', 'CREATE'] } },
      orderBy: { createdAt: 'desc' },
      include: {
        admin: {
          select: { id: true, email: true, firstName: true, lastName: true, avatar: true },
        },
      },
    }),
  ]);

  if (!item) throw new AppError(404, 'NOT_FOUND', 'Content page not found');
  return { ...item, lastChange: mapLastChange(lastChangeLog) };
}

async function createContentPage(data, req) {
  await assertLanguagesExist([...new Set(data.translations.map((item) => item.lang))]);

  const created = await prisma.contentPage.create({
    data: {
      slug: data.slug,
      image: data.image || null,
      isActive: data.isActive ?? true,
      translations: {
        create: data.translations.map((item) => ({
          lang: item.lang,
          title: item.title,
          body: item.body,
          isActive: item.isActive ?? true,
        })),
      },
    },
    include: { translations: { orderBy: { lang: 'asc' } } },
  });

  await audit(req, {
    action: 'CREATE',
    entity: 'ContentPage',
    entityId: created.id,
    after: normalizeCore(created),
    details: { translationLangs: created.translations.map((item) => item.lang) },
  });

  return created;
}

async function updateContentPage(id, data, req) {
  const existing = await prisma.contentPage.findUnique({ where: { id }, include: { translations: true } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Content page not found');

  if (Array.isArray(data.translations)) {
    await assertLanguagesExist([...new Set(data.translations.map((item) => item.lang))]);
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.contentPage.update({
      where: { id },
      data: {
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
        ...(data.image !== undefined ? { image: data.image || null } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });

    if (Array.isArray(data.translations)) {
      for (const item of data.translations) {
        await tx.contentPageTranslation.upsert({
          where: { contentPageId_lang: { contentPageId: id, lang: item.lang } },
          update: {
            title: item.title,
            body: item.body,
            isActive: item.isActive ?? true,
          },
          create: {
            contentPageId: id,
            lang: item.lang,
            title: item.title,
            body: item.body,
            isActive: item.isActive ?? true,
          },
        });
      }
      await tx.contentPageTranslation.deleteMany({
        where: { contentPageId: id, lang: { notIn: data.translations.map((item) => item.lang) } },
      });
    }

    return tx.contentPage.findUnique({ where: { id }, include: { translations: { orderBy: { lang: 'asc' } } } });
  });

  await audit(req, {
    action: 'UPDATE',
    entity: 'ContentPage',
    entityId: id,
    before: normalizeCore(existing),
    after: normalizeCore(updated),
    details: { translationLangs: updated.translations.map((item) => item.lang) },
  });

  return updated;
}

async function deleteContentPage(id, req) {
  const existing = await prisma.contentPage.findUnique({
    where: { id },
    include: { translations: { select: { lang: true } } },
  });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Content page not found');

  await prisma.contentPage.delete({ where: { id } });
  await audit(req, {
    action: 'DELETE',
    entity: 'ContentPage',
    entityId: id,
    before: normalizeCore(existing),
    details: { translationLangs: existing.translations.map((item) => item.lang) },
  });
}

module.exports = {
  listContentPages,
  getContentPageById,
  createContentPage,
  updateContentPage,
  deleteContentPage,
};
