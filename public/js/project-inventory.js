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
    if (!window.bootstrap) {
      return;
    }

    const instance = window.bootstrap.Collapse.getOrCreateInstance(collapseEl, { toggle: false });
    if (expanded) {
      instance.show();
    } else {
      instance.hide();
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

  function initInventoryCollapse() {
    const tree = document.getElementById('projectInventoryTree');
    if (!tree || !window.bootstrap) {
      return;
    }

    const savedState = loadExpandedState();
    const collapseEls = tree.querySelectorAll('[data-inventory-collapse]');

    collapseEls.forEach((collapseEl) => {
      const nodeKey = collapseEl.dataset.inventoryNodeKey;
      const defaultExpanded = collapseEl.dataset.inventoryDefaultExpanded === 'true';
      const shouldExpand = Object.prototype.hasOwnProperty.call(savedState, nodeKey)
        ? savedState[nodeKey]
        : defaultExpanded;

      setCollapseExpanded(collapseEl, shouldExpand, { persist: false });

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
        if (!confirm('Delete this unit?')) {
          return;
        }
        const unitId = button.getAttribute('data-unit-id');
        await submitJson(`/company/projects/${projectId}/units/${unitId}/delete`, 'POST');
        reloadInventoryTab();
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

  function init() {
    initInventoryCollapse();
    initInventoryDropdowns();
    initInventoryUiActions();
    initInventoryEditing();

    if (config.activeTab && config.activeTab !== 'general') {
      const tabButton = document.querySelector(`[data-project-tab="${config.activeTab}"]`);
      if (tabButton && window.bootstrap) {
        window.bootstrap.Tab.getOrCreateInstance(tabButton).show();
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
