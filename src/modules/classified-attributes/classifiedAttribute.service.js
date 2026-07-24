const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const { audit } = require('../../shared/audit/audit');
const {
  collectDescendantCategoryIds,
  getCategoryPath,
} = require('../classifieds-domain/classifiedCategoryHierarchy');

const SELECT_TYPES = new Set(['SELECT', 'MULTI_SELECT']);

function normalizeAttribute(item) {
  return {
    categoryId: item.categoryId,
    code: item.code,
    title: item.title,
    type: item.type,
    unit: item.unit,
    placeholder: item.placeholder,
    isRequired: item.isRequired,
    showInFilters: item.showInFilters,
    displayOrder: item.displayOrder,
    isActive: item.isActive,
    minValue: item.minValue,
    maxValue: item.maxValue,
    minLength: item.minLength,
    maxLength: item.maxLength,
  };
}

function normalizeOption(item) {
  return {
    attributeId: item.attributeId,
    code: item.code,
    title: item.title,
    image: item.image,
    color: item.color,
    displayOrder: item.displayOrder,
    isActive: item.isActive,
  };
}

async function auditOptionChanges(req, beforeOptions, afterOptions) {
  const beforeById = new Map(beforeOptions.map((item) => [item.id, item]));
  const afterById = new Map(afterOptions.map((item) => [item.id, item]));

  for (const before of beforeOptions) {
    if (afterById.has(before.id)) continue;
    await audit(req, {
      action: 'DELETE',
      entity: 'ClassifiedAttributeOption',
      entityId: before.id,
      before: normalizeOption(before),
    });
  }

  for (const after of afterOptions) {
    const before = beforeById.get(after.id);
    if (!before) {
      await audit(req, {
        action: 'CREATE',
        entity: 'ClassifiedAttributeOption',
        entityId: after.id,
        after: normalizeOption(after),
      });
      continue;
    }

    const beforeValue = normalizeOption(before);
    const afterValue = normalizeOption(after);
    if (JSON.stringify(beforeValue) === JSON.stringify(afterValue)) continue;
    await audit(req, {
      action: 'UPDATE',
      entity: 'ClassifiedAttributeOption',
      entityId: after.id,
      before: beforeValue,
      after: afterValue,
    });
  }
}

function attributeInclude() {
  return {
    category: {
      select: {
        id: true,
        parentId: true,
        code: true,
        title: true,
        isActive: true,
        allowAds: true,
      },
    },
    options: {
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
      include: { _count: { select: { values: true } } },
    },
    _count: { select: { options: true, values: true } },
  };
}

async function getCategoryRows() {
  return prisma.classifiedCategory.findMany({
    select: {
      id: true,
      parentId: true,
      code: true,
      title: true,
      isActive: true,
      allowAds: true,
      displayOrder: true,
    },
    orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
  });
}

async function assertCategory(categoryId) {
  const category = await prisma.classifiedCategory.findUnique({
    where: { id: categoryId },
    select: { id: true, title: true },
  });
  if (!category) {
    throw new AppError(400, 'CLASSIFIED_CATEGORY_NOT_FOUND', 'Classified category not found', {
      errors: [{ path: 'categoryId', message: 'Classified category not found' }],
    });
  }
  return category;
}

function cleanConstraints(data, effectiveType) {
  const next = { ...data };
  if (effectiveType !== 'NUMBER') {
    next.minValue = null;
    next.maxValue = null;
    next.unit = null;
  }
  if (effectiveType !== 'TEXT') {
    next.minLength = null;
    next.maxLength = null;
  }
  if (!['TEXT', 'NUMBER'].includes(effectiveType)) {
    next.placeholder = null;
  }
  return next;
}

async function assertUniqueCode(categoryId, code, currentId = null) {
  if (!categoryId || !code) return;
  const duplicate = await prisma.classifiedAttribute.findFirst({
    where: {
      categoryId,
      code,
      ...(currentId ? { id: { not: currentId } } : {}),
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new AppError(409, 'CLASSIFIED_ATTRIBUTE_DUPLICATE', 'This attribute code already exists in the category', {
      errors: [{ path: 'code', message: 'This code is already in use in the selected category' }],
    });
  }
}

async function assertCompatibleInheritance({ categoryId, code, type, currentId = null }) {
  const categoryRows = await getCategoryRows();
  const category = categoryRows.find((item) => item.id === categoryId);
  if (!category) {
    throw new AppError(400, 'CLASSIFIED_CATEGORY_NOT_FOUND', 'Classified category not found', {
      errors: [{ path: 'categoryId', message: 'Classified category not found' }],
    });
  }
  const ancestorIds = new Set(getCategoryPath(categoryRows, categoryId).map((item) => item.id));
  const descendantIds = new Set(collectDescendantCategoryIds(categoryRows, categoryId));
  const relatedIds = [...new Set([...ancestorIds, ...descendantIds])];
  const conflicts = await prisma.classifiedAttribute.findMany({
    where: {
      categoryId: { in: relatedIds },
      code,
      type: { not: type },
      ...(currentId ? { id: { not: currentId } } : {}),
    },
    include: { category: { select: { id: true, title: true } } },
  });
  if (conflicts.length) {
    throw new AppError(
      409,
      'CLASSIFIED_ATTRIBUTE_TYPE_CONFLICT',
      'An inherited attribute with this code has a different type',
      {
        errors: [{
          path: 'type',
          message: `The code "${code}" is already ${conflicts[0].type} in "${conflicts[0].category.title}"`,
        }],
      },
    );
  }
}

function enrichAttribute(item, categoryRows, selectedCategoryId = null) {
  const categoryPath = getCategoryPath(categoryRows, item.categoryId);
  return {
    ...item,
    categoryPath: categoryPath.map((part) => ({ id: part.id, title: part.title, code: part.code })),
    categoryPathTitle: categoryPath.map((part) => part.title).join(' / '),
    inherited: selectedCategoryId != null && item.categoryId !== selectedCategoryId,
    sourceDepth: Math.max(0, categoryPath.length - 1),
  };
}

async function listClassifiedAttributes(query) {
  const categoryRows = await getCategoryRows();
  let categoryIds;
  if (query.categoryId && query.includeInherited) {
    categoryIds = getCategoryPath(categoryRows, query.categoryId).map((item) => item.id);
  } else if (query.categoryId) {
    categoryIds = [query.categoryId];
  }

  const where = {};
  if (categoryIds) where.categoryId = { in: categoryIds };
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.type) where.type = query.type;
  if (query.q) {
    where.OR = [
      { code: { contains: query.q } },
      { title: { contains: query.q } },
      { placeholder: { contains: query.q } },
      { unit: { contains: query.q } },
      { category: { title: { contains: query.q } } },
      { options: { some: { OR: [{ code: { contains: query.q } }, { title: { contains: query.q } }] } } },
    ];
  }

  if (query.includeInherited) {
    const items = await prisma.classifiedAttribute.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
      include: attributeInclude(),
    });
    const depthByCategory = new Map(
      getCategoryPath(categoryRows, query.categoryId).map((category, index) => [category.id, index]),
    );
    const byCode = new Map();
    for (const item of items.sort((left, right) => (
      depthByCategory.get(left.categoryId) - depthByCategory.get(right.categoryId)
      || left.displayOrder - right.displayOrder
      || left.id - right.id
    ))) {
      const existing = byCode.get(item.code);
      if (existing && existing.type !== item.type) {
        throw new AppError(409, 'CLASSIFIED_ATTRIBUTE_TYPE_CONFLICT', `Inherited attribute "${item.code}" has incompatible types`);
      }
      byCode.set(item.code, item);
    }
    const resolved = [...byCode.values()].map((item) => enrichAttribute(item, categoryRows, query.categoryId));
    return {
      items: resolved,
      meta: { page: 1, pageSize: resolved.length, total: resolved.length, pageCount: 1 },
    };
  }

  const skip = (query.page - 1) * query.pageSize;
  const [items, total] = await Promise.all([
    prisma.classifiedAttribute.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [{ [query.sortBy]: query.sortDir }, { id: 'asc' }],
      include: attributeInclude(),
    }),
    prisma.classifiedAttribute.count({ where }),
  ]);
  return {
    items: items.map((item) => enrichAttribute(item, categoryRows, query.categoryId)),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      pageCount: Math.ceil(total / query.pageSize),
    },
  };
}

async function getClassifiedAttributeById(id) {
  const [item, categoryRows] = await Promise.all([
    prisma.classifiedAttribute.findUnique({ where: { id }, include: attributeInclude() }),
    getCategoryRows(),
  ]);
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Classified attribute not found');
  return enrichAttribute(item, categoryRows);
}

async function createClassifiedAttribute(data, req) {
  const { options = [], ...attributeData } = data;
  await assertCategory(attributeData.categoryId);
  await assertUniqueCode(attributeData.categoryId, attributeData.code);
  await assertCompatibleInheritance(attributeData);
  const prepared = cleanConstraints(attributeData, attributeData.type);
  const created = await prisma.classifiedAttribute.create({
    data: {
      ...prepared,
      ...(options.length ? {
        options: {
          create: options.map(({ id: _id, ...option }) => option),
        },
      } : {}),
    },
    include: attributeInclude(),
  });
  await audit(req, {
    action: 'CREATE',
    entity: 'ClassifiedAttribute',
    entityId: created.id,
    after: normalizeAttribute(created),
  });
  await auditOptionChanges(req, [], created.options);
  return created;
}

async function updateClassifiedAttribute(id, data, req) {
  const existing = await prisma.classifiedAttribute.findUnique({
    where: { id },
    include: attributeInclude(),
  });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Classified attribute not found');

  const optionsProvided = Object.prototype.hasOwnProperty.call(data, 'options');
  const { options = [], ...attributeData } = data;
  const nextCategoryId = attributeData.categoryId ?? existing.categoryId;
  const nextCode = attributeData.code ?? existing.code;
  const nextType = attributeData.type ?? existing.type;
  await assertCategory(nextCategoryId);
  await assertUniqueCode(nextCategoryId, nextCode, id);
  await assertCompatibleInheritance({
    categoryId: nextCategoryId,
    code: nextCode,
    type: nextType,
    currentId: id,
  });

  if (nextType !== existing.type && existing._count.values > 0) {
    throw new AppError(409, 'CLASSIFIED_ATTRIBUTE_IN_USE', 'The type of an attribute used by ads cannot be changed');
  }
  if (!SELECT_TYPES.has(nextType) && existing._count.options > 0 && !optionsProvided) {
    throw new AppError(409, 'CLASSIFIED_ATTRIBUTE_HAS_OPTIONS', 'Remove the attribute options before changing to a non-selection type');
  }
  if (!SELECT_TYPES.has(nextType) && options.length > 0) {
    throw new AppError(409, 'CLASSIFIED_ATTRIBUTE_OPTIONS_NOT_ALLOWED', 'Options are only supported for selection attributes', {
      errors: [{ path: 'options', message: 'Remove the options before changing to a non-selection type' }],
    });
  }

  const existingOptionsById = new Map(existing.options.map((option) => [option.id, option]));
  const incomingIds = new Set();
  if (optionsProvided) {
    for (const [index, option] of options.entries()) {
      if (!option.id) continue;
      if (incomingIds.has(option.id) || !existingOptionsById.has(option.id)) {
        throw new AppError(400, 'INVALID_CLASSIFIED_ATTRIBUTE_OPTION', 'An option does not belong to this attribute', {
          errors: [{ path: `options.${index}.id`, message: 'Invalid option identifier' }],
        });
      }
      incomingIds.add(option.id);
    }
  }

  const removedOptions = optionsProvided
    ? existing.options.filter((option) => !incomingIds.has(option.id))
    : [];
  const usedRemovedOption = removedOptions.find((option) => option._count.values > 0);
  if (usedRemovedOption) {
    throw new AppError(409, 'CLASSIFIED_ATTRIBUTE_OPTION_IN_USE', 'An option used by ads cannot be deleted', {
      errors: [{ path: 'options', message: `The option "${usedRemovedOption.title}" is used by ads and cannot be removed` }],
    });
  }

  const prepared = cleanConstraints(attributeData, nextType);
  const updated = await prisma.$transaction(async (tx) => {
    if (removedOptions.length) {
      await tx.classifiedAttributeOption.deleteMany({
        where: { id: { in: removedOptions.map((option) => option.id) }, attributeId: id },
      });
    }

    if (optionsProvided) {
      const changedExistingOptions = options.filter((option) => (
        option.id && existingOptionsById.get(option.id)?.code !== option.code
      ));
      for (const option of changedExistingOptions) {
        await tx.classifiedAttributeOption.update({
          where: { id: option.id },
          data: { code: `__sync_${option.id}_${Date.now()}` },
        });
      }

      for (const option of options) {
        const { id: optionId, ...optionData } = option;
        if (optionId) {
          await tx.classifiedAttributeOption.update({
            where: { id: optionId },
            data: optionData,
          });
        } else {
          await tx.classifiedAttributeOption.create({
            data: { ...optionData, attributeId: id },
          });
        }
      }
    }

    return tx.classifiedAttribute.update({
      where: { id },
      data: prepared,
      include: attributeInclude(),
    });
  });
  await audit(req, {
    action: 'UPDATE',
    entity: 'ClassifiedAttribute',
    entityId: id,
    before: normalizeAttribute(existing),
    after: normalizeAttribute(updated),
  });
  if (optionsProvided) {
    await auditOptionChanges(req, existing.options, updated.options);
  }
  return updated;
}

async function deleteClassifiedAttribute(id, req) {
  const existing = await prisma.classifiedAttribute.findUnique({
    where: { id },
    include: attributeInclude(),
  });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Classified attribute not found');
  if (existing._count.values > 0) {
    throw new AppError(409, 'CLASSIFIED_ATTRIBUTE_IN_USE', 'An attribute used by ads cannot be deleted');
  }
  await prisma.classifiedAttribute.delete({ where: { id } });
  await audit(req, {
    action: 'DELETE',
    entity: 'ClassifiedAttribute',
    entityId: id,
    before: normalizeAttribute(existing),
  });
}

async function assertSelectionAttribute(attributeId) {
  const attribute = await prisma.classifiedAttribute.findUnique({
    where: { id: attributeId },
    select: { id: true, title: true, type: true },
  });
  if (!attribute) throw new AppError(404, 'NOT_FOUND', 'Classified attribute not found');
  if (!SELECT_TYPES.has(attribute.type)) {
    throw new AppError(409, 'CLASSIFIED_ATTRIBUTE_OPTIONS_NOT_ALLOWED', 'Options are only supported for selection attributes');
  }
  return attribute;
}

async function assertUniqueOptionCode(attributeId, code, currentId = null) {
  if (!code) return;
  const duplicate = await prisma.classifiedAttributeOption.findFirst({
    where: {
      attributeId,
      code,
      ...(currentId ? { id: { not: currentId } } : {}),
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new AppError(409, 'CLASSIFIED_ATTRIBUTE_OPTION_DUPLICATE', 'This option code already exists', {
      errors: [{ path: 'code', message: 'This code is already in use for the attribute' }],
    });
  }
}

async function listClassifiedAttributeOptions(attributeId) {
  const attribute = await assertSelectionAttribute(attributeId);
  const options = await prisma.classifiedAttributeOption.findMany({
    where: { attributeId },
    orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    include: { _count: { select: { values: true } } },
  });
  return { attribute, options };
}

async function getClassifiedAttributeOption(attributeId, optionId) {
  const item = await prisma.classifiedAttributeOption.findFirst({
    where: { id: optionId, attributeId },
    include: {
      attribute: { select: { id: true, title: true, type: true, categoryId: true } },
      _count: { select: { values: true } },
    },
  });
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Classified attribute option not found');
  return item;
}

async function createClassifiedAttributeOption(attributeId, data, req) {
  await assertSelectionAttribute(attributeId);
  await assertUniqueOptionCode(attributeId, data.code);
  const created = await prisma.classifiedAttributeOption.create({
    data: { ...data, attributeId },
    include: { _count: { select: { values: true } } },
  });
  await audit(req, {
    action: 'CREATE',
    entity: 'ClassifiedAttributeOption',
    entityId: created.id,
    after: normalizeOption(created),
  });
  return created;
}

async function updateClassifiedAttributeOption(attributeId, optionId, data, req) {
  const existing = await getClassifiedAttributeOption(attributeId, optionId);
  await assertSelectionAttribute(attributeId);
  await assertUniqueOptionCode(attributeId, data.code, optionId);
  const updated = await prisma.classifiedAttributeOption.update({
    where: { id: optionId },
    data,
    include: { _count: { select: { values: true } } },
  });
  await audit(req, {
    action: 'UPDATE',
    entity: 'ClassifiedAttributeOption',
    entityId: optionId,
    before: normalizeOption(existing),
    after: normalizeOption(updated),
  });
  return updated;
}

async function deleteClassifiedAttributeOption(attributeId, optionId, req) {
  const existing = await getClassifiedAttributeOption(attributeId, optionId);
  if (existing._count.values > 0) {
    throw new AppError(409, 'CLASSIFIED_ATTRIBUTE_OPTION_IN_USE', 'An option used by ads cannot be deleted');
  }
  await prisma.classifiedAttributeOption.delete({ where: { id: optionId } });
  await audit(req, {
    action: 'DELETE',
    entity: 'ClassifiedAttributeOption',
    entityId: optionId,
    before: normalizeOption(existing),
  });
}

async function getNextDisplayOrder(categoryId) {
  await assertCategory(categoryId);
  const aggregate = await prisma.classifiedAttribute.aggregate({
    where: { categoryId },
    _max: { displayOrder: true },
  });
  return (aggregate._max.displayOrder || 0) + 10;
}

async function getNextOptionDisplayOrder(attributeId) {
  await assertSelectionAttribute(attributeId);
  const aggregate = await prisma.classifiedAttributeOption.aggregate({
    where: { attributeId },
    _max: { displayOrder: true },
  });
  return (aggregate._max.displayOrder || 0) + 10;
}

module.exports = {
  createClassifiedAttribute,
  createClassifiedAttributeOption,
  deleteClassifiedAttribute,
  deleteClassifiedAttributeOption,
  getClassifiedAttributeById,
  getClassifiedAttributeOption,
  getNextDisplayOrder,
  getNextOptionDisplayOrder,
  listClassifiedAttributeOptions,
  listClassifiedAttributes,
  updateClassifiedAttribute,
  updateClassifiedAttributeOption,
};
