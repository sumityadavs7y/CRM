const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');
const { isImageMimeType } = require('../constants/mediaLibrary');

const THUMB_MAX_SIZE = 320;
const THUMB_JPEG_QUALITY = 50;

const RASTER_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/tiff',
]);

function canGenerateThumbnail(mimeType) {
  return RASTER_IMAGE_MIME_TYPES.has(String(mimeType || '').toLowerCase());
}

function getThumbnailRelativePath(storagePath) {
  const normalized = storagePath.split('/').join(path.sep);
  const dir = path.dirname(normalized);
  const baseName = path.basename(normalized, path.extname(normalized));
  return path.join(dir, '.thumbs', `${baseName}.jpg`).split(path.sep).join('/');
}

function getAbsolutePath(projectRoot, relativePath) {
  return path.join(projectRoot, relativePath.split('/').join(path.sep));
}

async function ensureThumbnailDir(absoluteThumbPath) {
  await fs.mkdir(path.dirname(absoluteThumbPath), { recursive: true });
}

async function generateThumbnailFromBuffer(buffer, absoluteThumbPath) {
  await ensureThumbnailDir(absoluteThumbPath);
  try {
    await sharp(buffer)
      .rotate()
      .resize(THUMB_MAX_SIZE, THUMB_MAX_SIZE, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({
        quality: THUMB_JPEG_QUALITY,
        mozjpeg: true,
      })
      .toFile(absoluteThumbPath);
    return true;
  } catch {
    return false;
  }
}

async function generateThumbnailFromFile(absoluteSourcePath, absoluteThumbPath) {
  await ensureThumbnailDir(absoluteThumbPath);
  try {
    await sharp(absoluteSourcePath)
      .rotate()
      .resize(THUMB_MAX_SIZE, THUMB_MAX_SIZE, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({
        quality: THUMB_JPEG_QUALITY,
        mozjpeg: true,
      })
      .toFile(absoluteThumbPath);
    return true;
  } catch {
    return false;
  }
}

async function createThumbnailForUpload(file, absoluteSourcePath, storagePath) {
  if (!canGenerateThumbnail(file.mimetype)) {
    return null;
  }

  const projectRoot = path.join(__dirname, '..');
  const thumbRelativePath = getThumbnailRelativePath(storagePath);
  const absoluteThumbPath = getAbsolutePath(projectRoot, thumbRelativePath);
  const created = await generateThumbnailFromBuffer(file.buffer, absoluteThumbPath);
  return created ? thumbRelativePath : null;
}

async function ensureThumbnailExists(file, projectRoot = path.join(__dirname, '..')) {
  if (!isImageMimeType(file.mimeType) || !canGenerateThumbnail(file.mimeType)) {
    return null;
  }

  const thumbRelativePath = getThumbnailRelativePath(file.storagePath);
  const absoluteThumbPath = getAbsolutePath(projectRoot, thumbRelativePath);
  const absoluteSourcePath = getAbsolutePath(projectRoot, file.storagePath);

  try {
    await fs.access(absoluteThumbPath);
    return thumbRelativePath;
  } catch {
    // Generate on first preview request for legacy uploads.
  }

  try {
    await fs.access(absoluteSourcePath);
  } catch {
    return null;
  }

  const created = await generateThumbnailFromFile(absoluteSourcePath, absoluteThumbPath);
  return created ? thumbRelativePath : null;
}

async function deleteThumbnailIfExists(storagePath, projectRoot = path.join(__dirname, '..')) {
  const thumbRelativePath = getThumbnailRelativePath(storagePath);
  const absoluteThumbPath = getAbsolutePath(projectRoot, thumbRelativePath);
  await fs.unlink(absoluteThumbPath).catch(() => {});
}

module.exports = {
  THUMB_MAX_SIZE,
  THUMB_JPEG_QUALITY,
  canGenerateThumbnail,
  getThumbnailRelativePath,
  getAbsolutePath,
  createThumbnailForUpload,
  ensureThumbnailExists,
  deleteThumbnailIfExists,
};
