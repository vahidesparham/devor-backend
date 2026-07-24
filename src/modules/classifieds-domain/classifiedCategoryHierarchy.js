const { AppError } = require('../../shared/http/response');

function buildCategoryIndex(rows) {
  return new Map((rows || []).map((row) => [Number(row.id), row]));
}

function buildChildrenByParent(rows) {
  const childrenByParent = new Map();
  for (const row of rows || []) {
    const key = row.parentId == null ? null : Number(row.parentId);
    const children = childrenByParent.get(key) || [];
    children.push(row);
    childrenByParent.set(key, children);
  }
  return childrenByParent;
}

function collectDescendantCategoryIds(rows, categoryId, { includeSelf = true } = {}) {
  const numericId = Number(categoryId);
  const childrenByParent = buildChildrenByParent(rows);
  const stack = includeSelf
    ? [numericId]
    : (childrenByParent.get(numericId) || []).map((item) => Number(item.id));
  const ids = [];
  const visited = new Set();

  while (stack.length) {
    const id = Number(stack.pop());
    if (!Number.isInteger(id) || visited.has(id)) continue;
    visited.add(id);
    ids.push(id);
    for (const child of childrenByParent.get(id) || []) {
      stack.push(Number(child.id));
    }
  }

  return ids;
}

function getCategoryPath(rows, categoryId, { includeSelf = true } = {}) {
  const byId = buildCategoryIndex(rows);
  const path = [];
  const visited = new Set();
  let current = byId.get(Number(categoryId));

  while (current) {
    const id = Number(current.id);
    if (visited.has(id)) {
      throw new AppError(409, 'CLASSIFIED_CATEGORY_CYCLE', 'Classified category hierarchy contains a cycle');
    }
    visited.add(id);
    path.push(current);
    current = current.parentId == null ? null : byId.get(Number(current.parentId));
  }

  const rootFirst = path.reverse();
  if (includeSelf) return rootFirst;
  return rootFirst.slice(0, -1);
}

function wouldCreateCategoryCycle(rows, categoryId, parentId) {
  if (parentId == null) return false;
  const numericId = Number(categoryId);
  const numericParentId = Number(parentId);
  if (numericId === numericParentId) return true;
  return collectDescendantCategoryIds(rows, numericId).includes(numericParentId);
}

function assertValidCategoryParent(rows, categoryId, parentId) {
  if (parentId == null) return;
  const byId = buildCategoryIndex(rows);
  if (!byId.has(Number(parentId))) {
    throw new AppError(400, 'CLASSIFIED_CATEGORY_PARENT_NOT_FOUND', 'Parent classified category was not found', {
      errors: [{ path: 'parentId', message: 'Parent classified category was not found' }],
    });
  }
  if (wouldCreateCategoryCycle(rows, categoryId, parentId)) {
    throw new AppError(400, 'CLASSIFIED_CATEGORY_CYCLE', 'A classified category cannot use itself or a descendant as parent', {
      errors: [{ path: 'parentId', message: 'A classified category cannot use itself or a descendant as parent' }],
    });
  }
}

function isCategoryPubliclySelectable(rows, categoryId) {
  const path = getCategoryPath(rows, categoryId);
  if (!path.length) return false;
  const selected = path[path.length - 1];
  const hasChildren = (rows || []).some((category) => Number(category.parentId) === Number(selected.id));
  return path.every((category) => category.isActive) && selected.allowAds === true && !hasChildren;
}

function resolveInheritedClassifiedAttributes(categoryRows, attributeRows, categoryId) {
  const path = getCategoryPath(categoryRows, categoryId);
  const depthByCategory = new Map(path.map((category, index) => [Number(category.id), index]));
  const resolved = new Map();

  const sorted = (attributeRows || [])
    .filter((attribute) => attribute.isActive && depthByCategory.has(Number(attribute.categoryId)))
    .sort((left, right) => {
      const depthDifference = depthByCategory.get(Number(left.categoryId)) - depthByCategory.get(Number(right.categoryId));
      if (depthDifference !== 0) return depthDifference;
      if ((left.displayOrder || 0) !== (right.displayOrder || 0)) {
        return (left.displayOrder || 0) - (right.displayOrder || 0);
      }
      return Number(left.id) - Number(right.id);
    });

  for (const attribute of sorted) {
    const existing = resolved.get(attribute.code);
    if (existing && existing.type !== attribute.type) {
      throw new AppError(
        409,
        'CLASSIFIED_ATTRIBUTE_TYPE_CONFLICT',
        `Inherited classified attribute "${attribute.code}" has incompatible types`,
      );
    }
    resolved.set(attribute.code, attribute);
  }

  return [...resolved.values()].sort((left, right) => {
    const depthDifference = depthByCategory.get(Number(left.categoryId)) - depthByCategory.get(Number(right.categoryId));
    if (depthDifference !== 0) return depthDifference;
    if ((left.displayOrder || 0) !== (right.displayOrder || 0)) {
      return (left.displayOrder || 0) - (right.displayOrder || 0);
    }
    return Number(left.id) - Number(right.id);
  });
}

module.exports = {
  assertValidCategoryParent,
  buildCategoryIndex,
  collectDescendantCategoryIds,
  getCategoryPath,
  isCategoryPubliclySelectable,
  resolveInheritedClassifiedAttributes,
  wouldCreateCategoryCycle,
};
