const prisma = require('../../prisma');
const { Prisma } = require('../../generated/prisma-client');
const { AppError } = require('../../shared/http/response');
const { audit } = require('../../shared/audit/audit');
const { ensureDefaultBusinessRoles } = require('../business-roles/businessRole.service');

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

async function assertBusinessRelations(serviceTypeId, attributeOptionIds, attributeValues = []) {
  const serviceType = await prisma.serviceType.findUnique({ where: { id: serviceTypeId }, select: { id: true } });
  if (!serviceType) throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', { errors: [{ path: 'serviceTypeId', message: 'Service type not found' }] });

  const groups = await prisma.attributeGroup.findMany({
    where: { serviceTypeId },
    include: { options: { select: { id: true } } },
  });
  const groupsById = new Map(groups.map((group) => [group.id, group]));
  const optionGroupById = new Map();
  for (const group of groups) {
    for (const option of group.options) optionGroupById.set(option.id, group);
  }

  if (attributeOptionIds.length) {
    const uniqueOptionIds = [...new Set(attributeOptionIds)];
    if (uniqueOptionIds.some((optionId) => !optionGroupById.has(optionId))) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', { errors: [{ path: 'attributeOptionIds', message: 'Some attributes do not belong to the selected service type' }] });
    }
    const singleGroups = new Map();
    for (const optionId of uniqueOptionIds) {
      const group = optionGroupById.get(optionId);
      const singleLike = group.selectionMode === 'SINGLE' || group.fieldType === 'SELECT';
      if (!singleLike) continue;
      singleGroups.set(group.id, (singleGroups.get(group.id) || 0) + 1);
    }
    const invalid = [...singleGroups.values()].some((count) => count > 1);
    if (invalid) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', { errors: [{ path: 'attributeOptionIds', message: 'Single-select attribute fields can only have one selected option' }] });
    }
  }

  const selectedOptionGroupIds = new Set((attributeOptionIds || []).map((optionId) => optionGroupById.get(optionId)?.id).filter(Boolean));
  const valueByGroupId = new Map((attributeValues || []).map((value) => [value.groupId, value]));
  for (const value of attributeValues || []) {
    const group = groupsById.get(value.groupId);
    if (!group) throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', { errors: [{ path: 'attributeValues.groupId', message: 'Attribute value group does not belong to the selected service type' }] });
    if (!['TEXT', 'NUMBER', 'BOOLEAN'].includes(group.fieldType)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', { errors: [{ path: 'attributeValues.groupId', message: 'This attribute group does not accept typed values' }] });
    }
    if (group.fieldType === 'TEXT' && !value.textValue) throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', { errors: [{ path: 'attributeValues.textValue', message: 'Text value is required' }] });
    if (group.fieldType === 'NUMBER' && (value.numberValue === null || value.numberValue === undefined)) throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', { errors: [{ path: 'attributeValues.numberValue', message: 'Number value is required' }] });
    if (group.fieldType === 'BOOLEAN' && (value.booleanValue === null || value.booleanValue === undefined)) throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', { errors: [{ path: 'attributeValues.booleanValue', message: 'Boolean value is required' }] });
  }
  for (const group of groups) {
    if (!group.isRequired) continue;
    const hasOptionValue = ['SELECT', 'MULTI_SELECT'].includes(group.fieldType) && selectedOptionGroupIds.has(group.id);
    const typedValue = valueByGroupId.get(group.id);
    const hasTypedValue = group.fieldType === 'TEXT'
      ? Boolean(typedValue?.textValue)
      : group.fieldType === 'NUMBER'
        ? typedValue?.numberValue !== null && typedValue?.numberValue !== undefined
        : group.fieldType === 'BOOLEAN'
          ? typedValue?.booleanValue !== null && typedValue?.booleanValue !== undefined
          : false;
    if (!hasOptionValue && !hasTypedValue) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', { errors: [{ path: 'attributes', message: `Required attribute "${group.title}" is missing` }] });
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
    publicationStatus: item.publicationStatus,
    submittedAt: item.submittedAt,
    reviewedAt: item.reviewedAt,
    publishedAt: item.publishedAt,
    reviewNote: item.reviewNote,
  };
}

function splitData(data) {
  const { translations, gallery, slideshows, attributeOptionIds, attributeValues, ...core } = data;
  return { core, translations, gallery, slideshows, attributeOptionIds, attributeValues };
}

function buildBusinessOrderBy(query) {
  if (query.sortBy === 'serviceType') return [{ serviceType: { title: query.sortDir } }, { id: 'asc' }];
  if (query.sortBy === 'title') return [{ slug: query.sortDir }, { id: 'asc' }];
  return [{ [query.sortBy]: query.sortDir }, { id: 'asc' }];
}

function buildBusinessListWhere(query) {
  const where = {};
  if (query.serviceTypeId) where.serviceTypeId = query.serviceTypeId;
  if (query.countryId) where.countryId = query.countryId;
  if (query.cityId) where.cityId = query.cityId;
  if (query.areaId) where.areaId = query.areaId;
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.isFeatured !== undefined) where.isFeatured = query.isFeatured;
  if (query.publicationStatus) where.publicationStatus = query.publicationStatus;
  if (query.q) {
    where.OR = [
      { slug: { contains: query.q } },
      { translations: { some: { OR: [{ title: { contains: query.q } }, { summary: { contains: query.q } }, { address: { contains: query.q } }] } } },
    ];
  }
  return where;
}

async function findLocalizedSortedBusinessIds(query, selectedLang, skip) {
  const conditions = [];
  if (query.serviceTypeId) conditions.push(Prisma.sql`b.serviceTypeId = ${query.serviceTypeId}`);
  if (query.countryId) conditions.push(Prisma.sql`b.countryId = ${query.countryId}`);
  if (query.cityId) conditions.push(Prisma.sql`b.cityId = ${query.cityId}`);
  if (query.areaId) conditions.push(Prisma.sql`b.areaId = ${query.areaId}`);
  if (query.isActive !== undefined) conditions.push(Prisma.sql`b.isActive = ${query.isActive}`);
  if (query.isFeatured !== undefined) conditions.push(Prisma.sql`b.isFeatured = ${query.isFeatured}`);
  if (query.publicationStatus) conditions.push(Prisma.sql`b.publicationStatus = ${query.publicationStatus}`);
  if (query.q) {
    const term = `%${query.q}%`;
    conditions.push(Prisma.sql`(
      b.slug LIKE ${term}
      OR EXISTS (
        SELECT 1 FROM BusinessTranslation bq
        WHERE bq.businessId = b.id
          AND (bq.title LIKE ${term} OR bq.summary LIKE ${term} OR bq.address LIKE ${term})
      )
    )`);
  }

  const whereSql = conditions.length ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}` : Prisma.empty;
  const sortExpression = query.sortBy === 'serviceType' ? Prisma.sql`COALESCE(stt.title, st.title)` : Prisma.sql`COALESCE(bt.title, b.slug)`;
  const sortDirection = Prisma.raw(query.sortDir === 'desc' ? 'DESC' : 'ASC');
  const rows = await prisma.$queryRaw`
    SELECT b.id
    FROM Business b
    LEFT JOIN BusinessTranslation bt ON bt.businessId = b.id AND bt.lang = ${selectedLang}
    LEFT JOIN ServiceType st ON st.id = b.serviceTypeId
    LEFT JOIN ServiceTypeTranslation stt ON stt.serviceTypeId = st.id AND stt.lang = ${selectedLang}
    ${whereSql}
    ORDER BY ${sortExpression} ${sortDirection}, b.id ASC
    LIMIT ${query.pageSize} OFFSET ${skip}
  `;
  return rows.map((row) => Number(row.id));
}

async function listBusinesses(query, lang) {
  const selectedLang = await resolveSelectedLang(lang);
  const skip = (query.page - 1) * query.pageSize;
  const where = buildBusinessListWhere(query);
  const usesLocalizedSort = ['title', 'serviceType'].includes(query.sortBy);
  const pageIdsPromise = usesLocalizedSort ? findLocalizedSortedBusinessIds(query, selectedLang, skip) : Promise.resolve(null);
  const [pageIds, total] = await Promise.all([pageIdsPromise, prisma.business.count({ where })]);
  if (usesLocalizedSort && !pageIds.length) {
    return { items: [], meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize), lang: selectedLang } };
  }

  const items = await prisma.business.findMany({
      where: usesLocalizedSort ? { id: { in: pageIds } } : where,
      skip: usesLocalizedSort ? undefined : skip,
      take: usesLocalizedSort ? undefined : query.pageSize,
      orderBy: usesLocalizedSort ? undefined : buildBusinessOrderBy(query),
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
    });
  if (usesLocalizedSort) {
    const orderIndex = new Map(pageIds.map((id, index) => [id, index]));
    items.sort((a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0));
  }

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
      serviceType: { select: { id: true, code: true, title: true, image: true, color: true, isActive: true } },
      country: { select: { id: true, code: true, title: true, flagImage: true, phoneCode: true } },
      city: { select: { id: true, code: true, title: true, countryId: true } },
      area: { select: { id: true, code: true, title: true, cityId: true } },
      translations: { orderBy: { lang: 'asc' } },
      gallery: { orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }] },
      slideshows: { orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }] },
      contactLinks: { orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }, { id: 'asc' }] },
      businessAttributes: { select: { attributeOptionId: true } },
      attributeValues: true,
      _count: { select: { gallery: true, slideshows: true, contactLinks: true, businessAttributes: true, attributeValues: true, workingHours: true, offerings: true } },
    },
  });
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Business not found');
  return {
    ...item,
    attributeOptionIds: item.businessAttributes.map((entry) => entry.attributeOptionId),
    attributeValues: item.attributeValues || [],
    readiness: buildBusinessReadiness(item),
  };
}

function addReadinessCheck(checks, key, required, passed, message, href = null) {
  checks.push({ key, required, passed: Boolean(passed), message, href });
}

function hasReadableText(value) {
  return Boolean(value && !String(value).includes('???'));
}

function buildBusinessReadiness(item) {
  const translations = item.translations || [];
  const activeReadableTranslations = translations.filter((translation) => translation.isActive && hasReadableText(translation.title));
  const hasContactLinks = (item.contactLinks || []).some((link) => link.isActive && (link.value || link.url));
  const hasContact = hasContactLinks || Boolean(item.phone || item.email || item.website);
  const hasLocation = Boolean(item.countryId && item.cityId && item.latitude && item.longitude);
  const galleryCount = item._count?.gallery ?? item.gallery?.length ?? 0;
  const slideshowCount = item._count?.slideshows ?? item.slideshows?.length ?? 0;
  const contactLinksCount = item._count?.contactLinks ?? item.contactLinks?.length ?? 0;
  const attributesCount = (item._count?.businessAttributes ?? item.businessAttributes?.length ?? 0) + (item._count?.attributeValues ?? item.attributeValues?.length ?? 0);
  const workingHoursCount = item._count?.workingHours ?? item.workingHours?.length ?? 0;
  const offeringsCount = item._count?.offerings ?? item.offerings?.length ?? 0;
  const needsOfferings = ['SHOWCASE', 'ORDERING', 'BOOKING', 'ORDERING_AND_BOOKING'].includes(item.operationMode);
  const checks = [];

  addReadinessCheck(checks, 'active', true, item.isActive, 'Business must be operationally active before publishing', '/businesses/form');
  addReadinessCheck(checks, 'serviceType', true, item.serviceType?.isActive !== false, 'Business must have an active service type', '/businesses/form');
  addReadinessCheck(checks, 'translation', true, activeReadableTranslations.length > 0, 'At least one active readable title translation is required', '/businesses/form');
  addReadinessCheck(checks, 'logo', true, item.logoImage, 'Logo image is required', '/businesses/form');
  addReadinessCheck(checks, 'cover', true, item.coverImage, 'Cover image is required', '/businesses/form');
  addReadinessCheck(checks, 'contact', true, hasContact, 'At least one active contact link is required', '/businesses/contact-links');
  addReadinessCheck(checks, 'location', true, hasLocation, 'Country, city and map coordinates are required', '/businesses/form');
  addReadinessCheck(checks, 'gallery', false, galleryCount > 0, 'Gallery improves the public profile', '/businesses/gallery');
  addReadinessCheck(checks, 'slideshow', false, slideshowCount > 0, 'Slideshow improves the first screen', '/businesses/slideshows');
  addReadinessCheck(checks, 'workingHours', false, workingHoursCount > 0, 'Working hours improve user confidence', '/businesses/working-hours');
  addReadinessCheck(checks, 'contactLinksQuality', false, contactLinksCount > 1, 'Multiple contact links improve the public profile', '/businesses/contact-links');
  addReadinessCheck(checks, 'attributes', false, attributesCount > 0, 'Attributes make the profile more useful', '/businesses/form');
  addReadinessCheck(checks, 'offerings', needsOfferings, !needsOfferings || offeringsCount > 0, 'This activity mode should have at least one offering', '/businesses/offerings');

  const requiredChecks = checks.filter((check) => check.required);
  const passedRequired = requiredChecks.filter((check) => check.passed).length;
  const passedAll = checks.filter((check) => check.passed).length;
  return {
    isReadyToPublish: requiredChecks.every((check) => check.passed),
    requiredPassed: passedRequired,
    requiredTotal: requiredChecks.length,
    passed: passedAll,
    total: checks.length,
    checks,
  };
}

async function getBusinessReadiness(id) {
  const item = await prisma.business.findUnique({
    where: { id },
    include: {
      serviceType: { select: { id: true, isActive: true } },
      translations: true,
      contactLinks: { where: { isActive: true }, select: { id: true, value: true, url: true, isActive: true } },
      _count: { select: { gallery: true, slideshows: true, contactLinks: true, businessAttributes: true, attributeValues: true, workingHours: true, offerings: true } },
    },
  });
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Business not found');
  return buildBusinessReadiness(item);
}

async function assertReadyToPublish(id) {
  const readiness = await getBusinessReadiness(id);
  if (!readiness.isReadyToPublish) {
    throw new AppError(409, 'BUSINESS_NOT_READY_TO_PUBLISH', 'Business is not ready to publish', {
      readiness,
      errors: readiness.checks.filter((check) => check.required && !check.passed).map((check) => ({ path: check.key, message: check.message })),
    });
  }
  return readiness;
}

async function transitionBusinessPublication(id, status, data = {}, req) {
  const existing = await prisma.business.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Business not found');

  const updateData = { publicationStatus: status };
  if (status === 'PENDING_REVIEW') {
    await assertReadyToPublish(id);
    updateData.submittedAt = new Date();
    updateData.reviewedAt = null;
    updateData.reviewNote = null;
  }
  if (status === 'PUBLISHED') {
    await assertReadyToPublish(id);
    updateData.reviewedAt = new Date();
    updateData.publishedAt = new Date();
    updateData.reviewNote = data.reviewNote ?? null;
  }
  if (status === 'REJECTED') {
    updateData.reviewedAt = new Date();
    updateData.reviewNote = data.reviewNote ?? null;
  }
  if (status === 'SUSPENDED') {
    updateData.reviewedAt = new Date();
    updateData.reviewNote = data.reviewNote ?? null;
  }
  if (status === 'DRAFT') {
    updateData.reviewNote = data.reviewNote ?? null;
  }

  const updated = await prisma.business.update({ where: { id }, data: updateData });
  await audit(req, { action: 'UPDATE', entity: 'BusinessPublication', entityId: id, before: normalize(existing), after: normalize(updated), details: { transition: status } });
  return { ...updated, readiness: await getBusinessReadiness(id) };
}

async function createBusiness(data, req) {
  const { core, translations, gallery, slideshows, attributeOptionIds, attributeValues } = splitData(data);
  await assertLanguages([...new Set(translations.map((item) => item.lang))]);
  await assertBusinessRelations(core.serviceTypeId, attributeOptionIds || [], attributeValues || []);
  await assertLocationRelations(core);

  const created = await prisma.$transaction(async (tx) => {
    const business = await tx.business.create({
      data: {
        ...core,
        translations: { create: translations },
        gallery: gallery?.length ? { create: gallery.map(({ id: _id, ...item }) => item) } : undefined,
        slideshows: slideshows?.length ? { create: slideshows.map(({ id: _id, ...item }) => item) } : undefined,
        businessAttributes: attributeOptionIds?.length ? { create: [...new Set(attributeOptionIds)].map((attributeOptionId) => ({ attributeOptionId })) } : undefined,
        attributeValues: attributeValues?.length ? { create: attributeValues.map((value) => ({
          groupId: value.groupId,
          textValue: value.textValue ?? null,
          numberValue: value.numberValue ?? null,
          booleanValue: value.booleanValue ?? null,
        })) } : undefined,
      },
      include: { translations: true, gallery: true },
    });
    await ensureDefaultBusinessRoles(business.id, tx);
    return business;
  });

  await audit(req, { action: 'CREATE', entity: 'Business', entityId: created.id, after: normalize(created) });
  return created;
}

async function updateBusiness(id, data, req) {
  const existing = await prisma.business.findUnique({
    where: { id },
    include: { translations: true, businessAttributes: { select: { attributeOptionId: true } }, attributeValues: true },
  });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Business not found');

  const { core, translations, gallery, slideshows, attributeOptionIds, attributeValues } = splitData(data);
  const nextServiceTypeId = core.serviceTypeId || existing.serviceTypeId;
  if (translations) await assertLanguages([...new Set(translations.map((item) => item.lang))]);
  const nextAttributeOptionIds = Array.isArray(attributeOptionIds)
    ? attributeOptionIds
    : existing.businessAttributes.map((entry) => entry.attributeOptionId);
  const nextAttributeValues = Array.isArray(attributeValues) ? attributeValues : existing.attributeValues;
  await assertBusinessRelations(nextServiceTypeId, nextAttributeOptionIds, nextAttributeValues);
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
          const updatedGallery = await tx.businessGallery.updateMany({ where: { id: galleryId, businessId: id }, data: entryData });
          if (updatedGallery.count === 0) {
            throw new AppError(403, 'BUSINESS_SCOPE_FORBIDDEN', 'Gallery image does not belong to this business');
          }
          keepIds.push(galleryId);
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
          const updatedSlideshow = await tx.businessSlideshow.updateMany({ where: { id: slideshowId, businessId: id }, data: entryData });
          if (updatedSlideshow.count === 0) {
            throw new AppError(403, 'BUSINESS_SCOPE_FORBIDDEN', 'Slideshow image does not belong to this business');
          }
          keepIds.push(slideshowId);
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

    if (Array.isArray(attributeValues)) {
      await tx.businessAttributeValue.deleteMany({ where: { businessId: id } });
      if (attributeValues.length) {
        await tx.businessAttributeValue.createMany({
          data: attributeValues.map((value) => ({
            businessId: id,
            groupId: value.groupId,
            textValue: value.textValue ?? null,
            numberValue: value.numberValue ?? null,
            booleanValue: value.booleanValue ?? null,
          })),
        });
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
  getBusinessReadiness,
  createBusiness,
  updateBusiness,
  deleteBusiness,
  getNextDisplayOrder,
  transitionBusinessPublication,
};
