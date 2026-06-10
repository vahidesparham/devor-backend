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

function normalizeCore(item) {
  return {
    image: item.image,
    readingMinutes: item.readingMinutes,
    isActive: item.isActive,
  };
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

function toListItem(item, selectedLang) {
  const selected = item.translations[0] || null;
  return {
    id: item.id,
    image: item.image,
    readingMinutes: item.readingMinutes,
    isActive: item.isActive,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    lang: selectedLang,
    title: selected?.title || null,
    shortDescription: selected?.shortDescription || null,
    body: selected?.body || null,
    translationIsActive: selected?.isActive ?? null,
  };
}

async function listBlogPosts(query, lang) {
  const selectedLang = await resolveSelectedLang(query.lang || lang);
  const skip = (query.page - 1) * query.pageSize;
  const where = {};
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.q) {
    where.translations = {
      some: {
        OR: [
          { title: { contains: query.q } },
          { shortDescription: { contains: query.q } },
          { body: { contains: query.q } },
        ],
      },
    };
  }
  const [items, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [{ [query.sortBy]: query.sortDir }, { id: 'asc' }],
      include: {
        translations: {
          where: { lang: selectedLang },
          take: 1,
          select: { title: true, shortDescription: true, body: true, isActive: true },
        },
      },
    }),
    prisma.blogPost.count({ where }),
  ]);
  return {
    items: items.map((item) => toListItem(item, selectedLang)),
    meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize), lang: selectedLang },
  };
}

async function getBlogPostById(id) {
  const [item, lastChangeLog] = await Promise.all([
    prisma.blogPost.findUnique({ where: { id }, include: { translations: { orderBy: { lang: 'asc' } } } }),
    prisma.auditLog.findFirst({
      where: { entity: 'BlogPost', entityId: String(id), action: { in: ['UPDATE', 'CREATE'] } },
      orderBy: { createdAt: 'desc' },
      include: { admin: { select: { id: true, email: true, firstName: true, lastName: true, avatar: true } } },
    }),
  ]);
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Blog post not found');
  return { ...item, lastChange: mapLastChange(lastChangeLog) };
}

async function createBlogPost(data, req) {
  await assertLanguagesExist([...new Set(data.translations.map((item) => item.lang))]);
  const created = await prisma.blogPost.create({
    data: {
      image: data.image || null,
      readingMinutes: data.readingMinutes ?? null,
      isActive: data.isActive ?? true,
      translations: {
        create: data.translations.map((item) => ({
          lang: item.lang,
          title: item.title,
          shortDescription: item.shortDescription || null,
          body: item.body,
          isActive: item.isActive ?? true,
        })),
      },
    },
    include: { translations: { orderBy: { lang: 'asc' } } },
  });
  await audit(req, {
    action: 'CREATE',
    entity: 'BlogPost',
    entityId: created.id,
    after: normalizeCore(created),
    details: { translationLangs: created.translations.map((item) => item.lang) },
  });
  return created;
}

async function updateBlogPost(id, data, req) {
  const existing = await prisma.blogPost.findUnique({ where: { id }, include: { translations: true } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Blog post not found');
  if (Array.isArray(data.translations)) {
    await assertLanguagesExist([...new Set(data.translations.map((item) => item.lang))]);
  }
  const updated = await prisma.$transaction(async (tx) => {
    await tx.blogPost.update({
      where: { id },
      data: {
        ...(data.image !== undefined ? { image: data.image || null } : {}),
        ...(data.readingMinutes !== undefined ? { readingMinutes: data.readingMinutes ?? null } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
    if (Array.isArray(data.translations)) {
      for (const item of data.translations) {
        await tx.blogPostTranslation.upsert({
          where: { blogPostId_lang: { blogPostId: id, lang: item.lang } },
          update: {
            title: item.title,
            shortDescription: item.shortDescription || null,
            body: item.body,
            isActive: item.isActive ?? true,
          },
          create: {
            blogPostId: id,
            lang: item.lang,
            title: item.title,
            shortDescription: item.shortDescription || null,
            body: item.body,
            isActive: item.isActive ?? true,
          },
        });
      }
      await tx.blogPostTranslation.deleteMany({
        where: { blogPostId: id, lang: { notIn: data.translations.map((item) => item.lang) } },
      });
    }
    return tx.blogPost.findUnique({ where: { id }, include: { translations: { orderBy: { lang: 'asc' } } } });
  });
  await audit(req, {
    action: 'UPDATE',
    entity: 'BlogPost',
    entityId: id,
    before: normalizeCore(existing),
    after: normalizeCore(updated),
    details: { translationLangs: updated.translations.map((item) => item.lang) },
  });
  return updated;
}

async function deleteBlogPost(id, req) {
  const existing = await prisma.blogPost.findUnique({
    where: { id },
    include: { translations: { select: { lang: true } } },
  });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Blog post not found');
  await prisma.blogPost.delete({ where: { id } });
  await audit(req, {
    action: 'DELETE',
    entity: 'BlogPost',
    entityId: id,
    before: normalizeCore(existing),
    details: { translationLangs: existing.translations.map((item) => item.lang) },
  });
}

module.exports = {
  listBlogPosts,
  getBlogPostById,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
};
