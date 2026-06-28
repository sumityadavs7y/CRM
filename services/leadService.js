const {
  Lead,
  LeadCommunication,
  LeadDiscussion,
  LeadTask,
  CompanyCredential,
  Pipeline,
  PipelineStage,
  Source,
  sequelize,
} = require('../models');
const { sanitizeNotesHtml } = require('../utils/sanitizeHtml');
const { PATCHABLE_FIELDS, leadToPatchBase, serializeLeadForJson } = require('../utils/leadHelpers');
const { LEAD_QUALITY_OPTIONS, VALID_LEAD_QUALITIES } = require('../constants/leadQuality');
const { buildPaginationMeta } = require('../utils/pagination');
const {
  recordLeadHistoryEvent,
  buildLeadHistoryContext,
  buildLeadChanges,
  LEAD_HISTORY_ACTIONS,
  LEAD_HISTORY_ENTITY_TYPES,
} = require('./leadHistoryService');

const LEAD_LIST_INCLUDES = [
  { model: CompanyCredential, as: 'assignee', attributes: ['id', 'adminName'] },
  { model: Pipeline, as: 'pipeline', attributes: ['id', 'name'] },
  { model: PipelineStage, as: 'stage', attributes: ['id', 'name'] },
];

const LEAD_LIST_SOURCE_INCLUDE = {
  model: Source,
  as: 'sources',
  attributes: ['id', 'name'],
  through: { attributes: [] },
};

const LEAD_LIST_COUNT_ATTRIBUTES = {
  communicationCount: sequelize.literal('(SELECT COUNT(*) FROM "LeadCommunications" AS lc WHERE lc."leadId" = "Lead"."id")'),
  taskCount: sequelize.literal('(SELECT COUNT(*) FROM "LeadTasks" AS lt WHERE lt."leadId" = "Lead"."id")'),
  discussionCount: sequelize.literal('(SELECT COUNT(*) FROM "LeadDiscussions" AS ld WHERE ld."leadId" = "Lead"."id")'),
};

const LEAD_INCLUDES = [
  { model: CompanyCredential, as: 'assignee', attributes: ['id', 'adminName', 'email'] },
  { model: Pipeline, as: 'pipeline', attributes: ['id', 'name'] },
  { model: PipelineStage, as: 'stage', attributes: ['id', 'name', 'stageType'] },
  { model: Source, as: 'sources', attributes: ['id', 'name'], through: { attributes: [] } },
  {
    model: LeadCommunication,
    as: 'communications',
    separate: true,
    order: [['sentAt', 'DESC']],
  },
  {
    model: LeadDiscussion,
    as: 'discussions',
    separate: true,
    order: [['postedAt', 'DESC']],
    include: [
      { model: CompanyCredential, as: 'user', attributes: ['id', 'adminName', 'email'] },
    ],
  },
  {
    model: LeadTask,
    as: 'tasks',
    separate: true,
    order: [['dueDate', 'ASC'], ['dueTime', 'ASC']],
  },
];

function parseOptionalId(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseSourceIds(raw) {
  if (!raw) {
    return [];
  }
  const list = Array.isArray(raw) ? raw : [raw];
  return [...new Set(list.map((id) => parseInt(id, 10)).filter(Number.isFinite))];
}

function parseOptionalScore(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalQuality(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();
  return normalized || null;
}

function normalizeLeadInput(data) {
  const notesRaw = data.notes;
  const notes = notesRaw === undefined || notesRaw === null
    ? null
    : sanitizeNotesHtml(typeof notesRaw === 'string' ? notesRaw : String(notesRaw));

  return {
    customerName: data.customerName?.trim() || '',
    email: data.email?.trim() || '',
    subject: data.subject?.trim() || '',
    assigneeId: parseOptionalId(data.assigneeId),
    phone: data.phone?.trim() || null,
    followUpDate: data.followUpDate?.trim() || null,
    score: parseOptionalScore(data.score),
    quality: parseOptionalQuality(data.quality),
    pipelineId: parseOptionalId(data.pipelineId),
    stageId: parseOptionalId(data.stageId),
    notes,
    sourceIds: parseSourceIds(data.sourceIds),
  };
}

async function findCompanyLead(companyId, leadId, options = {}) {
  return Lead.findOne({
    where: { id: leadId, companyId },
    include: LEAD_INCLUDES,
    ...options,
  });
}

async function attachSourcesToLeads(leads) {
  if (!leads.length) {
    return leads;
  }

  const leadIds = leads.map((lead) => lead.id);
  const leadsWithSources = await Lead.findAll({
    where: { id: leadIds },
    include: [LEAD_LIST_SOURCE_INCLUDE],
  });

  const sourcesByLeadId = new Map(
    leadsWithSources.map((lead) => [lead.id, lead.sources || []]),
  );

  leads.forEach((lead) => {
    lead.setDataValue('sources', sourcesByLeadId.get(lead.id) || []);
  });

  return leads;
}

async function listCompanyLeadsPaginated(companyId, { page, pageSize, sort, dir }) {
  const direction = dir === 'asc' ? 'ASC' : 'DESC';

  const sortOrderMap = {
    customerName: [['customerName', direction]],
    email: [['email', direction]],
    subject: [['subject', direction]],
    assignee: [[{ model: CompanyCredential, as: 'assignee' }, 'adminName', direction]],
    phone: [['phone', direction]],
    followUpDate: [['followUpDate', direction]],
    score: [['score', direction]],
    quality: [['quality', direction]],
    pipeline: [[{ model: Pipeline, as: 'pipeline' }, 'name', direction]],
    stage: [[{ model: PipelineStage, as: 'stage' }, 'name', direction]],
    notes: [['notes', direction]],
    createdAt: [['createdAt', direction]],
    updatedAt: [['updatedAt', direction]],
    communicationCount: [[LEAD_LIST_COUNT_ATTRIBUTES.communicationCount, direction]],
    taskCount: [[LEAD_LIST_COUNT_ATTRIBUTES.taskCount, direction]],
    discussionCount: [[LEAD_LIST_COUNT_ATTRIBUTES.discussionCount, direction]],
  };

  const order = sortOrderMap[sort] || sortOrderMap.createdAt;
  const total = await Lead.count({ where: { companyId } });
  const meta = buildPaginationMeta({ page, pageSize, total });

  const rows = total === 0
    ? []
    : await attachSourcesToLeads(await Lead.findAll({
      where: { companyId },
      include: LEAD_LIST_INCLUDES,
      attributes: {
        include: [
          [LEAD_LIST_COUNT_ATTRIBUTES.communicationCount, 'communicationCount'],
          [LEAD_LIST_COUNT_ATTRIBUTES.taskCount, 'taskCount'],
          [LEAD_LIST_COUNT_ATTRIBUTES.discussionCount, 'discussionCount'],
        ],
      },
      limit: meta.pageSize,
      offset: meta.offset,
      order,
    }));

  return {
    rows,
    total,
    page: meta.page,
    pageSize: meta.pageSize,
    sort,
    dir,
    totalPages: meta.totalPages,
    offset: meta.offset,
    start: meta.start,
    end: meta.end,
    hasPrev: meta.hasPrev,
    hasNext: meta.hasNext,
  };
}

async function getLeadFormOptions(companyId) {
  const [assignees, pipelines, sources] = await Promise.all([
    CompanyCredential.findAll({
      where: { companyId, isActive: true },
      attributes: ['id', 'adminName', 'email'],
      order: [['adminName', 'ASC']],
    }),
    Pipeline.findAll({
      where: { companyId, isActive: true },
      include: [{
        model: PipelineStage,
        as: 'stages',
        where: { stageType: 'lead', isActive: true },
        required: false,
        attributes: ['id', 'name', 'sortOrder'],
      }],
      order: [
        ['sortOrder', 'ASC'],
        ['name', 'ASC'],
        [{ model: PipelineStage, as: 'stages' }, 'sortOrder', 'ASC'],
        [{ model: PipelineStage, as: 'stages' }, 'name', 'ASC'],
      ],
    }),
    Source.findAll({
      where: { companyId, isActive: true },
      attributes: ['id', 'name'],
      order: [['sortOrder', 'ASC'], ['name', 'ASC']],
    }),
  ]);

  const pipelineStageMap = pipelines.map((pipeline) => ({
    id: pipeline.id,
    name: pipeline.name,
    stages: (pipeline.stages || []).map((stage) => ({
      id: stage.id,
      name: stage.name,
    })),
  }));

  return { assignees, pipelines, sources, pipelineStageMap, qualityOptions: LEAD_QUALITY_OPTIONS };
}

async function validateLeadPayload(companyId, data) {
  const input = normalizeLeadInput(data);
  const errors = [];

  if (!input.customerName) {
    errors.push('Customer name is required.');
  }
  if (!input.email) {
    errors.push('Email is required.');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    errors.push('Email must be valid.');
  }
  if (!input.subject) {
    errors.push('Subject is required.');
  }
  if (!input.assigneeId) {
    errors.push('Assignee is required.');
  }

  if (input.stageId && !input.pipelineId) {
    errors.push('Pipeline is required when a stage is selected.');
  }

  if (input.score !== null && (!Number.isInteger(input.score) || input.score < 1 || input.score > 10)) {
    errors.push('Score must be a whole number between 1 and 10.');
  }

  if (input.quality !== null && !VALID_LEAD_QUALITIES.has(input.quality)) {
    errors.push('Quality must be High, Medium, or Low.');
  }

  if (errors.length > 0) {
    return { ok: false, errors, input };
  }

  const assignee = await CompanyCredential.findOne({
    where: { id: input.assigneeId, companyId, isActive: true },
  });
  if (!assignee) {
    errors.push('Assignee must be an active team member in your company.');
  }

  if (input.pipelineId) {
    const pipeline = await Pipeline.findOne({
      where: { id: input.pipelineId, companyId, isActive: true },
    });
    if (!pipeline) {
      errors.push('Pipeline not found.');
    }
  }

  if (input.stageId) {
    const stage = await PipelineStage.findOne({
      where: {
        id: input.stageId,
        pipelineId: input.pipelineId,
        stageType: 'lead',
        isActive: true,
      },
    });
    if (!stage) {
      errors.push('Stage must be an active lead stage on the selected pipeline.');
    }
  }

  if (input.sourceIds.length > 0) {
    const sourceCount = await Source.count({
      where: { id: input.sourceIds, companyId, isActive: true },
    });
    if (sourceCount !== input.sourceIds.length) {
      errors.push('One or more selected sources are invalid.');
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors, input };
  }

  return { ok: true, input };
}

async function syncLeadSources(lead, sourceIds, transaction) {
  await lead.setSources(sourceIds, { transaction });
}

async function createLead(companyId, data, { actorId } = {}) {
  const validation = await validateLeadPayload(companyId, data);
  if (!validation.ok) {
    throw new Error(validation.errors.join(' '));
  }

  const { input } = validation;

  return sequelize.transaction(async (transaction) => {
    const lead = await Lead.create({
      companyId,
      customerName: input.customerName,
      email: input.email,
      subject: input.subject,
      assigneeId: input.assigneeId,
      phone: input.phone,
      followUpDate: input.followUpDate,
      score: input.score,
      quality: input.quality,
      pipelineId: input.pipelineId,
      stageId: input.stageId,
      notes: input.notes,
    }, { transaction });

    await syncLeadSources(lead, input.sourceIds, transaction);

    await recordLeadHistoryEvent({
      leadId: lead.id,
      companyId,
      userId: actorId || null,
      action: LEAD_HISTORY_ACTIONS.CREATED,
      entityType: LEAD_HISTORY_ENTITY_TYPES.LEAD,
      entityId: lead.id,
      summary: 'Lead created',
    }, transaction);

    return findCompanyLead(companyId, lead.id, { transaction });
  });
}

async function updateLead(companyId, leadId, data, { actorId } = {}) {
  const lead = await findCompanyLead(companyId, leadId);
  if (!lead) {
    throw new Error('Lead not found.');
  }

  const validation = await validateLeadPayload(companyId, data);
  if (!validation.ok) {
    throw new Error(validation.errors.join(' '));
  }

  const { input } = validation;
  const historyContext = await buildLeadHistoryContext(companyId, lead);
  const afterState = {
    customerName: input.customerName,
    email: input.email,
    subject: input.subject,
    assigneeId: input.assigneeId,
    phone: input.phone || '',
    followUpDate: input.followUpDate || '',
    score: input.score ?? '',
    quality: input.quality || '',
    pipelineId: input.pipelineId || '',
    stageId: input.stageId || '',
    notes: input.notes || '',
    sourceIds: input.sourceIds,
  };
  const changes = buildLeadChanges(historyContext.before, afterState, historyContext);

  return sequelize.transaction(async (transaction) => {
    await lead.update({
      customerName: input.customerName,
      email: input.email,
      subject: input.subject,
      assigneeId: input.assigneeId,
      phone: input.phone,
      followUpDate: input.followUpDate,
      score: input.score,
      quality: input.quality,
      pipelineId: input.pipelineId,
      stageId: input.stageId,
      notes: input.notes,
    }, { transaction });

    await syncLeadSources(lead, input.sourceIds, transaction);

    if (Object.keys(changes).length > 0) {
      await recordLeadHistoryEvent({
        leadId: lead.id,
        companyId,
        userId: actorId || null,
        action: LEAD_HISTORY_ACTIONS.UPDATED,
        entityType: LEAD_HISTORY_ENTITY_TYPES.LEAD,
        entityId: lead.id,
        summary: 'Lead updated',
        changes,
      }, transaction);
    }

    return findCompanyLead(companyId, lead.id, { transaction });
  });
}

async function deleteLead(companyId, leadId) {
  const lead = await findCompanyLead(companyId, leadId);
  if (!lead) {
    throw new Error('Lead not found.');
  }

  await lead.destroy();
}

async function patchLead(companyId, leadId, partialData, options = {}) {
  const lead = await findCompanyLead(companyId, leadId);
  if (!lead) {
    throw new Error('Lead not found.');
  }

  const merged = { ...leadToPatchBase(lead) };

  Object.entries(partialData || {}).forEach(([key, value]) => {
    if (PATCHABLE_FIELDS.has(key)) {
      merged[key] = value;
    }
  });

  return updateLead(companyId, leadId, merged, options);
}

module.exports = {
  findCompanyLead,
  listCompanyLeadsPaginated,
  getLeadFormOptions,
  validateLeadPayload,
  normalizeLeadInput,
  createLead,
  updateLead,
  patchLead,
  deleteLead,
  serializeLeadForJson,
};
