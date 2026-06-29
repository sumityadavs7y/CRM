function parseFocusUnitId(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function findUnitInventoryPath(project, focusUnitId) {
  const unitId = parseFocusUnitId(focusUnitId);
  if (!unitId || !project) {
    return { unitId: null, nodeKeys: new Set(), phaseTab: null };
  }

  const nodeKeys = new Set();
  let phaseTab = null;

  function searchBlock(block, phaseId = null) {
    for (const floor of block.floors || []) {
      for (const unit of floor.units || []) {
        const id = unit.id ?? unit.get?.('id');
        if (Number(id) === unitId) {
          if (phaseId) {
            phaseTab = `phase-${phaseId}`;
            nodeKeys.add(phaseTab);
          } else {
            phaseTab = 'default';
          }
          nodeKeys.add(`block-${block.id ?? block.get?.('id')}`);
          nodeKeys.add(`floor-${floor.id ?? floor.get?.('id')}`);
          return true;
        }
      }
    }
    return false;
  }

  for (const phase of project.phases || []) {
    for (const block of phase.blocks || []) {
      if (searchBlock(block, phase.id ?? phase.get?.('id'))) {
        return { unitId, nodeKeys, phaseTab };
      }
    }
  }

  for (const block of project.blocks || []) {
    const blockPhaseId = block.phaseId ?? block.get?.('phaseId') ?? null;
    if (blockPhaseId) {
      continue;
    }
    if (searchBlock(block, null)) {
      return { unitId, nodeKeys, phaseTab };
    }
  }

  return { unitId, nodeKeys: new Set(), phaseTab: null };
}

function resolveInventoryPhaseTab(queryPhaseTab, inventoryFocus, project) {
  const phases = project?.phases || [];
  const hasPhases = phases.length > 0;

  function isValidPhaseTab(tab) {
    if (tab === 'default') {
      return true;
    }
    if (!hasPhases) {
      return false;
    }
    const match = String(tab).match(/^phase-(\d+)$/);
    if (!match) {
      return false;
    }
    return phases.some((phase) => String(phase.id ?? phase.get?.('id')) === match[1]);
  }

  if (queryPhaseTab && isValidPhaseTab(queryPhaseTab)) {
    return String(queryPhaseTab);
  }
  if (inventoryFocus?.phaseTab && isValidPhaseTab(inventoryFocus.phaseTab)) {
    return inventoryFocus.phaseTab;
  }
  if (hasPhases) {
    const firstPhaseId = phases[0].id ?? phases[0].get?.('id');
    return `phase-${firstPhaseId}`;
  }
  return 'default';
}

function inventoryFocusNodeKeysArray(nodeKeys) {
  return Array.from(nodeKeys || []);
}

module.exports = {
  parseFocusUnitId,
  findUnitInventoryPath,
  inventoryFocusNodeKeysArray,
  resolveInventoryPhaseTab,
};
