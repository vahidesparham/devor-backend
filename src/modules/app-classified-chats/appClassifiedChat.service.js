const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const {
  DEFAULT_CLASSIFIED_SETTINGS,
  validateClassifiedSettings,
} = require('../classifieds-domain/classifiedSettings');
const { enqueueAppEvent } = require('../app-events/appEventOutbox.service');

const ACTIVE_AD_STATUS = 'PUBLISHED';

const conversationInclude = {
  ad: {
    select: {
      id: true,
      publicCode: true,
      title: true,
      status: true,
      allowChat: true,
      deletedAt: true,
      appUserId: true,
      images: {
        orderBy: [{ isCover: 'desc' }, { displayOrder: 'asc' }, { id: 'asc' }],
        take: 1,
        select: {
          imageUrl: true,
          thumbnailUrl: true,
        },
      },
    },
  },
  buyer: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatar: true,
    },
  },
  owner: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatar: true,
    },
  },
};

async function getSettings(db = prisma) {
  const row = await db.classifiedSetting.findUnique({ where: { id: 1 } });
  const settings = { ...DEFAULT_CLASSIFIED_SETTINGS, ...(row || {}) };
  const issues = validateClassifiedSettings(settings);
  if (issues.length) {
    throw new AppError(
      500,
      'CLASSIFIED_SETTINGS_INVALID',
      'Classified settings are invalid',
      { details: { issues } },
    );
  }
  return settings;
}

function displayName(user) {
  const name = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  return name || 'کاربر';
}

function mapPerson(user) {
  return {
    id: user.id,
    name: displayName(user),
    avatar: user.avatar || null,
  };
}

function mapAd(ad) {
  const image = ad.images?.[0];
  return {
    id: ad.id,
    publicCode: ad.publicCode,
    title: ad.title,
    status: ad.status,
    coverImage: image
      ? {
        imageUrl: image.imageUrl,
        thumbnailUrl: image.thumbnailUrl,
      }
      : null,
  };
}

function participantRole(conversation, appUserId) {
  if (conversation.ownerAppUserId === Number(appUserId)) return 'OWNER';
  if (conversation.buyerAppUserId === Number(appUserId)) return 'BUYER';
  throw new AppError(
    403,
    'CLASSIFIED_CHAT_FORBIDDEN',
    'You are not a participant in this conversation',
  );
}

function mapConversation(conversation, appUserId, starterLimit) {
  const role = participantRole(conversation, appUserId);
  const isOwner = role === 'OWNER';
  const starterRemaining = conversation.ownerRepliedAt
    ? null
    : Math.max(0, starterLimit - conversation.starterMessageCount);
  const active = conversation.status === 'ACTIVE';
  const canSend = active && (
    isOwner
    || Boolean(conversation.ownerRepliedAt)
    || starterRemaining > 0
  );

  return {
    id: String(conversation.id),
    status: conversation.status,
    role,
    peer: mapPerson(isOwner ? conversation.buyer : conversation.owner),
    ad: mapAd(conversation.ad),
    unreadCount: isOwner
      ? conversation.ownerUnreadCount
      : conversation.buyerUnreadCount,
    starterMessageLimit: starterLimit,
    starterMessageCount: conversation.starterMessageCount,
    starterMessagesRemaining: starterRemaining,
    ownerHasReplied: Boolean(conversation.ownerRepliedAt),
    canSend,
    lastMessagePreview: conversation.lastMessagePreview,
    lastMessageAt: conversation.lastMessageAt,
    blockedReason: conversation.status === 'BLOCKED'
      ? conversation.blockedReason
      : null,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

function mapMessage(message, appUserId) {
  return {
    id: String(message.id),
    conversationId: String(message.conversationId),
    senderAppUserId: message.senderAppUserId,
    senderRole: message.senderRole,
    body: message.body,
    isMine: message.senderAppUserId === Number(appUserId),
    createdAt: message.createdAt,
  };
}

async function findParticipantConversation(appUser, conversationId, db = prisma) {
  const conversation = await db.classifiedConversation.findFirst({
    where: {
      id: conversationId,
      OR: [
        { buyerAppUserId: appUser.id },
        { ownerAppUserId: appUser.id },
      ],
    },
    include: conversationInclude,
  });
  if (!conversation) {
    throw new AppError(
      404,
      'CLASSIFIED_CHAT_NOT_FOUND',
      'Classified conversation not found',
    );
  }
  return conversation;
}

async function startConversation(appUser, adId) {
  const settings = await getSettings();
  if (!settings.allowChatContact) {
    throw new AppError(
      503,
      'CLASSIFIED_CHAT_DISABLED',
      'Classified chat is currently unavailable',
    );
  }

  const existing = await prisma.classifiedConversation.findUnique({
    where: {
      adId_buyerAppUserId: {
        adId: Number(adId),
        buyerAppUserId: appUser.id,
      },
    },
    include: conversationInclude,
  });
  if (existing) {
    return mapConversation(existing, appUser.id, settings.chatStarterMessageLimit);
  }

  const conversation = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT id
      FROM ClassifiedAd
      WHERE id = ${Number(adId)}
      FOR UPDATE
    `;
    const ad = await tx.classifiedAd.findFirst({
      where: {
        id: Number(adId),
        ownerType: 'APP_USER',
        status: ACTIVE_AD_STATUS,
        allowChat: true,
        deletedAt: null,
        publishedAt: { not: null },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        appUser: { isActive: true },
      },
      select: {
        id: true,
        appUserId: true,
      },
    });
    if (!ad?.appUserId) {
      throw new AppError(
        409,
        'CLASSIFIED_CHAT_UNAVAILABLE',
        'Chat is not available for this classified ad',
      );
    }
    if (ad.appUserId === appUser.id) {
      throw new AppError(
        409,
        'CLASSIFIED_CHAT_OWN_AD',
        'You cannot start a conversation on your own ad',
      );
    }

    const duplicate = await tx.classifiedConversation.findUnique({
      where: {
        adId_buyerAppUserId: {
          adId: ad.id,
          buyerAppUserId: appUser.id,
        },
      },
    });
    const row = duplicate || await tx.classifiedConversation.create({
      data: {
        adId: ad.id,
        buyerAppUserId: appUser.id,
        ownerAppUserId: ad.appUserId,
      },
    });
    return tx.classifiedConversation.findUnique({
      where: { id: row.id },
      include: conversationInclude,
    });
  });

  return mapConversation(conversation, appUser.id, settings.chatStarterMessageLimit);
}

async function listConversations(appUser, query) {
  const settings = await getSettings();
  const participantFilter = {
    OR: [
      { buyerAppUserId: appUser.id },
      { ownerAppUserId: appUser.id },
    ],
  };
  const where = {
    lastMessageAt: { not: null },
    AND: [
      participantFilter,
      ...(query.q
        ? [{
          OR: [
            { ad: { title: { contains: query.q } } },
            { buyer: { firstName: { contains: query.q } } },
            { buyer: { lastName: { contains: query.q } } },
            { owner: { firstName: { contains: query.q } } },
            { owner: { lastName: { contains: query.q } } },
          ],
        }]
        : []),
    ],
  };
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
    items: items.map((item) => mapConversation(
      item,
      appUser.id,
      settings.chatStarterMessageLimit,
    )),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      pageCount: Math.ceil(total / query.pageSize),
      hasNext: skip + items.length < total,
    },
  };
}

async function unreadCount(appUser) {
  const [buyer, owner] = await Promise.all([
    prisma.classifiedConversation.aggregate({
      where: { buyerAppUserId: appUser.id },
      _sum: { buyerUnreadCount: true },
    }),
    prisma.classifiedConversation.aggregate({
      where: { ownerAppUserId: appUser.id },
      _sum: { ownerUnreadCount: true },
    }),
  ]);
  return {
    count: Number(buyer._sum.buyerUnreadCount || 0)
      + Number(owner._sum.ownerUnreadCount || 0),
  };
}

async function getConversation(appUser, conversationId) {
  const [conversation, settings] = await Promise.all([
    findParticipantConversation(appUser, conversationId),
    getSettings(),
  ]);
  return mapConversation(
    conversation,
    appUser.id,
    settings.chatStarterMessageLimit,
  );
}

async function listMessages(appUser, conversationId, query) {
  await findParticipantConversation(appUser, conversationId);
  const where = {
    conversationId,
    ...(query.beforeId ? { id: { lt: query.beforeId } } : {}),
    ...(query.afterId ? { id: { gt: query.afterId } } : {}),
  };
  const ascending = Boolean(query.afterId);
  const rows = await prisma.classifiedMessage.findMany({
    where,
    take: query.limit + 1,
    orderBy: { id: ascending ? 'asc' : 'desc' },
  });
  const hasMore = rows.length > query.limit;
  const items = rows.slice(0, query.limit);
  if (!ascending) items.reverse();
  return {
    items: items.map((item) => mapMessage(item, appUser.id)),
    meta: { hasMore },
  };
}

async function markRead(appUser, conversationId) {
  const conversation = await findParticipantConversation(appUser, conversationId);
  const role = participantRole(conversation, appUser.id);
  await prisma.classifiedConversation.update({
    where: { id: conversation.id },
    data: role === 'OWNER'
      ? { ownerUnreadCount: 0 }
      : { buyerUnreadCount: 0 },
  });
  return { unreadCount: 0 };
}

async function sendMessage(appUser, conversationId, input) {
  const settings = await getSettings();
  if (!settings.allowChatContact) {
    throw new AppError(
      503,
      'CLASSIFIED_CHAT_DISABLED',
      'Classified chat is currently unavailable',
    );
  }
  const body = input.body.trim();
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT id
      FROM ClassifiedConversation
      WHERE id = ${conversationId}
      FOR UPDATE
    `;
    const conversation = await findParticipantConversation(
      appUser,
      conversationId,
      tx,
    );
    const role = participantRole(conversation, appUser.id);

    const existing = await tx.classifiedMessage.findUnique({
      where: {
        conversationId_senderAppUserId_clientMessageId: {
          conversationId,
          senderAppUserId: appUser.id,
          clientMessageId: input.clientMessageId,
        },
      },
    });
    if (existing) {
      return { conversation, message: existing, duplicate: true };
    }

    if (conversation.status !== 'ACTIVE') {
      throw new AppError(
        409,
        'CLASSIFIED_CHAT_NOT_ACTIVE',
        conversation.status === 'BLOCKED'
          ? 'This conversation has been blocked'
          : 'This conversation is closed',
      );
    }
    if (
      role === 'BUYER'
      && !conversation.ownerRepliedAt
      && conversation.starterMessageCount >= settings.chatStarterMessageLimit
    ) {
      throw new AppError(
        409,
        'CLASSIFIED_CHAT_STARTER_LIMIT_REACHED',
        'Wait for the ad owner to reply before sending more messages',
        {
          details: {
            limit: settings.chatStarterMessageLimit,
            current: conversation.starterMessageCount,
          },
        },
      );
    }

    const message = await tx.classifiedMessage.create({
      data: {
        conversationId,
        senderAppUserId: appUser.id,
        senderRole: role,
        clientMessageId: input.clientMessageId,
        body,
      },
    });
    const ownerFirstReply = role === 'OWNER' && !conversation.ownerRepliedAt;
    const updated = await tx.classifiedConversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: now,
        lastMessagePreview: body.replace(/\s+/g, ' ').slice(0, 200),
        ...(role === 'BUYER'
          ? {
            starterMessageCount: !conversation.ownerRepliedAt
              ? { increment: 1 }
              : undefined,
            ownerUnreadCount: { increment: 1 },
          }
          : {
            ownerRepliedAt: ownerFirstReply ? now : undefined,
            buyerUnreadCount: { increment: 1 },
          }),
      },
      include: conversationInclude,
    });
    const recipientAppUserId = role === 'BUYER'
      ? conversation.ownerAppUserId
      : conversation.buyerAppUserId;
    if (settings.notificationsEnabled) {
      await enqueueAppEvent(tx, {
        eventType: 'CLASSIFIED_CHAT_MESSAGE_RECEIVED',
        aggregateType: 'CLASSIFIED_CONVERSATION',
        aggregateId: conversation.id,
        recipientAppUserId,
        dedupeKey: `classified-chat:message:${message.id}`,
        payload: {
          title: `پیام جدید برای ${conversation.ad.title}`,
          body: body.replace(/\s+/g, ' ').slice(0, 180),
          data: {
            conversationId: String(conversation.id),
            messageId: String(message.id),
            adId: conversation.ad.id,
          },
        },
      });
    }
    return { conversation: updated, message, duplicate: false };
  });

  return {
    message: mapMessage(result.message, appUser.id),
    conversation: mapConversation(
      result.conversation,
      appUser.id,
      settings.chatStarterMessageLimit,
    ),
    duplicate: result.duplicate,
  };
}

module.exports = {
  getConversation,
  listConversations,
  listMessages,
  markRead,
  sendMessage,
  startConversation,
  unreadCount,
};
