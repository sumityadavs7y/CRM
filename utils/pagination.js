function parsePositiveInt(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parsePaginationQuery(query, {
  defaultPageSize,
  allowedPageSizes,
  defaultSort,
  allowedSortColumns,
  defaultDir = 'desc',
}) {
  const allowedSizeSet = new Set(allowedPageSizes);
  const pageSizeRaw = parseInt(query.pageSize, 10);
  const pageSize = allowedSizeSet.has(pageSizeRaw) ? pageSizeRaw : defaultPageSize;

  const sort = allowedSortColumns.has(query.sort) ? query.sort : defaultSort;
  const dir = query.dir === 'asc' ? 'asc' : (query.dir === 'desc' ? 'desc' : defaultDir);

  return {
    page: parsePositiveInt(query.page, 1),
    pageSize,
    sort,
    dir,
  };
}

function buildPaginationMeta({ page, pageSize, total }) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const safePage = totalPages === 0 ? 1 : Math.min(Math.max(page, 1), totalPages);
  const offset = (safePage - 1) * pageSize;
  const start = total === 0 ? 0 : offset + 1;
  const end = total === 0 ? 0 : Math.min(offset + pageSize, total);

  return {
    page: safePage,
    pageSize,
    total,
    totalPages,
    offset,
    start,
    end,
    hasPrev: safePage > 1,
    hasNext: totalPages > 0 && safePage < totalPages,
  };
}

function buildQueryString(baseParams, overrides = {}) {
  const params = new URLSearchParams();

  Object.entries({ ...baseParams, ...overrides }).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });

  const query = params.toString();
  return query ? `?${query}` : '';
}

function buildPageNumbers(currentPage, totalPages, windowSize = 2) {
  if (totalPages <= 1) {
    return totalPages === 1 ? [1] : [];
  }

  const pages = new Set([1, totalPages, currentPage]);

  for (let i = currentPage - windowSize; i <= currentPage + windowSize; i += 1) {
    if (i >= 1 && i <= totalPages) {
      pages.add(i);
    }
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const result = [];

  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) {
      result.push('…');
    }
    result.push(page);
  });

  return result;
}

module.exports = {
  parsePaginationQuery,
  buildPaginationMeta,
  buildQueryString,
  buildPageNumbers,
};
