const { VALID_LEAD_QUALITIES } = require('../constants/leadQuality');
const {
  EMPTY_LEAD_LIST_FILTERS,
  LEAD_LIST_SCORE_MIN,
  LEAD_LIST_SCORE_MAX,
} = require('../constants/leadListFilters');

function parseOptionalId(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseOptionalScore(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < LEAD_LIST_SCORE_MIN || parsed > LEAD_LIST_SCORE_MAX) {
    return null;
  }
  return parsed;
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

function parseOptionalQuality(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const normalized = String(value).trim().toLowerCase();
  return VALID_LEAD_QUALITIES.has(normalized) ? normalized : null;
}

function parseOptionalSearch(value) {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value).trim();
}

function normalizeScoreRange(scoreMin, scoreMax) {
  if (scoreMin !== null && scoreMax !== null && scoreMin > scoreMax) {
    return { scoreMin: scoreMax, scoreMax: scoreMin };
  }
  return { scoreMin, scoreMax };
}

function normalizeDateRange(from, to) {
  if (from !== null && to !== null && from > to) {
    return { from: to, to: from };
  }
  return { from, to };
}

function parseLeadListFilters(query) {
  const q = parseOptionalSearch(query.q);
  const assigneeId = parseOptionalId(query.assigneeId);
  const pipelineId = parseOptionalId(query.pipelineId);
  const stageId = parseOptionalId(query.stageId);
  const quality = parseOptionalQuality(query.quality);
  const { scoreMin, scoreMax } = normalizeScoreRange(
    parseOptionalScore(query.scoreMin),
    parseOptionalScore(query.scoreMax),
  );
  const followUpRange = normalizeDateRange(
    parseOptionalDate(query.followUpFrom),
    parseOptionalDate(query.followUpTo),
  );
  const createdRange = normalizeDateRange(
    parseOptionalDate(query.createdFrom),
    parseOptionalDate(query.createdTo),
  );
  const sourceId = parseOptionalId(query.sourceId);

  return {
    ...EMPTY_LEAD_LIST_FILTERS,
    q,
    assigneeId,
    pipelineId,
    stageId,
    quality,
    scoreMin,
    scoreMax,
    followUpFrom: followUpRange.from,
    followUpTo: followUpRange.to,
    createdFrom: createdRange.from,
    createdTo: createdRange.to,
    sourceId,
  };
}

function hasActiveLeadListFilters(filters) {
  return filters.q !== ''
    || filters.assigneeId !== null
    || filters.pipelineId !== null
    || filters.stageId !== null
    || filters.quality !== null
    || filters.scoreMin !== null
    || filters.scoreMax !== null
    || filters.followUpFrom !== null
    || filters.followUpTo !== null
    || filters.createdFrom !== null
    || filters.createdTo !== null
    || filters.sourceId !== null;
}

function buildLeadListFilterQuery(filters) {
  return {
    q: filters.q || null,
    assigneeId: filters.assigneeId,
    pipelineId: filters.pipelineId,
    stageId: filters.stageId,
    quality: filters.quality,
    scoreMin: filters.scoreMin,
    scoreMax: filters.scoreMax,
    followUpFrom: filters.followUpFrom,
    followUpTo: filters.followUpTo,
    createdFrom: filters.createdFrom,
    createdTo: filters.createdTo,
    sourceId: filters.sourceId,
  };
}

function escapeIlikePattern(value) {
  return value.replace(/[%_\\]/g, '\\$&');
}

module.exports = {
  parseLeadListFilters,
  hasActiveLeadListFilters,
  buildLeadListFilterQuery,
  escapeIlikePattern,
  parseOptionalDate,
  normalizeDateRange,
};
