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

  function initViewToggle(config) {
    const storageKey = config.viewStorageKey;
    const defaultView = config.defaultView === 'list' ? 'list' : 'grid';
    const listView = document.getElementById('projectsListView');
    const gridView = document.getElementById('projectsGridView');
    const toggleButtons = document.querySelectorAll('[data-project-list-view]');

    if (!storageKey || !listView || !gridView || !toggleButtons.length) {
      return;
    }

    let view = defaultView;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === 'list' || stored === 'grid') {
        view = stored;
      }
    } catch {
      view = defaultView;
    }

    function applyView(mode) {
      const isList = mode === 'list';
      listView.classList.toggle('d-none', !isList);
      gridView.classList.toggle('d-none', isList);
      toggleButtons.forEach((button) => {
        button.classList.toggle('active', button.dataset.projectListView === mode);
        button.setAttribute('aria-pressed', button.dataset.projectListView === mode ? 'true' : 'false');
      });
      try {
        localStorage.setItem(storageKey, mode);
      } catch {
        // ignore storage errors
      }
    }

    toggleButtons.forEach((button) => {
      button.addEventListener('click', () => {
        applyView(button.dataset.projectListView);
      });
    });

    applyView(view);
  }

  if (document.getElementById('entity-list-config')) {
    initViewToggle(readConfig());
  }
})();
