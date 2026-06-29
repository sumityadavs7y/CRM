const {
  SORT_OPTIONS,
  VIEW_MODES,
  DEFAULT_SORT,
  DEFAULT_VIEW,
} = require('../constants/mediaLibrary');

function parseBrowseFilters(query = {}) {
  const sortValues = new Set(SORT_OPTIONS.map((option) => option.value));
  const sort = sortValues.has(query.sort) ? query.sort : DEFAULT_SORT;

  const view = VIEW_MODES.includes(query.view) ? query.view : DEFAULT_VIEW;

  let folderId = null;
  if (query.folderId !== undefined && query.folderId !== '' && query.folderId !== 'all') {
    const parsed = parseInt(query.folderId, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      folderId = parsed;
    }
  }

  const search = typeof query.search === 'string' ? query.search.trim() : '';

  const imagesOnly = query.imagesOnly === '1'
    || query.imagesOnly === 'true'
    || query.imagesOnly === true;

  return {
    folderId,
    search,
    sort,
    view,
    imagesOnly,
  };
}

module.exports = {
  parseBrowseFilters,
};
