function getLineProjectUnitId(line) {
  if (!line) {
    return null;
  }
  const unitId = typeof line.get === 'function' ? line.get('projectUnitId') : line.projectUnitId;
  if (unitId === undefined || unitId === null || String(unitId).trim() === '') {
    return null;
  }
  return unitId;
}

function hasLinkedInventoryUnits(lineItems) {
  return (lineItems || []).some((line) => getLineProjectUnitId(line) != null);
}

function buildProjectInventoryUrl(projectId, unitId) {
  if (!projectId) {
    return null;
  }

  let url = `/company/projects/${projectId}?tab=inventory`;
  const normalizedUnitId = unitId !== undefined && unitId !== null && String(unitId).trim() !== ''
    ? String(unitId).trim()
    : null;
  if (normalizedUnitId) {
    url += `&unitId=${encodeURIComponent(normalizedUnitId)}`;
  }
  return url;
}

module.exports = {
  getLineProjectUnitId,
  hasLinkedInventoryUnits,
  buildProjectInventoryUrl,
};
