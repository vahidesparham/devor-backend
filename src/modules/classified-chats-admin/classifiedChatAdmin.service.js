const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');

const conversationInclude = {
  ad: {
    select: {
      id: true,
      publicCode: true,
      title: true,
      status: true,
      images: {
        orderBy: [{ isCover: 'desc' }, { displayOrder: 'asc' }],
        take: 1,
        select: { thumbnailUrl: true, imageUrl: true },
      },
    },
  },
  buyer: {
    select: {
      id: true,
      phone: true,
      firstName: true,
      lastName: true,
      avatar: true,
      isActive: true,
    },
  },
  owner: {
    select: {
      id: true,
      phone: true,
      firstName: true,
      lastName: true,
      avatar: true,
      isActive: true,
    },
  },
  blockedBy: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
};

function personName(person) {
  return [person?.firstName, person?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim() || person?.phone || person?.email || 'User';
}

function mapPerson(person) {
  if (!person) return null;
  return {
    id: person.id,
    name: personName(person),
    phone: person.phone || null,
    email: person.email || null,
    avatar: person.avatar || null,
    isActive: person.isActive ?? true,
  };
}

function mapConversation(item) {
  const cover = item.ad.images?.[0];
  return {
    id: String(item.id),
    status: item.status,
    ad: {
      id: item.ad.id,
      publicCode: item.ad.publicCode,
      title: item.ad.title,
      status: item.ad.status,
      coverImage: cover?.thumbnailUrl || cover?.imageUrl || null,
    },
    buyer: mapPerson(item.buyer),
    owner: mapPerson(item.owner),
    starterMessageCount: item.starterMessageCount,
    ownerHasReplied: Boolean(item.ownerRepliedAt),
    buyerUnreadCount: item.buyerUnreadCount,
    ownerUnreadCount: item.ownerUnreadCount,
    lastMessagePreview: item.lastMessagePreview,
    lastMessageAt: item.lastMessageAt,
    blockedReason: item.blockedReason,
    blockedAt: item.blockedAt,
    blockedBy: mapPerson(item.blockedBy),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function buildWhere(query) {
  return {
    ...(query.status ? { status: query.status } : {}),
    ...(query.q
      ? {
        OR: [
          { ad: { title: { contains: query.q } } },
          { ad: { publicCode: { contains: query.q } } },
          { buyer: { phone: { contains: query.q } } },
          { buyer: { firstName: { contains: query.q } } },
          { buyer: { lastName: { contains: query.q } } },
          { owner: { phone: { contains: query.q } } },
          { owner: { firstName: { contains: query.q } } },
          { owner: { lastName: { contains: query.q } } },
        ],
      }
      : {}),
  };
}

async function list(query) {
  const where = buildWhere(query);
  const skip = (query.page - 1) * query.pageSize;
  const [items, total] = await Promise.all([
    prisma.classifiedConversation.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
      include: conversationInclude,
    }),
    prisma.classifiedConversation.count({ where }),
  ]);
  return {
    items: items.map(mapConversation),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      pageCount: Math.ceil(total / query.pageSize),
    },
  };
}

async function stats() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [byStatus, messages24h, unread] = await Promise.all([
    prisma.classifiedConversation.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.classifiedMessage.count({
      where: { createdAt: { gte: since } },
    }),
    prisma.classifiedConversation.aggregate({
      _sum: {
        buyerUnreadCount: true,
        ownerUnreadCount: true,
      },
    }),
  ]);
  const statuses = Object.fromEntries(
    byStatus.map((item) => [item.status, item._count._all]),
  );
  return {
    active: statuses.ACTIVE || 0,
    blocked: statuses.BLOCKED || 0,
    closed: statuses.CLOSED || 0,
    messages24h,
    unread: Number(unread._sum.buyerUnreadCount || 0)
      + Number(unread._sum.ownerUnreadCount || 0),
  };
}

async function detail(id) {
  const conversation = await prisma.classifiedConversation.findUnique({
    where: { id },
    include: {
      ...conversationInclude,
      messages: {
        orderBy: { id: 'desc' },
        take: 200,
        include: {
          sender: {
            select: {
              id: true,
              phone: true,
              firstName: true,
              lastName: true,
              avatar: true,
              isActive: true,
            },
          },
        },
      },
    },
  });
  if (!conversation) {
    throw new AppError(
      404,
      'CLASSIFIED_CHAT_NOT_FOUND',
      'Classified conversation not found',
    );
  }
  return {
    ...mapConversation(conversation),
    messages: conversation.messages.slice().reverse().map((message) => ({
      id: String(message.id),
      senderRole: message.senderRole,
      sender: mapPerson(message.sender),
      body: message.body,
      createdAt: message.createdAt,
    })),
  };
}

async function block(admin, id, input) {
  await detail(id);
  const updated = await prisma.classifiedConversation.update({
    where: { id },
    data: {
      status: 'BLOCKED',
      blockedByAdminId: admin.id,
      blockedReason: input.reason,
      blockedAt: new Date(),
    },
    include: conversationInclude,
  });
  return mapConversation(updated);
}

async function unblock(id) {
  await detail(id);
  const updated = await prisma.classifiedConversation.update({
    where: { id },
    data: {
      status: 'ACTIVE',
      blockedByAdminId: null,
      blockedReason: null,
      blockedAt: null,
    },
    include: conversationInclude,
  });
  return mapConversation(updated);
}

module.exports = {
  block,
  detail,
  list,
  stats,
  unblock,
};
