const {
  LEAD_REPORT_PERIOD_OPTIONS,
  VALID_LEAD_REPORT_PERIODS,
  DEFAULT_LEAD_REPORT_PERIOD,
} = require('../constants/leadReports');
const { parseOptionalDate, normalizeDateRange } = require('./leadListFilters');

function formatUtcDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function subtractDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() - days);
  return result;
}

function resolvePresetRange(days) {
  const to = new Date();
  const from = subtractDays(to, days - 1);
  return {
    from: formatUtcDateOnly(from),
    to: formatUtcDateOnly(to),
  };
}

function parseLeadReportFilters(query) {
  const rawPeriod = query.period ? String(query.period).trim() : '';
  const period = VALID_LEAD_REPORT_PERIODS.has(rawPeriod)
    ? rawPeriod
    : DEFAULT_LEAD_REPORT_PERIOD;

  let from;
  let to;

  if (period === 'custom') {
    const customRange = normalizeDateRange(
      parseOptionalDate(query.from),
      parseOptionalDate(query.to),
    );
    from = customRange.from;
    to = customRange.to;

    if (!from || !to) {
      const fallback = resolvePresetRange(7);
      from = fallback.from;
      to = fallback.to;
    }
  } else {
    const preset = LEAD_REPORT_PERIOD_OPTIONS.find((option) => option.value === period);
    const range = resolvePresetRange(preset.days);
    from = range.from;
    to = range.to;
  }

  return {
    period,
    from,
    to,
    createdFrom: from,
    createdTo: to,
  };
}

module.exports = {
  parseLeadReportFilters,
};
