const LEAD_REPORT_PERIOD_OPTIONS = [
  { value: '1d', label: 'Last 1 day', shortLabel: '1D', days: 1 },
  { value: '3d', label: 'Last 3 days', shortLabel: '3D', days: 3 },
  { value: '7d', label: 'Last 7 days', shortLabel: '7D', days: 7 },
  { value: '30d', label: 'Last 30 days', shortLabel: '30D', days: 30 },
  { value: 'custom', label: 'Custom range', shortLabel: 'Custom', days: null },
];

const VALID_LEAD_REPORT_PERIODS = new Set(LEAD_REPORT_PERIOD_OPTIONS.map((option) => option.value));

const DEFAULT_LEAD_REPORT_PERIOD = '7d';

module.exports = {
  LEAD_REPORT_PERIOD_OPTIONS,
  VALID_LEAD_REPORT_PERIODS,
  DEFAULT_LEAD_REPORT_PERIOD,
};
