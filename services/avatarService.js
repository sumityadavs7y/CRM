const fs = require('fs/promises');
const path = require('path');
const {
  getAvatarRelativePath,
  getAbsolutePath,
  processAvatarBuffer,
} = require('../utils/avatarImages');

const PROJECT_ROOT = path.join(__dirname, '..');

async function saveAvatar(companyId, credentialId, buffer) {
  const relativePath = getAvatarRelativePath(companyId, credentialId);
  const absolutePath = getAbsolutePath(PROJECT_ROOT, relativePath);
  await processAvatarBuffer(buffer, absolutePath);
  return relativePath;
}

async function deleteAvatar(avatarPath) {
  if (!avatarPath) {
    return;
  }

  const absolutePath = getAbsolutePath(PROJECT_ROOT, avatarPath);
  await fs.unlink(absolutePath).catch(() => {});
}

function getAvatarAbsolutePath(avatarPath) {
  if (!avatarPath) {
    return null;
  }
  return getAbsolutePath(PROJECT_ROOT, avatarPath);
}

module.exports = {
  saveAvatar,
  deleteAvatar,
  getAvatarAbsolutePath,
};
