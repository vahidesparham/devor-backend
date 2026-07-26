const test = require('node:test');
const assert = require('node:assert/strict');
const prisma = require('../src/prisma');
const chatService = require('../src/modules/app-classified-chats/appClassifiedChat.service');
const chatAdminService = require('../src/modules/classified-chats-admin/classifiedChatAdmin.service');

test('classified chat enforces three starter messages until the owner replies', async () => {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const ad = await prisma.classifiedAd.findFirst({
    where: {
      ownerType: 'APP_USER',
      appUserId: { not: null },
      status: 'PUBLISHED',
      allowChat: true,
      deletedAt: null,
      appUser: { isActive: true },
    },
    orderBy: { id: 'asc' },
  });
  assert.ok(ad, 'A published app-user classified ad is required');

  const buyer = await prisma.appUser.create({
    data: {
      phone: `+99292${suffix.slice(-7)}`,
      firstName: 'Chat buyer',
      isActive: true,
    },
  });
  let conversationId;
  try {
    const conversation = await chatService.startConversation(buyer, ad.id);
    conversationId = BigInt(conversation.id);
    assert.equal(conversation.role, 'BUYER');
    assert.equal(conversation.starterMessagesRemaining, 3);

    for (let index = 1; index <= 3; index += 1) {
      const result = await chatService.sendMessage(buyer, conversationId, {
        clientMessageId: `chat-test-${suffix}-${index}`,
        body: `Starter message ${index}`,
      });
      assert.equal(result.conversation.starterMessagesRemaining, 3 - index);
    }

    const duplicate = await chatService.sendMessage(buyer, conversationId, {
      clientMessageId: `chat-test-${suffix}-3`,
      body: 'Starter message 3',
    });
    assert.equal(duplicate.duplicate, true);

    await assert.rejects(
      () => chatService.sendMessage(buyer, conversationId, {
        clientMessageId: `chat-test-${suffix}-4`,
        body: 'Blocked starter message',
      }),
      (error) => error.code === 'CLASSIFIED_CHAT_STARTER_LIMIT_REACHED',
    );

    const owner = { id: ad.appUserId };
    const ownerReply = await chatService.sendMessage(owner, conversationId, {
      clientMessageId: `chat-test-${suffix}-owner`,
      body: 'Owner reply',
    });
    assert.equal(ownerReply.conversation.ownerHasReplied, true);
    assert.equal(ownerReply.conversation.starterMessagesRemaining, null);

    const unlocked = await chatService.sendMessage(buyer, conversationId, {
      clientMessageId: `chat-test-${suffix}-after-reply`,
      body: 'Message after owner reply',
    });
    assert.equal(unlocked.conversation.canSend, true);

    const admin = await prisma.adminUser.findFirst({ orderBy: { id: 'asc' } });
    assert.ok(admin, 'An admin user is required for moderation');
    const blocked = await chatAdminService.block(admin, conversationId, {
      reason: 'Integration safety check',
    });
    assert.equal(blocked.status, 'BLOCKED');
    await assert.rejects(
      () => chatService.sendMessage(buyer, conversationId, {
        clientMessageId: `chat-test-${suffix}-blocked`,
        body: 'Blocked message',
      }),
      (error) => error.code === 'CLASSIFIED_CHAT_NOT_ACTIVE',
    );
    const reopened = await chatAdminService.unblock(conversationId);
    assert.equal(reopened.status, 'ACTIVE');
  } finally {
    if (conversationId) {
      const events = await prisma.appEventOutbox.findMany({
        where: {
          aggregateType: 'CLASSIFIED_CONVERSATION',
          aggregateId: String(conversationId),
        },
        select: { id: true },
      });
      if (events.length) {
        await prisma.appNotification.deleteMany({
          where: { sourceEventId: { in: events.map((event) => event.id) } },
        });
        await prisma.appEventOutbox.deleteMany({
          where: { id: { in: events.map((event) => event.id) } },
        });
      }
      await prisma.classifiedConversation.delete({
        where: { id: conversationId },
      }).catch(() => {});
    }
    await prisma.appUser.delete({ where: { id: buyer.id } }).catch(() => {});
  }
});

test.after(async () => {
  await prisma.$disconnect();
});
