const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const env = require('../src/config/env');
const prisma = require('../src/prisma');

test('classified admin API moderates ads and reports with versions, history, and audit', async () => {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const created = { adminId: null, userId: null, countryId: null, categoryId: null, adIds: [] };
  const traceIds = [];
  let server;

  try {
    const superAdminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
    assert.ok(superAdminRole);

    const admin = await prisma.adminUser.create({
      data: {
        email: `classified.moderator.${suffix}@example.test`,
        firstName: 'Classified',
        lastName: 'Moderator',
        passwordHash: 'integration-test-not-login-capable',
        isActive: true,
        adminUserRoles: { create: { roleId: superAdminRole.id } },
      },
    });
    created.adminId = admin.id;

    const owner = await prisma.appUser.create({
      data: {
        phone: `+99292${suffix.slice(-7)}`,
        firstName: 'Ad',
        lastName: 'Owner',
        isActive: true,
        wallet: { create: { currency: 'TJS' } },
      },
    });
    created.userId = owner.id;

    const country = await prisma.country.create({
      data: {
        code: `M${suffix.slice(-7)}`,
        title: `Moderation country ${suffix}`,
        phoneCode: '+992',
        isActive: true,
        cities: {
          create: {
            code: `moderation_city_${suffix}`,
            title: `Moderation city ${suffix}`,
            isActive: true,
            areas: {
              create: {
                code: `moderation_area_${suffix}`,
                title: `Moderation area ${suffix}`,
                isActive: true,
              },
            },
          },
        },
      },
      include: {
        cities: {
          include: { areas: true },
        },
      },
    });
    created.countryId = country.id;
    const city = country.cities[0];
    const area = city.areas[0];

    const category = await prisma.classifiedCategory.create({
      data: {
        code: `moderation_${suffix}`,
        slug: `moderation-${suffix}`,
        title: `Moderation category ${suffix}`,
        isActive: true,
        allowAds: true,
        postingFee: 0,
      },
    });
    created.categoryId = category.id;

    async function createPendingAd(codePrefix, title) {
      const ad = await prisma.classifiedAd.create({
        data: {
          publicCode: `${codePrefix}${suffix.slice(-12)}`,
          categoryId: category.id,
          ownerType: 'APP_USER',
          appUserId: owner.id,
          countryId: country.id,
          cityId: city.id,
          areaId: area.id,
          title,
          description: 'A complete plain text classified description for moderation.',
          priceType: 'CONTACT',
          price: null,
          currency: 'TJS',
          contactName: 'Ad Owner',
          contactPhone: owner.phone,
          allowPhone: true,
          allowChat: false,
          status: 'PENDING_REVIEW',
          submittedAt: new Date(),
          postingFee: 0,
          postingFeeCurrency: 'TJS',
          postingFeePaidAt: new Date(),
          images: {
            create: {
              imageUrl: `/public/uploads/tests/${suffix}/${codePrefix}.webp`,
              thumbnailUrl: `/public/uploads/tests/${suffix}/${codePrefix}-thumb.webp`,
              width: 800,
              height: 600,
              displayOrder: 10,
              isCover: true,
            },
          },
          statusHistory: {
            create: {
              fromStatus: 'DRAFT',
              toStatus: 'PENDING_REVIEW',
              actorType: 'APP_USER',
              actorId: String(owner.id),
              reasonCode: 'TEST_SUBMITTED',
            },
          },
        },
      });
      created.adIds.push(ad.id);
      return ad;
    }

    const primaryAd = await createPendingAd('MP', 'Primary moderation ad');
    const rejectedAd = await createPendingAd('MR', 'Rejected moderation ad');
    const auditFailureAd = await createPendingAd('MA', 'Atomic audit rollback ad');
    const report = await prisma.classifiedReport.create({
      data: {
        adId: primaryAd.id,
        reporterAppUserId: owner.id,
        reasonCode: 'SUSPICIOUS',
        description: 'Please review this classified ad.',
      },
    });
    const auditFailureReport = await prisma.classifiedReport.create({
      data: {
        adId: auditFailureAd.id,
        reporterAppUserId: owner.id,
        reasonCode: 'AUDIT_ROLLBACK',
        description: 'This report verifies atomic audit rollback.',
      },
    });

    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}/v1/admin`;
    const token = jwt.sign(
      { sub: String(admin.id), email: admin.email, jti: `admin-test-${suffix}` },
      env.JWT_SECRET,
      { expiresIn: '10m' },
    );

    async function request(url, { method = 'GET', body } = {}) {
      const response = await fetch(`${baseUrl}${url}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const payload = await response.json();
      if (payload.traceId) traceIds.push(payload.traceId);
      return { status: response.status, payload };
    }

    const statsResult = await request('/classified-ads/stats');
    assert.equal(statsResult.status, 200);
    assert.equal(statsResult.payload.data.pendingCount >= 2, true);
    assert.equal(statsResult.payload.data.openReportCount >= 1, true);

    const listResult = await request(`/classified-ads?status=PENDING_REVIEW&q=${encodeURIComponent(primaryAd.publicCode)}`);
    assert.equal(listResult.status, 200);
    assert.equal(listResult.payload.data.length, 1);
    assert.equal(listResult.payload.data[0].id, primaryAd.id);
    assert.equal(listResult.payload.data[0].postingPayment.currency, 'TJS');

    const detailResult = await request(`/classified-ads/${primaryAd.id}`);
    assert.equal(detailResult.status, 200);
    assert.equal(detailResult.payload.data.readiness.ready, true);
    assert.equal(detailResult.payload.data.reports.length, 1);

    const oversizedAuditQuery = `?auditPathPadding=${'x'.repeat(300)}`;
    const failedAuditModeration = await request(
      `/classified-ads/${auditFailureAd.id}/actions/approve${oversizedAuditQuery}`,
      {
        method: 'POST',
        body: { expectedVersion: 1 },
      },
    );
    assert.equal(failedAuditModeration.status, 500);
    const moderationAfterAuditFailure = await prisma.classifiedAd.findUnique({
      where: { id: auditFailureAd.id },
      select: { status: true, version: true },
    });
    assert.deepEqual(moderationAfterAuditFailure, { status: 'PENDING_REVIEW', version: 1 });

    const failedAuditReport = await request(
      `/classified-reports/${auditFailureReport.id}/actions/review${oversizedAuditQuery}`,
      {
        method: 'POST',
        body: { expectedVersion: 1, note: 'Atomic audit test' },
      },
    );
    assert.equal(failedAuditReport.status, 500);
    const reportAfterAuditFailure = await prisma.classifiedReport.findUnique({
      where: { id: auditFailureReport.id },
      select: { status: true, version: true },
    });
    assert.deepEqual(reportAfterAuditFailure, { status: 'OPEN', version: 1 });

    const approveResult = await request(`/classified-ads/${primaryAd.id}/actions/approve`, {
      method: 'POST',
      body: { expectedVersion: 1 },
    });
    assert.equal(approveResult.status, 200);
    assert.equal(approveResult.payload.data.status, 'PUBLISHED');
    assert.equal(approveResult.payload.data.version, 2);
    assert.ok(approveResult.payload.data.expiresAt);

    const staleSuspend = await request(`/classified-ads/${primaryAd.id}/actions/suspend`, {
      method: 'POST',
      body: { expectedVersion: 1, note: 'Stale request' },
    });
    assert.equal(staleSuspend.status, 409);
    assert.equal(staleSuspend.payload.code, 'CLASSIFIED_VERSION_CONFLICT');

    const suspendResult = await request(`/classified-ads/${primaryAd.id}/actions/suspend`, {
      method: 'POST',
      body: { expectedVersion: 2, note: 'Temporary policy investigation' },
    });
    assert.equal(suspendResult.status, 200);
    assert.equal(suspendResult.payload.data.status, 'SUSPENDED');
    assert.equal(suspendResult.payload.data.version, 3);

    const restoreResult = await request(`/classified-ads/${primaryAd.id}/actions/restore`, {
      method: 'POST',
      body: { expectedVersion: 3, note: 'Investigation completed' },
    });
    assert.equal(restoreResult.status, 200);
    assert.equal(restoreResult.payload.data.status, 'PUBLISHED');
    assert.equal(restoreResult.payload.data.version, 4);

    const rejectResult = await request(`/classified-ads/${rejectedAd.id}/actions/reject`, {
      method: 'POST',
      body: { expectedVersion: 1, note: 'The description needs clearer ownership information.' },
    });
    assert.equal(rejectResult.status, 200);
    assert.equal(rejectResult.payload.data.status, 'REJECTED');
    assert.equal(rejectResult.payload.data.moderationNote, 'The description needs clearer ownership information.');

    const reportList = await request(`/classified-reports?status=OPEN&adId=${primaryAd.id}`);
    assert.equal(reportList.status, 200);
    assert.equal(reportList.payload.data.length, 1);
    assert.equal(reportList.payload.data[0].id, report.id);

    const reviewResult = await request(`/classified-reports/${report.id}/actions/review`, {
      method: 'POST',
      body: { expectedVersion: 1, note: 'Review started' },
    });
    assert.equal(reviewResult.status, 200);
    assert.equal(reviewResult.payload.data.status, 'REVIEWING');
    assert.equal(reviewResult.payload.data.version, 2);

    const staleResolve = await request(`/classified-reports/${report.id}/actions/resolve`, {
      method: 'POST',
      body: { expectedVersion: 1, note: 'Stale resolution' },
    });
    assert.equal(staleResolve.status, 409);
    assert.equal(staleResolve.payload.code, 'CLASSIFIED_REPORT_VERSION_CONFLICT');

    const resolveResult = await request(`/classified-reports/${report.id}/actions/resolve`, {
      method: 'POST',
      body: { expectedVersion: 2, note: 'The ad was reviewed and restored after investigation.' },
    });
    assert.equal(resolveResult.status, 200);
    assert.equal(resolveResult.payload.data.status, 'RESOLVED');
    assert.equal(resolveResult.payload.data.version, 3);

    const archiveResult = await request(`/classified-ads/${primaryAd.id}/actions/archive`, {
      method: 'POST',
      body: { expectedVersion: 4, note: 'Archived after moderation integration test' },
    });
    assert.equal(archiveResult.status, 200);
    assert.equal(archiveResult.payload.data.status, 'ARCHIVED');
    assert.equal(archiveResult.payload.data.version, 5);

    const [historyCount, auditCount] = await Promise.all([
      prisma.classifiedAdStatusHistory.count({
        where: { adId: primaryAd.id, actorType: 'ADMIN', actorId: String(admin.id) },
      }),
      prisma.auditLog.count({
        where: {
          adminId: admin.id,
          entity: { in: ['ClassifiedAd', 'ClassifiedReport'] },
        },
      }),
    ]);
    assert.equal(historyCount, 4);
    assert.equal(auditCount, 7);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (created.adIds.length) {
      await prisma.classifiedAd.deleteMany({ where: { id: { in: created.adIds } } });
    }
    if (created.categoryId) {
      await prisma.classifiedCategory.delete({ where: { id: created.categoryId } }).catch(() => {});
    }
    if (created.countryId) {
      await prisma.country.delete({ where: { id: created.countryId } }).catch(() => {});
    }
    if (created.adminId) {
      await prisma.auditLog.deleteMany({ where: { adminId: created.adminId } });
      await prisma.adminUser.delete({ where: { id: created.adminId } }).catch(() => {});
    }
    if (created.userId) {
      await prisma.appUser.delete({ where: { id: created.userId } }).catch(() => {});
    }
    if (traceIds.length) {
      await prisma.errorLog.deleteMany({ where: { traceId: { in: traceIds } } });
    }
  }
});
