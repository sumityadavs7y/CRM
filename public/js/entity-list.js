(function () {
  function readConfig() {
    const el = document.getElementById('entity-list-config');
    if (!el) {
      return {};
    }

    try {
      return JSON.parse(el.textContent || '{}');
    } catch {
      return {};
    }
  }

  function init(userConfig) {
    const config = { ...readConfig(), ...userConfig };
    initPageSizeSelect();
    initColumnPicker(config);
    initFilterCollapse(config);
  }

  function initPageSizeSelect() {
    const pageSizeSelect = document.querySelector('[data-list-page-size]');
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
    return Array.from(document.querySelectorAll('[data-list-column-toggle]'))
      .map((input) => input.dataset.listColumnToggle)
      .filter(Boolean);
  }

  function getStorageKey(config) {
    const picker = document.querySelector('[data-list-column-picker]');
    return picker?.dataset.storageKey || config.columnsStorageKey || '';
  }

  function getDefaultVisibleColumns() {
    const picker = document.querySelector('[data-list-column-picker]');
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

  function loadVisibleColumns(config) {
    const known = getKnownColumnKeys();
    const defaultVisible = getDefaultVisibleColumns();
    const storageKey = getStorageKey(config);

    if (known.length === 0 || !storageKey) {
      return known.filter((key) => defaultVisible.includes(key));
    }

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        return known.filter((key) => defaultVisible.includes(key));
      }

      const stored = JSON.parse(raw);
      return normalizeVisibleColumns(stored, known, defaultVisible);
    } catch {
      return known.filter((key) => defaultVisible.includes(key));
    }
  }

  function saveVisibleColumns(keys, config) {
    const storageKey = getStorageKey(config);
    if (!storageKey) {
      return;
    }
    localStorage.setItem(storageKey, JSON.stringify(keys));
  }

  function applyColumnVisibility(visibleKeys) {
    const visibleSet = new Set(visibleKeys);

    document.querySelectorAll('[data-list-column]').forEach((cell) => {
      const columnKey = cell.dataset.listColumn;
      cell.classList.toggle('d-none', !visibleSet.has(columnKey));
    });
  }

  function syncCheckboxes(visibleKeys) {
    const visibleSet = new Set(visibleKeys);

    document.querySelectorAll('[data-list-column-toggle]').forEach((input) => {
      input.checked = visibleSet.has(input.dataset.listColumnToggle);
    });
  }

  function initColumnPicker(config) {
    const picker = document.querySelector('[data-list-column-picker]');
    if (!picker) {
      return;
    }

    const known = getKnownColumnKeys();
    if (known.length === 0) {
      return;
    }

    let visibleColumns = loadVisibleColumns(config);
    applyColumnVisibility(visibleColumns);
    syncCheckboxes(visibleColumns);

    picker.querySelectorAll('[data-list-column-toggle]').forEach((input) => {
      input.addEventListener('change', () => {
        const selected = Array.from(picker.querySelectorAll('[data-list-column-toggle]:checked'))
          .map((checkbox) => checkbox.dataset.listColumnToggle);

        if (selected.length === 0) {
          input.checked = true;
          return;
        }

        visibleColumns = selected;
        applyColumnVisibility(visibleColumns);
        saveVisibleColumns(visibleColumns, config);
      });
    });
  }

  function initFilterCollapse(config) {
    function setup() {
      const panelId = config.filtersPanelId;
      if (!panelId) {
        return false;
      }

      const panel = document.getElementById(panelId);
      const toggle = document.querySelector('[data-list-filters-toggle]');
      const hasActiveEl = document.getElementById('entity-list-has-active-filters');
      const storageKey = config.filtersExpandedStorageKey;

      if (!panel || !toggle || typeof bootstrap === 'undefined') {
        return false;
      }

      let hasActiveFilters = false;
      try {
        hasActiveFilters = JSON.parse(hasActiveEl?.textContent || 'false');
      } catch {
        hasActiveFilters = false;
      }

      if (!hasActiveFilters && storageKey) {
        try {
          const stored = localStorage.getItem(storageKey);
          if (stored === 'true') {
            bootstrap.Collapse.getOrCreateInstance(panel, { toggle: false }).show();
          } else if (stored === 'false') {
            bootstrap.Collapse.getOrCreateInstance(panel, { toggle: false }).hide();
          }
        } catch {
          // ignore storage errors
        }
      }

      panel.addEventListener('shown.bs.collapse', () => {
        toggle.setAttribute('aria-expanded', 'true');
        if (storageKey) {
          localStorage.setItem(storageKey, 'true');
        }
      });

      panel.addEventListener('hidden.bs.collapse', () => {
        toggle.setAttribute('aria-expanded', 'false');
        if (storageKey) {
          localStorage.setItem(storageKey, 'false');
        }
      });

      return true;
    }

    if (!setup()) {
      window.addEventListener('load', setup);
    }
  }

  window.EntityList = { init };

  if (document.getElementById('entity-list-config')) {
    EntityList.init();
  }
})();
