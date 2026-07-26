const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const {
  reconcileClassifiedMedia,
} = require('../src/modules/classifieds-domain/classifiedMediaMaintenance.service');
const {
  validateClassifiedSettings,
} = require('../src/modules/classifieds-domain/classifiedSettings');

test('classified operational limits reject unsafe values', () => {
  const issues = validateClassifiedSettings({
    maxReportsPerUserPerDay: 0,
    mediaCleanupGraceHours: 0,
    chatStarterMessageLimit: 0,
  });
  assert.ok(issues.some((item) => item.field === 'maxReportsPerUserPerDay'));
  assert.ok(issues.some((item) => item.field === 'mediaCleanupGraceHours'));
  assert.ok(issues.some((item) => item.field === 'chatStarterMessageLimit'));
});

test('classified media reconciliation is scoped, grace-aware, and supports dry runs', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'devor-classified-media-'));
  const mediaRoot = path.join(cwd, 'public', 'uploads', 'classifieds', '7', 'dv-test');
  const thumbnailRoot = path.join(mediaRoot, 'thumbnails');
  await fs.mkdir(thumbnailRoot, { recursive: true });

  const referencedPath = path.join(mediaRoot, 'referenced.webp');
  const orphanPath = path.join(mediaRoot, 'orphan.webp');
  await fs.writeFile(referencedPath, 'referenced');
  await fs.writeFile(orphanPath, 'orphan');
  const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000);
  await fs.utimes(orphanPath, oldDate, oldDate);

  const db = {
    classifiedAdImage: {
      findMany: async () => [{
        imageUrl: '/public/uploads/classifieds/7/dv-test/referenced.webp',
        thumbnailUrl: '/public/uploads/classifieds/7/dv-test/thumbnails/missing.webp',
      }],
    },
  };

  try {
    const dryRun = await reconcileClassifiedMedia({
      db,
      cwd,
      execute: false,
      graceHours: 24,
    });
    assert.equal(dryRun.orphanCount, 1);
    assert.equal(dryRun.missingReferenceCount, 1);
    assert.equal(dryRun.deletedCount, 0);
    await fs.access(orphanPath);

    const executed = await reconcileClassifiedMedia({
      db,
      cwd,
      execute: true,
      graceHours: 24,
    });
    assert.equal(executed.deletedCount, 1);
    await assert.rejects(fs.access(orphanPath));
    await fs.access(referencedPath);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});
