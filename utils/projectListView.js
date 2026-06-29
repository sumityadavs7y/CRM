const { formatProjectType } = require('../constants/projectManagement');

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

function formatProjectListUpdatedAt(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) {
    return 'Updated just now';
  }
  if (diffHours < 24) {
    return `Updated ${diffHours}hrs ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `Updated ${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }

  return `Last update : ${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`;
}

function getProjectUnitProgress(project) {
  const stats = project.unitStats || {};
  const total = stats.totalUnits || 0;
  const available = stats.availableUnits || 0;

  if (!total) {
    return {
      hasUnits: false,
      label: 'Units',
      text: '—',
      percent: 0,
      barClass: 'bg-success',
    };
  }

  const occupied = Math.max(0, total - available);
  const percent = Math.min(100, Math.round((occupied / total) * 100));

  return {
    hasUnits: true,
    label: 'Units',
    text: `${occupied}/${total}`,
    percent,
    barClass: percent >= 80 ? 'bg-warning' : 'bg-success',
  };
}

function getProjectCardDescription(project) {
  const description = String(project.description || '').trim();
  if (description) {
    return description;
  }

  const location = formatProjectListLocation(project);
  if (location !== '—') {
    return location;
  }

  return formatProjectType(project.projectType);
}

module.exports = {
  formatProjectListDate,
  formatProjectListLocation,
  formatProjectListUnits,
  formatProjectListCurrency,
  formatProjectListUpdatedAt,
  getProjectUnitProgress,
  getProjectCardDescription,
};
