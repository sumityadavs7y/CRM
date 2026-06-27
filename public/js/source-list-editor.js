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
    const placeholder = container.querySelector('.source-empty-row');
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
  }

  function handleDeleteRow(form, row) {
    const container = form.querySelector('[data-row-container]');
    const rowId = row.dataset.rowId;
    addDeletedId(form, rowId);
    row.remove();
    renumberRows(container);

    if (!container.querySelector('tr[data-row]')) {
      const placeholder = document.createElement('tr');
      placeholder.className = 'source-empty-row';
      placeholder.innerHTML = '<td colspan="4" class="text-muted">No sources yet. Add one below.</td>';
      container.appendChild(placeholder);
    }
  }

  function reindexFormFields(form) {
    const rows = form.querySelectorAll('tr[data-row]');

    rows.forEach((row, index) => {
      const idInput = row.querySelector('input[name$="[id]"]');
      const nameInput = row.querySelector('input[name$="[name]"]');

      if (idInput) {
        idInput.name = `sources[${index}][id]`;
      }
      if (nameInput) {
        nameInput.name = `sources[${index}][name]`;
      }
    });
  }

  function validateForm(form) {
    const rows = form.querySelectorAll('tr[data-row]');
    const names = new Set();

    for (const row of rows) {
      const nameInput = row.querySelector('input[name$="[name]"]');
      const trimmed = nameInput?.value.trim() || '';

      if (!trimmed) {
        window.alert('All source names are required before saving.');
        nameInput?.focus();
        return false;
      }

      const key = trimmed.toLowerCase();
      if (names.has(key)) {
        window.alert(`Duplicate name "${trimmed}".`);
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

  function initAll() {
    document.querySelectorAll('.source-list-form').forEach(initForm);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
