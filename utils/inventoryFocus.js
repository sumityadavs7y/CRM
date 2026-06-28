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
    return { unitId: null, nodeKeys: new Set() };
  }

  const nodeKeys = new Set();

  function searchBlock(block, phaseId = null) {
    for (const floor of block.floors || []) {
      for (const unit of floor.units || []) {
        const id = unit.id ?? unit.get?.('id');
        if (Number(id) === unitId) {
          if (phaseId) {
            nodeKeys.add(`phase-${phaseId}`);
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
        return { unitId, nodeKeys };
      }
    }
  }

  for (const block of project.blocks || []) {
    if (searchBlock(block, block.phaseId ?? block.get?.('phaseId') ?? null)) {
      return { unitId, nodeKeys };
    }
  }

  return { unitId, nodeKeys: new Set() };
}

function inventoryFocusNodeKeysArray(nodeKeys) {
  return Array.from(nodeKeys || []);
}

module.exports = {
  parseFocusUnitId,
  findUnitInventoryPath,
  inventoryFocusNodeKeysArray,
};
