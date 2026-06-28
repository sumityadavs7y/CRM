const { Lead, LeadCommunication } = require('../models');
const {
  recordLeadHistoryEvent,
  buildCommunicationChanges,
  LEAD_HISTORY_ACTIONS,
  LEAD_HISTORY_ENTITY_TYPES,
} = require('./leadHistoryService');

const VALID_ITEM_TYPES = ['email', 'message'];

async function assertCompanyLead(companyId, leadId) {
  const lead = await Lead.findOne({
    where: { id: leadId, companyId },
  });
  if (!lead) {
    throw new Error('Lead not found.');
  }
  return lead;
}

function normalizeCommunicationInput(data) {
  return {
    itemType: data.itemType?.trim() || '',
    sentAt: data.sentAt?.trim() || '',
    toAddress: data.toAddress?.trim() || '',
    subject: data.subject?.trim() || '',
    description: data.description?.trim() || null,
  };
}

function validateCommunicationInput(input) {
  const errors = [];

  if (!VALID_ITEM_TYPES.includes(input.itemType)) {
    errors.push('Item type must be email or message.');
  }
  if (!input.sentAt) {
    errors.push('Sent time is required.');
  } else if (Number.isNaN(new Date(input.sentAt).getTime())) {
    errors.push('Sent time must be valid.');
  }
  if (!input.toAddress) {
    errors.push('To is required.');
  }
  if (!input.subject) {
    errors.push('Subject is required.');
  }

  return errors;
}

function communicationSnapshot(communication) {
  return {
    itemType: communication.itemType,
    sentAt: communication.sentAt,
    toAddress: communication.toAddress,
    subject: communication.subject,
    description: communication.description || '',
  };
}

function formatCommunicationSummary(itemType, subject) {
  const label = itemType === 'email' ? 'email' : 'message';
  return `Added ${label}: ${subject}`;
}

async function listLeadCommunications(companyId, leadId) {
  await assertCompanyLead(companyId, leadId);

  return LeadCommunication.findAll({
    where: { leadId },
    order: [['sentAt', 'DESC']],
  });
}

async function createLeadCommunication(companyId, leadId, data, { actorId } = {}) {
  const lead = await assertCompanyLead(companyId, leadId);

  const input = normalizeCommunicationInput(data);
  const errors = validateCommunicationInput(input);
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  const communication = await LeadCommunication.create({
    leadId,
    itemType: input.itemType,
    sentAt: new Date(input.sentAt),
    toAddress: input.toAddress,
    subject: input.subject,
    description: input.description,
  });

  await recordLeadHistoryEvent({
    leadId,
    companyId: lead.companyId,
    userId: actorId || null,
    action: LEAD_HISTORY_ACTIONS.CREATED,
    entityType: LEAD_HISTORY_ENTITY_TYPES.COMMUNICATION,
    entityId: communication.id,
    summary: formatCommunicationSummary(input.itemType, input.subject),
  });

  return communication;
}

async function updateLeadCommunication(companyId, leadId, communicationId, data, { actorId } = {}) {
  const lead = await assertCompanyLead(companyId, leadId);

  const communication = await LeadCommunication.findOne({
    where: { id: communicationId, leadId },
  });
  if (!communication) {
    throw new Error('Communication not found.');
  }

  const before = communicationSnapshot(communication);
  const input = normalizeCommunicationInput(data);
  const errors = validateCommunicationInput(input);
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  await communication.update({
    itemType: input.itemType,
    sentAt: new Date(input.sentAt),
    toAddress: input.toAddress,
    subject: input.subject,
    description: input.description,
  });

  const after = communicationSnapshot(communication);
  const changes = buildCommunicationChanges(before, after);

  if (Object.keys(changes).length > 0) {
    await recordLeadHistoryEvent({
      leadId,
      companyId: lead.companyId,
      userId: actorId || null,
      action: LEAD_HISTORY_ACTIONS.UPDATED,
      entityType: LEAD_HISTORY_ENTITY_TYPES.COMMUNICATION,
      entityId: communication.id,
      summary: `Updated ${input.itemType === 'email' ? 'email' : 'message'}: ${input.subject}`,
      changes,
    });
  }

  return communication;
}

async function deleteLeadCommunication(companyId, leadId, communicationId, { actorId } = {}) {
  const lead = await assertCompanyLead(companyId, leadId);

  const communication = await LeadCommunication.findOne({
    where: { id: communicationId, leadId },
  });
  if (!communication) {
    throw new Error('Communication not found.');
  }

  const summary = `Deleted ${communication.itemType === 'email' ? 'email' : 'message'}: ${communication.subject}`;

  await recordLeadHistoryEvent({
    leadId,
    companyId: lead.companyId,
    userId: actorId || null,
    action: LEAD_HISTORY_ACTIONS.DELETED,
    entityType: LEAD_HISTORY_ENTITY_TYPES.COMMUNICATION,
    entityId: communication.id,
    summary,
  });

  await communication.destroy();
}

module.exports = {
  listLeadCommunications,
  createLeadCommunication,
  updateLeadCommunication,
  deleteLeadCommunication,
};
