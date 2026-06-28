const LEAD_TASK_PRIORITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const LEAD_TASK_STATUS_OPTIONS = [
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'complete', label: 'Complete' },
];

const VALID_LEAD_TASK_PRIORITIES = new Set(LEAD_TASK_PRIORITY_OPTIONS.map((option) => option.value));
const VALID_LEAD_TASK_STATUSES = new Set(LEAD_TASK_STATUS_OPTIONS.map((option) => option.value));

const PRIORITY_BADGE_CLASSES = {
  high: 'bg-danger-subtle text-danger',
  medium: 'bg-warning-subtle text-warning',
  low: 'bg-secondary-subtle text-secondary',
};

const STATUS_BADGE_CLASSES = {
  ongoing: 'bg-primary-subtle text-primary',
  complete: 'bg-success-subtle text-success',
};

function formatLeadTaskPriority(value) {
  if (!value) {
    return '—';
  }

  const option = LEAD_TASK_PRIORITY_OPTIONS.find((item) => item.value === value);
  return option ? option.label : value;
}

function formatLeadTaskStatus(value) {
  if (!value) {
    return '—';
  }

  const option = LEAD_TASK_STATUS_OPTIONS.find((item) => item.value === value);
  return option ? option.label : value;
}

function getLeadTaskPriorityBadgeClass(value) {
  return PRIORITY_BADGE_CLASSES[value] || 'bg-secondary-subtle text-secondary';
}

function getLeadTaskStatusBadgeClass(value) {
  return STATUS_BADGE_CLASSES[value] || 'bg-secondary-subtle text-secondary';
}

module.exports = {
  LEAD_TASK_PRIORITY_OPTIONS,
  LEAD_TASK_STATUS_OPTIONS,
  VALID_LEAD_TASK_PRIORITIES,
  VALID_LEAD_TASK_STATUSES,
  PRIORITY_BADGE_CLASSES,
  STATUS_BADGE_CLASSES,
  formatLeadTaskPriority,
  formatLeadTaskStatus,
  getLeadTaskPriorityBadgeClass,
  getLeadTaskStatusBadgeClass,
};
