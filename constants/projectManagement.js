const PROJECT_TYPES = ['residential', 'commercial', 'mixed_use', 'plotted'];

const PROJECT_TYPE_LABELS = {
  residential: 'Residential',
  commercial: 'Commercial',
  mixed_use: 'Mixed Use',
  plotted: 'Plotted Development',
};

const PROJECT_STATUSES = [
  'planning',
  'pre_launch',
  'under_construction',
  'ready_to_move',
  'completed',
  'on_hold',
];

const PROJECT_STATUS_LABELS = {
  planning: 'Planning',
  pre_launch: 'Pre-Launch',
  under_construction: 'Under Construction',
  ready_to_move: 'Ready to Move',
  completed: 'Completed',
  on_hold: 'On Hold',
};

const PROJECT_STATUS_BADGE_CLASSES = {
  planning: 'bg-secondary-subtle text-secondary',
  pre_launch: 'bg-info-subtle text-info',
  under_construction: 'bg-warning-subtle text-warning',
  ready_to_move: 'bg-success-subtle text-success',
  completed: 'bg-primary-subtle text-primary',
  on_hold: 'bg-danger-subtle text-danger',
};

const PHASE_STATUSES = ['planning', 'under_construction', 'completed', 'on_hold'];

const PHASE_STATUS_LABELS = {
  planning: 'Planning',
  under_construction: 'Under Construction',
  completed: 'Completed',
  on_hold: 'On Hold',
};

const UNIT_TYPES = [
  '1bhk',
  '2bhk',
  '3bhk',
  '4bhk',
  'studio',
  'shop',
  'office',
  'plot',
  'penthouse',
  'other',
];

const UNIT_TYPE_LABELS = {
  '1bhk': '1 BHK',
  '2bhk': '2 BHK',
  '3bhk': '3 BHK',
  '4bhk': '4 BHK',
  studio: 'Studio',
  shop: 'Shop',
  office: 'Office',
  plot: 'Plot',
  penthouse: 'Penthouse',
  other: 'Other',
};

const UNIT_STATUSES = ['available', 'hold', 'blocked', 'booked', 'sold'];

const UNIT_STATUS_LABELS = {
  available: 'Available',
  hold: 'Hold',
  blocked: 'Blocked',
  booked: 'Booked',
  sold: 'Sold',
};

const UNIT_STATUS_BADGE_CLASSES = {
  available: 'bg-success-subtle text-success',
  hold: 'bg-warning-subtle text-warning',
  blocked: 'bg-secondary-subtle text-secondary',
  booked: 'bg-info-subtle text-info',
  sold: 'bg-primary-subtle text-primary',
};

const UNIT_FACINGS = [
  'north',
  'south',
  'east',
  'west',
  'north_east',
  'north_west',
  'south_east',
  'south_west',
];

const UNIT_FACING_LABELS = {
  north: 'North',
  south: 'South',
  east: 'East',
  west: 'West',
  north_east: 'North East',
  north_west: 'North West',
  south_east: 'South East',
  south_west: 'South West',
};

const RERA_STATUSES = ['registered', 'pending', 'expired', 'revoked'];

const RERA_STATUS_LABELS = {
  registered: 'Registered',
  pending: 'Pending',
  expired: 'Expired',
  revoked: 'Revoked',
};

const RERA_STATUS_BADGE_CLASSES = {
  registered: 'bg-success-subtle text-success',
  pending: 'bg-warning-subtle text-warning',
  expired: 'bg-danger-subtle text-danger',
  revoked: 'bg-secondary-subtle text-secondary',
};

const RERA_STATES = [
  'Andhra Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Tamil Nadu',
  'Telangana',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

const PROJECT_TABS = ['general', 'inventory', 'rera', 'milestones', 'approvals'];

function formatProjectType(value) {
  return PROJECT_TYPE_LABELS[value] || value || '—';
}

function formatProjectStatus(value) {
  return PROJECT_STATUS_LABELS[value] || value || '—';
}

function getProjectStatusBadgeClass(value) {
  return PROJECT_STATUS_BADGE_CLASSES[value] || 'bg-secondary-subtle text-secondary';
}

function formatPhaseStatus(value) {
  return PHASE_STATUS_LABELS[value] || value || '—';
}

function formatUnitType(value) {
  return UNIT_TYPE_LABELS[value] || value || '—';
}

function formatUnitStatus(value) {
  return UNIT_STATUS_LABELS[value] || value || '—';
}

function getUnitStatusBadgeClass(value) {
  return UNIT_STATUS_BADGE_CLASSES[value] || 'bg-secondary-subtle text-secondary';
}

function formatUnitFacing(value) {
  return UNIT_FACING_LABELS[value] || value || '—';
}

function formatReraStatus(value) {
  return RERA_STATUS_LABELS[value] || value || '—';
}

function getReraStatusBadgeClass(value) {
  return RERA_STATUS_BADGE_CLASSES[value] || 'bg-secondary-subtle text-secondary';
}

function resolveActiveProjectTab(tab) {
  if (tab && PROJECT_TABS.includes(tab)) {
    return tab;
  }
  return 'general';
}

module.exports = {
  PROJECT_TYPES,
  PROJECT_TYPE_LABELS,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_BADGE_CLASSES,
  PHASE_STATUSES,
  PHASE_STATUS_LABELS,
  UNIT_TYPES,
  UNIT_TYPE_LABELS,
  UNIT_STATUSES,
  UNIT_STATUS_LABELS,
  UNIT_STATUS_BADGE_CLASSES,
  UNIT_FACINGS,
  UNIT_FACING_LABELS,
  RERA_STATUSES,
  RERA_STATUS_LABELS,
  RERA_STATUS_BADGE_CLASSES,
  RERA_STATES,
  PROJECT_TABS,
  formatProjectType,
  formatProjectStatus,
  getProjectStatusBadgeClass,
  formatPhaseStatus,
  formatUnitType,
  formatUnitStatus,
  getUnitStatusBadgeClass,
  formatUnitFacing,
  formatReraStatus,
  getReraStatusBadgeClass,
  resolveActiveProjectTab,
};
