const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');

function parseBigIntId(rawId) {
  try {
    return BigInt(rawId);
  } catch (_err) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
      errors: [{ path: 'id', message: 'Invalid id' }],
    });
  }
}

function toDisplayName(admin) {
  if (!admin) return null;
  const fullName = [admin.firstName, admin.lastName].filter(Boolean).join(' ').trim();
  return fullName || admin.email || null;
}

function toListItem(item) {
  return {
    id: item.id.toString(),
    createdAt: item.createdAt,
    traceId: item.traceId,
    adminId: item.adminId,
    action: item.action,
    entity: item.entity,
    entityId: item.entityId,
    method: item.method,
    path: item.path,
    ip: item.ip,
    userAgent: item.userAgent,
    admin: item.admin
      ? {
          id: item.admin.id,
          email: item.admin.email,
          firstName: item.admin.firstName,
          lastName: item.admin.lastName,
          avatar: item.admin.avatar,
          displayName: toDisplayName(item.admin),
        }
      : null,
  };
}

function toDetail(item) {
  return {
    ...toListItem(item),
    before: item.before,
    after: item.after,
    details: item.details,
  };
}

async function listAuditLogs(query) {
  const page = query.page;
  const pageSize = query.pageSize;
  const skip = (page - 1) * pageSize;

  const where = {};

  if (query.adminId !== undefined) where.adminId = query.adminId;
  if (query.action) where.action = query.action;
  if (query.entity) where.entity = { contains: query.entity };

  if (query.q) {
    where.OR = [
      { traceId: { contains: query.q } },
      { entity: { contains: query.q } },
      { entityId: { contains: query.q } },
      { path: { contains: query.q } },
      { method: { contains: query.q } },
      {
        admin: {
          is: {
            OR: [
              { email: { contains: query.q } },
              { firstName: { contains: query.q } },
              { lastName: { contains: query.q } },
            ],
          },
        },
      },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ [query.sortBy]: query.sortDir }],
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items: items.map(toListItem),
    meta: {
      page,
      pageSize,
      total,
      pageCount: Math.ceil(total / pageSize),
    },
  };
}

async function getAuditLogById(rawId) {
  const id = parseBigIntId(rawId);

  const item = await prisma.auditLog.findUnique({
    where: { id },
    include: {
      admin: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
    },
  });

  if (!item) {
    throw new AppError(404, 'NOT_FOUND', 'Audit log not found');
  }

  return toDetail(item);
}

async function deleteAllAuditLogs() {
  const result = await prisma.auditLog.deleteMany({});
  return {
    count: result.count || 0,
  };
}

module.exports = {
  listAuditLogs,
  getAuditLogById,
  deleteAllAuditLogs,
};
