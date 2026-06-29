const { isImageMimeType } = require('../constants/mediaLibrary');

function getProjectInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return 'P';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getProjectAvatarAccent(name) {
  const input = String(name || 'project');
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 58% 42%)`;
}

function getMediaFileUrls(mediaFileId) {
  if (!mediaFileId) {
    return { avatarUrl: null, avatarThumbUrl: null };
  }

  return {
    avatarUrl: `/company/media/files/${mediaFileId}/serve`,
    avatarThumbUrl: `/company/media/files/${mediaFileId}/thumb`,
  };
}

function enrichProjectAvatar(project, { canLoadMedia = true } = {}) {
  const plain = project?.get ? project.get({ plain: true }) : { ...project };
  const media = plain.avatarMedia || null;
  const mediaId = plain.avatarMediaFileId || media?.id || null;
  const hasImageMedia = Boolean(
    mediaId
    && media
    && isImageMimeType(media.mimeType)
    && canLoadMedia,
  );

  const urls = hasImageMedia ? getMediaFileUrls(mediaId) : { avatarUrl: null, avatarThumbUrl: null };

  return {
    ...plain,
    avatarInitials: getProjectInitials(plain.name),
    avatarAccent: getProjectAvatarAccent(plain.name),
    hasAvatar: hasImageMedia,
    avatarUrl: urls.avatarUrl,
    avatarThumbUrl: urls.avatarThumbUrl,
  };
}

module.exports = {
  getProjectInitials,
  getProjectAvatarAccent,
  getMediaFileUrls,
  enrichProjectAvatar,
};
