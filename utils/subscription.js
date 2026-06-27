function isSubscriptionValid(subscription) {
  if (!subscription) {
    return false;
  }

  const now = new Date();
  const startsAt = new Date(subscription.startsAt);
  const expiresAt = new Date(subscription.expiresAt);

  return startsAt <= now && expiresAt > now;
}

function toDateInputValue(date) {
  if (!date) {
    return '';
  }

  const value = new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function parseDateInput(dateStr, { endOfDay = false } = {}) {
  if (!dateStr || typeof dateStr !== 'string') {
    return null;
  }

  const parts = dateStr.trim().split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return null;
  }

  const [year, month, day] = parts;
  if (endOfDay) {
    return new Date(year, month - 1, day, 23, 59, 59, 999);
  }

  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function parseSubscriptionDates(startsAtInput, expiresAtInput) {
  let startsAt;

  if (startsAtInput && String(startsAtInput).trim()) {
    startsAt = parseDateInput(startsAtInput, { endOfDay: false });
  } else {
    startsAt = new Date();
  }

  const expiresAt = parseDateInput(expiresAtInput, { endOfDay: true });

  return { startsAt, expiresAt };
}

function formatSubscriptionStatus(subscription) {
  if (!subscription) {
    return { label: 'No Plan', className: 'bg-secondary-subtle text-secondary' };
  }

  const now = new Date();
  const startsAt = new Date(subscription.startsAt);
  const expiresAt = new Date(subscription.expiresAt);

  if (startsAt > now) {
    return { label: 'Scheduled', className: 'bg-info-subtle text-info' };
  }

  if (expiresAt <= now) {
    return { label: 'Expired', className: 'bg-warning-subtle text-warning' };
  }

  return { label: 'Active', className: 'bg-success-subtle text-success' };
}

module.exports = {
  isSubscriptionValid,
  toDateInputValue,
  parseDateInput,
  parseSubscriptionDates,
  formatSubscriptionStatus,
};
