const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const { audit } = require('../../shared/audit/audit');

async function listImageConfigs(query) {
  const page = query.page;
  const pageSize = query.pageSize;
  const skip = (page - 1) * pageSize;

  const where = {};
  if (query.q) {
    where.OR = [
      { code: { contains: query.q } },
      { folderName: { contains: query.q } }
    ];
  }

  const [items, total] = await Promise.all([
    prisma.imageConfig.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ [query.sortBy]: query.sortDir }]
    }),
    prisma.imageConfig.count({ where })
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

async function getImageConfigById(id) {
  const item = await prisma.imageConfig.findUnique({ where: { id } });
  if (!item) {
    throw new AppError(404, 'NOT_FOUND', 'Image config not found');
  }
  return item;
}

async function createImageConfig(data, req) {
  const created = await prisma.imageConfig.create({
    data: {
      code: data.code,
      width: data.width,
      height: data.height,
      thumbnailWidth: data.thumbnailWidth,
      thumbnailHeight: data.thumbnailHeight,
      folderName: data.folderName
    }
  });

  await audit(req, {
    action: 'CREATE',
    entity: 'ImageConfig',
    entityId: created.id,
    after: created
  });

  return created;
}

async function updateImageConfig(id, data, req) {
  const existing = await prisma.imageConfig.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Image config not found');
  }

  const updated = await prisma.imageConfig.update({
    where: { id },
    data
  });

  await audit(req, {
    action: 'UPDATE',
    entity: 'ImageConfig',
    entityId: id,
    before: existing,
    after: updated
  });

  return updated;
}

async function deleteImageConfig(id, req) {
  const existing = await prisma.imageConfig.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Image config not found');
  }

  await prisma.imageConfig.delete({ where: { id } });

  await audit(req, {
    action: 'DELETE',
    entity: 'ImageConfig',
    entityId: id,
    before: existing
  });
}

module.exports = {
  listImageConfigs,
  getImageConfigById,
  createImageConfig,
  updateImageConfig,
  deleteImageConfig
};
