const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const { audit } = require('../../shared/audit/audit');

async function getLanguageByCode(code, activeOnly = true) {
  return prisma.language.findFirst({
    where: {
      code,
      ...(activeOnly ? { isActive: true } : {}),
    },
  });
}

async function assertLanguageExists(code, options = {}) {
  const { activeOnly = true, path = 'lang' } = options;
  const language = await getLanguageByCode(code, activeOnly);
  if (!language) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
      errors: [{ path, message: `Language "${code}" is not available` }],
    });
  }
}

async function assertLanguagesExist(codes) {
  if (!codes.length) return;

  const existing = await prisma.language.findMany({
    where: {
      code: { in: codes },
      isActive: true,
    },
    select: { code: true },
  });

  const existingCodes = new Set(existing.map((item) => item.code));
  const missing = codes.filter((code) => !existingCodes.has(code));

  if (missing.length) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
      errors: missing.map((code) => ({
        path: 'translations.lang',
        message: `Language "${code}" is not available`,
      })),
    });
  }
}

async function resolveSelectedLang(lang, path = 'x-lang') {
  if (lang) {
    await assertLanguageExists(lang, { path });
    return lang;
  }

  const fallback = await prisma.language.findFirst({
    where: { isActive: true },
    orderBy: [{ isDefault: 'desc' }, { code: 'asc' }],
  });

  if (!fallback) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
      errors: [{ path, message: 'No active language is configured' }],
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
    placement: item.placement,
    fromDate: item.fromDate,
    toDate: item.toDate,
  };
}

function toListItem(item, selectedLang) {
  const selected = item.translations[0] || null;

  return {
    id: item.id,
    placement: item.placement,
    fromDate: item.fromDate,
    toDate: item.toDate,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    lang: selectedLang,
    title: selected ? selected.title : null,
    link: selected ? selected.link : null,
    image: selected ? selected.image : null,
    isActive: selected ? selected.isActive : null,
  };
}

async function listBanners(query, lang) {
  const selectedLang = await resolveSelectedLang(lang);

  const page = query.page;
  const pageSize = query.pageSize;
  const skip = (page - 1) * pageSize;

  const where = {};

  if (query.placement !== undefined) {
    where.placement = query.placement;
  }

  if (query.activeAt) {
    where.AND = [
      {
        OR: [{ fromDate: null }, { fromDate: { lte: query.activeAt } }],
      },
      {
        OR: [{ toDate: null }, { toDate: { gte: query.activeAt } }],
      },
    ];
  }

  const translationFilter = {
    lang: selectedLang,
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
  };

  if (query.q) {
    const queryCond = {
      translations: {
        some: {
          ...translationFilter,
          OR: [{ title: { contains: query.q } }, { link: { contains: query.q } }],
        },
      },
    };

    if (where.OR) {
      where.OR.push(queryCond);
    } else {
      where.OR = [queryCond];
    }
  } else if (query.isActive !== undefined) {
    where.translations = {
      some: translationFilter,
    };
  }

  const [items, total] = await Promise.all([
    prisma.banner.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: {
        [query.sortBy]: query.sortDir,
      },
      include: {
        translations: {
          where: translationFilter,
          take: 1,
          select: {
            title: true,
            link: true,
            image: true,
            isActive: true,
          },
        },
      },
    }),
    prisma.banner.count({ where }),
  ]);

  return {
    items: items.map((item) => toListItem(item, selectedLang)),
    meta: {
      page,
      pageSize,
      total,
      pageCount: Math.ceil(total / pageSize),
      lang: selectedLang,
    },
  };
}

async function createBanner(data, req) {
  if (data.fromDate && data.toDate && data.toDate < data.fromDate) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
      errors: [{ path: 'toDate', message: 'toDate must be greater than or equal to fromDate' }],
    });
  }

  const langs = [...new Set(data.translations.map((item) => item.lang))];
  await assertLanguagesExist(langs);

  const created = await prisma.banner.create({
    data: {
      placement: data.placement,
      fromDate: data.fromDate ?? null,
      toDate: data.toDate ?? null,
      translations: {
        create: data.translations.map((item) => ({
          lang: item.lang,
          title: item.title,
          link: item.link ?? null,
          image: item.image,
          isActive: item.isActive ?? true,
        })),
      },
    },
    include: {
      translations: {
        orderBy: { lang: 'asc' },
      },
    },
  });

  await audit(req, {
    action: 'CREATE',
    entity: 'Banner',
    entityId: created.id,
    after: normalizeCore(created),
    details: {
      translationLangs: created.translations.map((item) => item.lang),
    },
  });

  return created;
}

async function getBannerById(id, lang) {
  const [item, lastChangeLog] = await Promise.all([
    prisma.banner.findUnique({
      where: { id },
      include: {
        translations: {
          orderBy: { lang: 'asc' },
        },
      },
    }),
    prisma.auditLog.findFirst({
      where: {
        entity: 'Banner',
        entityId: String(id),
        action: { in: ['UPDATE', 'CREATE'] },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    }),
  ]);

  if (!item) {
    throw new AppError(404, 'NOT_FOUND', 'Banner not found');
  }

  const selectedLang = await resolveSelectedLang(lang);
  const selectedTranslation = item.translations.find((t) => t.lang === selectedLang) || null;

  return {
    id: item.id,
    placement: item.placement,
    fromDate: item.fromDate,
    toDate: item.toDate,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    selectedLang,
    selectedTranslation,
    translations: item.translations,
    lastChange: mapLastChange(lastChangeLog),
  };
}

async function updateBanner(id, data, req) {
  const existing = await prisma.banner.findUnique({
    where: { id },
    include: {
      translations: true,
    },
  });

  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Banner not found');
  }

  const nextFromDate = data.fromDate !== undefined ? data.fromDate : existing.fromDate;
  const nextToDate = data.toDate !== undefined ? data.toDate : existing.toDate;

  if (nextFromDate && nextToDate && nextToDate < nextFromDate) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
      errors: [{ path: 'toDate', message: 'toDate must be greater than or equal to fromDate' }],
    });
  }

  const beforeCore = normalizeCore(existing);

  const updateData = {};
  if (data.placement !== undefined) updateData.placement = data.placement;
  if (data.fromDate !== undefined) updateData.fromDate = data.fromDate;
  if (data.toDate !== undefined) updateData.toDate = data.toDate;

  const hasTranslationsArray = Array.isArray(data.translations);
  const translationsInput = hasTranslationsArray ? data.translations : [];

  if (translationsInput.length) {
    await assertLanguagesExist([...new Set(translationsInput.map((item) => item.lang))]);
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (Object.keys(updateData).length) {
      await tx.banner.update({
        where: { id: existing.id },
        data: updateData,
      });
    }

    if (hasTranslationsArray) {
      const existingMap = new Map(existing.translations.map((item) => [item.lang, item]));

      for (const item of translationsInput) {
        const current = existingMap.get(item.lang);

        if (current) {
          await tx.bannerTranslation.update({
            where: {
              bannerId_lang: {
                bannerId: existing.id,
                lang: item.lang,
              },
            },
            data: {
              title: item.title,
              link: item.link ?? null,
              image: item.image,
              isActive: item.isActive ?? true,
            },
          });
        } else {
          await tx.bannerTranslation.create({
            data: {
              bannerId: existing.id,
              lang: item.lang,
              title: item.title,
              link: item.link ?? null,
              image: item.image,
              isActive: item.isActive ?? true,
            },
          });
        }
      }

      const desiredLangs = translationsInput.map((item) => item.lang);
      await tx.bannerTranslation.deleteMany({
        where: {
          bannerId: existing.id,
          lang: { notIn: desiredLangs },
        },
      });
    }

    return tx.banner.findUnique({
      where: { id: existing.id },
      include: {
        translations: {
          orderBy: { lang: 'asc' },
        },
      },
    });
  });

  await audit(req, {
    action: 'UPDATE',
    entity: 'Banner',
    entityId: updated.id,
    before: beforeCore,
    after: normalizeCore(updated),
    details: {
      translationLangs: updated.translations.map((item) => item.lang),
    },
  });

  return updated;
}

async function deleteBanner(id, req) {
  const existing = await prisma.banner.findUnique({
    where: { id },
    include: {
      translations: {
        select: { lang: true },
      },
    },
  });

  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Banner not found');
  }

  await prisma.banner.delete({ where: { id } });

  await audit(req, {
    action: 'DELETE',
    entity: 'Banner',
    entityId: id,
    before: normalizeCore(existing),
    details: {
      translationLangs: existing.translations.map((item) => item.lang),
    },
  });
}

module.exports = {
  listBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
};
