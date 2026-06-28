(function () {
  const filtersForm = document.getElementById('leadReportFilters');
  const periodInputs = filtersForm
    ? Array.from(filtersForm.querySelectorAll('input[name="period"]'))
    : [];
  const customRange = document.getElementById('leadReportCustomRange');
  const periodHint = document.getElementById('leadReportPeriodHint');
  const fromInput = document.getElementById('leadReportFrom');
  const toInput = document.getElementById('leadReportTo');
  const summaryRoot = document.getElementById('leadReportSummary');
  const chartsRoot = document.getElementById('leadReportCharts');
  const emptyState = document.getElementById('leadReportEmpty');
  const initialFiltersEl = document.getElementById('lead-report-initial-filters');

  if (!filtersForm || periodInputs.length === 0 || typeof ApexCharts === 'undefined') {
    return;
  }

  const chartInstances = {};
  const initialFilters = initialFiltersEl
    ? JSON.parse(initialFiltersEl.textContent || '{}')
    : {};

  function getChartColors() {
    const rootStyles = getComputedStyle(document.documentElement);
    const vars = ['--vz-primary', '--vz-success', '--vz-info', '--vz-warning', '--vz-danger', '--vz-secondary'];
    return vars
      .map((name) => rootStyles.getPropertyValue(name).trim())
      .filter(Boolean);
  }

  function getSliceBorderColor() {
    const card = document.querySelector('#leadReportCharts .card-body');
    if (card) {
      return getComputedStyle(card).backgroundColor || '#fff';
    }
    return '#fff';
  }

  function formatDisplayDate(isoDate) {
    if (!isoDate) {
      return '';
    }
    const parsed = new Date(`${isoDate}T12:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      return isoDate;
    }
    return parsed.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function getSelectedPeriod() {
    const checked = filtersForm.querySelector('input[name="period"]:checked');
    return checked ? checked.value : '7d';
  }

  function buildCleanParams(filters) {
    const params = new URLSearchParams();
    params.set('period', filters.period || '7d');

    if (filters.period === 'custom') {
      if (filters.from) {
        params.set('from', filters.from);
      }
      if (filters.to) {
        params.set('to', filters.to);
      }
    }

    return params;
  }

  function updatePeriodHint(filters) {
    if (!periodHint || !filters?.from || !filters?.to) {
      return;
    }

    const fromLabel = formatDisplayDate(filters.from);
    const toLabel = formatDisplayDate(filters.to);
    periodHint.innerHTML = `<i class="ri-calendar-line" aria-hidden="true"></i><span>${fromLabel} – ${toLabel}</span>`;
  }

  function toggleCustomRange() {
    if (!customRange) {
      return;
    }

    const isCustom = getSelectedPeriod() === 'custom';
    customRange.classList.toggle('is-visible', isCustom);

    if (fromInput) {
      fromInput.disabled = !isCustom;
    }
    if (toInput) {
      toInput.disabled = !isCustom;
    }

    if (isCustom && fromInput) {
      fromInput.focus();
    }
  }

  function readFiltersFromForm() {
    const period = getSelectedPeriod();
    const filters = { period };

    if (period === 'custom') {
      if (fromInput?.value) {
        filters.from = fromInput.value;
      }
      if (toInput?.value) {
        filters.to = toInput.value;
      }
    }

    return filters;
  }

  function buildDataUrl(filters) {
    return `/company/leads/reports/data?${buildCleanParams(filters).toString()}`;
  }

  function updateUrl(filters) {
    const nextUrl = `/company/leads/reports?${buildCleanParams(filters).toString()}`;
    window.history.replaceState(null, '', nextUrl);
  }

  function formatSummaryValue(key, value) {
    if (value == null) {
      return '—';
    }
    if (key === 'highQualityPct') {
      return `${value}%`;
    }
    return String(value);
  }

  function updateSummary(summary) {
    if (!summaryRoot) {
      return;
    }

    summaryRoot.querySelectorAll('[data-summary]').forEach((node) => {
      const key = node.getAttribute('data-summary');
      node.textContent = formatSummaryValue(key, summary[key]);
    });
  }

  function setEmptyState(isEmpty) {
    if (emptyState) {
      emptyState.classList.toggle('d-none', !isEmpty);
    }
    if (chartsRoot) {
      chartsRoot.classList.toggle('opacity-50', isEmpty);
    }
  }

  function destroyChart(key) {
    if (chartInstances[key]) {
      chartInstances[key].destroy();
      delete chartInstances[key];
    }
  }

  function buildPieTooltip() {
    return {
      enabled: true,
      fillSeriesColor: false,
      custom({ series, seriesIndex, w }) {
        const label = w.globals.labels[seriesIndex] || 'Unknown';
        const value = series[seriesIndex] || 0;
        const total = series.reduce((sum, item) => sum + item, 0);
        const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';

        return (
          '<div class="lead-report-chart-tooltip">'
          + `<div class="lead-report-chart-tooltip__label">${label}</div>`
          + `<div class="lead-report-chart-tooltip__value">${value} leads <span class="text-muted">(${pct}%)</span></div>`
          + '</div>'
        );
      },
    };
  }

  function buildSeriesTooltip() {
    return {
      enabled: true,
      shared: false,
      intersect: true,
      fillSeriesColor: false,
      custom({ series, seriesIndex, dataPointIndex, w }) {
        const label = w.globals.labels[dataPointIndex] || 'Unknown';
        const value = series[seriesIndex][dataPointIndex] ?? 0;

        return (
          '<div class="lead-report-chart-tooltip">'
          + `<div class="lead-report-chart-tooltip__label">${label}</div>`
          + `<div class="lead-report-chart-tooltip__value">${value} leads</div>`
          + '</div>'
        );
      },
    };
  }

  function buildPieChartOptions(labels, series, donut) {
    const colors = getChartColors();

    return {
      series,
      labels,
      chart: {
        type: donut ? 'donut' : 'pie',
        height: 320,
        fontFamily: 'inherit',
        toolbar: { show: false },
        selection: {
          enabled: false,
        },
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 400,
        },
        events: {
          dataPointSelection(event, chartContext, config) {
            event.preventDefault();
          },
        },
      },
      colors: colors.length ? colors : undefined,
      legend: {
        position: 'bottom',
        horizontalAlign: 'center',
        fontSize: '13px',
        markers: {
          width: 10,
          height: 10,
          radius: 10,
        },
        onItemClick: {
          toggleDataSeries: false,
        },
        onItemHover: {
          highlightDataSeries: true,
        },
      },
      states: {
        active: {
          allowMultipleDataPointsSelection: false,
          filter: {
            type: 'none',
          },
        },
        hover: {
          filter: {
            type: 'lighten',
            value: 0.06,
          },
        },
      },
      plotOptions: {
        pie: {
          expandOnClick: false,
          customScale: 1,
          donut: {
            size: donut ? '58%' : '0%',
            labels: {
              show: false,
            },
          },
        },
      },
      stroke: {
        width: 2,
        colors: [getSliceBorderColor()],
      },
      dataLabels: {
        enabled: true,
        dropShadow: { enabled: false },
        style: {
          fontSize: '12px',
          fontWeight: 500,
        },
        formatter(value) {
          return `${Math.round(value)}%`;
        },
      },
      tooltip: buildPieTooltip(),
      noData: {
        text: 'No data',
      },
    };
  }

  function renderPieChart(key, selector, labels, series, donut) {
    destroyChart(key);
    const el = document.querySelector(selector);
    if (!el) {
      return;
    }

    chartInstances[key] = new ApexCharts(el, buildPieChartOptions(labels, series, donut));
    chartInstances[key].render();
  }

  function renderBarChart(key, labels, series) {
    destroyChart(key);
    const el = document.querySelector('#chart-by-stage');
    if (!el) {
      return;
    }

    const colors = getChartColors();
    const options = {
      series: [{
        name: 'Leads',
        data: series,
      }],
      chart: {
        type: 'bar',
        height: 320,
        toolbar: { show: false },
        fontFamily: 'inherit',
      },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 4,
        },
      },
      xaxis: {
        categories: labels,
      },
      colors: colors.length ? [colors[0]] : undefined,
      dataLabels: { enabled: false },
      tooltip: buildSeriesTooltip(),
      noData: {
        text: 'No data',
      },
    };

    chartInstances[key] = new ApexCharts(el, options);
    chartInstances[key].render();
  }

  function renderAreaChart(labels, series) {
    destroyChart('overTime');
    const el = document.querySelector('#chart-over-time');
    if (!el) {
      return;
    }

    const colors = getChartColors();
    const options = {
      series: [{
        name: 'Leads',
        data: series,
      }],
      chart: {
        type: 'area',
        height: 340,
        toolbar: { show: false },
        zoom: { enabled: false },
        fontFamily: 'inherit',
      },
      stroke: {
        curve: 'smooth',
        width: 2,
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 0.4,
          opacityFrom: 0.5,
          opacityTo: 0.05,
        },
      },
      xaxis: {
        categories: labels,
        labels: {
          rotate: -45,
        },
      },
      colors: colors.length ? [colors[0]] : undefined,
      dataLabels: { enabled: false },
      tooltip: buildSeriesTooltip(),
      noData: {
        text: 'No data',
      },
    };

    chartInstances.overTime = new ApexCharts(el, options);
    chartInstances.overTime.render();
  }

  function renderCharts(data) {
    const mapSeries = (items) => ({
      labels: items.map((item) => item.label),
      series: items.map((item) => item.count),
    });

    const assignee = mapSeries(data.byAssignee || []);
    renderPieChart('byAssignee', '#chart-by-assignee', assignee.labels, assignee.series, false);

    const source = mapSeries(data.bySource || []);
    renderPieChart('bySource', '#chart-by-source', source.labels, source.series, true);

    const quality = mapSeries(data.byQuality || []);
    renderPieChart('byQuality', '#chart-by-quality', quality.labels, quality.series, false);

    const stage = mapSeries(data.byStage || []);
    renderBarChart('byStage', stage.labels, stage.series);

    const overTime = data.overTime || { labels: [], series: [] };
    renderAreaChart(overTime.labels, overTime.series);
  }

  async function loadReport(filters) {
    const response = await fetch(buildDataUrl(filters), {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Failed to load report data');
    }

    const data = await response.json();
    updateSummary(data.summary || {});
    updatePeriodHint(data.filters || filters);
    setEmptyState((data.summary?.totalLeads || 0) === 0);
    renderCharts(data);
    updateUrl(data.filters || filters);
  }

  async function submitFilters() {
    const filters = readFiltersFromForm();

    try {
      await loadReport(filters);
    } catch (error) {
      console.error(error);
    }
  }

  periodInputs.forEach((input) => {
    input.addEventListener('change', () => {
      toggleCustomRange();

      if (input.value !== 'custom') {
        submitFilters();
      }
    });
  });

  filtersForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    await submitFilters();
  });

  toggleCustomRange();
  updatePeriodHint(initialFilters);
  loadReport(initialFilters).catch((error) => {
    console.error(error);
  });
}());
