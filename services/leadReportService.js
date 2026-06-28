const { Op, fn, col, literal } = require('sequelize');
const {
  Lead,
  CompanyCredential,
  PipelineStage,
  Source,
  sequelize,
} = require('../models');
const { formatLeadQuality } = require('../constants/leadQuality');

function buildCreatedAtWhere(companyId, createdFrom, createdTo) {
  const where = { companyId };

  if (createdFrom || createdTo) {
    where.createdAt = {};
    if (createdFrom) {
      where.createdAt[Op.gte] = new Date(`${createdFrom}T00:00:00.000Z`);
    }
    if (createdTo) {
      where.createdAt[Op.lte] = new Date(`${createdTo}T23:59:59.999Z`);
    }
  }

  return where;
}

function dailyDateExpression() {
  if (sequelize.getDialect() === 'postgres') {
    return literal('DATE("Lead"."createdAt" AT TIME ZONE \'UTC\')');
  }
  return fn('DATE', col('Lead.createdAt'));
}

function listDateRange(from, to) {
  const dates = [];
  const current = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

function parseCount(value) {
  return parseInt(value, 10) || 0;
}

async function getSummary(companyId, createdFrom, createdTo) {
  const where = buildCreatedAtWhere(companyId, createdFrom, createdTo);

  const [totalLeads, avgScoreResult, highQualityCount] = await Promise.all([
    Lead.count({ where }),
    Lead.findOne({
      attributes: [[fn('AVG', col('score')), 'avgScore']],
      where: {
        ...where,
        score: { [Op.ne]: null },
      },
      raw: true,
    }),
    Lead.count({
      where: {
        ...where,
        quality: 'high',
      },
    }),
  ]);

  const avgScore = avgScoreResult?.avgScore != null
    ? Math.round(parseFloat(avgScoreResult.avgScore) * 10) / 10
    : null;
  const highQualityPct = totalLeads > 0
    ? Math.round((highQualityCount / totalLeads) * 1000) / 10
    : 0;

  return {
    totalLeads,
    avgScore,
    highQualityCount,
    highQualityPct,
  };
}

async function getByAssignee(companyId, createdFrom, createdTo) {
  const where = buildCreatedAtWhere(companyId, createdFrom, createdTo);

  const rows = await Lead.findAll({
    attributes: [
      'assigneeId',
      [fn('COUNT', col('Lead.id')), 'count'],
    ],
    include: [{
      model: CompanyCredential,
      as: 'assignee',
      attributes: ['adminName'],
      required: true,
    }],
    where,
    group: ['Lead.assigneeId', 'assignee.id', 'assignee.adminName'],
    order: [[literal('count'), 'DESC']],
    raw: true,
    nest: true,
  });

  return rows.map((row) => ({
    label: row.assignee?.adminName || 'Unknown',
    count: parseCount(row.count),
  }));
}

async function getBySource(companyId, createdFrom, createdTo) {
  const leadWhere = buildCreatedAtWhere(companyId, createdFrom, createdTo);

  const rows = await Source.findAll({
    attributes: [
      'id',
      'name',
      [fn('COUNT', col('leads.id')), 'count'],
    ],
    include: [{
      model: Lead,
      as: 'leads',
      attributes: [],
      required: true,
      where: leadWhere,
      through: { attributes: [] },
    }],
    where: { companyId },
    group: ['Source.id', 'Source.name'],
    order: [[literal('count'), 'DESC']],
    raw: true,
  });

  return rows.map((row) => ({
    label: row.name,
    count: parseCount(row.count),
  }));
}

async function getByQuality(companyId, createdFrom, createdTo) {
  const where = buildCreatedAtWhere(companyId, createdFrom, createdTo);

  const rows = await Lead.findAll({
    attributes: [
      'quality',
      [fn('COUNT', col('Lead.id')), 'count'],
    ],
    where,
    group: ['Lead.quality'],
    order: [[literal('count'), 'DESC']],
    raw: true,
  });

  return rows.map((row) => ({
    label: row.quality ? formatLeadQuality(row.quality) : 'Unspecified',
    count: parseCount(row.count),
  }));
}

async function getByStage(companyId, createdFrom, createdTo) {
  const where = buildCreatedAtWhere(companyId, createdFrom, createdTo);

  const rows = await Lead.findAll({
    attributes: [
      'stageId',
      [fn('COUNT', col('Lead.id')), 'count'],
    ],
    include: [{
      model: PipelineStage,
      as: 'stage',
      attributes: ['name'],
      required: false,
    }],
    where,
    group: ['Lead.stageId', 'stage.id', 'stage.name'],
    order: [[literal('count'), 'DESC']],
    raw: true,
    nest: true,
  });

  return rows.map((row) => ({
    label: row.stage?.name || 'No stage',
    count: parseCount(row.count),
  }));
}

async function getOverTime(companyId, createdFrom, createdTo) {
  const where = buildCreatedAtWhere(companyId, createdFrom, createdTo);
  const dateExpr = dailyDateExpression();

  const rows = await Lead.findAll({
    attributes: [
      [dateExpr, 'date'],
      [fn('COUNT', col('Lead.id')), 'count'],
    ],
    where,
    group: [dateExpr],
    order: [[dateExpr, 'ASC']],
    raw: true,
  });

  const countByDate = new Map(
    rows.map((row) => [String(row.date), parseCount(row.count)]),
  );

  const labels = listDateRange(createdFrom, createdTo);
  const series = labels.map((date) => countByDate.get(date) || 0);

  return { labels, series };
}

async function getLeadReportData(companyId, { createdFrom, createdTo }) {
  const [
    summary,
    byAssignee,
    bySource,
    byQuality,
    byStage,
    overTime,
  ] = await Promise.all([
    getSummary(companyId, createdFrom, createdTo),
    getByAssignee(companyId, createdFrom, createdTo),
    getBySource(companyId, createdFrom, createdTo),
    getByQuality(companyId, createdFrom, createdTo),
    getByStage(companyId, createdFrom, createdTo),
    getOverTime(companyId, createdFrom, createdTo),
  ]);

  return {
    summary,
    byAssignee,
    bySource,
    byQuality,
    byStage,
    overTime,
  };
}

module.exports = {
  getLeadReportData,
};
