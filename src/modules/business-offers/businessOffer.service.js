const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const { audit } = require('../../shared/audit/audit');
const {
  getEffectiveOfferStatus,
  calculateDiscountedPrice,
  scopesConflict,
} = require('./businessOffer.domain');

async function assertBusiness(id) {
  const business = await prisma.business.findUnique({ where: { id }, select: { id: true } });
  if (!business) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
      errors: [{ path: 'businessId', message: 'Business not found' }],
    });
  }
}

async function assertLanguages(codes) {
  const existing = await prisma.language.findMany({
    where: { code: { in: codes }, isActive: true },
    select: { code: true },
  });
  const available = new Set(existing.map((item) => item.code));
  const missing = codes.filter((code) => !available.has(code));
  if (missing.length) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
      errors: missing.map((code) => ({
        path: 'translations.lang',
        message: `Language "${code}" is not available`,
      })),
    });
  }
}

async function resolveSelectedLang(lang) {
  if (lang) return lang;
  const fallback = await prisma.language.findFirst({
    where: { isActive: true },
    orderBy: [{ isDefault: 'desc' }, { code: 'asc' }],
    select: { code: true },
  });
  return fallback?.code || 'en';
}

function chooseTitle(translations, fallback = '') {
  return translations?.[0]?.title || fallback || '';
}

function normalizeTargetOffering(offering, discountPercent) {
  if (!offering) return null;
  const basePrice = offering.basePrice === null || offering.basePrice === undefined
    ? null
    : Number(offering.basePrice);
  const selectedTranslation = offering.translations?.[0] || null;
  return {
    id: offering.id,
    businessId: offering.businessId,
    categoryId: offering.categoryId,
    title: selectedTranslation?.title || offering.title,
    image: offering.image,
    basePrice,
    offerPrice: calculateDiscountedPrice(basePrice, discountPercent),
    isActive: offering.isActive,
    isUnavailable: offering.isUnavailable,
  };
}

function normalizeOffer(item, now = new Date()) {
  if (!item) return item;
  const selectedTranslation = item.selectedTranslation || item.translations?.[0] || null;
  const selectedBusinessTranslation = item.business?.translations?.[0] || null;
  const selectedCategoryTranslation = item.category?.translations?.[0] || null;
  const targets = (item.targets || []).map((target) => (
    normalizeTargetOffering(target.offering, item.discountPercent)
  )).filter(Boolean);

  return {
    id: item.id,
    businessId: item.businessId,
    categoryId: item.categoryId,
    title: selectedTranslation?.title || item.title,
    description: selectedTranslation?.description || null,
    image: item.image,
    discountPercent: item.discountPercent,
    scope: item.scope,
    publicationStatus: item.publicationStatus,
    effectiveStatus: getEffectiveOfferStatus(item, now),
    startsAt: item.startsAt,
    endsAt: item.endsAt,
    displayOrder: item.displayOrder,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    business: item.business ? {
      id: item.business.id,
      slug: item.business.slug,
      title: selectedBusinessTranslation?.title || item.business.slug,
    } : undefined,
    category: item.category ? {
      id: item.category.id,
      title: selectedCategoryTranslation?.title || item.category.title,
    } : null,
    offeringIds: targets.map((offering) => offering.id),
    targets,
    targetCount: item._count?.targets ?? targets.length,
    translations: item.translations,
  };
}

function effectiveStatusWhere(effectiveStatus, now) {
  if (effectiveStatus === 'DRAFT') return { publicationStatus: 'DRAFT' };
  if (effectiveStatus === 'PAUSED') return { publicationStatus: 'PAUSED' };
  if (effectiveStatus === 'SCHEDULED') {
    return { publicationStatus: 'PUBLISHED', startsAt: { gt: now } };
  }
  if (effectiveStatus === 'ACTIVE') {
    return {
      publicationStatus: 'PUBLISHED',
      startsAt: { lte: now },
      endsAt: { gt: now },
    };
  }
  if (effectiveStatus === 'EXPIRED') {
    return { publicationStatus: 'PUBLISHED', endsAt: { lte: now } };
  }
  return null;
}

async function listBusinessOffers(query) {
  const selectedLang = await resolveSelectedLang(query.lang);
  const now = new Date();
  const skip = (query.page - 1) * query.pageSize;
  const where = {};

  if (query.businessId) where.businessId = query.businessId;
  if (query.scope) where.scope = query.scope;
  if (query.q) {
    where.OR = [
      { title: { contains: query.q } },
      { translations: { some: { title: { contains: query.q } } } },
    ];
  }

  const statusWhere = effectiveStatusWhere(query.effectiveStatus, now);
  if (statusWhere) where.AND = [statusWhere];

  const include = {
    translations: { where: { lang: selectedLang }, take: 1 },
    business: {
      select: {
        id: true,
        slug: true,
        translations: { where: { lang: selectedLang }, take: 1 },
      },
    },
    category: {
      include: { translations: { where: { lang: selectedLang }, take: 1 } },
    },
    _count: { select: { targets: true } },
  };

  const [items, total] = await Promise.all([
    prisma.businessOffer.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [{ [query.sortBy]: query.sortDir }, { id: 'desc' }],
      include,
    }),
    prisma.businessOffer.count({ where }),
  ]);

  return {
    items: items.map((item) => normalizeOffer({
      ...item,
      selectedTranslation: item.translations[0] || null,
      translations: undefined,
    }, now)),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      pageCount: Math.ceil(total / query.pageSize),
      lang: selectedLang,
    },
  };
}

async function getBusinessOfferById(id) {
  const item = await prisma.businessOffer.findUnique({
    where: { id },
    include: {
      translations: { orderBy: { lang: 'asc' } },
      business: {
        select: {
          id: true,
          slug: true,
          translations: { orderBy: { lang: 'asc' } },
        },
      },
      category: { include: { translations: { orderBy: { lang: 'asc' } } } },
      targets: {
        orderBy: { offeringId: 'asc' },
        include: {
          offering: {
            include: { translations: { orderBy: { lang: 'asc' } } },
          },
        },
      },
    },
  });
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Business offer not found');
  return normalizeOffer(item);
}

async function validateScopeTargets({ businessId, scope, categoryId, offeringIds }) {
  let category = null;
  let offerings = [];

  if (scope === 'CATEGORY') {
    category = await prisma.businessOfferingCategory.findFirst({
      where: { id: categoryId, businessId },
      select: { id: true },
    });
    if (!category) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
        errors: [{ path: 'categoryId', message: 'Offering category does not belong to this business' }],
      });
    }
  }

  if (scope === 'OFFERINGS') {
    const uniqueIds = [...new Set(offeringIds || [])];
    offerings = await prisma.businessOffering.findMany({
      where: { id: { in: uniqueIds }, businessId },
      select: { id: true, categoryId: true },
    });
    if (offerings.length !== uniqueIds.length) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
        errors: [{ path: 'offeringIds', message: 'One or more offerings do not belong to this business' }],
      });
    }
  }

  return { category, offerings };
}

function descriptorFor(scope, categoryId, offerings) {
  return {
    scope,
    categoryId,
    offeringIds: offerings.map((item) => item.id),
    offeringCategoryIds: offerings.map((item) => item.categoryId).filter(Boolean),
  };
}

async function assertNoPublishedOverlap({
  excludeId,
  businessId,
  scope,
  categoryId,
  offerings,
  startsAt,
  endsAt,
  publicationStatus,
}) {
  if (publicationStatus !== 'PUBLISHED') return;

  const candidates = await prisma.businessOffer.findMany({
    where: {
      businessId,
      publicationStatus: 'PUBLISHED',
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    include: {
      targets: {
        include: {
          offering: { select: { id: true, categoryId: true } },
        },
      },
    },
  });

  const nextDescriptor = descriptorFor(scope, categoryId, offerings);
  const conflicting = candidates.find((candidate) => {
    const candidateOfferings = candidate.targets.map((target) => target.offering);
    return scopesConflict(
      nextDescriptor,
      descriptorFor(candidate.scope, candidate.categoryId, candidateOfferings),
    );
  });

  if (conflicting) {
    throw new AppError(409, 'BUSINESS_OFFER_OVERLAP', 'Published offers cannot overlap on the same offering', {
      errors: [{
        path: 'startsAt',
        message: `This schedule conflicts with offer #${conflicting.id}`,
      }],
    });
  }
}

function auditShape(item) {
  if (!item) return item;
  return {
    id: item.id,
    businessId: item.businessId,
    categoryId: item.categoryId,
    title: item.title,
    discountPercent: item.discountPercent,
    scope: item.scope,
    publicationStatus: item.publicationStatus,
    startsAt: item.startsAt,
    endsAt: item.endsAt,
  };
}

async function createBusinessOffer(data, req) {
  await assertBusiness(data.businessId);
  await assertLanguages([...new Set(data.translations.map((item) => item.lang))]);
  const { offerings } = await validateScopeTargets(data);
  await assertNoPublishedOverlap({ ...data, offerings });

  const categoryId = data.scope === 'CATEGORY' ? data.categoryId : null;
  const offeringIds = data.scope === 'OFFERINGS' ? offerings.map((item) => item.id) : [];
  const created = await prisma.businessOffer.create({
    data: {
      businessId: data.businessId,
      categoryId,
      title: chooseTitle(data.translations),
      image: data.image ?? null,
      discountPercent: data.discountPercent,
      scope: data.scope,
      publicationStatus: data.publicationStatus,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      displayOrder: data.displayOrder ?? 0,
      translations: { create: data.translations },
      targets: offeringIds.length
        ? { create: offeringIds.map((offeringId) => ({ offeringId })) }
        : undefined,
    },
    include: { translations: true, targets: true },
  });

  await audit(req, {
    action: 'CREATE',
    entity: 'BusinessOffer',
    entityId: created.id,
    after: auditShape(created),
  });
  return getBusinessOfferById(created.id);
}

async function updateBusinessOffer(id, data, req) {
  const existing = await prisma.businessOffer.findUnique({
    where: { id },
    include: { translations: true, targets: true },
  });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Business offer not found');

  const merged = {
    businessId: data.businessId ?? existing.businessId,
    categoryId: data.categoryId !== undefined ? data.categoryId : existing.categoryId,
    offeringIds: data.offeringIds !== undefined
      ? data.offeringIds
      : existing.targets.map((target) => target.offeringId),
    image: data.image !== undefined ? data.image : existing.image,
    discountPercent: data.discountPercent ?? existing.discountPercent,
    scope: data.scope ?? existing.scope,
    publicationStatus: data.publicationStatus ?? existing.publicationStatus,
    startsAt: data.startsAt ?? existing.startsAt,
    endsAt: data.endsAt ?? existing.endsAt,
    displayOrder: data.displayOrder ?? existing.displayOrder,
    translations: data.translations ?? existing.translations.map((item) => ({
      lang: item.lang,
      title: item.title,
      description: item.description,
      isActive: item.isActive,
    })),
  };

  if (merged.endsAt.getTime() <= merged.startsAt.getTime()) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
      errors: [{ path: 'endsAt', message: 'End date must be after start date' }],
    });
  }

  await assertBusiness(merged.businessId);
  if (data.translations) {
    await assertLanguages([...new Set(data.translations.map((item) => item.lang))]);
  }
  const { offerings } = await validateScopeTargets(merged);
  await assertNoPublishedOverlap({ ...merged, offerings, excludeId: id });

  const categoryId = merged.scope === 'CATEGORY' ? merged.categoryId : null;
  const offeringIds = merged.scope === 'OFFERINGS' ? offerings.map((item) => item.id) : [];

  await prisma.$transaction(async (tx) => {
    await tx.businessOffer.update({
      where: { id },
      data: {
        businessId: merged.businessId,
        categoryId,
        title: chooseTitle(merged.translations, existing.title),
        image: merged.image ?? null,
        discountPercent: merged.discountPercent,
        scope: merged.scope,
        publicationStatus: merged.publicationStatus,
        startsAt: merged.startsAt,
        endsAt: merged.endsAt,
        displayOrder: merged.displayOrder,
      },
    });

    if (Array.isArray(data.translations)) {
      for (const translation of data.translations) {
        await tx.businessOfferTranslation.upsert({
          where: { offerId_lang: { offerId: id, lang: translation.lang } },
          update: translation,
          create: { ...translation, offerId: id },
        });
      }
      await tx.businessOfferTranslation.deleteMany({
        where: { offerId: id, lang: { notIn: data.translations.map((item) => item.lang) } },
      });
    }

    await tx.businessOfferTarget.deleteMany({ where: { offerId: id } });
    if (offeringIds.length) {
      await tx.businessOfferTarget.createMany({
        data: offeringIds.map((offeringId) => ({ offerId: id, offeringId })),
      });
    }
  });

  const updated = await getBusinessOfferById(id);
  await audit(req, {
    action: 'UPDATE',
    entity: 'BusinessOffer',
    entityId: id,
    before: auditShape(existing),
    after: auditShape(updated),
  });
  return updated;
}

async function deleteBusinessOffer(id, req) {
  const existing = await prisma.businessOffer.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Business offer not found');
  await prisma.businessOffer.delete({ where: { id } });
  await audit(req, {
    action: 'DELETE',
    entity: 'BusinessOffer',
    entityId: id,
    before: auditShape(existing),
  });
}

async function getNextDisplayOrder(businessId) {
  const where = businessId ? { businessId: Number(businessId) } : {};
  const aggregate = await prisma.businessOffer.aggregate({ where, _max: { displayOrder: true } });
  return (aggregate._max.displayOrder || 0) + 10;
}

module.exports = {
  listBusinessOffers,
  getBusinessOfferById,
  createBusinessOffer,
  updateBusinessOffer,
  deleteBusinessOffer,
  getNextDisplayOrder,
};
