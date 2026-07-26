const fs = require('fs/promises');
const path = require('path');
const prisma = require('../../prisma');

const CLASSIFIED_UPLOAD_PREFIX = '/public/uploads/classifieds/';

function normalizeUrl(value) {
  const normalized = String(value || '').replace(/\\/g, '/');
  return normalized.startsWith(CLASSIFIED_UPLOAD_PREFIX) ? normalized : null;
}

function uploadsRoot(cwd = process.cwd()) {
  return path.resolve(cwd, 'public', 'uploads', 'classifieds');
}

async function listFiles(root, current = root) {
  let entries;
  try {
    entries = await fs.readdir(current, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) return listFiles(root, fullPath);
    if (!entry.isFile()) return [];
    const stat = await fs.stat(fullPath);
    return [{
      fullPath,
      relativePath: path.relative(root, fullPath).replace(/\\/g, '/'),
      modifiedAt: stat.mtime,
      size: stat.size,
    }];
  }));
  return nested.flat();
}

function toPublicUrl(relativePath) {
  return `${CLASSIFIED_UPLOAD_PREFIX}${relativePath.replace(/^\/+/, '')}`;
}

async function removeEmptyDirectories(root, current = root) {
  let entries;
  try {
    entries = await fs.readdir(current, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      await removeEmptyDirectories(root, path.join(current, entry.name));
    }
  }
  if (current !== root) {
    const remaining = await fs.readdir(current);
    if (!remaining.length) await fs.rmdir(current);
  }
}

async function reconcileClassifiedMedia({
  db = prisma,
  cwd = process.cwd(),
  execute = false,
  graceHours = 24,
  now = new Date(),
} = {}) {
  const root = uploadsRoot(cwd);
  const imageRows = await db.classifiedAdImage.findMany({
    select: { imageUrl: true, thumbnailUrl: true },
  });
  const referencedUrls = new Set();
  for (const row of imageRows) {
    const imageUrl = normalizeUrl(row.imageUrl);
    const thumbnailUrl = normalizeUrl(row.thumbnailUrl);
    if (imageUrl) referencedUrls.add(imageUrl);
    if (thumbnailUrl) referencedUrls.add(thumbnailUrl);
  }

  const files = await listFiles(root);
  const fileUrls = new Set(files.map((file) => toPublicUrl(file.relativePath)));
  const cutoff = now.getTime() - Math.max(1, Number(graceHours) || 24) * 60 * 60 * 1000;
  const orphanFiles = files.filter((file) => (
    !referencedUrls.has(toPublicUrl(file.relativePath))
    && file.modifiedAt.getTime() <= cutoff
  ));
  const missingReferences = [...referencedUrls].filter((url) => !fileUrls.has(url));

  let deletedCount = 0;
  let deletedBytes = 0;
  if (execute) {
    for (const file of orphanFiles) {
      const resolved = path.resolve(file.fullPath);
      if (resolved !== root && resolved.startsWith(`${root}${path.sep}`)) {
        await fs.unlink(resolved).catch((error) => {
          if (error.code !== 'ENOENT') throw error;
        });
        deletedCount += 1;
        deletedBytes += file.size;
      }
    }
    await removeEmptyDirectories(root);
  }

  return {
    scannedCount: files.length,
    affectedCount: deletedCount,
    referencedCount: referencedUrls.size,
    orphanCount: orphanFiles.length,
    missingReferenceCount: missingReferences.length,
    deletedCount,
    deletedBytes,
    execute,
    graceHours: Math.max(1, Number(graceHours) || 24),
    metadata: {
      orphanCount: orphanFiles.length,
      missingReferenceCount: missingReferences.length,
      deletedBytes,
      execute,
      orphanSamples: orphanFiles.slice(0, 10).map((file) => toPublicUrl(file.relativePath)),
      missingReferenceSamples: missingReferences.slice(0, 10),
    },
  };
}

module.exports = {
  CLASSIFIED_UPLOAD_PREFIX,
  reconcileClassifiedMedia,
  uploadsRoot,
};
