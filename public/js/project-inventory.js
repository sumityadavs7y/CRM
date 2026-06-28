(function () {
  const config = window.projectDetailConfig || {};
  const projectId = config.projectId;
  if (!projectId) {
    return;
  }

  const COLLAPSE_STORAGE_KEY = `crm.project-inventory.expanded.${projectId}`;

  function getModal(id) {
    const el = document.getElementById(id);
    if (!el || !window.bootstrap) {
      return null;
    }
    return window.bootstrap.Modal.getOrCreateInstance(el);
  }

  function parseJsonAttr(button, attr) {
    const raw = button.getAttribute(attr);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  let editingPhaseId = null;
  let editingBlockId = null;
  let editingFloorId = null;
  let editingUnitId = null;
  let currentBlockIdForFloor = null;
  let currentFloorIdForUnit = null;

  function showFormError(formErrorEl, message) {
    formErrorEl.textContent = message;
    formErrorEl.classList.remove('d-none');
  }

  function clearFormError(formErrorEl) {
    formErrorEl.textContent = '';
    formErrorEl.classList.add('d-none');
  }

  async function submitJson(url, method, body) {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Requested-With': 'fetch',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Request failed.');
    }
    return data;
  }

  async function fetchDeleteImpact(unitId) {
    const response = await fetch(`/company/projects/${projectId}/units/${unitId}/delete-impact`, {
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'fetch',
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Failed to check related records.');
    }
    return data.impact;
  }

  function openUnitDeleteModal(impact) {
    return new Promise((resolve) => {
      const modalEl = document.getElementById('unitDeleteModal');
      if (!modalEl || !window.bootstrap) {
        if (!confirm(
          `Unit ${impact.unitNumber} is linked to ${impact.quotations} quotation(s), `
          + `${impact.invoices} invoice(s), and ${impact.receipts} receipt(s). Delete this unit?`
        )) {
          resolve(null);
          return;
        }
        resolve(confirm(
          'Delete ALL related quotations, invoices, and receipts too?\n\n'
          + 'OK = delete everything\nCancel = keep records (unlink only)'
        ));
        return;
      }

      document.getElementById('unitDeleteModalUnitNumber').textContent = impact.unitNumber;
      document.getElementById('unitDeleteModalQuotationCount').textContent = String(impact.quotations);
      document.getElementById('unitDeleteModalInvoiceCount').textContent = String(impact.invoices);
      document.getElementById('unitDeleteModalReceiptCount').textContent = String(impact.receipts);

      const checkbox = document.getElementById('unitDeleteModalDeleteRelated');
      checkbox.checked = false;

      const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
      const confirmBtn = document.getElementById('unitDeleteModalConfirm');

      const cleanup = () => {
        confirmBtn.removeEventListener('click', onConfirm);
        modalEl.removeEventListener('hidden.bs.modal', onHidden);
      };

      const onConfirm = () => {
        const deleteRelated = checkbox.checked;
        cleanup();
        modal.hide();
        resolve(deleteRelated);
      };

      const onHidden = () => {
        cleanup();
        resolve(null);
      };

      confirmBtn.addEventListener('click', onConfirm);
      modalEl.addEventListener('hidden.bs.modal', onHidden, { once: false });
      modal.show();
    });
  }

  async function confirmAndDeleteUnit(unitId) {
    const impact = await fetchDeleteImpact(unitId);
    let deleteRelated = false;

    if (impact.hasRelated) {
      const choice = await openUnitDeleteModal(impact);
      if (choice === null) {
        return;
      }
      deleteRelated = choice;
    } else if (!confirm(`Delete unit ${impact.unitNumber}?`)) {
      return;
    }

    await submitJson(`/company/projects/${projectId}/units/${unitId}/delete`, 'POST', { deleteRelated });
    reloadInventoryTab();
  }

  function reloadInventoryTab() {
    window.location.href = `/company/projects/${projectId}?tab=inventory&success=Saved+successfully.`;
  }

  function getFormData(form) {
    const formData = new FormData(form);
    const body = {};
    formData.forEach((value, key) => {
      if (value !== '') {
        body[key] = value;
      }
    });
    return body;
  }

  function loadExpandedState() {
    try {
      const raw = localStorage.getItem(COLLAPSE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function saveExpandedState(state) {
    try {
      localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage errors
    }
  }

  function getCollapseControls(collapseEl) {
    const targetId = collapseEl.id;
    if (!targetId) {
      return [];
    }

    return Array.from(document.querySelectorAll(`[data-bs-target="#${targetId}"]`));
  }

  function syncCollapseUi(collapseEl, expanded) {
    const header = collapseEl.previousElementSibling;
    if (header?.classList.contains('inventory-node__header')) {
      header.classList.toggle('inventory-node__header--expanded', expanded);
    }

    getCollapseControls(collapseEl).forEach((control) => {
      control.setAttribute('aria-expanded', expanded ? 'true' : 'false');

      if (control.classList.contains('inventory-node__toggle')) {
        const parts = (control.getAttribute('aria-label') || '').match(/^(Collapse|Expand)\s+(.*)$/);
        if (parts) {
          control.setAttribute('aria-label', `${expanded ? 'Collapse' : 'Expand'} ${parts[2]}`);
        }
      }
    });
  }

  function setCollapseExpanded(collapseEl, expanded, { persist = true, state } = {}) {
    if (window.bootstrap) {
      const instance = window.bootstrap.Collapse.getOrCreateInstance(collapseEl, { toggle: false });
      if (expanded) {
        instance.show();
      } else {
        instance.hide();
      }
    } else {
      collapseEl.classList.toggle('show', expanded);
    }

    syncCollapseUi(collapseEl, expanded);

    if (persist) {
      const nodeKey = collapseEl.dataset.inventoryNodeKey;
      if (nodeKey) {
        const nextState = state || loadExpandedState();
        nextState[nodeKey] = expanded;
        saveExpandedState(nextState);
      }
    }
  }

  function getFocusUnitId() {
    const params = new URLSearchParams(window.location.search);
    return config.focusUnitId || params.get('unitId') || null;
  }

  function getFocusNodeKeys() {
    return new Set(Array.isArray(config.inventoryFocusNodeKeys) ? config.inventoryFocusNodeKeys : []);
  }

  function resolveFocusUnitRow() {
    const unitId = getFocusUnitId();
    if (!unitId) {
      return null;
    }
    return document.getElementById(`inventory-unit-${unitId}`)
      || document.querySelector(`[data-inventory-unit-id="${unitId}"]`);
  }

  function getAncestorCollapses(element) {
    const collapses = [];
    let el = element?.parentElement;
    while (el) {
      if (el.matches('[data-inventory-collapse]')) {
        collapses.push(el);
      }
      el = el.parentElement;
    }
    return collapses.reverse();
  }

  function waitForCollapseShown(collapseEl) {
    return new Promise((resolve) => {
      if (collapseEl.classList.contains('show')) {
        resolve();
        return;
      }

      let settled = false;
      const finish = () => {
        if (settled) {
          return;
        }
        settled = true;
        collapseEl.removeEventListener('shown.bs.collapse', finish);
        resolve();
      };

      collapseEl.addEventListener('shown.bs.collapse', finish);
      window.setTimeout(finish, 400);
    });
  }

  async function expandCollapsesSequentially(collapses, state) {
    for (const collapseEl of collapses) {
      const nodeKey = collapseEl.dataset.inventoryNodeKey;
      if (nodeKey) {
        state[nodeKey] = true;
      }
      if (!collapseEl.classList.contains('show')) {
        setCollapseExpanded(collapseEl, true, { persist: false, state });
        await waitForCollapseShown(collapseEl);
      } else {
        syncCollapseUi(collapseEl, true);
      }
    }
    saveExpandedState(state);
  }

  function initInventoryCollapse() {
    const tree = document.getElementById('projectInventoryTree');
    if (!tree) {
      return;
    }

    const savedState = loadExpandedState();
    const focusNodeKeys = getFocusNodeKeys();
    const collapseEls = tree.querySelectorAll('[data-inventory-collapse]');

    collapseEls.forEach((collapseEl) => {
      const nodeKey = collapseEl.dataset.inventoryNodeKey;
      const defaultExpanded = collapseEl.dataset.inventoryDefaultExpanded === 'true';
      let shouldExpand = Object.prototype.hasOwnProperty.call(savedState, nodeKey)
        ? savedState[nodeKey]
        : defaultExpanded;

      if (nodeKey && focusNodeKeys.has(nodeKey)) {
        shouldExpand = true;
        savedState[nodeKey] = true;
      }

      setCollapseExpanded(collapseEl, shouldExpand, { persist: false });

      if (!window.bootstrap) {
        return;
      }

      collapseEl.addEventListener('shown.bs.collapse', () => {
        syncCollapseUi(collapseEl, true);
        const state = loadExpandedState();
        if (nodeKey) {
          state[nodeKey] = true;
          saveExpandedState(state);
        }
      });

      collapseEl.addEventListener('hidden.bs.collapse', () => {
        syncCollapseUi(collapseEl, false);
        const state = loadExpandedState();
        if (nodeKey) {
          state[nodeKey] = false;
          saveExpandedState(state);
        }
      });
    });

    if (focusNodeKeys.size) {
      saveExpandedState(savedState);
    }

    tree.querySelectorAll('.inventory-node__title--toggle').forEach((titleEl) => {
      titleEl.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          titleEl.click();
        }
      });
    });
  }

  function setAllInventoryCollapsed(expanded) {
    const tree = document.getElementById('projectInventoryTree');
    if (!tree || !window.bootstrap) {
      return;
    }

    const state = {};
    tree.querySelectorAll('[data-inventory-collapse]').forEach((collapseEl) => {
      const nodeKey = collapseEl.dataset.inventoryNodeKey;
      if (nodeKey) {
        state[nodeKey] = expanded;
      }
      setCollapseExpanded(collapseEl, expanded, { persist: false, state });
    });
    saveExpandedState(state);
  }

  function initInventoryDropdowns() {
    if (!window.bootstrap) {
      return;
    }

    const popperConfig = {
      strategy: 'fixed',
      modifiers: [
        { name: 'preventOverflow', options: { boundary: 'viewport' } },
      ],
    };

    document.querySelectorAll('.inventory-kebab [data-bs-toggle="dropdown"], .unit-status-dropdown [data-bs-toggle="dropdown"]').forEach((toggle) => {
      window.bootstrap.Dropdown.getOrCreateInstance(toggle, { popperConfig });
    });
  }

  function openPhaseModal(phase) {
    const phaseModal = getModal('phaseModal');
    if (!phaseModal) {
      return;
    }

    editingPhaseId = phase ? phase.id : null;
    document.getElementById('phaseModalLabel').textContent = phase ? 'Edit Phase' : 'Add Phase';
    document.getElementById('phaseName').value = phase ? phase.name : '';
    document.getElementById('phaseStatus').value = phase ? phase.status : 'planning';
    document.getElementById('phaseLaunchDate').value = phase ? (phase.launchDate || '') : '';
    document.getElementById('phasePossessionDate').value = phase ? (phase.possessionDate || '') : '';
    clearFormError(document.getElementById('phaseFormError'));
    phaseModal.show();
  }

  function openBlockModal(block, phaseId) {
    const blockModal = getModal('blockModal');
    if (!blockModal) {
      return;
    }

    editingBlockId = block ? block.id : null;
    document.getElementById('blockModalLabel').textContent = block ? 'Edit Block' : 'Add Block';
    document.getElementById('blockName').value = block ? block.name : '';
    document.getElementById('blockTotalFloors').value = block && block.totalFloors != null ? block.totalFloors : '';
    const phaseSelect = document.getElementById('blockPhaseSelect');
    if (phaseSelect) {
      phaseSelect.value = block ? (block.phaseId || '') : (phaseId || '');
    }
    clearFormError(document.getElementById('blockFormError'));
    blockModal.show();
  }

  function openFloorModal(floor, blockId) {
    const floorModal = getModal('floorModal');
    if (!floorModal) {
      return;
    }

    editingFloorId = floor ? floor.id : null;
    currentBlockIdForFloor = blockId;
    document.getElementById('floorModalLabel').textContent = floor ? 'Edit Floor' : 'Add Floor';
    document.getElementById('floorLabel').value = floor ? floor.label : '';
    document.getElementById('floorNumber').value = floor ? floor.floorNumber : '';
    clearFormError(document.getElementById('floorFormError'));
    floorModal.show();
  }

  function openUnitModal(unit, floorId) {
    const unitModal = getModal('unitModal');
    if (!unitModal) {
      return;
    }

    editingUnitId = unit ? unit.id : null;
    currentFloorIdForUnit = floorId;
    document.getElementById('unitModalLabel').textContent = unit ? 'Edit Unit' : 'Add Unit';
    document.getElementById('unitNumber').value = unit ? unit.unitNumber : '';
    document.getElementById('unitType').value = unit ? unit.unitType : '2bhk';
    document.getElementById('unitStatus').value = unit ? unit.status : 'available';
    document.getElementById('carpetAreaSqft').value = unit && unit.carpetAreaSqft != null ? unit.carpetAreaSqft : '';
    document.getElementById('superBuiltUpAreaSqft').value = unit && unit.superBuiltUpAreaSqft != null ? unit.superBuiltUpAreaSqft : '';
    document.getElementById('unitFacing').value = unit ? (unit.facing || '') : '';
    document.getElementById('basePrice').value = unit && unit.basePrice != null ? unit.basePrice : '';
    clearFormError(document.getElementById('unitFormError'));
    unitModal.show();
  }

  function initInventoryEditing() {
    if (!config.canEdit || !document.getElementById('phaseModal')) {
      return;
    }

    document.getElementById('phaseForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const errorEl = document.getElementById('phaseFormError');
      clearFormError(errorEl);

      try {
        const body = getFormData(event.target);
        if (editingPhaseId) {
          await submitJson(`/company/projects/${projectId}/phases/${editingPhaseId}`, 'PATCH', body);
        } else {
          await submitJson(`/company/projects/${projectId}/phases`, 'POST', body);
        }
        getModal('phaseModal')?.hide();
        reloadInventoryTab();
      } catch (error) {
        showFormError(errorEl, error.message);
      }
    });

    document.getElementById('blockForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const errorEl = document.getElementById('blockFormError');
      clearFormError(errorEl);

      try {
        const body = getFormData(event.target);
        if (!body.phaseId) {
          delete body.phaseId;
        }
        if (editingBlockId) {
          await submitJson(`/company/projects/${projectId}/blocks/${editingBlockId}`, 'PATCH', body);
        } else {
          await submitJson(`/company/projects/${projectId}/blocks`, 'POST', body);
        }
        getModal('blockModal')?.hide();
        reloadInventoryTab();
      } catch (error) {
        showFormError(errorEl, error.message);
      }
    });

    document.getElementById('floorForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const errorEl = document.getElementById('floorFormError');
      clearFormError(errorEl);

      try {
        const body = getFormData(event.target);
        const blockId = currentBlockIdForFloor;
        if (editingFloorId) {
          await submitJson(`/company/projects/${projectId}/floors/${editingFloorId}`, 'PATCH', body);
        } else {
          await submitJson(`/company/projects/${projectId}/blocks/${blockId}/floors`, 'POST', body);
        }
        getModal('floorModal')?.hide();
        reloadInventoryTab();
      } catch (error) {
        showFormError(errorEl, error.message);
      }
    });

    document.getElementById('unitForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const errorEl = document.getElementById('unitFormError');
      clearFormError(errorEl);

      try {
        const body = getFormData(event.target);
        const floorId = currentFloorIdForUnit;
        if (editingUnitId) {
          await submitJson(`/company/projects/${projectId}/units/${editingUnitId}`, 'PATCH', body);
        } else {
          await submitJson(`/company/projects/${projectId}/floors/${floorId}/units`, 'POST', body);
        }
        getModal('unitModal')?.hide();
        reloadInventoryTab();
      } catch (error) {
        showFormError(errorEl, error.message);
      }
    });

    document.addEventListener('click', async (event) => {
      if (event.target.closest('.inventory-node__actions')) {
        event.stopPropagation();
      }

      const statusOption = event.target.closest('.unit-status-option');
      if (statusOption) {
        event.preventDefault();
        const unitId = statusOption.getAttribute('data-unit-id');
        const status = statusOption.getAttribute('data-unit-status');
        const dropdown = statusOption.closest('.unit-status-dropdown');
        const badge = dropdown?.querySelector('.unit-status-badge');
        const labelEl = badge?.querySelector('.unit-status-label');
        const previous = badge?.getAttribute('data-status');

        if (!badge || !labelEl || status === previous) {
          return;
        }

        try {
          await submitJson(`/company/projects/${projectId}/units/${unitId}`, 'PATCH', { status });
          const labels = config.unitStatusLabels || {};
          const badgeClasses = config.unitStatusBadgeClasses || {};
          badge.setAttribute('data-status', status);
          badge.className = `badge unit-status-badge ${badgeClasses[status] || 'bg-secondary-subtle text-secondary'}`;
          labelEl.textContent = labels[status] || status;
          dropdown.querySelectorAll('.unit-status-option').forEach((option) => {
            option.classList.toggle('active', option.getAttribute('data-unit-status') === status);
          });
        } catch (error) {
          alert(error.message);
        }
        return;
      }

      const button = event.target.closest('[data-inventory-action]');
      if (!button) {
        return;
      }

      event.preventDefault();
      const action = button.getAttribute('data-inventory-action');

      if (action === 'expand-all') {
        setAllInventoryCollapsed(true);
        return;
      }

      if (action === 'collapse-all') {
        setAllInventoryCollapsed(false);
        return;
      }

      if (action === 'add-phase') {
        openPhaseModal(null);
        return;
      }

      if (action === 'edit-phase') {
        openPhaseModal(parseJsonAttr(button, 'data-phase'));
        return;
      }

      if (action === 'delete-phase') {
        if (!confirm('Delete this phase and all its blocks, floors, and units?')) {
          return;
        }
        const phaseId = button.getAttribute('data-phase-id');
        await submitJson(`/company/projects/${projectId}/phases/${phaseId}/delete`, 'POST');
        reloadInventoryTab();
        return;
      }

      if (action === 'add-block') {
        openBlockModal(null, button.getAttribute('data-phase-id') || '');
        return;
      }

      if (action === 'edit-block') {
        openBlockModal(parseJsonAttr(button, 'data-block'));
        return;
      }

      if (action === 'delete-block') {
        if (!confirm('Delete this block and all its floors and units?')) {
          return;
        }
        const blockId = button.getAttribute('data-block-id');
        await submitJson(`/company/projects/${projectId}/blocks/${blockId}/delete`, 'POST');
        reloadInventoryTab();
        return;
      }

      if (action === 'add-floor') {
        openFloorModal(null, button.getAttribute('data-block-id'));
        return;
      }

      if (action === 'edit-floor') {
        const floor = parseJsonAttr(button, 'data-floor');
        openFloorModal(floor, floor?.blockId);
        return;
      }

      if (action === 'delete-floor') {
        if (!confirm('Delete this floor and all its units?')) {
          return;
        }
        const floorId = button.getAttribute('data-floor-id');
        await submitJson(`/company/projects/${projectId}/floors/${floorId}/delete`, 'POST');
        reloadInventoryTab();
        return;
      }

      if (action === 'add-unit') {
        openUnitModal(null, button.getAttribute('data-floor-id'));
        return;
      }

      if (action === 'edit-unit') {
        const unit = parseJsonAttr(button, 'data-unit');
        openUnitModal(unit, unit?.floorId);
        return;
      }

      if (action === 'delete-unit') {
        const unitId = button.getAttribute('data-unit-id');
        try {
          await confirmAndDeleteUnit(unitId);
        } catch (error) {
          alert(error.message);
        }
        return;
      }
    });
  }

  function initInventoryUiActions() {
    document.addEventListener('click', (event) => {
      if (config.canEdit) {
        return;
      }

      const button = event.target.closest('[data-inventory-action]');
      if (!button) {
        return;
      }

      event.preventDefault();
      const action = button.getAttribute('data-inventory-action');
      if (action === 'expand-all') {
        setAllInventoryCollapsed(true);
      } else if (action === 'collapse-all') {
        setAllInventoryCollapsed(false);
      }
    });
  }

  async function focusInventoryUnitFromUrl() {
    const unitId = getFocusUnitId();
    const activeTab = config.activeTab || new URLSearchParams(window.location.search).get('tab') || 'general';
    if (!unitId || activeTab !== 'inventory') {
      return;
    }

    const unitRow = resolveFocusUnitRow();
    if (!unitRow) {
      return;
    }

    const collapses = getAncestorCollapses(unitRow);
    const state = loadExpandedState();
    await expandCollapsesSequentially(collapses, state);

    window.requestAnimationFrame(() => {
      unitRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      unitRow.classList.add('inventory-unit-row--focused');
      window.setTimeout(() => {
        unitRow.classList.remove('inventory-unit-row--focused');
      }, 4000);
    });
  }

  async function init() {
    initInventoryCollapse();
    initInventoryDropdowns();
    initInventoryUiActions();
    initInventoryEditing();
    await focusInventoryUnitFromUrl();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
