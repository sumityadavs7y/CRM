const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Date ↓' },
  { value: 'date_asc', label: 'Date ↑' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'name_desc', label: 'Name Z–A' },
];

const VIEW_MODES = ['grid', 'list'];

const DEFAULT_SORT = 'date_desc';
const DEFAULT_VIEW = 'grid';

const IMAGE_MIME_PREFIX = 'image/';

function isImageMimeType(mimeType) {
  return typeof mimeType === 'string' && mimeType.startsWith(IMAGE_MIME_PREFIX);
}

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(2)} KB`;
  }
  if (value < 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

module.exports = {
  SORT_OPTIONS,
  VIEW_MODES,
  DEFAULT_SORT,
  DEFAULT_VIEW,
  IMAGE_MIME_PREFIX,
  isImageMimeType,
  formatBytes,
};
