(function () {
  function renumberRows(container) {
    const rows = container.querySelectorAll('tr[data-row]');
    rows.forEach((row, index) => {
      const indexCell = row.querySelector('.row-index');
      if (indexCell) {
        indexCell.textContent = String(index + 1);
      }
    });
  }

  function removeEmptyPlaceholder(container) {
    const placeholder = container.querySelector('.pipeline-empty-row');
    if (placeholder) {
      placeholder.remove();
    }
  }

  function addDeletedId(form, rowId) {
    if (!rowId) {
      return;
    }

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'deletedIds[]';
    input.value = rowId;
    form.appendChild(input);
  }

  function handleAddRow(form) {
    const container = form.querySelector('[data-row-container]');
    const template = form.querySelector('template[data-row-template]');
    if (!container || !template) {
      return;
    }

    removeEmptyPlaceholder(container);

    const row = template.content.firstElementChild.cloneNode(true);
    container.appendChild(row);
    renumberRows(container);

    const nameInput = row.querySelector('input[name$="[name]"]');
    if (nameInput) {
      nameInput.focus();
    }

    if (typeof window.initPipelineColorPickers === 'function') {
      window.initPipelineColorPickers(row);
    }
  }

  function handleDeleteRow(form, row) {
    const container = form.querySelector('[data-row-container]');
    const rowId = row.dataset.rowId;
    addDeletedId(form, rowId);
    row.remove();
    renumberRows(container);

    if (!container.querySelector('tr[data-row]')) {
      const placeholder = document.createElement('tr');
      placeholder.className = 'pipeline-empty-row';
      const colSpan = form.dataset.tabType === 'label' ? '4' : '3';
      placeholder.innerHTML = `<td colspan="${colSpan}" class="text-muted">No items yet. Add one below.</td>`;
      container.appendChild(placeholder);
    }
  }

  function reindexFormFields(form) {
    const tabType = form.dataset.tabType;
    const prefix = tabType === 'label' ? 'labels' : 'stages';
    const rows = form.querySelectorAll('tr[data-row]');

    rows.forEach((row, index) => {
      const idInput = row.querySelector('input[name$="[id]"]');
      const nameInput = row.querySelector('input[name$="[name]"]');
      const colorInput = row.querySelector('input[name$="[color]"]');

      if (idInput) {
        idInput.name = `${prefix}[${index}][id]`;
      }
      if (nameInput) {
        nameInput.name = `${prefix}[${index}][name]`;
      }
      if (colorInput) {
        colorInput.name = `${prefix}[${index}][color]`;
      }
    });
  }

  function validateForm(form) {
    const tabType = form.dataset.tabType;
    const rows = form.querySelectorAll('tr[data-row]');

    if (tabType === 'stage' && rows.length < 1) {
      window.alert('Each pipeline must have at least one stage per type.');
      return false;
    }

    const names = new Set();
    for (const row of rows) {
      const nameInput = row.querySelector('input[name$="[name]"]');
      const trimmed = nameInput?.value.trim() || '';

      if (!trimmed) {
        window.alert('All names are required before saving.');
        nameInput?.focus();
        return false;
      }

      const key = trimmed.toLowerCase();
      if (names.has(key)) {
        window.alert(`Duplicate name "${trimmed}" in this tab.`);
        nameInput?.focus();
        return false;
      }

      names.add(key);
    }

    return true;
  }

  function initForm(form) {
    if (form.dataset.editorBound === 'true') {
      return;
    }

    form.dataset.editorBound = 'true';

    const addButton = form.querySelector('.btn-add-row');
    if (addButton) {
      addButton.addEventListener('click', () => handleAddRow(form));
    }

    form.addEventListener('click', (event) => {
      const deleteButton = event.target.closest('.btn-delete-row');
      if (!deleteButton) {
        return;
      }

      event.preventDefault();
      const row = deleteButton.closest('tr[data-row]');
      if (!row) {
        return;
      }

      handleDeleteRow(form, row);
    });

    form.addEventListener('submit', (event) => {
      if (!validateForm(form)) {
        event.preventDefault();
        return;
      }

      reindexFormFields(form);
    });
  }

  function initPipelineTabs() {
    const tabButtons = document.querySelectorAll('[data-bs-toggle="tab"][data-bs-target^="#pipeline-pane-"]');
    tabButtons.forEach((button) => {
      button.addEventListener('shown.bs.tab', () => {
        const target = button.getAttribute('data-bs-target') || '';
        const tabKey = target.replace('#pipeline-pane-', '');
        if (!tabKey) {
          return;
        }

        const url = new URL(window.location.href);
        if (tabKey === 'lead') {
          url.searchParams.delete('tab');
        } else {
          url.searchParams.set('tab', tabKey);
        }
        url.searchParams.delete('success');
        url.searchParams.delete('error');
        window.history.replaceState({}, '', url.toString());
      });
    });
  }

  function initAll() {
    initPipelineTabs();
    document.querySelectorAll('.pipeline-tab-form').forEach(initForm);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
