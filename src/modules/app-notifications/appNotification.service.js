const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');

function mapNotification(item) {
  return {
    id: String(item.id),
    type: item.type,
    title: item.title,
    body: item.body,
    data: item.data,
    isRead: Boolean(item.readAt),
    readAt: item.readAt,
    createdAt: item.createdAt,
  };
}

async function listNotifications(appUser, query) {
  const where = {
    appUserId: appUser.id,
    ...(query.unreadOnly ? { readAt: null } : {}),
  };
  const skip = (query.page - 1) * query.pageSize;
  const [items, total, unreadCount] = await Promise.all([
    prisma.appNotification.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    }),
    prisma.appNotification.count({ where }),
    prisma.appNotification.count({ where: { appUserId: appUser.id, readAt: null } }),
  ]);
  return {
    items: items.map(mapNotification),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      pageCount: Math.ceil(total / query.pageSize),
      unreadCount,
    },
  };
}

async function unreadCount(appUser) {
  return {
    count: await prisma.appNotification.count({
      where: { appUserId: appUser.id, readAt: null },
    }),
  };
}

async function markRead(appUser, id) {
  const result = await prisma.appNotification.updateMany({
    where: { id, appUserId: appUser.id },
    data: { readAt: new Date() },
  });
  if (result.count !== 1) {
    throw new AppError(404, 'APP_NOTIFICATION_NOT_FOUND', 'Notification not found');
  }
  const item = await prisma.appNotification.findUnique({ where: { id } });
  return mapNotification(item);
}

async function markAllRead(appUser) {
  const result = await prisma.appNotification.updateMany({
    where: { appUserId: appUser.id, readAt: null },
    data: { readAt: new Date() },
  });
  return { updatedCount: result.count };
}

module.exports = {
  listNotifications,
  markAllRead,
  markRead,
  unreadCount,
};
