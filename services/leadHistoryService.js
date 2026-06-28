const {
  Lead,
  LeadHistoryEvent,
  CompanyCredential,
  Pipeline,
  PipelineStage,
  Source,
} = require('../models');
const { buildPaginationMeta } = require('../utils/pagination');
const { formatLeadQuality } = require('../constants/leadQuality');
const { formatLeadTaskPriority, formatLeadTaskStatus } = require('../constants/leadTask');
const {
  LEAD_HISTORY_ACTIONS,
  LEAD_HISTORY_ENTITY_TYPES,
  LEAD_FIELD_LABELS,
  COMMUNICATION_FIELD_LABELS,
  DISCUSSION_FIELD_LABELS,
  TASK_FIELD_LABELS,
  DEFAULT_HISTORY_PAGE_SIZE,
} = require('../constants/leadHistory');

function displayValue(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  return String(value);
}

function formatDateOnly(value) {
  if (!value) {
    return '—';
  }
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return displayValue(value);
  }
  return date.toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) {
    return '—';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return displayValue(value);
  }
  return date.toLocaleString();
}

function formatTime(value) {
  if (!value) {
    return '—';
  }
  const parts = String(value).split(':');
  if (parts.length < 2) {
    return displayValue(value);
  }
  const date = new Date();
  date.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
  if (Number.isNaN(date.getTime())) {
    return displayValue(value);
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatCommunicationType(value) {
  if (value === 'email') {
    return 'Email';
  }
  if (value === 'message') {
    return 'Message';
  }
  return displayValue(value);
}

function normalizeComparable(value, fieldKey) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (fieldKey === 'sourceIds' && Array.isArray(value)) {
    return [...value].map(Number).sort((a, b) => a - b).join(',');
  }
  if (fieldKey === 'score') {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (fieldKey === 'assigneeId' || fieldKey === 'pipelineId' || fieldKey === 'stageId' || fieldKey === 'userId') {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return String(value);
}

async function buildLeadHistoryContext(companyId, lead) {
  const sourceIds = (lead.sources || []).map((source) => source.id);
  const [
    assignees,
    pipelines,
    sources,
  ] = await Promise.all([
    CompanyCredential.findAll({
      where: { companyId, isActive: true },
      attributes: ['id', 'adminName'],
    }),
    Pipeline.findAll({
      where: { companyId, isActive: true },
      attributes: ['id', 'name'],
      include: [{
        model: PipelineStage,
        as: 'stages',
        where: { stageType: 'lead', isActive: true },
        required: false,
        attributes: ['id', 'name'],
      }],
    }),
    Source.findAll({
      where: { companyId, isActive: true },
      attributes: ['id', 'name'],
    }),
  ]);

  const assigneeMap = new Map(assignees.map((item) => [item.id, item.adminName]));
  const pipelineMap = new Map(pipelines.map((item) => [item.id, item.name]));
  const stageMap = new Map();
  pipelines.forEach((pipeline) => {
    (pipeline.stages || []).forEach((stage) => {
      stageMap.set(stage.id, stage.name);
    });
  });
  const sourceMap = new Map(sources.map((item) => [item.id, item.name]));

  return {
    assigneeMap,
    pipelineMap,
    stageMap,
    sourceMap,
    before: {
      customerName: lead.customerName,
      email: lead.email,
      subject: lead.subject,
      assigneeId: lead.assigneeId,
      phone: lead.phone || '',
      followUpDate: lead.followUpDate || '',
      score: lead.score ?? '',
      quality: lead.quality || '',
      pipelineId: lead.pipelineId || '',
      stageId: lead.stageId || '',
      notes: lead.notes || '',
      sourceIds,
    },
  };
}

function formatLeadFieldDisplay(fieldKey, value, context) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  switch (fieldKey) {
    case 'assigneeId':
      return context.assigneeMap.get(Number(value)) || displayValue(value);
    case 'pipelineId':
      return context.pipelineMap.get(Number(value)) || displayValue(value);
    case 'stageId':
      return context.stageMap.get(Number(value)) || displayValue(value);
    case 'sourceIds': {
      const ids = Array.isArray(value) ? value : [];
      if (ids.length === 0) {
        return '—';
      }
      return ids
        .map((id) => context.sourceMap.get(Number(id)) || id)
        .join(', ');
    }
    case 'quality':
      return formatLeadQuality(value);
    case 'followUpDate':
      return formatDateOnly(value);
    case 'notes':
      return 'Updated';
    default:
      return displayValue(value);
  }
}

function buildFieldChanges(before, after, fieldLabels, formatDisplay) {
  const changes = {};

  Object.keys(fieldLabels).forEach((fieldKey) => {
    const beforeValue = before[fieldKey];
    const afterValue = after[fieldKey];

    if (normalizeComparable(beforeValue, fieldKey) === normalizeComparable(afterValue, fieldKey)) {
      return;
    }

    changes[fieldKey] = {
      label: fieldLabels[fieldKey],
      from: formatDisplay(fieldKey, beforeValue),
      to: formatDisplay(fieldKey, afterValue),
    };
  });

  return changes;
}

function buildLeadChanges(before, after, context) {
  return buildFieldChanges(
    before,
    after,
    LEAD_FIELD_LABELS,
    (fieldKey, value) => formatLeadFieldDisplay(fieldKey, value, context)
  );
}

function buildCommunicationChanges(before, after) {
  return buildFieldChanges(
    before,
    after,
    COMMUNICATION_FIELD_LABELS,
    (fieldKey, value) => {
      if (fieldKey === 'itemType') {
        return formatCommunicationType(value);
      }
      if (fieldKey === 'sentAt') {
        return formatDateTime(value);
      }
      return displayValue(value);
    }
  );
}

function buildDiscussionChanges(before, after, userMap) {
  return buildFieldChanges(
    before,
    after,
    DISCUSSION_FIELD_LABELS,
    (fieldKey, value) => {
      if (fieldKey === 'userId') {
        return userMap.get(Number(value)) || displayValue(value);
      }
      if (fieldKey === 'postedAt') {
        return formatDateTime(value);
      }
      return displayValue(value);
    }
  );
}

function buildTaskChanges(before, after) {
  return buildFieldChanges(
    before,
    after,
    TASK_FIELD_LABELS,
    (fieldKey, value) => {
      if (fieldKey === 'dueDate') {
        return formatDateOnly(value);
      }
      if (fieldKey === 'dueTime') {
        return formatTime(value);
      }
      if (fieldKey === 'priority') {
        return formatLeadTaskPriority(value);
      }
      if (fieldKey === 'status') {
        return formatLeadTaskStatus(value);
      }
      return displayValue(value);
    }
  );
}

async function recordLeadHistoryEvent(eventData, transaction) {
  return LeadHistoryEvent.create({
    leadId: eventData.leadId,
    companyId: eventData.companyId,
    userId: eventData.userId || null,
    action: eventData.action,
    entityType: eventData.entityType,
    entityId: eventData.entityId ?? null,
    summary: eventData.summary,
    changes: eventData.changes || null,
  }, { transaction });
}

function serializeHistoryEvent(event) {
  const json = event.toJSON ? event.toJSON() : event;

  return {
    id: json.id,
    action: json.action,
    entityType: json.entityType,
    entityId: json.entityId,
    summary: json.summary,
    changes: json.changes || null,
    createdAt: json.createdAt,
    user: json.user ? {
      id: json.user.id,
      adminName: json.user.adminName,
    } : null,
  };
}

async function assertCompanyLead(companyId, leadId) {
  const lead = await Lead.findOne({
    where: { id: leadId, companyId },
  });
  if (!lead) {
    throw new Error('Lead not found.');
  }
  return lead;
}

async function listLeadHistory(companyId, leadId, { page = 1, pageSize = DEFAULT_HISTORY_PAGE_SIZE } = {}) {
  await assertCompanyLead(companyId, leadId);

  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.min(pageSize, 100) : DEFAULT_HISTORY_PAGE_SIZE;
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;

  const total = await LeadHistoryEvent.count({
    where: { leadId, companyId },
  });

  const meta = buildPaginationMeta({ page: safePage, pageSize: safePageSize, total });

  const events = await LeadHistoryEvent.findAll({
    where: { leadId, companyId },
    include: [{
      model: CompanyCredential,
      as: 'user',
      attributes: ['id', 'adminName'],
    }],
    order: [['createdAt', 'DESC']],
    limit: meta.pageSize,
    offset: meta.offset,
  });

  return {
    events: events.map(serializeHistoryEvent),
    pagination: {
      page: meta.page,
      pageSize: meta.pageSize,
      total: meta.total,
      totalPages: meta.totalPages,
      hasPrev: meta.hasPrev,
      hasNext: meta.hasNext,
    },
  };
}

module.exports = {
  LEAD_HISTORY_ACTIONS,
  LEAD_HISTORY_ENTITY_TYPES,
  recordLeadHistoryEvent,
  serializeHistoryEvent,
  listLeadHistory,
  buildLeadHistoryContext,
  buildLeadChanges,
  buildCommunicationChanges,
  buildDiscussionChanges,
  buildTaskChanges,
};
