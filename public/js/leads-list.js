(function () {
  const DEFAULT_STORAGE_KEY = 'crm.leads-list.visible-columns';

  function initPageSizeSelect() {
    const pageSizeSelect = document.querySelector('[data-leads-page-size]');
    if (!pageSizeSelect) {
      return;
    }

    pageSizeSelect.addEventListener('change', () => {
      const url = new URL(window.location.href);
      url.searchParams.set('pageSize', pageSizeSelect.value);
      url.searchParams.set('page', '1');
      window.location.href = url.toString();
    });
  }

  function getKnownColumnKeys() {
    return Array.from(document.querySelectorAll('[data-lead-column-toggle]'))
      .map((input) => input.dataset.leadColumnToggle)
      .filter(Boolean);
  }

  function getStorageKey() {
    const picker = document.querySelector('[data-leads-column-picker]');
    return picker?.dataset.storageKey || DEFAULT_STORAGE_KEY;
  }

  function getDefaultVisibleColumns() {
    const picker = document.querySelector('[data-leads-column-picker]');
    if (!picker?.dataset.defaultVisibleColumns) {
      return getKnownColumnKeys();
    }

    try {
      const parsed = JSON.parse(picker.dataset.defaultVisibleColumns);
      return Array.isArray(parsed) ? parsed : getKnownColumnKeys();
    } catch {
      return getKnownColumnKeys();
    }
  }

  function normalizeVisibleColumns(stored, known, defaultVisible) {
    const defaultSet = new Set(defaultVisible);

    if (!Array.isArray(stored) || stored.length === 0) {
      return known.filter((key) => defaultSet.has(key));
    }

    const valid = stored.filter((key) => known.includes(key));
    const newColumns = known.filter((key) => !stored.includes(key));
    const merged = [
      ...valid,
      ...newColumns.filter((key) => defaultSet.has(key)),
    ];

    if (merged.length === 0) {
      return [known[0]];
    }

    return merged;
  }

  function loadVisibleColumns() {
    const known = getKnownColumnKeys();
    const defaultVisible = getDefaultVisibleColumns();

    if (known.length === 0) {
      return [];
    }

    try {
      const raw = localStorage.getItem(getStorageKey());
      if (!raw) {
        return known.filter((key) => defaultVisible.includes(key));
      }

      const stored = JSON.parse(raw);
      return normalizeVisibleColumns(stored, known, defaultVisible);
    } catch {
      return known.filter((key) => defaultVisible.includes(key));
    }
  }

  function saveVisibleColumns(keys) {
    localStorage.setItem(getStorageKey(), JSON.stringify(keys));
  }

  function applyColumnVisibility(visibleKeys) {
    const visibleSet = new Set(visibleKeys);

    document.querySelectorAll('[data-lead-column]').forEach((cell) => {
      const columnKey = cell.dataset.leadColumn;
      cell.classList.toggle('d-none', !visibleSet.has(columnKey));
    });
  }

  function syncCheckboxes(visibleKeys) {
    const visibleSet = new Set(visibleKeys);

    document.querySelectorAll('[data-lead-column-toggle]').forEach((input) => {
      input.checked = visibleSet.has(input.dataset.leadColumnToggle);
    });
  }

  function initColumnPicker() {
    const picker = document.querySelector('[data-leads-column-picker]');
    if (!picker) {
      return;
    }

    const known = getKnownColumnKeys();
    if (known.length === 0) {
      return;
    }

    let visibleColumns = loadVisibleColumns();
    applyColumnVisibility(visibleColumns);
    syncCheckboxes(visibleColumns);

    picker.querySelectorAll('[data-lead-column-toggle]').forEach((input) => {
      input.addEventListener('change', () => {
        const selected = Array.from(picker.querySelectorAll('[data-lead-column-toggle]:checked'))
          .map((checkbox) => checkbox.dataset.leadColumnToggle);

        if (selected.length === 0) {
          input.checked = true;
          return;
        }

        visibleColumns = selected;
        applyColumnVisibility(visibleColumns);
        saveVisibleColumns(visibleColumns);
      });
    });
  }

  initPageSizeSelect();
  initColumnPicker();
})();
