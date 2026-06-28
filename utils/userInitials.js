const INITIALS_COLORS = [
  'bg-primary',
  'bg-success',
  'bg-info',
  'bg-warning',
  'bg-danger',
  'bg-secondary',
];

function getUserInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getInitialsColorClass(name) {
  const value = String(name || '');
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }

  return INITIALS_COLORS[Math.abs(hash) % INITIALS_COLORS.length];
}

module.exports = {
  getUserInitials,
  getInitialsColorClass,
};
