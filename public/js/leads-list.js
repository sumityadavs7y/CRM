(function () {
  const table = document.querySelector('[data-leads-table]');
  if (!table) {
    return;
  }

  const tbody = table.querySelector('tbody');
  const headers = table.querySelectorAll('th[data-sortable]');
  let currentSort = { column: null, direction: 'asc' };

  function isEmptyValue(value) {
    return value === '' || value === null || value === undefined;
  }

  function parseSortValue(value, type) {
    if (isEmptyValue(value)) {
      return null;
    }

    if (type === 'number') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    if (type === 'date') {
      const parsed = Date.parse(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return String(value).toLowerCase();
  }

  function getCellSortValue(row, columnIndex, sortType) {
    const cell = row.children[columnIndex];
    if (!cell) {
      return null;
    }

    const rawValue = cell.dataset.sortValue !== undefined
      ? cell.dataset.sortValue
      : cell.textContent.trim();

    return parseSortValue(rawValue, sortType);
  }

  function compareValues(a, b) {
    if (a === null && b === null) {
      return 0;
    }
    if (a === null) {
      return 1;
    }
    if (b === null) {
      return -1;
    }

    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }

    return String(a).localeCompare(String(b));
  }

  function updateSortIndicators() {
    headers.forEach((header, index) => {
      const icon = header.querySelector('.sort-indicator');
      if (!icon) {
        return;
      }

      icon.classList.remove('ri-arrow-up-s-line', 'ri-arrow-down-s-line', 'ri-arrow-up-down-line');

      if (currentSort.column === index) {
        icon.classList.add(currentSort.direction === 'asc' ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line');
        header.setAttribute('aria-sort', currentSort.direction === 'asc' ? 'ascending' : 'descending');
      } else {
        icon.classList.add('ri-arrow-up-down-line');
        header.setAttribute('aria-sort', 'none');
      }
    });
  }

  function sortByColumn(header) {
    const columnIndex = Array.from(header.parentNode.children).indexOf(header);
    const sortType = header.dataset.sortType || 'text';
    const rows = Array.from(tbody.querySelectorAll('tr'));

    if (currentSort.column === columnIndex) {
      currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      currentSort.column = columnIndex;
      currentSort.direction = 'asc';
    }

    rows.sort((rowA, rowB) => {
      const valueA = getCellSortValue(rowA, columnIndex, sortType);
      const valueB = getCellSortValue(rowB, columnIndex, sortType);
      const result = compareValues(valueA, valueB);

      return currentSort.direction === 'asc' ? result : -result;
    });

    rows.forEach((row) => tbody.appendChild(row));
    updateSortIndicators();
  }

  headers.forEach((header) => {
    header.addEventListener('click', () => sortByColumn(header));
    header.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        sortByColumn(header);
      }
    });
  });

  updateSortIndicators();
})();
