const { PROJECT_TYPES, PROJECT_STATUSES } = require('../constants/projectManagement');
const { escapeIlikePattern } = require('./leadListFilters');

function parseOptionalSearch(value) {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value).trim();
}

function parseOptionalEnum(value, allowed) {
  if (value === undefined || value === null || value === '') {
    return '';
  }
  const normalized = String(value).trim();
  return allowed.includes(normalized) ? normalized : '';
}

function parseOptionalActive(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (value === 'true' || value === true) {
    return true;
  }
  if (value === 'false' || value === false) {
    return false;
  }
  return null;
}

function parseOptionalDate(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const trimmed = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }
  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return trimmed;
}

function normalizeDateRange(from, to) {
  if (from !== null && to !== null && from > to) {
    return { from: to, to: from };
  }
  return { from, to };
}

function parseProjectListFilters(query) {
  const q = parseOptionalSearch(query.q ?? query.search);
  const status = parseOptionalEnum(query.status, PROJECT_STATUSES);
  const projectType = parseOptionalEnum(query.projectType, PROJECT_TYPES);
  const isActive = parseOptionalActive(query.isActive);
  const city = parseOptionalSearch(query.city);
  const launchRange = normalizeDateRange(
    parseOptionalDate(query.launchFrom),
    parseOptionalDate(query.launchTo),
  );
  const createdRange = normalizeDateRange(
    parseOptionalDate(query.createdFrom),
    parseOptionalDate(query.createdTo),
  );

  return {
    q,
    status,
    projectType,
    isActive,
    city,
    launchFrom: launchRange.from,
    launchTo: launchRange.to,
    createdFrom: createdRange.from,
    createdTo: createdRange.to,
  };
}

function hasActiveProjectListFilters(filters) {
  return filters.q !== ''
    || filters.status !== ''
    || filters.projectType !== ''
    || filters.isActive !== null
    || filters.city !== ''
    || filters.launchFrom !== null
    || filters.launchTo !== null
    || filters.createdFrom !== null
    || filters.createdTo !== null;
}

function buildProjectListFilterQuery(filters) {
  return {
    q: filters.q || null,
    status: filters.status || null,
    projectType: filters.projectType || null,
    isActive: filters.isActive === null ? null : String(filters.isActive),
    city: filters.city || null,
    launchFrom: filters.launchFrom,
    launchTo: filters.launchTo,
    createdFrom: filters.createdFrom,
    createdTo: filters.createdTo,
  };
}

module.exports = {
  parseProjectListFilters,
  hasActiveProjectListFilters,
  buildProjectListFilterQuery,
  escapeIlikePattern,
};
