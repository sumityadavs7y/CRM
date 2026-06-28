function formatProjectListDate(value) {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toISOString().slice(0, 10);
}

function formatProjectListLocation(project) {
  const parts = [project.city, project.state].filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
}

function formatProjectListUnits(project) {
  const stats = project.unitStats || {};
  if (!stats.totalUnits) {
    return '—';
  }
  return `${stats.availableUnits} / ${stats.totalUnits} avail.`;
}

module.exports = {
  formatProjectListDate,
  formatProjectListLocation,
  formatProjectListUnits,
};
