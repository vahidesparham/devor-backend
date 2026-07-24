const prisma = require('../../prisma');

async function listServiceTypeHierarchyRows({ activeOnly = false } = {}) {
  return prisma.serviceType.findMany({
    where: activeOnly ? { isActive: true } : {},
    select: { id: true, parentId: true },
  });
}

function buildChildrenByParent(rows) {
  const childrenByParent = new Map();
  for (const row of rows) {
    const key = row.parentId ?? null;
    const children = childrenByParent.get(key) || [];
    children.push(row);
    childrenByParent.set(key, children);
  }
  return childrenByParent;
}

function collectDescendantServiceTypeIds(rows, serviceTypeId, { includeSelf = true } = {}) {
  const numericId = Number(serviceTypeId);
  const childrenByParent = buildChildrenByParent(rows);
  const ids = [];
  const visited = new Set();
  const stack = includeSelf ? [numericId] : (childrenByParent.get(numericId) || []).map((item) => item.id);

  while (stack.length) {
    const id = Number(stack.pop());
    if (visited.has(id)) continue;
    visited.add(id);
    ids.push(id);
    for (const child of childrenByParent.get(id) || []) {
      stack.push(child.id);
    }
  }

  return ids;
}

async function getDescendantServiceTypeIds(serviceTypeId, options = {}) {
  if (!serviceTypeId) return null;
  const rows = await listServiceTypeHierarchyRows({ activeOnly: options.activeOnly });
  const ids = collectDescendantServiceTypeIds(rows, serviceTypeId, options);
  return ids.length ? ids : [Number(serviceTypeId)];
}

async function getRootServiceTypeId(serviceTypeId) {
  if (!serviceTypeId) return null;
  const rows = await listServiceTypeHierarchyRows();
  const byId = new Map(rows.map((row) => [row.id, row]));
  let current = byId.get(Number(serviceTypeId));
  if (!current) return Number(serviceTypeId);

  const visited = new Set();
  while (current.parentId) {
    if (visited.has(current.id)) break;
    visited.add(current.id);
    const parent = byId.get(current.parentId);
    if (!parent) break;
    current = parent;
  }

  return current.id;
}

async function isDescendantServiceType(descendantId, ancestorId) {
  if (!descendantId || !ancestorId) return false;
  const rows = await listServiceTypeHierarchyRows();
  const byId = new Map(rows.map((row) => [row.id, row]));
  let current = byId.get(Number(descendantId));
  const numericAncestorId = Number(ancestorId);
  const visited = new Set();

  while (current?.parentId) {
    if (visited.has(current.id)) return false;
    visited.add(current.id);
    if (current.parentId === numericAncestorId) return true;
    current = byId.get(current.parentId);
  }

  return false;
}

module.exports = {
  collectDescendantServiceTypeIds,
  getDescendantServiceTypeIds,
  getRootServiceTypeId,
  isDescendantServiceType,
  listServiceTypeHierarchyRows,
};
