const { Lead, LeadCommunication } = require('../models');

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

async function listLeadCommunications(companyId, leadId) {
  await assertCompanyLead(companyId, leadId);

  return LeadCommunication.findAll({
    where: { leadId },
    order: [['sentAt', 'DESC']],
  });
}

async function createLeadCommunication(companyId, leadId, data) {
  await assertCompanyLead(companyId, leadId);

  const input = normalizeCommunicationInput(data);
  const errors = validateCommunicationInput(input);
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  return LeadCommunication.create({
    leadId,
    itemType: input.itemType,
    sentAt: new Date(input.sentAt),
    toAddress: input.toAddress,
    subject: input.subject,
    description: input.description,
  });
}

async function updateLeadCommunication(companyId, leadId, communicationId, data) {
  await assertCompanyLead(companyId, leadId);

  const communication = await LeadCommunication.findOne({
    where: { id: communicationId, leadId },
  });
  if (!communication) {
    throw new Error('Communication not found.');
  }

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

  return communication;
}

async function deleteLeadCommunication(companyId, leadId, communicationId) {
  await assertCompanyLead(companyId, leadId);

  const communication = await LeadCommunication.findOne({
    where: { id: communicationId, leadId },
  });
  if (!communication) {
    throw new Error('Communication not found.');
  }

  await communication.destroy();
}

module.exports = {
  listLeadCommunications,
  createLeadCommunication,
  updateLeadCommunication,
  deleteLeadCommunication,
};
