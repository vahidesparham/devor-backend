const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const { audit } = require('../../shared/audit/audit');
const { assertLanguagesExist, resolveSelectedLang } = require('./eventLanguage');

const STATUS_TRANSITIONS = {
  DRAFT: new Set(['PUBLISHED']),
  PUBLISHED: new Set(['DRAFT', 'CANCELLED', 'ENDED']),
  CANCELLED: new Set(['DRAFT']),
  ENDED: new Set(['DRAFT']),
};

function nullable(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return value;
}

function decimalToNumber(value) {
  return value === null || value === undefined ? null : Number(value);
}

function adminDisplayName(admin) {
  if (!admin) return null;
  return [admin.firstName, admin.lastName].filter(Boolean).join(' ').trim() || admin.email || null;
}

function serializeEvent(item) {
  if (!item) return item;
  return {
    ...item,
    latitude: decimalToNumber(item.latitude),
    longitude: decimalToNumber(item.longitude),
    price: decimalToNumber(item.price),
    ...(item.createdByAdmin
      ? {
          createdByAdmin: {
            ...item.createdByAdmin,
            displayName: adminDisplayName(item.createdByAdmin),
          },
        }
      : {}),
  };
}

function normalizeCore(item) {
  return {
    categoryId: item.categoryId,
    cityId: item.cityId,
    areaId: item.areaId,
    organizerType: item.organizerType,
    coverImage: item.coverImage,
    startsAt: item.startsAt,
    endsAt: item.endsAt,
    latitude: decimalToNumber(item.latitude),
    longitude: decimalToNumber(item.longitude),
    priceType: item.priceType,
    price: decimalToNumber(item.price),
    currency: item.currency,
    contactPhone: item.contactPhone,
    externalUrl: item.externalUrl,
    status: item.status,
    isFeatured: item.isFeatured,
    isActive: item.isActive,
    publishedAt: item.publishedAt,
  };
}

function validationError(errors, code = 'VALIDATION_ERROR', message = 'Validation failed') {
  throw new AppError(422, code, message, { errors });
}

function validateMergedCore(core) {
  const errors = [];

  if (core.endsAt <= core.startsAt) {
    errors.push({ path: 'endsAt', message: 'endsAt must be later than startsAt' });
  }

  const hasLatitude = core.latitude !== null && core.latitude !== undefined;
  const hasLongitude = core.longitude !== null && core.longitude !== undefined;
  if (hasLatitude !== hasLongitude) {
    errors.push({
      path: hasLatitude ? 'longitude' : 'latitude',
      message: 'latitude and longitude must be provided together',
    });
  }

  if (core.priceType === 'PAID' && !(Number(core.price) > 0)) {
    errors.push({ path: 'price', message: 'A positive price is required for paid events' });
  }
  if (core.priceType === 'FREE' && Number(core.price || 0) > 0) {
    errors.push({ path: 'price', message: 'Free events cannot have a positive price' });
  }

  if (errors.length) validationError(errors);
}

async function assertCategory(categoryId, { active = true } = {}) {
  const category = await prisma.eventCategory.findUnique({
    where: { id: categoryId },
    select: { id: true, isActive: true },
  });
  if (!category) {
    validationError([{ path: 'categoryId', message: 'Event category does not exist' }]);
  }
  if (active && !category.isActive) {
    validationError([{ path: 'categoryId', message: 'Event category is inactive' }]);
  }
  return category;
}

async function assertLocation(cityId, areaId, { active = true } = {}) {
  const city = await prisma.city.findUnique({
    where: { id: cityId },
    select: { id: true, isActive: true },
  });
  if (!city) validationError([{ path: 'cityId', message: 'City does not exist' }]);
  if (active && !city.isActive) validationError([{ path: 'cityId', message: 'City is inactive' }]);

  if (areaId === null || areaId === undefined) return;
  const area = await prisma.area.findUnique({
    where: { id: areaId },
    select: { id: true, cityId: true, isActive: true },
  });
  if (!area) validationError([{ path: 'areaId', message: 'Area does not exist' }]);
  if (area.cityId !== cityId) {
    validationError([{ path: 'areaId', message: 'Area does not belong to the selected city' }]);
  }
  if (active && !area.isActive) validationError([{ path: 'areaId', message: 'Area is inactive' }]);
}

function localizedRelation(relation, selectedLang) {
  if (!relation) return null;
  const translation = relation.translations?.[0] || null;
  return {
    id: relation.id,
    code: relation.code,
    title: translation?.title || relation.title || null,
    lang: selectedLang,
    isActive: relation.isActive,
  };
}

function toListItem(item, selectedLang) {
  const translation = item.translations[0] || null;
  return serializeEvent({
    id: item.id,
    coverImage: item.coverImage,
    startsAt: item.startsAt,
    endsAt: item.endsAt,
    priceType: item.priceType,
    price: item.price,
    currency: item.currency,
    status: item.status,
    isFeatured: item.isFeatured,
    isActive: item.isActive,
    publishedAt: item.publishedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    lang: selectedLang,
    title: translation?.title || null,
    summary: translation?.summary || null,
    translationIsActive: translation?.isActive ?? null,
    category: localizedRelation(item.category, selectedLang),
    city: localizedRelation(item.city, selectedLang),
    area: localizedRelation(item.area, selectedLang),
    createdByAdmin: item.createdByAdmin,
  });
}

async function listEvents(query, lang) {
  const selectedLang = await resolveSelectedLang(lang);
  const skip = (query.page - 1) * query.pageSize;
  const where = {};

  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.cityId) where.cityId = query.cityId;
  if (query.areaId) where.areaId = query.areaId;
  if (query.status) where.status = query.status;
  if (query.priceType) where.priceType = query.priceType;
  if (query.isFeatured !== undefined) where.isFeatured = query.isFeatured;
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.startFrom || query.startTo) {
    where.startsAt = {
      ...(query.startFrom ? { gte: query.startFrom } : {}),
      ...(query.startTo ? { lte: query.startTo } : {}),
    };
  }
  if (query.q) {
    where.translations = {
      some: {
        OR: [
          { title: { contains: query.q } },
          { summary: { contains: query.q } },
          { address: { contains: query.q } },
        ],
      },
    };
  }

  const translationSelect = {
    where: { lang: selectedLang },
    take: 1,
    select: { title: true, summary: true, isActive: true },
  };
  const locationTranslationSelect = {
    where: { lang: selectedLang },
    take: 1,
    select: { title: true },
  };

  const [items, total] = await Promise.all([
    prisma.event.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [{ [query.sortBy]: query.sortDir }, { id: 'desc' }],
      include: {
        translations: translationSelect,
        category: {
          include: { translations: locationTranslationSelect },
        },
        city: {
          include: { translations: locationTranslationSelect },
        },
        area: {
          include: { translations: locationTranslationSelect },
        },
        createdByAdmin: {
          select: { id: true, email: true, firstName: true, lastName: true, avatar: true },
        },
      },
    }),
    prisma.event.count({ where }),
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

async function getEventById(id) {
  const item = await prisma.event.findUnique({
    where: { id },
    include: {
      translations: { orderBy: { lang: 'asc' } },
      category: { include: { translations: { orderBy: { lang: 'asc' } } } },
      city: { include: { translations: { orderBy: { lang: 'asc' } } } },
      area: { include: { translations: { orderBy: { lang: 'asc' } } } },
      createdByAdmin: {
        select: { id: true, email: true, firstName: true, lastName: true, avatar: true },
      },
    },
  });
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Event not found');
  return serializeEvent(item);
}

function translationData(translation) {
  return {
    lang: translation.lang,
    title: translation.title,
    summary: nullable(translation.summary),
    description: nullable(translation.description),
    address: nullable(translation.address),
    isActive: translation.isActive ?? true,
  };
}

async function createEvent(data, req) {
  await Promise.all([
    assertCategory(data.categoryId),
    assertLocation(data.cityId, data.areaId),
    assertLanguagesExist([...new Set(data.translations.map((item) => item.lang))]),
  ]);

  const core = {
    startsAt: data.startsAt,
    endsAt: data.endsAt,
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    priceType: data.priceType ?? 'FREE',
    price: data.priceType === 'PAID' ? data.price : null,
  };
  validateMergedCore(core);

  const created = await prisma.event.create({
    data: {
      categoryId: data.categoryId,
      cityId: data.cityId,
      areaId: data.areaId ?? null,
      organizerType: 'ADMIN',
      createdByAdminId: req.admin.id,
      businessId: null,
      appUserId: null,
      coverImage: nullable(data.coverImage),
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      priceType: core.priceType,
      price: core.price,
      currency: 'TJS',
      contactPhone: nullable(data.contactPhone),
      externalUrl: nullable(data.externalUrl),
      status: 'DRAFT',
      isFeatured: data.isFeatured ?? false,
      isActive: data.isActive ?? true,
      translations: {
        create: data.translations.map(translationData),
      },
    },
    include: { translations: { orderBy: { lang: 'asc' } } },
  });

  await audit(req, {
    action: 'CREATE',
    entity: 'Event',
    entityId: created.id,
    after: normalizeCore(created),
    details: { translationLangs: created.translations.map((item) => item.lang) },
  });

  return serializeEvent(created);
}

async function updateEvent(id, data, req) {
  const existing = await prisma.event.findUnique({
    where: { id },
    include: { translations: true },
  });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Event not found');

  const merged = {
    categoryId: data.categoryId ?? existing.categoryId,
    cityId: data.cityId ?? existing.cityId,
    areaId: data.areaId !== undefined ? data.areaId : existing.areaId,
    startsAt: data.startsAt ?? existing.startsAt,
    endsAt: data.endsAt ?? existing.endsAt,
    latitude: data.latitude !== undefined ? data.latitude : decimalToNumber(existing.latitude),
    longitude: data.longitude !== undefined ? data.longitude : decimalToNumber(existing.longitude),
    priceType: data.priceType ?? existing.priceType,
    price: data.price !== undefined ? data.price : decimalToNumber(existing.price),
  };
  if (data.priceType === 'FREE') merged.price = null;
  validateMergedCore(merged);

  const checks = [];
  if (data.categoryId !== undefined) checks.push(assertCategory(merged.categoryId));
  if (data.cityId !== undefined || data.areaId !== undefined) {
    checks.push(assertLocation(merged.cityId, merged.areaId));
  }
  if (data.translations) {
    checks.push(assertLanguagesExist([...new Set(data.translations.map((item) => item.lang))]));
  }
  await Promise.all(checks);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.event.update({
      where: { id },
      data: {
        ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
        ...(data.cityId !== undefined ? { cityId: data.cityId } : {}),
        ...(data.areaId !== undefined ? { areaId: data.areaId } : {}),
        ...(data.coverImage !== undefined ? { coverImage: nullable(data.coverImage) } : {}),
        ...(data.startsAt !== undefined ? { startsAt: data.startsAt } : {}),
        ...(data.endsAt !== undefined ? { endsAt: data.endsAt } : {}),
        ...(data.latitude !== undefined ? { latitude: data.latitude } : {}),
        ...(data.longitude !== undefined ? { longitude: data.longitude } : {}),
        ...(data.priceType !== undefined ? { priceType: data.priceType } : {}),
        ...(data.price !== undefined || data.priceType === 'FREE' ? { price: merged.price } : {}),
        ...(data.contactPhone !== undefined ? { contactPhone: nullable(data.contactPhone) } : {}),
        ...(data.externalUrl !== undefined ? { externalUrl: nullable(data.externalUrl) } : {}),
        ...(data.isFeatured !== undefined ? { isFeatured: data.isFeatured } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });

    if (data.translations) {
      for (const translation of data.translations) {
        await tx.eventTranslation.upsert({
          where: { eventId_lang: { eventId: id, lang: translation.lang } },
          update: translationData(translation),
          create: { eventId: id, ...translationData(translation) },
        });
      }
      await tx.eventTranslation.deleteMany({
        where: {
          eventId: id,
          lang: { notIn: data.translations.map((item) => item.lang) },
        },
      });
    }

    return tx.event.findUnique({
      where: { id },
      include: { translations: { orderBy: { lang: 'asc' } } },
    });
  });

  await audit(req, {
    action: 'UPDATE',
    entity: 'Event',
    entityId: id,
    before: normalizeCore(existing),
    after: normalizeCore(updated),
    details: { translationLangs: updated.translations.map((item) => item.lang) },
  });

  return serializeEvent(updated);
}

async function assertReadyForPublishing(event) {
  const errors = [];
  const now = new Date();

  if (!event.isActive) errors.push({ path: 'isActive', message: 'Event must be active before publishing' });
  if (!event.coverImage) errors.push({ path: 'coverImage', message: 'Cover image is required before publishing' });
  if (event.endsAt <= now) errors.push({ path: 'endsAt', message: 'Event must end in the future' });
  if (event.endsAt <= event.startsAt) errors.push({ path: 'endsAt', message: 'endsAt must be later than startsAt' });
  if (!event.category.isActive) errors.push({ path: 'categoryId', message: 'Event category is inactive' });
  if (!event.city.isActive) errors.push({ path: 'cityId', message: 'City is inactive' });
  if (event.area && !event.area.isActive) errors.push({ path: 'areaId', message: 'Area is inactive' });
  if (event.area && event.area.cityId !== event.cityId) {
    errors.push({ path: 'areaId', message: 'Area does not belong to the selected city' });
  }
  if (!event.translations.some((item) => item.isActive && item.title.trim())) {
    errors.push({ path: 'translations', message: 'At least one active translation is required' });
  }
  if (event.priceType === 'PAID' && !(Number(event.price) > 0)) {
    errors.push({ path: 'price', message: 'A positive price is required for paid events' });
  }
  if (event.organizerType !== 'ADMIN' || event.businessId || event.appUserId) {
    errors.push({ path: 'organizerType', message: 'Only admin-owned events are supported in phase one' });
  }

  if (errors.length) validationError(errors, 'EVENT_NOT_READY', 'Event is not ready for publishing');
}

async function updateEventStatus(id, data, req) {
  const existing = await prisma.event.findUnique({
    where: { id },
    include: {
      translations: true,
      category: { select: { isActive: true } },
      city: { select: { isActive: true } },
      area: { select: { cityId: true, isActive: true } },
    },
  });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Event not found');
  if (existing.status === data.status) return getEventById(id);

  if (!STATUS_TRANSITIONS[existing.status]?.has(data.status)) {
    throw new AppError(
      409,
      'INVALID_EVENT_STATUS_TRANSITION',
      `Event status cannot change from ${existing.status} to ${data.status}`,
    );
  }

  if (data.status === 'PUBLISHED') await assertReadyForPublishing(existing);

  const updated = await prisma.event.update({
    where: { id },
    data: {
      status: data.status,
      ...(data.status === 'PUBLISHED' ? { publishedAt: new Date() } : {}),
      ...(data.status === 'DRAFT' ? { publishedAt: null } : {}),
    },
    include: { translations: { orderBy: { lang: 'asc' } } },
  });

  await audit(req, {
    action: 'UPDATE',
    entity: 'Event',
    entityId: id,
    before: { status: existing.status, publishedAt: existing.publishedAt },
    after: { status: updated.status, publishedAt: updated.publishedAt },
    details: {
      operation: 'STATUS_CHANGE',
      note: nullable(data.note),
    },
  });

  return getEventById(updated.id);
}

async function deleteEvent(id, req) {
  const existing = await prisma.event.findUnique({
    where: { id },
    include: { translations: { select: { lang: true } } },
  });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Event not found');

  await prisma.event.delete({ where: { id } });
  await audit(req, {
    action: 'DELETE',
    entity: 'Event',
    entityId: id,
    before: normalizeCore(existing),
    details: { translationLangs: existing.translations.map((item) => item.lang) },
  });
}

module.exports = {
  listEvents,
  getEventById,
  createEvent,
  updateEvent,
  updateEventStatus,
  deleteEvent,
};
