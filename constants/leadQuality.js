const LEAD_QUALITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const VALID_LEAD_QUALITIES = new Set(LEAD_QUALITY_OPTIONS.map((option) => option.value));

const QUALITY_BADGE_CLASSES = {
  high: 'bg-success-subtle text-success',
  medium: 'bg-warning-subtle text-warning',
  low: 'bg-secondary-subtle text-secondary',
};

function formatLeadQuality(value) {
  if (!value) {
    return '—';
  }

  const option = LEAD_QUALITY_OPTIONS.find((item) => item.value === value);
  return option ? option.label : value;
}

function getLeadQualityBadgeClass(value) {
  return QUALITY_BADGE_CLASSES[value] || 'bg-secondary-subtle text-secondary';
}

module.exports = {
  LEAD_QUALITY_OPTIONS,
  VALID_LEAD_QUALITIES,
  QUALITY_BADGE_CLASSES,
  formatLeadQuality,
  getLeadQualityBadgeClass,
};
