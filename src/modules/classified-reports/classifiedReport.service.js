const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const { audit } = require('../../shared/audit/audit');

function displayName(user) {
  if (!user) return null;
  return [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.phone;
}

function mapReport(item) {
  return {
    id: item.id,
    version: item.version,
    adId: item.adId,
    reasonCode: item.reasonCode,
    description: item.description,
    status: item.status,
    resolutionNote: item.resolutionNote,
    reviewedAt: item.reviewedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    ad: item.ad ? {
      id: item.ad.id,
      publicCode: item.ad.publicCode,
      title: item.ad.title,
      status: item.ad.status,
      coverImage: item.ad.images?.[0]?.thumbnailUrl || item.ad.images?.[0]?.imageUrl || null,
      category: item.ad.category ? {
        id: item.ad.category.id,
        title: item.ad.category.title,
      } : null,
      owner: item.ad.appUser ? {
        id: item.ad.appUser.id,
        displayName: displayName(item.ad.appUser),
        phone: item.ad.appUser.phone,
      } : null,
    } : null,
    reporter: item.reporter ? {
      id: item.reporter.id,
      displayName: displayName(item.reporter),
      phone: item.reporter.phone,
    } : null,
    reviewedBy: item.reviewedBy ? {
      id: item.reviewedBy.id,
      displayName: displayName(item.reviewedBy) || item.reviewedBy.email,
      email: item.reviewedBy.email,
    } : null,
  };
}

function reportInclude() {
  return {
    ad: {
      select: {
        id: true,
        publicCode: true,
        title: true,
        status: true,
        category: { select: { id: true, title: true } },
        appUser: { select: { id: true, phone: true, firstName: true, lastName: true } },
        images: {
          where: { isCover: true },
          orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
          take: 1,
          select: { imageUrl: true, thumbnailUrl: true },
        },
      },
    },
    reporter: { select: { id: true, phone: true, firstName: true, lastName: true } },
    reviewedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
  };
}

function buildWhere(query) {
  const where = {};
  if (query.status) where.status = query.status;
  if (query.adId) where.adId = query.adId;
  if (query.reasonCode) where.reasonCode = query.reasonCode;
  if (query.q) {
    where.OR = [
      { reasonCode: { contains: query.q } },
      { description: { contains: query.q } },
      { resolutionNote: { contains: query.q } },
      { ad: { publicCode: { contains: query.q } } },
      { ad: { title: { contains: query.q } } },
      { reporter: { phone: { contains: query.q } } },
    ];
  }
  return where;
}

async function listClassifiedReports(query) {
  const where = buildWhere(query);
  const skip = (query.page - 1) * query.pageSize;
  const nullableSort = query.sortBy === 'reviewedAt';
  const [items, total] = await Promise.all([
    prisma.classifiedReport.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [
        { [query.sortBy]: nullableSort ? { sort: query.sortDir, nulls: 'last' } : query.sortDir },
        { id: 'desc' },
      ],
      include: reportInclude(),
    }),
    prisma.classifiedReport.count({ where }),
  ]);
  return {
    items: items.map(mapReport),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      pageCount: Math.ceil(total / query.pageSize),
    },
  };
}

async function getReportStats() {
  const rows = await prisma.classifiedReport.groupBy({
    by: ['status'],
    _count: { _all: true },
  });
  return {
    byStatus: Object.fromEntries(rows.map((row) => [row.status, row._count._all])),
    openCount: rows
      .filter((row) => ['OPEN', 'REVIEWING'].includes(row.status))
      .reduce((sum, row) => sum + row._count._all, 0),
  };
}

async function findReport(id) {
  const item = await prisma.classifiedReport.findUnique({
    where: { id: Number(id) },
    include: reportInclude(),
  });
  if (!item) throw new AppError(404, 'CLASSIFIED_REPORT_NOT_FOUND', 'Classified report not found');
  return item;
}

async function getClassifiedReportById(id) {
  return mapReport(await findReport(id));
}

async function transitionReport(id, data, req, options) {
  const existing = await findReport(id);
  if (existing.version !== Number(data.expectedVersion)) {
    throw new AppError(409, 'CLASSIFIED_REPORT_VERSION_CONFLICT', 'Classified report was changed by another request');
  }
  if (!options.from.includes(existing.status)) {
    throw new AppError(409, 'CLASSIFIED_REPORT_TRANSITION_NOT_ALLOWED', `Action is not allowed while report is ${existing.status}`);
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const updated = await tx.classifiedReport.updateMany({
      where: { id: existing.id, version: Number(data.expectedVersion) },
      data: {
        status: options.to,
        version: { increment: 1 },
        reviewedByAdminId: req.admin.id,
        reviewedAt: now,
        resolutionNote: options.close ? data.note : (data.note || existing.resolutionNote),
      },
    });
    if (updated.count !== 1) {
      throw new AppError(409, 'CLASSIFIED_REPORT_VERSION_CONFLICT', 'Classified report was changed by another request');
    }

    await audit(req, {
      action: 'UPDATE',
      entity: 'ClassifiedReport',
      entityId: existing.id,
      before: { status: existing.status, version: existing.version, resolutionNote: existing.resolutionNote },
      after: { status: options.to, version: existing.version + 1, resolutionNote: data.note || existing.resolutionNote },
      details: { adId: existing.adId, action: options.reasonCode },
    }, tx);
  });
  return getClassifiedReportById(existing.id);
}

function reviewClassifiedReport(id, data, req) {
  return transitionReport(id, data, req, {
    from: ['OPEN'],
    to: 'REVIEWING',
    reasonCode: 'ADMIN_STARTED_REVIEW',
    close: false,
  });
}

function resolveClassifiedReport(id, data, req) {
  return transitionReport(id, data, req, {
    from: ['OPEN', 'REVIEWING'],
    to: 'RESOLVED',
    reasonCode: 'ADMIN_RESOLVED_REPORT',
    close: true,
  });
}

function dismissClassifiedReport(id, data, req) {
  return transitionReport(id, data, req, {
    from: ['OPEN', 'REVIEWING'],
    to: 'DISMISSED',
    reasonCode: 'ADMIN_DISMISSED_REPORT',
    close: true,
  });
}

module.exports = {
  dismissClassifiedReport,
  getClassifiedReportById,
  getReportStats,
  listClassifiedReports,
  resolveClassifiedReport,
  reviewClassifiedReport,
};
