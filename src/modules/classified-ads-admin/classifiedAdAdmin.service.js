const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const { audit } = require('../../shared/audit/audit');
const {
  getCategoryPath,
  resolveInheritedClassifiedAttributes,
} = require('../classifieds-domain/classifiedCategoryHierarchy');
const {
  STATUSES,
  assertClassifiedTransition,
  classifiedPublicationExpiry,
} = require('../classifieds-domain/classifiedLifecycle');
const { evaluateClassifiedReadiness } = require('../classifieds-domain/classifiedReadiness');
const { DEFAULT_CLASSIFIED_SETTINGS } = require('../classifieds-domain/classifiedSettings');

const OPEN_REPORT_STATUSES = ['OPEN', 'REVIEWING'];

function toNumber(value) {
  return value == null ? null : Number(value);
}

function displayName(entity, fallback) {
  if (!entity) return fallback;
  const name = [entity.firstName, entity.lastName].filter(Boolean).join(' ').trim();
  return name || entity.title || entity.phone || entity.slug || fallback;
}

function mapOwner(ad) {
  if (ad.ownerType === 'APP_USER') {
    return {
      type: 'APP_USER',
      id: ad.appUser?.id || ad.appUserId,
      displayName: displayName(ad.appUser, 'App user'),
      phone: ad.appUser?.phone || null,
      email: ad.appUser?.email || null,
      avatar: ad.appUser?.avatar || null,
      isActive: ad.appUser?.isActive === true,
      wallet: ad.appUser?.wallet ? {
        balance: toNumber(ad.appUser.wallet.balance) || 0,
        currency: ad.appUser.wallet.currency,
      } : null,
    };
  }
  return {
    type: 'BUSINESS',
    id: ad.business?.id || ad.businessId,
    displayName: displayName(ad.business, 'Business'),
    phone: ad.business?.phone || null,
    email: ad.business?.email || null,
    avatar: ad.business?.logoImage || null,
    isActive: ad.business?.isActive === true,
    wallet: null,
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
  };
}

function mapPayment(ad) {
  return {
    categoryFee: toNumber(ad.category?.postingFee) || 0,
    paidFee: toNumber(ad.postingFee) || 0,
    currency: ad.postingFeeCurrency || ad.currency || 'TJS',
    isPaid: Boolean(ad.postingFeePaidAt),
    paidAt: ad.postingFeePaidAt,
    transaction: ad.postingFeeTransaction ? {
      id: String(ad.postingFeeTransaction.id),
      amount: toNumber(ad.postingFeeTransaction.amount),
      balanceBefore: toNumber(ad.postingFeeTransaction.balanceBefore),
      balanceAfter: toNumber(ad.postingFeeTransaction.balanceAfter),
      createdAt: ad.postingFeeTransaction.createdAt,
      referenceType: ad.postingFeeTransaction.referenceType,
      referenceId: ad.postingFeeTransaction.referenceId,
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
    category: ad.category ? {
      id: ad.category.id,
      title: ad.category.title,
      code: ad.category.code,
      color: ad.category.color,
      postingFee: toNumber(ad.category.postingFee) || 0,
    } : null,
    city: ad.city ? { id: ad.city.id, title: ad.city.title } : null,
    area: ad.area ? { id: ad.area.id, title: ad.area.title } : null,
    owner: mapOwner(ad),
    coverImage: ad.images?.[0] ? mapImage(ad.images[0]) : null,
    reportCount: ad._count?.reports ?? ad.reportCount ?? 0,
    viewCount: ad.viewCount,
    postingPayment: mapPayment(ad),
    submittedAt: ad.submittedAt,
    publishedAt: ad.publishedAt,
    expiresAt: ad.expiresAt,
    createdAt: ad.createdAt,
    updatedAt: ad.updatedAt,
  };
}

function listInclude() {
  return {
    category: { select: { id: true, code: true, title: true, color: true, postingFee: true } },
    city: { select: { id: true, title: true } },
    area: { select: { id: true, title: true } },
    appUser: {
      select: {
        id: true,
        phone: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        isActive: true,
      },
    },
    business: {
      select: {
        id: true,
        slug: true,
        phone: true,
        email: true,
        logoImage: true,
        isActive: true,
      },
    },
    images: {
      where: { isCover: true },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
      take: 1,
    },
    _count: { select: { reports: true } },
  };
}

function detailInclude() {
  return {
    category: true,
    country: true,
    city: true,
    area: true,
    appUser: {
      include: {
        wallet: { select: { balance: true, currency: true } },
      },
    },
    business: true,
    images: { orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }] },
    attributeValues: {
      orderBy: [{ attributeId: 'asc' }, { id: 'asc' }],
      include: {
        attribute: { select: { id: true, code: true, title: true, type: true, unit: true } },
        option: { select: { id: true, code: true, title: true, image: true, color: true } },
      },
    },
    statusHistory: {
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    },
    reports: {
      where: { status: { in: OPEN_REPORT_STATUSES } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 20,
      include: {
        reporter: { select: { id: true, phone: true, firstName: true, lastName: true } },
      },
    },
    postingFeeTransaction: true,
    _count: { select: { reports: true, favorites: true } },
  };
}

function mapDetail(ad, categoryPath, readiness) {
  return {
    ...mapSummary(ad),
    description: ad.description,
    contactName: ad.contactName,
    contactPhone: ad.contactPhone,
    allowPhone: ad.allowPhone,
    allowChat: ad.allowChat,
    latitude: toNumber(ad.latitude),
    longitude: toNumber(ad.longitude),
    locationPrecision: ad.locationPrecision,
    moderationNote: ad.moderationNote,
    country: ad.country ? { id: ad.country.id, code: ad.country.code, title: ad.country.title } : null,
    categoryPath: categoryPath.map((item) => ({ id: item.id, code: item.code, title: item.title })),
    images: ad.images.map(mapImage),
    attributeValues: ad.attributeValues.map((value) => ({
      id: value.id,
      attributeId: value.attributeId,
      optionId: value.optionId,
      textValue: value.textValue,
      numberValue: toNumber(value.numberValue),
      booleanValue: value.booleanValue,
      attribute: value.attribute,
      option: value.option,
    })),
    reports: ad.reports.map((report) => ({
      id: report.id,
      version: report.version,
      reasonCode: report.reasonCode,
      description: report.description,
      status: report.status,
      reporter: report.reporter ? {
        id: report.reporter.id,
        displayName: displayName(report.reporter, report.reporter.phone),
        phone: report.reporter.phone,
      } : null,
      createdAt: report.createdAt,
    })),
    statusHistory: ad.statusHistory.map((entry) => ({
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
    favoriteCount: ad._count.favorites,
    reportCount: ad._count.reports,
    readiness,
  };
}

function buildWhere(query) {
  const where = { deletedAt: null };
  if (query.status) where.status = query.status;
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.cityId) where.cityId = query.cityId;
  if (query.appUserId) where.appUserId = query.appUserId;
  if (query.ownerType) where.ownerType = query.ownerType;
  if (query.reportState === 'OPEN') {
    where.reports = { some: { status: { in: OPEN_REPORT_STATUSES } } };
  } else if (query.reportState === 'ANY') {
    where.reports = { some: {} };
  } else if (query.reportState === 'NONE') {
    where.reports = { none: {} };
  }
  if (query.submittedFrom || query.submittedTo) {
    where.submittedAt = {
      ...(query.submittedFrom ? { gte: query.submittedFrom } : {}),
      ...(query.submittedTo ? { lte: query.submittedTo } : {}),
    };
  }
  if (query.q) {
    where.OR = [
      { title: { contains: query.q } },
      { publicCode: { contains: query.q } },
      { contactPhone: { contains: query.q } },
      { category: { title: { contains: query.q } } },
      { appUser: { phone: { contains: query.q } } },
      { appUser: { firstName: { contains: query.q } } },
      { appUser: { lastName: { contains: query.q } } },
    ];
  }
  return where;
}

async function listClassifiedAds(query) {
  const where = buildWhere(query);
  const skip = (query.page - 1) * query.pageSize;
  const nullableSort = ['submittedAt', 'publishedAt', 'expiresAt'].includes(query.sortBy);
  const [items, total] = await Promise.all([
    prisma.classifiedAd.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [
        { [query.sortBy]: nullableSort ? { sort: query.sortDir, nulls: 'last' } : query.sortDir },
        { id: 'desc' },
      ],
      include: listInclude(),
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

async function getModerationStats() {
  const [statusRows, reportRows, oldestPending] = await Promise.all([
    prisma.classifiedAd.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.classifiedReport.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.classifiedAd.findFirst({
      where: { status: STATUSES.PENDING_REVIEW, deletedAt: null },
      orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }],
      select: { submittedAt: true },
    }),
  ]);
  return {
    byStatus: Object.fromEntries(statusRows.map((row) => [row.status, row._count._all])),
    reportsByStatus: Object.fromEntries(reportRows.map((row) => [row.status, row._count._all])),
    pendingCount: statusRows.find((row) => row.status === STATUSES.PENDING_REVIEW)?._count._all || 0,
    openReportCount: reportRows
      .filter((row) => OPEN_REPORT_STATUSES.includes(row.status))
      .reduce((sum, row) => sum + row._count._all, 0),
    oldestPendingAt: oldestPending?.submittedAt || null,
  };
}

async function loadReadiness(ad) {
  const [settingsRow, categoryRows] = await Promise.all([
    prisma.classifiedSetting.findUnique({ where: { id: 1 } }),
    prisma.classifiedCategory.findMany({
      select: { id: true, parentId: true, code: true, title: true, isActive: true, allowAds: true },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    }),
  ]);
  const settings = { ...DEFAULT_CLASSIFIED_SETTINGS, ...(settingsRow || {}) };
  const categoryPath = getCategoryPath(categoryRows, ad.categoryId);
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
  const effectiveAttributes = resolveInheritedClassifiedAttributes(categoryRows, attributes, ad.categoryId);
  const readiness = evaluateClassifiedReadiness({
    settings,
    ad,
    owner: ad.ownerType === 'APP_USER' ? ad.appUser : ad.business,
    category: categoryRows.find((item) => item.id === ad.categoryId) || null,
    categoryPath,
    attributes: effectiveAttributes,
    values: ad.attributeValues,
    images: ad.images,
    country: ad.country,
    city: ad.city,
    area: ad.area,
  });
  return { readiness, categoryPath, settings };
}

async function findClassifiedAd(id) {
  const ad = await prisma.classifiedAd.findFirst({
    where: { id: Number(id), deletedAt: null },
    include: detailInclude(),
  });
  if (!ad) throw new AppError(404, 'CLASSIFIED_NOT_FOUND', 'Classified ad not found');
  return ad;
}

async function getClassifiedAdById(id) {
  const ad = await findClassifiedAd(id);
  const context = await loadReadiness(ad);
  return mapDetail(ad, context.categoryPath, context.readiness);
}

function assertVersion(ad, expectedVersion) {
  if (ad.version !== Number(expectedVersion)) {
    throw new AppError(409, 'CLASSIFIED_VERSION_CONFLICT', 'Classified ad was changed by another request');
  }
}

async function moderateClassifiedAd(id, data, req, options) {
  const ad = await findClassifiedAd(id);
  assertVersion(ad, data.expectedVersion);
  if (!options.from.includes(ad.status)) {
    throw new AppError(409, 'CLASSIFIED_TRANSITION_NOT_ALLOWED', `Action is not allowed while classified ad is ${ad.status}`);
  }
  assertClassifiedTransition(ad.status, options.to);

  let readiness = null;
  let settings = null;
  if (options.requireReady) {
    const context = await loadReadiness(ad);
    readiness = context.readiness;
    settings = context.settings;
    if (!readiness.ready) {
      throw new AppError(409, 'CLASSIFIED_NOT_READY', 'Classified ad is not ready for publication', {
        errors: readiness.issues.map((item) => ({ path: item.field, message: item.message, code: item.code })),
      });
    }
  }
  if (options.assert) options.assert(ad);

  const now = new Date();
  const updateData = {
    status: options.to,
    version: { increment: 1 },
    ...(options.data?.(ad, data, now, settings) || {}),
  };

  await prisma.$transaction(async (tx) => {
    const updated = await tx.classifiedAd.updateMany({
      where: { id: ad.id, version: Number(data.expectedVersion), deletedAt: null },
      data: updateData,
    });
    if (updated.count !== 1) {
      throw new AppError(409, 'CLASSIFIED_VERSION_CONFLICT', 'Classified ad was changed by another request');
    }
    await tx.classifiedAdStatusHistory.create({
      data: {
        adId: ad.id,
        fromStatus: ad.status,
        toStatus: options.to,
        actorType: 'ADMIN',
        actorId: String(req.admin.id),
        reasonCode: options.reasonCode,
        note: data.note || null,
        metadata: readiness ? { readinessChecked: true } : undefined,
      },
    });
    await audit(req, {
      action: 'UPDATE',
      entity: 'ClassifiedAd',
      entityId: ad.id,
      before: { status: ad.status, version: ad.version, moderationNote: ad.moderationNote },
      after: { status: options.to, version: ad.version + 1, moderationNote: updateData.moderationNote ?? ad.moderationNote },
      details: { reasonCode: options.reasonCode, note: data.note || null },
    }, tx);
  });
  return getClassifiedAdById(ad.id);
}

function approveClassifiedAd(id, data, req) {
  return moderateClassifiedAd(id, data, req, {
    from: [STATUSES.PENDING_REVIEW],
    to: STATUSES.PUBLISHED,
    requireReady: true,
    reasonCode: 'ADMIN_APPROVED',
    data: (_ad, _data, now, settings) => ({
      reviewedAt: now,
      publishedAt: now,
      expiresAt: classifiedPublicationExpiry(now, settings.publicationDays),
      moderationNote: null,
      archivedAt: null,
    }),
  });
}

function rejectClassifiedAd(id, data, req) {
  return moderateClassifiedAd(id, data, req, {
    from: [STATUSES.PENDING_REVIEW],
    to: STATUSES.REJECTED,
    reasonCode: 'ADMIN_REJECTED',
    data: (_ad, action, now) => ({
      reviewedAt: now,
      publishedAt: null,
      expiresAt: null,
      moderationNote: action.note,
    }),
  });
}

function suspendClassifiedAd(id, data, req) {
  return moderateClassifiedAd(id, data, req, {
    from: [STATUSES.PUBLISHED, STATUSES.PAUSED],
    to: STATUSES.SUSPENDED,
    reasonCode: 'ADMIN_SUSPENDED',
    data: (_ad, action, now) => ({
      reviewedAt: now,
      moderationNote: action.note,
    }),
  });
}

function restoreClassifiedAd(id, data, req) {
  return moderateClassifiedAd(id, data, req, {
    from: [STATUSES.SUSPENDED],
    to: STATUSES.PUBLISHED,
    requireReady: true,
    reasonCode: 'ADMIN_RESTORED',
    assert(ad) {
      if (!ad.expiresAt || new Date(ad.expiresAt).getTime() <= Date.now()) {
        throw new AppError(409, 'CLASSIFIED_RESTORE_EXPIRED', 'Expired classified ads cannot be restored');
      }
    },
    data: (_ad, _action, now) => ({
      reviewedAt: now,
      moderationNote: null,
    }),
  });
}

function archiveClassifiedAd(id, data, req) {
  return moderateClassifiedAd(id, data, req, {
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
    reasonCode: 'ADMIN_ARCHIVED',
    data: (_ad, action, now) => ({
      archivedAt: now,
      moderationNote: action.note || null,
    }),
  });
}

module.exports = {
  approveClassifiedAd,
  archiveClassifiedAd,
  getClassifiedAdById,
  getModerationStats,
  listClassifiedAds,
  rejectClassifiedAd,
  restoreClassifiedAd,
  suspendClassifiedAd,
};
