const { sanitizeNotesHtml } = require('../utils/sanitizeHtml');

const PATCHABLE_FIELDS = new Set([
  'customerName',
  'email',
  'subject',
  'assigneeId',
  'phone',
  'followUpDate',
  'pipelineId',
  'stageId',
  'sourceIds',
  'notes',
]);

function leadToPatchBase(lead) {
  return {
    customerName: lead.customerName,
    email: lead.email,
    subject: lead.subject,
    assigneeId: lead.assigneeId,
    phone: lead.phone || '',
    followUpDate: lead.followUpDate || '',
    pipelineId: lead.pipelineId || '',
    stageId: lead.stageId || '',
    notes: lead.notes || '',
    sourceIds: (lead.sources || []).map((source) => source.id),
  };
}

function serializeLeadForJson(lead) {
  if (!lead) {
    return null;
  }

  const json = lead.toJSON ? lead.toJSON() : lead;

  return {
    id: json.id,
    customerName: json.customerName,
    email: json.email,
    subject: json.subject,
    assigneeId: json.assigneeId,
    phone: json.phone,
    followUpDate: json.followUpDate,
    pipelineId: json.pipelineId,
    stageId: json.stageId,
    notes: json.notes,
    assignee: json.assignee ? {
      id: json.assignee.id,
      adminName: json.assignee.adminName,
    } : null,
    pipeline: json.pipeline ? { id: json.pipeline.id, name: json.pipeline.name } : null,
    stage: json.stage ? { id: json.stage.id, name: json.stage.name } : null,
    sources: (json.sources || []).map((source) => ({ id: source.id, name: source.name })),
  };
}

module.exports = {
  PATCHABLE_FIELDS,
  leadToPatchBase,
  serializeLeadForJson,
  sanitizeNotesHtml,
};
