const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const { audit } = require('../../shared/audit/audit');
const {
  assertValidCategoryParent,
  collectDescendantCategoryIds,
  getCategoryPath,
} = require('../classifieds-domain/classifiedCategoryHierarchy');

const OPERATIONAL_AD_STATUSES = ['PENDING_REVIEW', 'PUBLISHED', 'PAUSED', 'SUSPENDED'];
const DEFAULT_CLASSIFIED_CURRENCY = 'TJS';

function normalize(item) {
  return {
    parentId: item.parentId ?? null,
    code: item.code,
    slug: item.slug,
    title: item.title,
    description: item.description,
    image: item.image,
    color: item.color,
    displayOrder: item.displayOrder,
    isActive: item.isActive,
    allowAds: item.allowAds,
    postingFee: Number(item.postingFee || 0),
  };
}

function serializeCategory(item, currency) {
  return {
    ...item,
    postingFee: Number(item.postingFee || 0),
    postingFeeCurrency: currency,
  };
}

function categorySelect() {
  return {
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
    createdAt: true,
    updatedAt: true,
    _count: {
      select: {
        children: true,
        attributes: true,
        ads: true,
      },
    },
  };
}

async function getHierarchyRows() {
  return prisma.classifiedCategory.findMany({
    select: {
      id: true,
      parentId: true,
      title: true,
      code: true,
      isActive: true,
      allowAds: true,
      postingFee: true,
      displayOrder: true,
    },
    orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
  });
}

async function getClassifiedCurrency() {
  const settings = await prisma.classifiedSetting.findUnique({
    where: { id: 1 },
    select: { currency: true },
  });
  return settings?.currency || DEFAULT_CLASSIFIED_CURRENCY;
}

function enrichWithPath(items, hierarchyRows, currency) {
  return items.map((item) => {
    const path = getCategoryPath(hierarchyRows, item.id);
    return {
      ...serializeCategory(item, currency),
      depth: Math.max(0, path.length - 1),
      path: path.map((part) => ({ id: part.id, title: part.title, code: part.code })),
      pathTitle: path.map((part) => part.title).join(' / '),
      effectivelyActive: path.every((part) => part.isActive),
      publiclySelectable: path.every((part) => part.isActive) && item.allowAds,
    };
  });
}

function buildTree(items) {
  const byParent = new Map();
  for (const item of items) {
    const key = item.parentId == null ? null : Number(item.parentId);
    const siblings = byParent.get(key) || [];
    siblings.push(item);
    byParent.set(key, siblings);
  }
  const sortItems = (rows) => rows.sort((left, right) => (
    left.displayOrder - right.displayOrder
    || left.title.localeCompare(right.title)
    || left.id - right.id
  ));
  const visit = (parentId, visited = new Set()) => sortItems(byParent.get(parentId) || []).map((item) => {
    if (visited.has(item.id)) {
      throw new AppError(409, 'CLASSIFIED_CATEGORY_CYCLE', 'Classified category hierarchy contains a cycle');
    }
    const nextVisited = new Set(visited);
    nextVisited.add(item.id);
    return { ...item, children: visit(item.id, nextVisited) };
  });
  return visit(null);
}

async function assertUniqueIdentity(data, currentId = null) {
  const clauses = [];
  if (data.code) clauses.push({ code: data.code });
  if (data.slug) clauses.push({ slug: data.slug });
  if (!clauses.length) return;
  const duplicate = await prisma.classifiedCategory.findFirst({
    where: {
      ...(currentId ? { id: { not: currentId } } : {}),
      OR: clauses,
    },
    select: { id: true, code: true, slug: true },
  });
  if (!duplicate) return;
  const field = data.code && duplicate.code === data.code ? 'code' : 'slug';
  throw new AppError(409, 'CLASSIFIED_CATEGORY_DUPLICATE', 'A classified category with this identifier already exists', {
    errors: [{ path: field, message: `This ${field} is already in use` }],
  });
}

async function assertBranchHasNoOperationalAds(categoryId, code, message) {
  const rows = await getHierarchyRows();
  const categoryIds = collectDescendantCategoryIds(rows, categoryId);
  const count = await prisma.classifiedAd.count({
    where: {
      categoryId: { in: categoryIds },
      status: { in: OPERATIONAL_AD_STATUSES },
      deletedAt: null,
    },
  });
  if (count > 0) {
    throw new AppError(409, code, message, { details: { operationalAdCount: count } });
  }
}

async function listClassifiedCategories(query) {
  const skip = (query.page - 1) * query.pageSize;
  const where = {};
  if (query.rootOnly) where.parentId = null;
  else if (query.parentId !== undefined) where.parentId = query.parentId;
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.allowAds !== undefined) where.allowAds = query.allowAds;
  if (query.q) {
    where.OR = [
      { code: { contains: query.q } },
      { slug: { contains: query.q } },
      { title: { contains: query.q } },
      { description: { contains: query.q } },
    ];
  }

  const [items, total, hierarchyRows, currency] = await Promise.all([
    prisma.classifiedCategory.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [{ [query.sortBy]: query.sortDir }, { id: 'asc' }],
      select: categorySelect(),
    }),
    prisma.classifiedCategory.count({ where }),
    getHierarchyRows(),
    getClassifiedCurrency(),
  ]);

  return {
    items: enrichWithPath(items, hierarchyRows, currency),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      pageCount: Math.ceil(total / query.pageSize),
    },
  };
}

async function getClassifiedCategoryTree() {
  const [hierarchyRows, items, currency] = await Promise.all([
    getHierarchyRows(),
    prisma.classifiedCategory.findMany({
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
      select: categorySelect(),
    }),
    getClassifiedCurrency(),
  ]);
  return buildTree(enrichWithPath(items, hierarchyRows, currency));
}

async function getClassifiedCategoryOptions(query) {
  const [hierarchyRows, currency] = await Promise.all([
    getHierarchyRows(),
    getClassifiedCurrency(),
  ]);
  const excludedIds = query.excludeId
    ? new Set(collectDescendantCategoryIds(hierarchyRows, query.excludeId))
    : new Set();
  return enrichWithPath(
    hierarchyRows
      .filter((item) => !excludedIds.has(item.id) && (!query.activeOnly || item.isActive))
      .map((item) => ({ ...item })),
    hierarchyRows,
    currency,
  );
}

async function getClassifiedCategoryById(id) {
  const [item, hierarchyRows, currency] = await Promise.all([
    prisma.classifiedCategory.findUnique({ where: { id }, select: categorySelect() }),
    getHierarchyRows(),
    getClassifiedCurrency(),
  ]);
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Classified category not found');
  return enrichWithPath([item], hierarchyRows, currency)[0];
}

async function createClassifiedCategory(data, req) {
  const [hierarchyRows, currency] = await Promise.all([
    getHierarchyRows(),
    getClassifiedCurrency(),
  ]);
  assertValidCategoryParent(hierarchyRows, null, data.parentId);
  await assertUniqueIdentity(data);
  const created = await prisma.classifiedCategory.create({
    data,
    select: categorySelect(),
  });
  await audit(req, {
    action: 'CREATE',
    entity: 'ClassifiedCategory',
    entityId: created.id,
    after: normalize(created),
  });
  return serializeCategory(created, currency);
}

async function updateClassifiedCategory(id, data, req) {
  const existing = await prisma.classifiedCategory.findUnique({ where: { id }, select: categorySelect() });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Classified category not found');

  const [hierarchyRows, currency] = await Promise.all([
    getHierarchyRows(),
    getClassifiedCurrency(),
  ]);
  if (Object.prototype.hasOwnProperty.call(data, 'parentId')) {
    assertValidCategoryParent(hierarchyRows, id, data.parentId);
  }
  await assertUniqueIdentity(data, id);

  if (existing.isActive && data.isActive === false) {
    await assertBranchHasNoOperationalAds(
      id,
      'CLASSIFIED_CATEGORY_HAS_OPERATIONAL_ADS',
      'A category branch with operational ads cannot be deactivated',
    );
  }
  if (existing.allowAds && data.allowAds === false) {
    await assertBranchHasNoOperationalAds(
      id,
      'CLASSIFIED_CATEGORY_HAS_OPERATIONAL_ADS',
      'Ad submission cannot be disabled while the category branch has operational ads',
    );
  }

  const updated = await prisma.classifiedCategory.update({
    where: { id },
    data,
    select: categorySelect(),
  });
  await audit(req, {
    action: 'UPDATE',
    entity: 'ClassifiedCategory',
    entityId: id,
    before: normalize(existing),
    after: normalize(updated),
  });
  return serializeCategory(updated, currency);
}

async function deleteClassifiedCategory(id, req) {
  const existing = await prisma.classifiedCategory.findUnique({
    where: { id },
    select: categorySelect(),
  });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Classified category not found');
  if (existing._count.children > 0) {
    throw new AppError(409, 'CLASSIFIED_CATEGORY_HAS_CHILDREN', 'A category with child categories cannot be deleted');
  }
  if (existing._count.attributes > 0) {
    throw new AppError(409, 'CLASSIFIED_CATEGORY_HAS_ATTRIBUTES', 'A category with attributes cannot be deleted');
  }
  if (existing._count.ads > 0) {
    throw new AppError(409, 'CLASSIFIED_CATEGORY_IN_USE', 'A category used by ads cannot be deleted');
  }
  await prisma.classifiedCategory.delete({ where: { id } });
  await audit(req, {
    action: 'DELETE',
    entity: 'ClassifiedCategory',
    entityId: id,
    before: normalize(existing),
  });
}

async function getNextDisplayOrder(parentId) {
  const aggregate = await prisma.classifiedCategory.aggregate({
    where: { parentId: parentId ?? null },
    _max: { displayOrder: true },
  });
  return (aggregate._max.displayOrder || 0) + 10;
}

module.exports = {
  createClassifiedCategory,
  deleteClassifiedCategory,
  getClassifiedCategoryById,
  getClassifiedCategoryOptions,
  getClassifiedCategoryTree,
  getNextDisplayOrder,
  listClassifiedCategories,
  updateClassifiedCategory,
};
