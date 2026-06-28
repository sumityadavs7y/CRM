const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');

const AVATAR_SIZE = 256;
const AVATAR_JPEG_QUALITY = 80;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

function isAllowedAvatarMimeType(mimeType) {
  return ALLOWED_MIME_TYPES.has(String(mimeType || '').toLowerCase());
}

function getAvatarRelativePath(companyId, credentialId) {
  return `uploads/avatars/company/${companyId}/${credentialId}.jpg`;
}

function getAbsolutePath(projectRoot, relativePath) {
  return path.join(projectRoot, relativePath.split('/').join(path.sep));
}

async function processAvatarBuffer(buffer, absoluteOutputPath) {
  await fs.mkdir(path.dirname(absoluteOutputPath), { recursive: true });
  await sharp(buffer)
    .rotate()
    .resize(AVATAR_SIZE, AVATAR_SIZE, {
      fit: 'cover',
      position: 'centre',
    })
    .jpeg({
      quality: AVATAR_JPEG_QUALITY,
      mozjpeg: true,
    })
    .toFile(absoluteOutputPath);
}

module.exports = {
  AVATAR_SIZE,
  AVATAR_JPEG_QUALITY,
  MAX_UPLOAD_BYTES,
  ALLOWED_MIME_TYPES,
  isAllowedAvatarMimeType,
  getAvatarRelativePath,
  getAbsolutePath,
  processAvatarBuffer,
};
