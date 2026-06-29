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

function formatProjectListCurrency(value) {
  if (value === undefined || value === null || value === '') {
    return '—';
  }
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return '—';
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

module.exports = {
  formatProjectListDate,
  formatProjectListLocation,
  formatProjectListUnits,
  formatProjectListCurrency,
};
