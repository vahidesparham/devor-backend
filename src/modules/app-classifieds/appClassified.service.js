const fs = require('fs/promises');
const path = require('path');
const { customAlphabet } = require('nanoid');
const { Prisma } = require('../../generated/prisma-client');
const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const uploadService = require('../uploads/upload.service');
const { debitAppWallet } = require('../app-wallets/appWalletLedger.service');
const {
  getCategoryPath,
  isCategoryPubliclySelectable,
  resolveInheritedClassifiedAttributes,
} = require('../classifieds-domain/classifiedCategoryHierarchy');
const {
  STATUSES,
  assertClassifiedTransition,
  classifiedPublicationExpiry,
} = require('../classifieds-domain/classifiedLifecycle');
const {
  evaluateClassifiedReadiness,
} = require('../classifieds-domain/classifiedReadiness');
const {
  DEFAULT_CLASSIFIED_SETTINGS,
  validateClassifiedSettings,
} = require('../classifieds-domain/classifiedSettings');

const makePublicCode = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 12);
const EDITABLE_STATUSES = new Set([STATUSES.DRAFT, STATUSES.REJECTED, STATUSES.PUBLISHED, STATUSES.PAUSED]);
const ACTIVE_LIMIT_STATUSES = [
  STATUSES.PENDING_REVIEW,
  STATUSES.PUBLISHED,
  STATUSES.PAUSED,
  STATUSES.SUSPENDED,
];
const DRAFT_LIMIT_STATUSES = [STATUSES.DRAFT, STATUSES.REJECTED];
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

function toNumber(value) {
  return value == null ? null : Number(value);
}

function mapCategory(category, currency = null) {
  if (!category) return null;
  return {
    id: category.id,
    parentId: category.parentId,
    code: category.code,
    slug: category.slug,
    title: category.title,
    image: category.image,
    color: category.color,
    isActive: category.isActive,
    allowAds: category.allowAds,
    postingFee: toNumber(category.postingFee) || 0,
    ...(currency ? { postingFeeCurrency: currency } : {}),
  };
}

function mapImage(image) {
  return {
    id: image.id,
    imageUrl: image.imageUrl,
    thumbnailUrl: image.thumbnailUrl,
    width: image.width,
    height: image.height,
    displayOrder: image.displayOrder,
    isCover: image.isCover,
    createdAt: image.createdAt,
  };
}

function mapAttribute(attribute) {
  return {
    id: attribute.id,
    categoryId: attribute.categoryId,
    code: attribute.code,
    title: attribute.title,
    type: attribute.type,
    unit: attribute.unit,
    placeholder: attribute.placeholder,
    isRequired: attribute.isRequired,
    showInFilters: attribute.showInFilters,
    displayOrder: attribute.displayOrder,
    minValue: toNumber(attribute.minValue),
    maxValue: toNumber(attribute.maxValue),
    minLength: attribute.minLength,
    maxLength: attribute.maxLength,
    options: (attribute.options || []).map((option) => ({
      id: option.id,
      code: option.code,
      title: option.title,
      image: option.image,
      color: option.color,
      displayOrder: option.displayOrder,
    })),
  };
}

function mapAttributeValue(value) {
  return {
    id: value.id,
    attributeId: value.attributeId,
    optionId: value.optionId,
    textValue: value.textValue,
    numberValue: toNumber(value.numberValue),
    booleanValue: value.booleanValue,
    attribute: value.attribute ? {
      id: value.attribute.id,
      code: value.attribute.code,
      title: value.attribute.title,
      type: value.attribute.type,
      unit: value.attribute.unit,
    } : undefined,
    option: value.option ? {
      id: value.option.id,
      code: value.option.code,
      title: value.option.title,
      image: value.option.image,
      color: value.option.color,
    } : null,
  };
}

function mapSummary(ad) {
  return {
    id: ad.id,
    publicCode: ad.publicCode,
    version: ad.version,
    title: ad.title,
    status: ad.status,
    priceType: ad.priceType,
    price: toNumber(ad.price),
    currency: ad.currency,
    category: mapCategory(ad.category),
    city: ad.city ? { id: ad.city.id, title: ad.city.title } : null,
    area: ad.area ? { id: ad.area.id, title: ad.area.title } : null,
    coverImage: ad.images?.[0] ? mapImage(ad.images[0]) : null,
    submittedAt: ad.submittedAt,
    publishedAt: ad.publishedAt,
    expiresAt: ad.expiresAt,
    soldAt: ad.soldAt,
    archivedAt: ad.archivedAt,
    postingPayment: {
      categoryFee: toNumber(ad.category?.postingFee) || 0,
      paidFee: toNumber(ad.postingFee) || 0,
      currency: ad.postingFeeCurrency || ad.currency,
      isPaid: Boolean(ad.postingFeePaidAt),
      paidAt: ad.postingFeePaidAt,
      transactionId: ad.postingFeeTransactionId ? String(ad.postingFeeTransactionId) : null,
    },
    createdAt: ad.createdAt,
    updatedAt: ad.updatedAt,
  };
}

function mapDetail(ad, resolvedAttributes = null) {
  return {
    ...mapSummary(ad),
    ownerType: ad.ownerType,
    country: ad.country ? { id: ad.country.id, code: ad.country.code, title: ad.country.title } : null,
    description: ad.description,
    contactName: ad.contactName,
    contactPhone: ad.contactPhone,
    allowPhone: ad.allowPhone,
    allowChat: ad.allowChat,
    latitude: toNumber(ad.latitude),
    longitude: toNumber(ad.longitude),
    locationPrecision: ad.locationPrecision,
    moderationNote: ad.moderationNote,
    images: (ad.images || []).map(mapImage),
    attributes: resolvedAttributes ? resolvedAttributes.map(mapAttribute) : undefined,
    attributeValues: (ad.attributeValues || []).map(mapAttributeValue),
    statusHistory: (ad.statusHistory || []).map((entry) => ({
      id: String(entry.id),
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      actorType: entry.actorType,
      actorId: entry.actorId,
      reasonCode: entry.reasonCode,
      note: entry.note,
      metadata: entry.metadata,
      createdAt: entry.createdAt,
    })),
  };
}

function detailInclude() {
  return {
    category: true,
    appUser: {
      select: {
        id: true,
        phone: true,
        firstName: true,
        lastName: true,
        avatar: true,
        isActive: true,
      },
    },
    country: { select: { id: true, code: true, title: true, isActive: true } },
    city: { select: { id: true, countryId: true, title: true, isActive: true } },
    area: { select: { id: true, cityId: true, title: true, isActive: true } },
    images: { orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }] },
    attributeValues: {
      orderBy: [{ attributeId: 'asc' }, { id: 'asc' }],
      include: {
        attribute: { select: { id: true, code: true, title: true, type: true, unit: true } },
        option: { select: { id: true, code: true, title: true, image: true, color: true } },
      },
    },
    statusHistory: { orderBy: { createdAt: 'desc' }, take: 50 },
  };
}

async function getSettings() {
  const row = await prisma.classifiedSetting.findUnique({ where: { id: 1 } });
  const settings = { ...DEFAULT_CLASSIFIED_SETTINGS, ...(row || {}) };
  const issues = validateClassifiedSettings(settings);
  if (issues.length) {
    throw new AppError(500, 'CLASSIFIED_SETTINGS_INVALID', 'Classified settings are invalid', { details: { issues } });
  }
  return settings;
}

async function getCategoryRows() {
  return prisma.classifiedCategory.findMany({
    select: {
      id: true,
      parentId: true,
      code: true,
      slug: true,
      title: true,
      description: true,
      image: true,
      color: true,
      displayOrder: true,
      isActive: true,
      allowAds: true,
      postingFee: true,
    },
    orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
  });
}

async function getSelectableCategory(categoryId) {
  const rows = await getCategoryRows();
  const category = rows.find((item) => item.id === Number(categoryId));
  if (!category) {
    throw new AppError(400, 'CLASSIFIED_CATEGORY_NOT_FOUND', 'Classified category not found', {
      errors: [{ path: 'categoryId', message: 'Classified category not found' }],
    });
  }
  if (!isCategoryPubliclySelectable(rows, category.id)) {
    throw new AppError(409, 'CLASSIFIED_CATEGORY_NOT_SELECTABLE', 'Selected category is inactive or does not accept ads', {
      errors: [{ path: 'categoryId', message: 'Select an active category that accepts ads' }],
    });
  }
  return { category, rows, path: getCategoryPath(rows, category.id) };
}

async function getResolvedAttributes(categoryId, categoryRows = null) {
  const rows = categoryRows || await getCategoryRows();
  const categoryPath = getCategoryPath(rows, categoryId);
  if (!categoryPath.length) throw new AppError(400, 'CLASSIFIED_CATEGORY_NOT_FOUND', 'Classified category not found');
  const categoryIds = categoryPath.map((item) => item.id);
  const attributes = await prisma.classifiedAttribute.findMany({
    where: { categoryId: { in: categoryIds }, isActive: true },
    orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    include: {
      options: {
        where: { isActive: true },
        orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
      },
    },
  });
  return resolveInheritedClassifiedAttributes(rows, attributes, categoryId);
}

async function assertLocation(countryId, cityId, areaId) {
  const [country, city, area] = await Promise.all([
    prisma.country.findFirst({ where: { id: countryId, isActive: true }, select: { id: true, code: true, title: true } }),
    prisma.city.findFirst({ where: { id: cityId, isActive: true }, select: { id: true, countryId: true, title: true } }),
    areaId
      ? prisma.area.findFirst({ where: { id: areaId, isActive: true }, select: { id: true, cityId: true, title: true } })
      : Promise.resolve(null),
  ]);
  const errors = [];
  if (!country) errors.push({ path: 'countryId', message: 'Active country not found' });
  if (!city) errors.push({ path: 'cityId', message: 'Active city not found' });
  else if (city.countryId !== countryId) errors.push({ path: 'cityId', message: 'City does not belong to the selected country' });
  if (areaId && !area) errors.push({ path: 'areaId', message: 'Active area not found' });
  else if (area && area.cityId !== cityId) errors.push({ path: 'areaId', message: 'Area does not belong to the selected city' });
  if (errors.length) {
    throw new AppError(400, 'CLASSIFIED_LOCATION_INVALID', 'Classified location is invalid', { errors });
  }
  return { country, city, area };
}

async function loadLocation(countryId, cityId, areaId) {
  const [country, city, area] = await Promise.all([
    prisma.country.findUnique({ where: { id: countryId }, select: { id: true, code: true, title: true, isActive: true } }),
    prisma.city.findUnique({ where: { id: cityId }, select: { id: true, countryId: true, title: true, isActive: true } }),
    areaId
      ? prisma.area.findUnique({ where: { id: areaId }, select: { id: true, cityId: true, title: true, isActive: true } })
      : Promise.resolve(null),
  ]);
  return { country, city, area };
}

function normalizePrice(priceType, price) {
  if (priceType === 'FREE' || priceType === 'CONTACT') return null;
  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
    throw new AppError(400, 'CLASSIFIED_PRICE_INVALID', 'A positive price is required', {
      errors: [{ path: 'price', message: 'A positive price is required for this price type' }],
    });
  }
  return numericPrice;
}

function assertContent(data, settings) {
  if (data.title != null && String(data.title).trim().length > settings.maxTitleLength) {
    throw new AppError(400, 'CLASSIFIED_TITLE_TOO_LONG', 'Classified title is too long', {
      errors: [{ path: 'title', message: `Title cannot exceed ${settings.maxTitleLength} characters` }],
    });
  }
  if (data.description != null && String(data.description).trim().length > settings.maxDescriptionLength) {
    throw new AppError(400, 'CLASSIFIED_DESCRIPTION_TOO_LONG', 'Classified description is too long', {
      errors: [{ path: 'description', message: `Description cannot exceed ${settings.maxDescriptionLength} characters` }],
    });
  }
  if (/<[^>]+>/.test(String(data.description || ''))) {
    throw new AppError(400, 'CLASSIFIED_DESCRIPTION_HTML_NOT_ALLOWED', 'Classified description must be plain text', {
      errors: [{ path: 'description', message: 'HTML is not allowed' }],
    });
  }
}

function assertContactSettings(data, settings) {
  if (data.allowPhone && !settings.allowPhoneContact) {
    throw new AppError(409, 'CLASSIFIED_PHONE_CONTACT_DISABLED', 'Phone contact is disabled');
  }
  if (data.allowChat && !settings.allowChatContact) {
    throw new AppError(409, 'CLASSIFIED_CHAT_DISABLED', 'Classified chat is not enabled');
  }
}

function assertEditable(ad) {
  if (!EDITABLE_STATUSES.has(ad.status)) {
    throw new AppError(409, 'CLASSIFIED_NOT_EDITABLE', `Classified ad cannot be edited while ${ad.status}`);
  }
}

function assertVersion(ad, expectedVersion) {
  if (ad.version !== Number(expectedVersion)) {
    throw new AppError(409, 'CLASSIFIED_VERSION_CONFLICT', 'Classified ad was changed by another request', {
      details: { expectedVersion: Number(expectedVersion), currentVersion: ad.version },
    });
  }
}

function mutationTransition(ad) {
  if (ad.status === STATUSES.REJECTED) {
    assertClassifiedTransition(ad.status, STATUSES.DRAFT);
    return {
      toStatus: STATUSES.DRAFT,
      data: { status: STATUSES.DRAFT, moderationNote: null, reviewedAt: null },
      reasonCode: 'OWNER_EDITED_REJECTED_AD',
    };
  }
  if (ad.status === STATUSES.PUBLISHED || ad.status === STATUSES.PAUSED) {
    assertClassifiedTransition(ad.status, STATUSES.PENDING_REVIEW);
    return {
      toStatus: STATUSES.PENDING_REVIEW,
      data: {
        status: STATUSES.PENDING_REVIEW,
        submittedAt: new Date(),
        reviewedAt: null,
        moderationNote: null,
      },
      reasonCode: 'OWNER_MATERIAL_EDIT',
    };
  }
  return null;
}

async function findOwnedAd(appUser, id) {
  const ad = await prisma.classifiedAd.findFirst({
    where: {
      id: Number(id),
      ownerType: 'APP_USER',
      appUserId: appUser.id,
      deletedAt: null,
    },
    include: detailInclude(),
  });
  if (!ad) throw new AppError(404, 'CLASSIFIED_NOT_FOUND', 'Classified ad not found');
  return ad;
}

async function buildReadiness(ad, overrides = {}) {
  const effectiveAd = { ...ad, ...(overrides.ad || {}) };
  const settings = overrides.settings || await getSettings();
  const categoryRows = await getCategoryRows();
  const category = categoryRows.find((item) => item.id === Number(effectiveAd.categoryId)) || null;
  const categoryPath = category ? getCategoryPath(categoryRows, category.id) : [];
  const attributes = category ? await getResolvedAttributes(category.id, categoryRows) : [];
  const location = await loadLocation(effectiveAd.countryId, effectiveAd.cityId, effectiveAd.areaId);
  return {
    result: evaluateClassifiedReadiness({
      settings,
      ad: effectiveAd,
      owner: effectiveAd.appUser || ad.appUser,
      category,
      categoryPath,
      attributes,
      values: overrides.values || ad.attributeValues || [],
      images: overrides.images || ad.images || [],
      country: location.country,
      city: location.city,
      area: location.area,
    }),
    settings,
    attributes,
  };
}

async function ensureActiveLimit(appUserId, settings, excludeId = null) {
  const count = await prisma.classifiedAd.count({
    where: {
      ownerType: 'APP_USER',
      appUserId,
      deletedAt: null,
      status: { in: ACTIVE_LIMIT_STATUSES },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  if (count >= settings.maxActiveAdsPerAppUser) {
    throw new AppError(409, 'CLASSIFIED_ACTIVE_LIMIT_REACHED', 'Active classified ad limit reached', {
      details: { limit: settings.maxActiveAdsPerAppUser, current: count },
    });
  }
}

async function nextPublicCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = `DV${makePublicCode()}`;
    const exists = await prisma.classifiedAd.findUnique({ where: { publicCode: code }, select: { id: true } });
    if (!exists) return code;
  }
  throw new AppError(500, 'CLASSIFIED_CODE_GENERATION_FAILED', 'Could not generate a public classified code');
}

async function getPostingConfig(appUser) {
  const settings = await getSettings();
  const [draftCount, activeCount] = await Promise.all([
    prisma.classifiedAd.count({
      where: { ownerType: 'APP_USER', appUserId: appUser.id, status: { in: DRAFT_LIMIT_STATUSES }, deletedAt: null },
    }),
    prisma.classifiedAd.count({
      where: { ownerType: 'APP_USER', appUserId: appUser.id, status: { in: ACTIVE_LIMIT_STATUSES }, deletedAt: null },
    }),
  ]);
  return {
    contentLanguage: settings.contentLanguage,
    currency: settings.currency,
    publicationDays: settings.publicationDays,
    imageLimits: { min: settings.minImagesPerAd, max: settings.maxImagesPerAd },
    adLimits: {
      maxActive: settings.maxActiveAdsPerAppUser,
      maxDrafts: settings.maxDraftAdsPerAppUser,
      activeCount,
      draftCount,
    },
    textLimits: {
      title: settings.maxTitleLength,
      description: settings.maxDescriptionLength,
    },
    contact: {
      allowPhone: settings.allowPhoneContact,
      allowChat: settings.allowChatContact,
    },
    requireModeration: settings.requireModeration,
  };
}

async function getCategoryAttributes(categoryId) {
  const { category, rows, path: categoryPath } = await getSelectableCategory(categoryId);
  const [attributes, settings] = await Promise.all([
    getResolvedAttributes(category.id, rows),
    getSettings(),
  ]);
  return {
    category: mapCategory(category, settings.currency),
    path: categoryPath.map((item) => mapCategory(item, settings.currency)),
    attributes: attributes.map(mapAttribute),
  };
}

async function listMyAds(appUser, query) {
  const where = {
    ownerType: 'APP_USER',
    appUserId: appUser.id,
    deletedAt: null,
  };
  if (query.status) where.status = query.status;
  if (query.q) {
    where.OR = [
      { title: { contains: query.q } },
      { publicCode: { contains: query.q } },
      { category: { title: { contains: query.q } } },
    ];
  }
  const skip = (query.page - 1) * query.pageSize;
  const [items, total] = await Promise.all([
    prisma.classifiedAd.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [{ [query.sortBy]: query.sortDir }, { id: 'desc' }],
      include: {
        category: true,
        city: { select: { id: true, title: true } },
        area: { select: { id: true, title: true } },
        images: {
          where: { isCover: true },
          orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
          take: 1,
        },
      },
    }),
    prisma.classifiedAd.count({ where }),
  ]);
  return {
    items: items.map(mapSummary),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      pageCount: Math.ceil(total / query.pageSize),
    },
  };
}

async function getMyAd(appUser, id) {
  const ad = await findOwnedAd(appUser, id);
  const attributes = await getResolvedAttributes(ad.categoryId);
  return mapDetail(ad, attributes);
}

async function createDraft(appUser, data) {
  const settings = await getSettings();
  const draftCount = await prisma.classifiedAd.count({
    where: {
      ownerType: 'APP_USER',
      appUserId: appUser.id,
      status: { in: DRAFT_LIMIT_STATUSES },
      deletedAt: null,
    },
  });
  if (draftCount >= settings.maxDraftAdsPerAppUser) {
    throw new AppError(409, 'CLASSIFIED_DRAFT_LIMIT_REACHED', 'Draft classified ad limit reached', {
      details: { limit: settings.maxDraftAdsPerAppUser, current: draftCount },
    });
  }

  await Promise.all([
    getSelectableCategory(data.categoryId),
    assertLocation(data.countryId, data.cityId, data.areaId),
  ]);
  assertContent(data, settings);
  const allowPhone = data.allowPhone ?? settings.allowPhoneContact;
  const allowChat = data.allowChat ?? false;
  assertContactSettings({ allowPhone, allowChat }, settings);
  const price = normalizePrice(data.priceType, data.price);
  const publicCode = await nextPublicCode();
  const created = await prisma.classifiedAd.create({
    data: {
      publicCode,
      categoryId: data.categoryId,
      ownerType: 'APP_USER',
      appUserId: appUser.id,
      businessId: null,
      countryId: data.countryId,
      cityId: data.cityId,
      areaId: data.areaId,
      title: data.title || '',
      description: data.description || '',
      priceType: data.priceType,
      price,
      currency: settings.currency,
      contactName: data.contactName,
      contactPhone: data.contactPhone || appUser.phone,
      allowPhone,
      allowChat,
      latitude: data.latitude,
      longitude: data.longitude,
      locationPrecision: data.locationPrecision,
      statusHistory: {
        create: {
          fromStatus: null,
          toStatus: STATUSES.DRAFT,
          actorType: 'APP_USER',
          actorId: String(appUser.id),
          reasonCode: 'OWNER_CREATED_DRAFT',
        },
      },
    },
    include: detailInclude(),
  });
  const attributes = await getResolvedAttributes(created.categoryId);
  return mapDetail(created, attributes);
}

async function updateMyAd(appUser, id, data) {
  const ad = await findOwnedAd(appUser, id);
  assertEditable(ad);
  assertVersion(ad, data.expectedVersion);
  const settings = await getSettings();
  const { expectedVersion, ...changes } = data;
  if (changes.categoryId && changes.categoryId !== ad.categoryId && ad.postingFeePaidAt) {
    throw new AppError(
      409,
      'CLASSIFIED_PAID_CATEGORY_CHANGE_NOT_ALLOWED',
      'Category cannot be changed after the posting fee has been settled',
    );
  }
  if (changes.categoryId && changes.categoryId !== ad.categoryId && ![STATUSES.DRAFT, STATUSES.REJECTED].includes(ad.status)) {
    throw new AppError(409, 'CLASSIFIED_CATEGORY_CHANGE_NOT_ALLOWED', 'Published or paused ads cannot change category');
  }

  const next = { ...ad, ...changes };
  await Promise.all([
    getSelectableCategory(next.categoryId),
    assertLocation(next.countryId, next.cityId, next.areaId),
  ]);
  assertContent(next, settings);
  assertContactSettings(next, settings);
  const nextPrice = normalizePrice(next.priceType, next.price);
  const transition = mutationTransition(ad);
  const updateData = {
    ...changes,
    price: nextPrice,
    version: { increment: 1 },
    ...(transition?.data || {}),
  };

  if (ad.status === STATUSES.PUBLISHED || ad.status === STATUSES.PAUSED) {
    const proposed = {
      ...next,
      price: nextPrice,
      status: transition.toStatus,
    };
    const readiness = await buildReadiness(ad, { ad: proposed, settings });
    if (!readiness.result.ready) {
      throw new AppError(409, 'CLASSIFIED_NOT_READY', 'Updated classified ad is not ready', {
        errors: readiness.result.issues.map((item) => ({ path: item.field, message: item.message, code: item.code })),
        details: readiness.result,
      });
    }
  }

  await prisma.$transaction(async (tx) => {
    const updated = await tx.classifiedAd.updateMany({
      where: { id: ad.id, appUserId: appUser.id, version: expectedVersion },
      data: updateData,
    });
    if (updated.count !== 1) {
      throw new AppError(409, 'CLASSIFIED_VERSION_CONFLICT', 'Classified ad was changed by another request');
    }
    if (changes.categoryId && changes.categoryId !== ad.categoryId) {
      await tx.classifiedAdAttributeValue.deleteMany({ where: { adId: ad.id } });
    }
    if (transition) {
      await tx.classifiedAdStatusHistory.create({
        data: {
          adId: ad.id,
          fromStatus: ad.status,
          toStatus: transition.toStatus,
          actorType: 'APP_USER',
          actorId: String(appUser.id),
          reasonCode: transition.reasonCode,
        },
      });
    }
  });
  return getMyAd(appUser, ad.id);
}

function typedRows(attributes, submittedValues) {
  const byId = new Map(attributes.map((attribute) => [attribute.id, attribute]));
  const rows = [];
  for (const input of submittedValues) {
    const attribute = byId.get(input.attributeId);
    if (!attribute) {
      throw new AppError(400, 'CLASSIFIED_ATTRIBUTE_NOT_AVAILABLE', 'Attribute is not available for this category', {
        errors: [{ path: `values.${input.attributeId}`, message: 'Attribute is not available for this category' }],
      });
    }
    const optionIds = [...new Set(input.optionIds || [])];
    const pathName = `attributes.${attribute.code}`;
    const populatedKinds = [
      optionIds.length > 0,
      input.textValue != null,
      input.numberValue != null,
      input.booleanValue != null,
    ].filter(Boolean).length;
    if (populatedKinds !== 1) {
      throw new AppError(400, 'CLASSIFIED_ATTRIBUTE_VALUE_SHAPE_INVALID', 'Attribute value has an invalid typed shape', {
        errors: [{ path: pathName, message: 'Send exactly one value matching the attribute type' }],
      });
    }
    if (attribute.type === 'SELECT' || attribute.type === 'MULTI_SELECT') {
      if (!optionIds.length || (attribute.type === 'SELECT' && optionIds.length !== 1)) {
        throw new AppError(400, 'CLASSIFIED_ATTRIBUTE_VALUE_INVALID', 'Selection attribute value is invalid', {
          errors: [{ path: pathName, message: attribute.type === 'SELECT' ? 'Select exactly one option' : 'Select at least one option' }],
        });
      }
      const validOptions = new Set((attribute.options || []).map((option) => option.id));
      if (optionIds.some((optionId) => !validOptions.has(optionId))) {
        throw new AppError(400, 'CLASSIFIED_ATTRIBUTE_OPTION_INVALID', 'Attribute option is invalid', {
          errors: [{ path: pathName, message: 'One or more options are inactive or belong to another attribute' }],
        });
      }
      rows.push(...optionIds.map((optionId) => ({ attributeId: attribute.id, optionId })));
      continue;
    }
    if (attribute.type === 'TEXT') {
      if (typeof input.textValue !== 'string' || !input.textValue.trim()) {
        throw new AppError(400, 'CLASSIFIED_ATTRIBUTE_VALUE_INVALID', 'Text attribute value is invalid', {
          errors: [{ path: pathName, message: 'Enter a text value' }],
        });
      }
      rows.push({ attributeId: attribute.id, textValue: input.textValue.trim() });
      continue;
    }
    if (attribute.type === 'NUMBER') {
      if (!Number.isFinite(Number(input.numberValue))) {
        throw new AppError(400, 'CLASSIFIED_ATTRIBUTE_VALUE_INVALID', 'Number attribute value is invalid', {
          errors: [{ path: pathName, message: 'Enter a valid number' }],
        });
      }
      rows.push({ attributeId: attribute.id, numberValue: Number(input.numberValue) });
      continue;
    }
    if (attribute.type === 'BOOLEAN') {
      if (typeof input.booleanValue !== 'boolean') {
        throw new AppError(400, 'CLASSIFIED_ATTRIBUTE_VALUE_INVALID', 'Boolean attribute value is invalid', {
          errors: [{ path: pathName, message: 'Choose true or false' }],
        });
      }
      rows.push({ attributeId: attribute.id, booleanValue: input.booleanValue });
    }
  }
  return rows;
}

async function saveAttributeValues(appUser, id, data) {
  const ad = await findOwnedAd(appUser, id);
  assertEditable(ad);
  assertVersion(ad, data.expectedVersion);
  const attributes = await getResolvedAttributes(ad.categoryId);
  const rows = typedRows(attributes, data.values);
  const transition = mutationTransition(ad);
  if (transition && [STATUSES.PUBLISHED, STATUSES.PAUSED].includes(ad.status)) {
    const readiness = await buildReadiness(ad, { values: rows });
    if (!readiness.result.ready) {
      throw new AppError(409, 'CLASSIFIED_NOT_READY', 'Updated classified attributes are not ready', {
        errors: readiness.result.issues.map((item) => ({ path: item.field, message: item.message, code: item.code })),
        details: readiness.result,
      });
    }
  }

  await prisma.$transaction(async (tx) => {
    const updated = await tx.classifiedAd.updateMany({
      where: { id: ad.id, appUserId: appUser.id, version: data.expectedVersion },
      data: { version: { increment: 1 }, ...(transition?.data || {}) },
    });
    if (updated.count !== 1) throw new AppError(409, 'CLASSIFIED_VERSION_CONFLICT', 'Classified ad was changed by another request');
    await tx.classifiedAdAttributeValue.deleteMany({ where: { adId: ad.id } });
    if (rows.length) {
      await tx.classifiedAdAttributeValue.createMany({
        data: rows.map((row) => ({ ...row, adId: ad.id })),
      });
    }
    if (transition) {
      await tx.classifiedAdStatusHistory.create({
        data: {
          adId: ad.id,
          fromStatus: ad.status,
          toStatus: transition.toStatus,
          actorType: 'APP_USER',
          actorId: String(appUser.id),
          reasonCode: transition.reasonCode,
        },
      });
    }
  });
  return getMyAd(appUser, ad.id);
}

function ensureImageFile(file) {
  if (!file) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
      errors: [{ path: 'image', message: 'Image file is required' }],
    });
  }
  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
    throw new AppError(400, 'CLASSIFIED_IMAGE_TYPE_INVALID', 'Unsupported classified image type', {
      errors: [{ path: 'image', message: 'Use JPEG, PNG, WebP, HEIC, or HEIF images' }],
    });
  }
}

function diskPathFromPublicUrl(url) {
  const normalized = String(url || '').replace(/\\/g, '/');
  if (!normalized.startsWith('/public/uploads/')) return null;
  const relative = normalized.slice('/public/'.length);
  const root = path.resolve(process.cwd(), 'public', 'uploads');
  const target = path.resolve(process.cwd(), 'public', relative);
  return target.startsWith(`${root}${path.sep}`) ? target : null;
}

async function removeUploadedFiles(urls) {
  await Promise.all((urls || []).map(async (url) => {
    const target = diskPathFromPublicUrl(url);
    if (!target) return;
    await fs.unlink(target).catch(() => {});
  }));
}

async function uploadAdImage(appUser, id, expectedVersion, file) {
  ensureImageFile(file);
  const ad = await findOwnedAd(appUser, id);
  assertEditable(ad);
  assertVersion(ad, expectedVersion);
  const settings = await getSettings();
  if (ad.images.length >= settings.maxImagesPerAd) {
    throw new AppError(409, 'CLASSIFIED_IMAGE_LIMIT_EXCEEDED', 'Classified image limit reached', {
      details: { limit: settings.maxImagesPerAd, current: ad.images.length },
    });
  }

  const uploaded = await uploadService.uploadImage({
    file,
    code: 'classified_ad_image',
    folderName: `classifieds/${appUser.id}/${ad.publicCode.toLowerCase()}`,
    skipCrop: true,
  });
  const transition = mutationTransition(ad);
  const proposedImage = {
    id: -1,
    imageUrl: uploaded.imageUrl,
    thumbnailUrl: uploaded.thumbnailUrl,
    width: uploaded.width,
    height: uploaded.height,
  };
  if (transition && [STATUSES.PUBLISHED, STATUSES.PAUSED].includes(ad.status)) {
    const readiness = await buildReadiness(ad, { images: [...ad.images, proposedImage], settings });
    if (!readiness.result.ready) {
      await removeUploadedFiles([uploaded.imageUrl, uploaded.thumbnailUrl]);
      throw new AppError(409, 'CLASSIFIED_NOT_READY', 'Updated classified images are not ready', {
        errors: readiness.result.issues.map((item) => ({ path: item.field, message: item.message, code: item.code })),
        details: readiness.result,
      });
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.classifiedAd.updateMany({
        where: { id: ad.id, appUserId: appUser.id, version: Number(expectedVersion) },
        data: { version: { increment: 1 }, ...(transition?.data || {}) },
      });
      if (updated.count !== 1) throw new AppError(409, 'CLASSIFIED_VERSION_CONFLICT', 'Classified ad was changed by another request');
      const maxOrder = ad.images.reduce((max, image) => Math.max(max, image.displayOrder || 0), 0);
      await tx.classifiedAdImage.create({
        data: {
          adId: ad.id,
          imageUrl: uploaded.imageUrl,
          thumbnailUrl: uploaded.thumbnailUrl,
          width: uploaded.width,
          height: uploaded.height,
          displayOrder: maxOrder + 10,
          isCover: ad.images.length === 0,
        },
      });
      if (transition) {
        await tx.classifiedAdStatusHistory.create({
          data: {
            adId: ad.id,
            fromStatus: ad.status,
            toStatus: transition.toStatus,
            actorType: 'APP_USER',
            actorId: String(appUser.id),
            reasonCode: transition.reasonCode,
          },
        });
      }
    });
  } catch (error) {
    await removeUploadedFiles([uploaded.imageUrl, uploaded.thumbnailUrl]);
    throw error;
  }
  return getMyAd(appUser, ad.id);
}

async function reorderAdImages(appUser, id, data) {
  const ad = await findOwnedAd(appUser, id);
  assertEditable(ad);
  assertVersion(ad, data.expectedVersion);
  const currentIds = ad.images.map((image) => image.id).sort((a, b) => a - b);
  const submittedIds = [...data.imageIds].sort((a, b) => a - b);
  if (currentIds.length !== submittedIds.length || currentIds.some((value, index) => value !== submittedIds[index])) {
    throw new AppError(400, 'CLASSIFIED_IMAGE_ORDER_INVALID', 'Image order must contain every ad image exactly once', {
      errors: [{ path: 'imageIds', message: 'Image order must contain every ad image exactly once' }],
    });
  }
  const transition = mutationTransition(ad);
  if (transition && [STATUSES.PUBLISHED, STATUSES.PAUSED].includes(ad.status)) {
    const readiness = await buildReadiness(ad);
    if (!readiness.result.ready) {
      throw new AppError(409, 'CLASSIFIED_NOT_READY', 'Classified ad is not ready', { details: readiness.result });
    }
  }
  await prisma.$transaction(async (tx) => {
    const updated = await tx.classifiedAd.updateMany({
      where: { id: ad.id, appUserId: appUser.id, version: data.expectedVersion },
      data: { version: { increment: 1 }, ...(transition?.data || {}) },
    });
    if (updated.count !== 1) throw new AppError(409, 'CLASSIFIED_VERSION_CONFLICT', 'Classified ad was changed by another request');
    for (let index = 0; index < data.imageIds.length; index += 1) {
      await tx.classifiedAdImage.update({
        where: { id: data.imageIds[index] },
        data: { displayOrder: (index + 1) * 10, isCover: index === 0 },
      });
    }
    if (transition) {
      await tx.classifiedAdStatusHistory.create({
        data: {
          adId: ad.id,
          fromStatus: ad.status,
          toStatus: transition.toStatus,
          actorType: 'APP_USER',
          actorId: String(appUser.id),
          reasonCode: transition.reasonCode,
        },
      });
    }
  });
  return getMyAd(appUser, ad.id);
}

async function deleteAdImage(appUser, id, imageId, expectedVersion) {
  const ad = await findOwnedAd(appUser, id);
  assertEditable(ad);
  assertVersion(ad, expectedVersion);
  const image = ad.images.find((item) => item.id === Number(imageId));
  if (!image) throw new AppError(404, 'CLASSIFIED_IMAGE_NOT_FOUND', 'Classified image not found');
  const remaining = ad.images.filter((item) => item.id !== image.id);
  const transition = mutationTransition(ad);
  if (transition && [STATUSES.PUBLISHED, STATUSES.PAUSED].includes(ad.status)) {
    const readiness = await buildReadiness(ad, { images: remaining });
    if (!readiness.result.ready) {
      throw new AppError(409, 'CLASSIFIED_NOT_READY', 'Deleting this image would make the ad incomplete', {
        errors: readiness.result.issues.map((item) => ({ path: item.field, message: item.message, code: item.code })),
        details: readiness.result,
      });
    }
  }
  await prisma.$transaction(async (tx) => {
    const updated = await tx.classifiedAd.updateMany({
      where: { id: ad.id, appUserId: appUser.id, version: Number(expectedVersion) },
      data: { version: { increment: 1 }, ...(transition?.data || {}) },
    });
    if (updated.count !== 1) throw new AppError(409, 'CLASSIFIED_VERSION_CONFLICT', 'Classified ad was changed by another request');
    await tx.classifiedAdImage.delete({ where: { id: image.id } });
    for (let index = 0; index < remaining.length; index += 1) {
      await tx.classifiedAdImage.update({
        where: { id: remaining[index].id },
        data: { displayOrder: (index + 1) * 10, isCover: index === 0 },
      });
    }
    if (transition) {
      await tx.classifiedAdStatusHistory.create({
        data: {
          adId: ad.id,
          fromStatus: ad.status,
          toStatus: transition.toStatus,
          actorType: 'APP_USER',
          actorId: String(appUser.id),
          reasonCode: transition.reasonCode,
        },
      });
    }
  });
  await removeUploadedFiles([image.imageUrl, image.thumbnailUrl]);
  return getMyAd(appUser, ad.id);
}

async function getMyAdReadiness(appUser, id) {
  const ad = await findOwnedAd(appUser, id);
  const readiness = await buildReadiness(ad);
  return {
    adId: ad.id,
    version: ad.version,
    status: ad.status,
    ready: readiness.result.ready,
    issues: readiness.result.issues,
  };
}

async function transitionAd(appUser, id, expectedVersion, options) {
  const ad = await findOwnedAd(appUser, id);
  assertVersion(ad, expectedVersion);
  if (!options.from.includes(ad.status)) {
    throw new AppError(409, 'CLASSIFIED_TRANSITION_NOT_ALLOWED', `Action is not allowed while classified ad is ${ad.status}`);
  }
  assertClassifiedTransition(ad.status, options.to);
  const settings = await getSettings();
  if (options.enforceActiveLimit) await ensureActiveLimit(appUser.id, settings, ad.id);
  if (options.requireReady) {
    const readiness = await buildReadiness(ad, { settings });
    if (!readiness.result.ready) {
      throw new AppError(409, 'CLASSIFIED_NOT_READY', 'Classified ad is not ready for this action', {
        errors: readiness.result.issues.map((item) => ({ path: item.field, message: item.message, code: item.code })),
        details: readiness.result,
      });
    }
  }
  if (options.assert) options.assert(ad, settings);

  const now = new Date();
  let finalStatus = options.to;
  const historyRows = [{
    adId: ad.id,
    fromStatus: ad.status,
    toStatus: options.to,
    actorType: 'APP_USER',
    actorId: String(appUser.id),
    reasonCode: options.reasonCode,
  }];
  const statusData = { status: options.to, version: { increment: 1 }, ...(options.data?.(ad, settings, now) || {}) };

  if (options.autoPublish && !settings.requireModeration) {
    assertClassifiedTransition(options.to, STATUSES.PUBLISHED);
    finalStatus = STATUSES.PUBLISHED;
    statusData.status = STATUSES.PUBLISHED;
    statusData.reviewedAt = now;
    statusData.publishedAt = now;
    statusData.expiresAt = classifiedPublicationExpiry(now, settings.publicationDays);
    historyRows.push({
      adId: ad.id,
      fromStatus: options.to,
      toStatus: STATUSES.PUBLISHED,
      actorType: 'SYSTEM',
      actorId: null,
      reasonCode: 'MODERATION_DISABLED_AUTO_PUBLISH',
    });
  }

  await prisma.$transaction(async (tx) => {
    const updated = await tx.classifiedAd.updateMany({
      where: { id: ad.id, appUserId: appUser.id, version: Number(expectedVersion) },
      data: statusData,
    });
    if (updated.count !== 1) throw new AppError(409, 'CLASSIFIED_VERSION_CONFLICT', 'Classified ad was changed by another request');

    if (options.settlePostingFee && !ad.postingFeePaidAt) {
      const postingFee = new Prisma.Decimal(ad.category.postingFee || 0);
      let postingFeeTransactionId = null;

      if (postingFee.isPositive()) {
        const payment = await debitAppWallet(tx, {
          appUserId: appUser.id,
          amount: postingFee,
          currency: settings.currency,
          reason: 'Classified ad posting fee',
          note: `${ad.publicCode} - ${ad.category.title}`,
          referenceType: 'CLASSIFIED_AD_POSTING_FEE',
          referenceId: ad.publicCode,
        });
        postingFeeTransactionId = payment.transaction.id;
      }

      await tx.classifiedAd.update({
        where: { id: ad.id },
        data: {
          postingFee,
          postingFeeCurrency: settings.currency,
          postingFeePaidAt: now,
          postingFeeTransactionId,
        },
      });
    }

    await tx.classifiedAdStatusHistory.createMany({ data: historyRows });
  });
  const result = await getMyAd(appUser, ad.id);
  return { ...result, status: finalStatus };
}

function submitMyAd(appUser, id, expectedVersion) {
  return transitionAd(appUser, id, expectedVersion, {
    from: [STATUSES.DRAFT, STATUSES.REJECTED],
    to: STATUSES.PENDING_REVIEW,
    requireReady: true,
    enforceActiveLimit: true,
    settlePostingFee: true,
    autoPublish: true,
    reasonCode: 'OWNER_SUBMITTED',
    data: (_ad, _settings, now) => ({
      submittedAt: now,
      reviewedAt: null,
      moderationNote: null,
    }),
  });
}

function pauseMyAd(appUser, id, expectedVersion) {
  return transitionAd(appUser, id, expectedVersion, {
    from: [STATUSES.PUBLISHED],
    to: STATUSES.PAUSED,
    reasonCode: 'OWNER_PAUSED',
  });
}

function resumeMyAd(appUser, id, expectedVersion) {
  return transitionAd(appUser, id, expectedVersion, {
    from: [STATUSES.PAUSED],
    to: STATUSES.PUBLISHED,
    requireReady: true,
    reasonCode: 'OWNER_RESUMED',
    assert(ad) {
      if (!ad.expiresAt || new Date(ad.expiresAt).getTime() <= Date.now()) {
        throw new AppError(409, 'CLASSIFIED_EXPIRED', 'Expired classified ads must be renewed');
      }
    },
  });
}

function markMyAdSold(appUser, id, expectedVersion) {
  return transitionAd(appUser, id, expectedVersion, {
    from: [STATUSES.PUBLISHED],
    to: STATUSES.SOLD,
    reasonCode: 'OWNER_MARKED_SOLD',
    data: (_ad, _settings, now) => ({ soldAt: now }),
  });
}

function renewMyAd(appUser, id, expectedVersion) {
  return transitionAd(appUser, id, expectedVersion, {
    from: [STATUSES.EXPIRED],
    to: STATUSES.PENDING_REVIEW,
    requireReady: true,
    enforceActiveLimit: true,
    autoPublish: true,
    reasonCode: 'OWNER_RENEWED',
    data: (_ad, _settings, now) => ({
      submittedAt: now,
      reviewedAt: null,
      moderationNote: null,
      publishedAt: null,
      expiresAt: null,
      soldAt: null,
    }),
  });
}

function archiveMyAd(appUser, id, expectedVersion) {
  return transitionAd(appUser, id, expectedVersion, {
    from: [
      STATUSES.DRAFT,
      STATUSES.PENDING_REVIEW,
      STATUSES.REJECTED,
      STATUSES.PUBLISHED,
      STATUSES.PAUSED,
      STATUSES.SOLD,
      STATUSES.EXPIRED,
      STATUSES.SUSPENDED,
    ],
    to: STATUSES.ARCHIVED,
    reasonCode: 'OWNER_ARCHIVED',
    data: (_ad, _settings, now) => ({ archivedAt: now }),
  });
}

module.exports = {
  archiveMyAd,
  createDraft,
  deleteAdImage,
  getCategoryAttributes,
  getMyAd,
  getMyAdReadiness,
  getPostingConfig,
  listMyAds,
  markMyAdSold,
  pauseMyAd,
  renewMyAd,
  reorderAdImages,
  resumeMyAd,
  saveAttributeValues,
  submitMyAd,
  updateMyAd,
  uploadAdImage,
};
