const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const { audit } = require('../../shared/audit/audit');
const { assertLanguagesExist, resolveSelectedLang } = require('../events/eventLanguage');

function normalizeCore(item) {
  return {
    code: item.code,
    displayOrder: item.displayOrder,
    isActive: item.isActive,
  };
}

function toListItem(item, selectedLang) {
  const translation = item.translations[0] || null;
  return {
    id: item.id,
    code: item.code,
    displayOrder: item.displayOrder,
    isActive: item.isActive,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    lang: selectedLang,
    title: translation?.title || null,
    translationIsActive: translation?.isActive ?? null,
    eventsCount: item._count.events,
  };
}

async function listEventCategories(query, lang) {
  const selectedLang = await resolveSelectedLang(lang);
  const skip = (query.page - 1) * query.pageSize;
  const where = {};

  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.q) {
    where.OR = [
      { code: { contains: query.q } },
      { translations: { some: { title: { contains: query.q } } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.eventCategory.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [{ [query.sortBy]: query.sortDir }, { id: 'asc' }],
      include: {
        translations: {
          where: { lang: selectedLang },
          take: 1,
          select: { title: true, isActive: true },
        },
        _count: { select: { events: true } },
      },
    }),
    prisma.eventCategory.count({ where }),
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

async function getEventCategoryById(id) {
  const item = await prisma.eventCategory.findUnique({
    where: { id },
    include: {
      translations: { orderBy: { lang: 'asc' } },
      _count: { select: { events: true } },
    },
  });
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Event category not found');
  return item;
}

async function createEventCategory(data, req) {
  await assertLanguagesExist([...new Set(data.translations.map((item) => item.lang))]);

  const created = await prisma.eventCategory.create({
    data: {
      code: data.code,
      displayOrder: data.displayOrder ?? 0,
      isActive: data.isActive ?? true,
      translations: {
        create: data.translations.map((item) => ({
          lang: item.lang,
          title: item.title,
          isActive: item.isActive ?? true,
        })),
      },
    },
    include: { translations: { orderBy: { lang: 'asc' } } },
  });

  await audit(req, {
    action: 'CREATE',
    entity: 'EventCategory',
    entityId: created.id,
    after: normalizeCore(created),
    details: { translationLangs: created.translations.map((item) => item.lang) },
  });

  return created;
}

async function updateEventCategory(id, data, req) {
  const existing = await prisma.eventCategory.findUnique({
    where: { id },
    include: { translations: true },
  });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Event category not found');

  if (data.translations) {
    await assertLanguagesExist([...new Set(data.translations.map((item) => item.lang))]);
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.eventCategory.update({
      where: { id },
      data: {
        ...(data.code !== undefined ? { code: data.code } : {}),
        ...(data.displayOrder !== undefined ? { displayOrder: data.displayOrder } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });

    if (data.translations) {
      for (const translation of data.translations) {
        await tx.eventCategoryTranslation.upsert({
          where: { eventCategoryId_lang: { eventCategoryId: id, lang: translation.lang } },
          update: {
            title: translation.title,
            isActive: translation.isActive ?? true,
          },
          create: {
            eventCategoryId: id,
            lang: translation.lang,
            title: translation.title,
            isActive: translation.isActive ?? true,
          },
        });
      }

      await tx.eventCategoryTranslation.deleteMany({
        where: {
          eventCategoryId: id,
          lang: { notIn: data.translations.map((item) => item.lang) },
        },
      });
    }

    return tx.eventCategory.findUnique({
      where: { id },
      include: { translations: { orderBy: { lang: 'asc' } } },
    });
  });

  await audit(req, {
    action: 'UPDATE',
    entity: 'EventCategory',
    entityId: id,
    before: normalizeCore(existing),
    after: normalizeCore(updated),
    details: { translationLangs: updated.translations.map((item) => item.lang) },
  });

  return updated;
}

async function deleteEventCategory(id, req) {
  const existing = await prisma.eventCategory.findUnique({
    where: { id },
    include: {
      translations: { select: { lang: true } },
      _count: { select: { events: true } },
    },
  });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Event category not found');
  if (existing._count.events > 0) {
    throw new AppError(409, 'EVENT_CATEGORY_IN_USE', 'Event category is used by one or more events');
  }

  await prisma.eventCategory.delete({ where: { id } });
  await audit(req, {
    action: 'DELETE',
    entity: 'EventCategory',
    entityId: id,
    before: normalizeCore(existing),
    details: { translationLangs: existing.translations.map((item) => item.lang) },
  });
}

async function getNextDisplayOrder() {
  const aggregate = await prisma.eventCategory.aggregate({
    _max: { displayOrder: true },
  });
  return (aggregate._max.displayOrder ?? 0) + 10;
}

module.exports = {
  listEventCategories,
  getEventCategoryById,
  createEventCategory,
  updateEventCategory,
  deleteEventCategory,
  getNextDisplayOrder,
};
