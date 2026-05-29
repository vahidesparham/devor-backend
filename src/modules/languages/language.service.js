const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const { audit } = require('../../shared/audit/audit');

async function getLanguageById(id) {
  const item = await prisma.language.findUnique({ where: { id } });
  if (!item) {
    throw new AppError(404, 'NOT_FOUND', 'Language not found');
  }
  return item;
}

async function listLanguages(query) {
  const page = query.page;
  const pageSize = query.pageSize;
  const skip = (page - 1) * pageSize;

  const where = {};

  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }
  if (query.direction !== undefined) {
    where.direction = query.direction;
  }
  if (query.q) {
    where.OR = [
      { code: { contains: query.q } },
      { name: { contains: query.q } },
      { nativeName: { contains: query.q } }
    ];
  }

  const orderBy = [{ [query.sortBy]: query.sortDir }];
  if (query.sortBy !== 'id') {
    orderBy.push({ id: 'asc' });
  }

  const [items, total] = await Promise.all([
    prisma.language.findMany({
      where,
      skip,
      take: pageSize,
      orderBy
    }),
    prisma.language.count({ where })
  ]);

  return {
    items,
    meta: {
      page,
      pageSize,
      total,
      pageCount: Math.ceil(total / pageSize)
    }
  };
}

async function createLanguage(data, req) {
  const created = await prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.language.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      });
    }

    const language = await tx.language.create({
      data: {
        code: data.code,
        name: data.name,
        nativeName: data.nativeName ?? null,
        direction: data.direction,
        isActive: data.isActive,
        isDefault: data.isDefault
      }
    });

    return language;
  });

  await audit(req, {
    action: 'CREATE',
    entity: 'Language',
    entityId: created.id,
    after: created
  });

  return created;
}

async function updateLanguage(id, data, req) {
  const existing = await prisma.language.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Language not found');
  }

  const before = {
    code: existing.code,
    name: existing.name,
    nativeName: existing.nativeName,
    direction: existing.direction,
    isActive: existing.isActive,
    isDefault: existing.isDefault
  };

  if (existing.isDefault && data.isActive === false) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
      errors: [{ path: 'isActive', message: 'Default language cannot be inactive' }]
    });
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (data.isDefault === true) {
      await tx.language.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      });
    }

    if (existing.isDefault && data.isDefault === false) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
        errors: [{ path: 'isDefault', message: 'At least one default language is required' }]
      });
    }

    return tx.language.update({
      where: { id },
      data: {
        ...(data.code !== undefined ? { code: data.code } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.nativeName !== undefined ? { nativeName: data.nativeName } : {}),
        ...(data.direction !== undefined ? { direction: data.direction } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.isDefault !== undefined ? { isDefault: data.isDefault } : {})
      }
    });
  });

  await audit(req, {
    action: 'UPDATE',
    entity: 'Language',
    entityId: id,
    before,
    after: {
      code: updated.code,
      name: updated.name,
      nativeName: updated.nativeName,
      direction: updated.direction,
      isActive: updated.isActive,
      isDefault: updated.isDefault
    }
  });

  return updated;
}

async function deleteLanguage(id, req) {
  const existing = await prisma.language.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Language not found');
  }

  if (existing.isDefault) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
      errors: [{ path: 'id', message: 'Default language cannot be deleted' }]
    });
  }

  await prisma.language.delete({ where: { id } });

  await audit(req, {
    action: 'DELETE',
    entity: 'Language',
    entityId: id,
    before: {
      code: existing.code,
      name: existing.name,
      nativeName: existing.nativeName,
      direction: existing.direction,
      isActive: existing.isActive,
      isDefault: existing.isDefault
    }
  });
}

module.exports = {
  listLanguages,
  getLanguageById,
  createLanguage,
  updateLanguage,
  deleteLanguage
};
