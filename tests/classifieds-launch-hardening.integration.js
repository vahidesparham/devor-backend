const test = require('node:test');
const assert = require('node:assert/strict');
const prisma = require('../src/prisma');
const {
  dispatchPendingAppEvents,
  enqueueAppEvent,
} = require('../src/modules/app-events/appEventOutbox.service');
const notificationService = require('../src/modules/app-notifications/appNotification.service');
const operationService = require('../src/modules/classified-operations/classifiedOperation.service');

test('app event outbox dispatches exactly one durable notification', async () => {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const user = await prisma.appUser.create({
    data: {
      phone: `+99293${suffix.slice(-7)}`,
      firstName: 'Notification',
      isActive: true,
    },
  });
  try {
    const input = {
      eventType: 'CLASSIFIED_AD_PUBLISHED',
      aggregateType: 'CLASSIFIED_AD',
      aggregateId: `DV${suffix.slice(-10)}`,
      recipientAppUserId: user.id,
      dedupeKey: `test-classified-event-${suffix}`,
      payload: {
        title: 'آگهی منتشر شد',
        body: 'آگهی آزمایشی منتشر شد.',
        data: { adId: 1 },
      },
    };
    const first = await enqueueAppEvent(prisma, input);
    const duplicate = await enqueueAppEvent(prisma, input);
    assert.equal(String(first.id), String(duplicate.id));

    const dispatched = await dispatchPendingAppEvents({ batchSize: 10 });
    assert.ok(dispatched.processedCount >= 1);

    const list = await notificationService.listNotifications(user, {
      page: 1,
      pageSize: 20,
      unreadOnly: false,
    });
    const notification = list.items.find((item) => item.type === input.eventType);
    assert.ok(notification);
    assert.equal(notification.isRead, false);

    const marked = await notificationService.markRead(user, BigInt(notification.id));
    assert.equal(marked.isRead, true);

    const status = await operationService.getOperationalStatus();
    assert.ok(status.featureFlags);
    assert.ok(Array.isArray(status.jobs));
    assert.equal(typeof status.events.pendingCount, 'number');
  } finally {
    await prisma.appUser.delete({ where: { id: user.id } }).catch(() => {});
  }
});

test.after(async () => {
  await prisma.$disconnect();
});
