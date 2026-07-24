const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const path = require('path');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');
const app = require('../src/app');
const env = require('../src/config/env');
const prisma = require('../src/prisma');

function tokenFor(user) {
  return jwt.sign(
    { sub: String(user.id), phone: user.phone, scope: 'app', jti: `test-${user.id}` },
    env.JWT_SECRET,
    { expiresIn: '10m' },
  );
}

function diskPathFromUrl(url) {
  const normalized = String(url || '').replace(/\\/g, '/');
  if (!normalized.startsWith('/public/uploads/')) return null;
  const target = path.resolve(process.cwd(), 'public', normalized.slice('/public/'.length));
  const root = path.resolve(process.cwd(), 'public', 'uploads');
  return target.startsWith(`${root}${path.sep}`) ? target : null;
}

test('private classified API enforces ownership, typed data, images, versions, and lifecycle', async () => {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const createdIds = { users: [], categories: [], country: null, ad: null };
  const uploadedUrls = [];
  const errorTraceIds = [];
  let uploadDirectory = null;
  let server;

  try {
    const [owner, stranger] = await Promise.all([
      prisma.appUser.create({ data: { phone: `+99290${suffix.slice(-7)}`, firstName: 'Owner', isActive: true } }),
      prisma.appUser.create({ data: { phone: `+99291${suffix.slice(-7)}`, firstName: 'Stranger', isActive: true } }),
    ]);
    createdIds.users.push(owner.id, stranger.id);
    const country = await prisma.country.create({
      data: {
        code: `T${suffix.slice(-7)}`,
        title: `Test country ${suffix}`,
        phoneCode: '+992',
        isActive: true,
        cities: {
          create: {
            code: `city_${suffix}`,
            title: `Test city ${suffix}`,
            isActive: true,
            areas: {
              create: {
                code: `area_${suffix}`,
                title: `Test area ${suffix}`,
                isActive: true,
              },
            },
          },
        },
      },
      include: { cities: { include: { areas: true } } },
    });
    createdIds.country = country.id;
    const city = country.cities[0];
    const area = city.areas[0];

    const root = await prisma.classifiedCategory.create({
      data: {
        code: `api_root_${suffix}`,
        slug: `api-root-${suffix}`,
        title: `API root ${suffix}`,
        allowAds: false,
        isActive: true,
      },
    });
    const leaf = await prisma.classifiedCategory.create({
      data: {
        parentId: root.id,
        code: `api_leaf_${suffix}`,
        slug: `api-leaf-${suffix}`,
        title: `API leaf ${suffix}`,
        allowAds: true,
        isActive: true,
        postingFee: 1000,
        attributes: {
          create: {
            code: `condition_${suffix}`,
            title: 'Condition',
            type: 'SELECT',
            isRequired: true,
            isActive: true,
            options: {
              create: {
                code: `new_${suffix}`,
                title: 'New',
                isActive: true,
              },
            },
          },
        },
      },
      include: { attributes: { include: { options: true } } },
    });
    createdIds.categories.push(leaf.id, root.id);
    const attribute = leaf.attributes[0];
    const option = attribute.options[0];

    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}/v1/app/classifieds`;
    const ownerToken = tokenFor(owner);
    const strangerToken = tokenFor(stranger);

    async function request(url, { token = ownerToken, method = 'GET', body, form } = {}) {
      const response = await fetch(`${baseUrl}${url}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : form,
      });
      const payload = await response.json();
      if (!response.ok && payload.traceId) errorTraceIds.push(payload.traceId);
      return { status: response.status, payload };
    }

    const configResult = await request('/posting-config');
    assert.equal(configResult.status, 200);
    assert.equal(configResult.payload.data.currency, 'TJS');
    assert.equal(configResult.payload.data.adLimits.draftCount, 0);

    const metadataResult = await request(`/categories/${leaf.id}/attributes`);
    assert.equal(metadataResult.status, 200);
    assert.equal(metadataResult.payload.data.attributes.length, 1);
    assert.equal(metadataResult.payload.data.attributes[0].options[0].id, option.id);
    assert.equal(metadataResult.payload.data.category.postingFee, 1000);
    assert.equal(metadataResult.payload.data.category.postingFeeCurrency, 'TJS');

    const ownerInjectionResult = await request('/my-ads', {
      method: 'POST',
      body: {
        appUserId: stranger.id,
        ownerType: 'BUSINESS',
        categoryId: leaf.id,
        countryId: country.id,
        cityId: city.id,
        areaId: area.id,
      },
    });
    assert.equal(ownerInjectionResult.status, 400);
    assert.equal(ownerInjectionResult.payload.code, 'VALIDATION_ERROR');

    const createResult = await request('/my-ads', {
      method: 'POST',
      body: {
        categoryId: leaf.id,
        countryId: country.id,
        cityId: city.id,
        areaId: area.id,
      },
    });
    assert.equal(createResult.status, 201);
    assert.equal(createResult.payload.data.status, 'DRAFT');
    assert.equal(createResult.payload.data.version, 1);
    createdIds.ad = createResult.payload.data.id;
    uploadDirectory = path.resolve(
      process.cwd(),
      'public',
      'uploads',
      'classifieds',
      String(owner.id),
      createResult.payload.data.publicCode.toLowerCase(),
    );
    const ownerRow = await prisma.classifiedAd.findUnique({
      where: { id: createdIds.ad },
      select: { ownerType: true, appUserId: true, businessId: true },
    });
    assert.deepEqual(ownerRow, { ownerType: 'APP_USER', appUserId: owner.id, businessId: null });

    const strangerDetail = await request(`/my-ads/${createdIds.ad}`, { token: strangerToken });
    assert.equal(strangerDetail.status, 404);
    assert.equal(strangerDetail.payload.code, 'CLASSIFIED_NOT_FOUND');

    const initialReadiness = await request(`/my-ads/${createdIds.ad}/readiness`);
    assert.equal(initialReadiness.status, 200);
    assert.equal(initialReadiness.payload.data.ready, false);
    assert.equal(initialReadiness.payload.data.issues.some((item) => item.code === 'CLASSIFIED_IMAGE_REQUIRED'), true);

    const updateResult = await request(`/my-ads/${createdIds.ad}`, {
      method: 'PATCH',
      body: {
        expectedVersion: 1,
        title: 'Integration test classified',
        description: 'A complete plain text description for the integration test.',
        priceType: 'FIXED',
        price: 1250,
        contactName: 'Owner',
      },
    });
    assert.equal(updateResult.status, 200);
    assert.equal(updateResult.payload.data.version, 2);

    const staleUpdate = await request(`/my-ads/${createdIds.ad}`, {
      method: 'PATCH',
      body: { expectedVersion: 1, title: 'Stale update' },
    });
    assert.equal(staleUpdate.status, 409);
    assert.equal(staleUpdate.payload.code, 'CLASSIFIED_VERSION_CONFLICT');

    const invalidAttributesResult = await request(`/my-ads/${createdIds.ad}/attributes`, {
      method: 'PUT',
      body: {
        expectedVersion: 2,
        values: [{ attributeId: attribute.id, optionIds: [option.id], textValue: 'wrong shape' }],
      },
    });
    assert.equal(invalidAttributesResult.status, 400);
    assert.equal(invalidAttributesResult.payload.code, 'CLASSIFIED_ATTRIBUTE_VALUE_SHAPE_INVALID');

    const attributesResult = await request(`/my-ads/${createdIds.ad}/attributes`, {
      method: 'PUT',
      body: {
        expectedVersion: 2,
        values: [{ attributeId: attribute.id, optionIds: [option.id] }],
      },
    });
    assert.equal(attributesResult.status, 200);
    assert.equal(attributesResult.payload.data.version, 3);
    assert.equal(attributesResult.payload.data.attributeValues[0].optionId, option.id);

    const png = await sharp({
      create: {
        width: 32,
        height: 24,
        channels: 4,
        background: { r: 40, g: 130, b: 120, alpha: 1 },
      },
    }).png().toBuffer();

    async function upload(expectedVersion, fileName) {
      const form = new FormData();
      form.append('expectedVersion', String(expectedVersion));
      form.append('image', new Blob([png], { type: 'image/png' }), fileName);
      return request(`/my-ads/${createdIds.ad}/images`, { method: 'POST', form });
    }

    const firstUpload = await upload(3, 'first.png');
    assert.equal(firstUpload.status, 201);
    assert.equal(firstUpload.payload.data.version, 4);
    uploadedUrls.push(...firstUpload.payload.data.images.flatMap((image) => [image.imageUrl, image.thumbnailUrl]));

    const secondUpload = await upload(4, 'second.png');
    assert.equal(secondUpload.status, 201);
    assert.equal(secondUpload.payload.data.version, 5);
    uploadedUrls.push(...secondUpload.payload.data.images.flatMap((image) => [image.imageUrl, image.thumbnailUrl]));
    const imageIds = secondUpload.payload.data.images.map((image) => image.id);

    const reorderResult = await request(`/my-ads/${createdIds.ad}/images/order`, {
      method: 'PATCH',
      body: { expectedVersion: 5, imageIds: [...imageIds].reverse() },
    });
    assert.equal(reorderResult.status, 200);
    assert.equal(reorderResult.payload.data.version, 6);
    assert.equal(reorderResult.payload.data.images[0].id, imageIds[1]);
    assert.equal(reorderResult.payload.data.images[0].isCover, true);

    const deleteResult = await request(`/my-ads/${createdIds.ad}/images/${imageIds[0]}?expectedVersion=6`, {
      method: 'DELETE',
    });
    assert.equal(deleteResult.status, 200);
    assert.equal(deleteResult.payload.data.version, 7);
    assert.equal(deleteResult.payload.data.images.length, 1);

    const readyResult = await request(`/my-ads/${createdIds.ad}/readiness`);
    assert.equal(readyResult.status, 200);
    assert.deepEqual(readyResult.payload.data.issues, []);
    assert.equal(readyResult.payload.data.ready, true);

    const insufficientBalanceResult = await request(`/my-ads/${createdIds.ad}/actions/submit`, {
      method: 'POST',
      body: { expectedVersion: 7 },
    });
    assert.equal(insufficientBalanceResult.status, 409);
    assert.equal(insufficientBalanceResult.payload.code, 'WALLET_INSUFFICIENT_BALANCE');

    const unchangedAfterFailedPayment = await prisma.classifiedAd.findUnique({
      where: { id: createdIds.ad },
      select: { status: true, version: true, postingFeePaidAt: true },
    });
    assert.deepEqual(unchangedAfterFailedPayment, {
      status: 'DRAFT',
      version: 7,
      postingFeePaidAt: null,
    });

    await prisma.appWallet.create({
      data: { appUserId: owner.id, balance: 2000, currency: 'TJS' },
    });

    const submitResult = await request(`/my-ads/${createdIds.ad}/actions/submit`, {
      method: 'POST',
      body: { expectedVersion: 7 },
    });
    assert.equal(submitResult.status, 200);
    assert.equal(submitResult.payload.data.status, 'PENDING_REVIEW');
    assert.equal(submitResult.payload.data.version, 8);
    assert.equal(submitResult.payload.data.postingPayment.categoryFee, 1000);
    assert.equal(submitResult.payload.data.postingPayment.paidFee, 1000);
    assert.equal(submitResult.payload.data.postingPayment.currency, 'TJS');
    assert.equal(submitResult.payload.data.postingPayment.isPaid, true);
    assert.ok(submitResult.payload.data.postingPayment.transactionId);

    const walletAfterPayment = await prisma.appWallet.findUnique({
      where: { appUserId: owner.id },
      include: { transactions: true },
    });
    assert.equal(Number(walletAfterPayment.balance), 1000);
    assert.equal(walletAfterPayment.transactions.length, 1);
    assert.equal(walletAfterPayment.transactions[0].type, 'DEBIT');
    assert.equal(Number(walletAfterPayment.transactions[0].amount), 1000);
    assert.equal(walletAfterPayment.transactions[0].referenceType, 'CLASSIFIED_AD_POSTING_FEE');
    assert.equal(walletAfterPayment.transactions[0].referenceId, createResult.payload.data.publicCode);

    const now = new Date();
    await prisma.$transaction([
      prisma.classifiedAd.update({
        where: { id: createdIds.ad },
        data: {
          status: 'PUBLISHED',
          version: { increment: 1 },
          reviewedAt: now,
          publishedAt: now,
          expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      }),
      prisma.classifiedAdStatusHistory.create({
        data: {
          adId: createdIds.ad,
          fromStatus: 'PENDING_REVIEW',
          toStatus: 'PUBLISHED',
          actorType: 'ADMIN',
          actorId: 'integration-test',
          reasonCode: 'TEST_APPROVED',
        },
      }),
    ]);

    const pauseResult = await request(`/my-ads/${createdIds.ad}/actions/pause`, {
      method: 'POST',
      body: { expectedVersion: 9 },
    });
    assert.equal(pauseResult.status, 200);
    assert.equal(pauseResult.payload.data.status, 'PAUSED');

    const resumeResult = await request(`/my-ads/${createdIds.ad}/actions/resume`, {
      method: 'POST',
      body: { expectedVersion: 10 },
    });
    assert.equal(resumeResult.status, 200);
    assert.equal(resumeResult.payload.data.status, 'PUBLISHED');

    await prisma.$transaction([
      prisma.classifiedAd.update({
        where: { id: createdIds.ad },
        data: { status: 'EXPIRED', version: { increment: 1 }, expiresAt: new Date(Date.now() - 1000) },
      }),
      prisma.classifiedAdStatusHistory.create({
        data: {
          adId: createdIds.ad,
          fromStatus: 'PUBLISHED',
          toStatus: 'EXPIRED',
          actorType: 'SYSTEM',
          reasonCode: 'TEST_EXPIRED',
        },
      }),
    ]);

    const renewResult = await request(`/my-ads/${createdIds.ad}/actions/renew`, {
      method: 'POST',
      body: { expectedVersion: 12 },
    });
    assert.equal(renewResult.status, 200);
    assert.equal(renewResult.payload.data.status, 'PENDING_REVIEW');

    const walletAfterRenewal = await prisma.appWallet.findUnique({
      where: { appUserId: owner.id },
      include: { transactions: true },
    });
    assert.equal(Number(walletAfterRenewal.balance), 1000);
    assert.equal(walletAfterRenewal.transactions.length, 1);

    const secondPublishAt = new Date();
    await prisma.$transaction([
      prisma.classifiedAd.update({
        where: { id: createdIds.ad },
        data: {
          status: 'PUBLISHED',
          version: { increment: 1 },
          reviewedAt: secondPublishAt,
          publishedAt: secondPublishAt,
          expiresAt: new Date(secondPublishAt.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      }),
      prisma.classifiedAdStatusHistory.create({
        data: {
          adId: createdIds.ad,
          fromStatus: 'PENDING_REVIEW',
          toStatus: 'PUBLISHED',
          actorType: 'ADMIN',
          actorId: 'integration-test',
          reasonCode: 'TEST_REAPPROVED',
        },
      }),
    ]);

    const soldResult = await request(`/my-ads/${createdIds.ad}/actions/sold`, {
      method: 'POST',
      body: { expectedVersion: 14 },
    });
    assert.equal(soldResult.status, 200);
    assert.equal(soldResult.payload.data.status, 'SOLD');
    assert.ok(soldResult.payload.data.soldAt);

    const archiveResult = await request(`/my-ads/${createdIds.ad}/actions/archive`, {
      method: 'POST',
      body: { expectedVersion: 15 },
    });
    assert.equal(archiveResult.status, 200);
    assert.equal(archiveResult.payload.data.status, 'ARCHIVED');
    assert.equal(archiveResult.payload.data.statusHistory.length >= 10, true);

    const listResult = await request('/my-ads?status=ARCHIVED');
    assert.equal(listResult.status, 200);
    assert.equal(listResult.payload.data.some((item) => item.id === createdIds.ad), true);
    assert.equal(listResult.payload.meta.total, 1);

    const draftLimit = configResult.payload.data.adLimits.maxDrafts;
    await prisma.classifiedAd.createMany({
      data: Array.from({ length: draftLimit }, (_, index) => ({
        publicCode: `DL${suffix.slice(-12)}${index}`,
        categoryId: leaf.id,
        ownerType: 'APP_USER',
        appUserId: owner.id,
        countryId: country.id,
        cityId: city.id,
        areaId: area.id,
        title: '',
        description: '',
        priceType: 'CONTACT',
        price: null,
        currency: 'TJS',
        contactPhone: owner.phone,
        allowPhone: true,
        allowChat: false,
        status: index === 0 ? 'REJECTED' : 'DRAFT',
      })),
    });
    const draftLimitResult = await request('/my-ads', {
      method: 'POST',
      body: {
        categoryId: leaf.id,
        countryId: country.id,
        cityId: city.id,
        areaId: area.id,
      },
    });
    assert.equal(draftLimitResult.status, 409);
    assert.equal(draftLimitResult.payload.code, 'CLASSIFIED_DRAFT_LIMIT_REACHED');

    const activeLimit = configResult.payload.data.adLimits.maxActive;
    await prisma.classifiedAd.createMany({
      data: Array.from({ length: activeLimit }, (_, index) => ({
        publicCode: `AL${suffix.slice(-12)}${index}`,
        categoryId: leaf.id,
        ownerType: 'APP_USER',
        appUserId: stranger.id,
        countryId: country.id,
        cityId: city.id,
        areaId: area.id,
        title: 'Active limit fixture',
        description: 'Active limit integration test fixture.',
        priceType: 'CONTACT',
        price: null,
        currency: 'TJS',
        contactPhone: stranger.phone,
        allowPhone: true,
        allowChat: false,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })),
    });
    const strangerDraft = await prisma.classifiedAd.create({
      data: {
        publicCode: `AX${suffix.slice(-12)}`,
        categoryId: leaf.id,
        ownerType: 'APP_USER',
        appUserId: stranger.id,
        countryId: country.id,
        cityId: city.id,
        areaId: area.id,
        title: '',
        description: '',
        priceType: 'CONTACT',
        price: null,
        currency: 'TJS',
        contactPhone: stranger.phone,
        allowPhone: true,
        allowChat: false,
        status: 'DRAFT',
      },
    });
    const activeLimitResult = await request(`/my-ads/${strangerDraft.id}/actions/submit`, {
      token: strangerToken,
      method: 'POST',
      body: { expectedVersion: 1 },
    });
    assert.equal(activeLimitResult.status, 409);
    assert.equal(activeLimitResult.payload.code, 'CLASSIFIED_ACTIVE_LIMIT_REACHED');
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (createdIds.users.length) {
      await prisma.classifiedAd.deleteMany({ where: { appUserId: { in: createdIds.users } } });
    }
    for (const categoryId of createdIds.categories) {
      await prisma.classifiedCategory.delete({ where: { id: categoryId } }).catch(() => {});
    }
    if (createdIds.country) await prisma.country.delete({ where: { id: createdIds.country } }).catch(() => {});
    if (createdIds.users.length) await prisma.appUser.deleteMany({ where: { id: { in: createdIds.users } } });
    if (errorTraceIds.length) await prisma.errorLog.deleteMany({ where: { traceId: { in: errorTraceIds } } });
    await Promise.all(uploadedUrls.map(async (url) => {
      const target = diskPathFromUrl(url);
      if (target) await fs.unlink(target).catch(() => {});
    }));
    const classifiedRoot = path.resolve(process.cwd(), 'public', 'uploads', 'classifieds');
    if (uploadDirectory?.startsWith(`${classifiedRoot}${path.sep}`)) {
      await fs.rm(uploadDirectory, { recursive: true, force: true });
      await fs.rmdir(path.dirname(uploadDirectory)).catch(() => {});
      await fs.rmdir(classifiedRoot).catch(() => {});
    }
  }
});

test.after(async () => {
  await prisma.$disconnect();
});
