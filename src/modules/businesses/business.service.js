const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const { audit } = require('../../shared/audit/audit');

async function assertLanguages(codes) {
  const existing = await prisma.language.findMany({ where: { code: { in: codes }, isActive: true }, select: { code: true } });
  const set = new Set(existing.map((item) => item.code));
  const missing = codes.filter((code) => !set.has(code));
  if (missing.length) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
      errors: missing.map((code) => ({ path: 'translations.lang', message: `Language "${code}" is not available` })),
    });
  }
}

async function assertBusinessRelations(serviceTypeId, attributeOptionIds) {
  const serviceType = await prisma.serviceType.findUnique({ where: { id: serviceTypeId }, select: { id: true } });
  if (!serviceType) throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', { errors: [{ path: 'serviceTypeId', message: 'Service type not found' }] });

  if (attributeOptionIds.length) {
    const options = await prisma.attributeOption.findMany({
      where: { id: { in: attributeOptionIds }, group: { serviceTypeId } },
      include: { group: { select: { id: true, selectionMode: true, title: true } } },
    });
    if (options.length !== new Set(attributeOptionIds).size) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', { errors: [{ path: 'attributeOptionIds', message: 'Some attributes do not belong to the selected service type' }] });
    }
    const singleGroups = new Map();
    for (const option of options) {
      if (option.group.selectionMode !== 'SINGLE') continue;
      singleGroups.set(option.group.id, (singleGroups.get(option.group.id) || 0) + 1);
    }
    const invalid = [...singleGroups.values()].some((count) => count > 1);
    if (invalid) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', { errors: [{ path: 'attributeOptionIds', message: 'Single-select attribute groups can only have one selected option' }] });
    }
  }
}

async function assertLocationRelations(core, existing = {}) {
  const countryId = core.countryId === undefined ? existing.countryId : core.countryId;
  const cityId = core.cityId === undefined ? existing.cityId : core.cityId;
  const areaId = core.areaId === undefined ? existing.areaId : core.areaId;

  if (countryId) {
    const country = await prisma.country.findUnique({ where: { id: countryId }, select: { id: true } });
    if (!country) throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', { errors: [{ path: 'countryId', message: 'Country not found' }] });
  }

  if (cityId) {
    const city = await prisma.city.findUnique({ where: { id: cityId }, select: { id: true, countryId: true } });
    if (!city) throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', { errors: [{ path: 'cityId', message: 'City not found' }] });
    if (countryId && city.countryId !== countryId) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', { errors: [{ path: 'cityId', message: 'City does not belong to the selected country' }] });
    }
  }

  if (areaId) {
    const area = await prisma.area.findUnique({ where: { id: areaId }, select: { id: true, cityId: true, city: { select: { countryId: true } } } });
    if (!area) throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', { errors: [{ path: 'areaId', message: 'Area not found' }] });
    if (cityId && area.cityId !== cityId) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', { errors: [{ path: 'areaId', message: 'Area does not belong to the selected city' }] });
    }
    if (countryId && area.city.countryId !== countryId) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', { errors: [{ path: 'areaId', message: 'Area does not belong to the selected country' }] });
    }
  }
}

async function resolveSelectedLang(lang) {
  if (lang) return lang;
  const fallback = await prisma.language.findFirst({ where: { isActive: true }, orderBy: [{ isDefault: 'desc' }, { code: 'asc' }] });
  return fallback?.code || 'en';
}

function normalize(item) {
  return {
    serviceTypeId: item.serviceTypeId,
    countryId: item.countryId,
    cityId: item.cityId,
    areaId: item.areaId,
    slug: item.slug,
    displayOrder: item.displayOrder,
    isActive: item.isActive,
    isFeatured: item.isFeatured,
    showInLatest: item.showInLatest,
    economicLevel: item.economicLevel,
    operationMode: item.operationMode,
  };
}

function splitData(data) {
  const { translations, gallery, slideshows, attributeOptionIds, ...core } = data;
  return { core, translations, gallery, slideshows, attributeOptionIds };
}

async function listBusinesses(query, lang) {
  const selectedLang = await resolveSelectedLang(lang);
  const skip = (query.page - 1) * query.pageSize;
  const where = {};
  if (query.serviceTypeId) where.serviceTypeId = query.serviceTypeId;
  if (query.countryId) where.countryId = query.countryId;
  if (query.cityId) where.cityId = query.cityId;
  if (query.areaId) where.areaId = query.areaId;
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.isFeatured !== undefined) where.isFeatured = query.isFeatured;
  if (query.q) {
    where.OR = [
      { slug: { contains: query.q } },
      { translations: { some: { OR: [{ title: { contains: query.q } }, { summary: { contains: query.q } }, { address: { contains: query.q } }] } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.business.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [{ [query.sortBy]: query.sortDir }, { id: 'asc' }],
      include: {
        serviceType: {
          select: {
            id: true,
            code: true,
            title: true,
            image: true,
            color: true,
            translations: { where: { lang: selectedLang }, take: 1, select: { title: true, description: true } },
          },
        },
        translations: { where: { lang: selectedLang }, take: 1 },
        country: { select: { id: true, code: true, title: true, flagImage: true, phoneCode: true, translations: { where: { lang: selectedLang }, take: 1, select: { title: true } } } },
        city: { select: { id: true, code: true, title: true, translations: { where: { lang: selectedLang }, take: 1, select: { title: true } } } },
        area: { select: { id: true, code: true, title: true, translations: { where: { lang: selectedLang }, take: 1, select: { title: true } } } },
        _count: { select: { gallery: true, slideshows: true, businessAttributes: true, businessMemberships: true } },
      },
    }),
    prisma.business.count({ where }),
  ]);

  return {
    items: items.map((item) => {
      const serviceTypeTranslation = item.serviceType?.translations?.[0] || null;
      return {
        ...item,
        _count: item._count ? { ...item._count, businessUsers: item._count.businessMemberships } : item._count,
        serviceType: item.serviceType
          ? { ...item.serviceType, title: serviceTypeTranslation?.title || item.serviceType.title, selectedTranslation: serviceTypeTranslation, translations: undefined }
          : null,
        country: item.country ? { ...item.country, title: item.country.translations?.[0]?.title || item.country.title, selectedTranslation: item.country.translations?.[0] || null, translations: undefined } : null,
        city: item.city ? { ...item.city, title: item.city.translations?.[0]?.title || item.city.title, selectedTranslation: item.city.translations?.[0] || null, translations: undefined } : null,
        area: item.area ? { ...item.area, title: item.area.translations?.[0]?.title || item.area.title, selectedTranslation: item.area.translations?.[0] || null, translations: undefined } : null,
        selectedTranslation: item.translations[0] || null,
        translations: undefined,
      };
    }),
    meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize), lang: selectedLang },
  };
}

async function getBusinessById(id) {
  const item = await prisma.business.findUnique({
    where: { id },
    include: {
      serviceType: { select: { id: true, code: true, title: true, image: true, color: true } },
      country: { select: { id: true, code: true, title: true, flagImage: true, phoneCode: true } },
      city: { select: { id: true, code: true, title: true, countryId: true } },
      area: { select: { id: true, code: true, title: true, cityId: true } },
      translations: { orderBy: { lang: 'asc' } },
      gallery: { orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }] },
      slideshows: { orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }] },
      businessAttributes: { select: { attributeOptionId: true } },
    },
  });
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Business not found');
  return {
    ...item,
    attributeOptionIds: item.businessAttributes.map((entry) => entry.attributeOptionId),
  };
}

async function createBusiness(data, req) {
  const { core, translations, gallery, slideshows, attributeOptionIds } = splitData(data);
  await assertLanguages([...new Set(translations.map((item) => item.lang))]);
  await assertBusinessRelations(core.serviceTypeId, attributeOptionIds || []);
  await assertLocationRelations(core);

  const created = await prisma.business.create({
    data: {
      ...core,
      translations: { create: translations },
      gallery: gallery?.length ? { create: gallery.map(({ id: _id, ...item }) => item) } : undefined,
      slideshows: slideshows?.length ? { create: slideshows.map(({ id: _id, ...item }) => item) } : undefined,
      businessAttributes: attributeOptionIds?.length ? { create: [...new Set(attributeOptionIds)].map((attributeOptionId) => ({ attributeOptionId })) } : undefined,
    },
    include: { translations: true, gallery: true },
  });

  await audit(req, { action: 'CREATE', entity: 'Business', entityId: created.id, after: normalize(created) });
  return created;
}

async function updateBusiness(id, data, req) {
  const existing = await prisma.business.findUnique({
    where: { id },
    include: { translations: true, businessAttributes: { select: { attributeOptionId: true } } },
  });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Business not found');

  const { core, translations, gallery, slideshows, attributeOptionIds } = splitData(data);
  const nextServiceTypeId = core.serviceTypeId || existing.serviceTypeId;
  if (translations) await assertLanguages([...new Set(translations.map((item) => item.lang))]);
  const nextAttributeOptionIds = Array.isArray(attributeOptionIds)
    ? attributeOptionIds
    : existing.businessAttributes.map((entry) => entry.attributeOptionId);
  await assertBusinessRelations(nextServiceTypeId, nextAttributeOptionIds);
  await assertLocationRelations(core, existing);

  const updated = await prisma.$transaction(async (tx) => {
    if (Object.keys(core).length) await tx.business.update({ where: { id }, data: core });

    if (Array.isArray(translations)) {
      for (const item of translations) {
        await tx.businessTranslation.upsert({
          where: { businessId_lang: { businessId: id, lang: item.lang } },
          update: item,
          create: { ...item, businessId: id },
        });
      }
      await tx.businessTranslation.deleteMany({ where: { businessId: id, lang: { notIn: translations.map((item) => item.lang) } } });
    }

    if (Array.isArray(gallery)) {
      const keepIds = [];
      for (const entry of gallery) {
        const { id: galleryId, ...entryData } = entry;
        if (galleryId) {
          keepIds.push(galleryId);
          await tx.businessGallery.update({ where: { id: galleryId }, data: entryData });
        } else {
          const createdGallery = await tx.businessGallery.create({ data: { ...entryData, businessId: id } });
          keepIds.push(createdGallery.id);
        }
      }
      await tx.businessGallery.deleteMany({ where: { businessId: id, id: { notIn: keepIds } } });
    }

    if (Array.isArray(slideshows)) {
      const keepIds = [];
      for (const entry of slideshows) {
        const { id: slideshowId, ...entryData } = entry;
        if (slideshowId) {
          keepIds.push(slideshowId);
          await tx.businessSlideshow.update({ where: { id: slideshowId }, data: entryData });
        } else {
          const createdSlideshow = await tx.businessSlideshow.create({ data: { ...entryData, businessId: id } });
          keepIds.push(createdSlideshow.id);
        }
      }
      await tx.businessSlideshow.deleteMany({ where: { businessId: id, id: { notIn: keepIds } } });
    }

    if (Array.isArray(attributeOptionIds)) {
      await tx.businessAttribute.deleteMany({ where: { businessId: id } });
      if (attributeOptionIds.length) {
        await tx.businessAttribute.createMany({ data: [...new Set(attributeOptionIds)].map((attributeOptionId) => ({ businessId: id, attributeOptionId })) });
      }
    }

    return tx.business.findUnique({ where: { id }, include: { translations: true, gallery: true } });
  });

  await audit(req, { action: 'UPDATE', entity: 'Business', entityId: id, before: normalize(existing), after: normalize(updated) });
  return updated;
}

async function deleteBusiness(id, req) {
  const existing = await prisma.business.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Business not found');
  await prisma.business.delete({ where: { id } });
  await audit(req, { action: 'DELETE', entity: 'Business', entityId: id, before: normalize(existing) });
}

async function getNextDisplayOrder(serviceTypeId) {
  const where = serviceTypeId ? { serviceTypeId: Number(serviceTypeId) } : {};
  const aggregate = await prisma.business.aggregate({ where, _max: { displayOrder: true } });
  return (aggregate._max.displayOrder || 0) + 10;
}

module.exports = {
  listBusinesses,
  getBusinessById,
  createBusiness,
  updateBusiness,
  deleteBusiness,
  getNextDisplayOrder,
};
