const { Lead, LeadDiscussion, CompanyCredential } = require('../models');
const {
  recordLeadHistoryEvent,
  buildDiscussionChanges,
  LEAD_HISTORY_ACTIONS,
  LEAD_HISTORY_ENTITY_TYPES,
} = require('./leadHistoryService');

async function assertCompanyLead(companyId, leadId) {
  const lead = await Lead.findOne({
    where: { id: leadId, companyId },
  });
  if (!lead) {
    throw new Error('Lead not found.');
  }
  return lead;
}

function parseOptionalId(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDiscussionInput(data) {
  return {
    userId: parseOptionalId(data.userId),
    postedAt: data.postedAt?.trim() || '',
    message: data.message?.trim() || '',
  };
}

async function assertCompanyUser(companyId, userId) {
  const user = await CompanyCredential.findOne({
    where: { id: userId, companyId },
  });
  if (!user) {
    throw new Error('User must belong to the current company.');
  }
  return user;
}

async function buildUserMap(companyId) {
  const users = await CompanyCredential.findAll({
    where: { companyId },
    attributes: ['id', 'adminName'],
  });
  return new Map(users.map((user) => [user.id, user.adminName]));
}

function validateDiscussionInput(input) {
  const errors = [];

  if (!input.userId) {
    errors.push('User is required.');
  }
  if (!input.postedAt) {
    errors.push('Time is required.');
  } else if (Number.isNaN(new Date(input.postedAt).getTime())) {
    errors.push('Time must be valid.');
  }
  if (!input.message) {
    errors.push('Message is required.');
  }

  return errors;
}

function discussionSnapshot(discussion) {
  return {
    userId: discussion.userId,
    postedAt: discussion.postedAt,
    message: discussion.message,
  };
}

function truncateMessage(message, maxLength = 60) {
  if (!message || message.length <= maxLength) {
    return message;
  }
  return `${message.slice(0, maxLength)}…`;
}

async function createLeadDiscussion(companyId, leadId, data, { actorId } = {}) {
  const lead = await assertCompanyLead(companyId, leadId);

  const input = normalizeDiscussionInput(data);
  const errors = validateDiscussionInput(input);
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  await assertCompanyUser(companyId, input.userId);

  const discussion = await LeadDiscussion.create({
    leadId,
    userId: input.userId,
    postedAt: new Date(input.postedAt),
    message: input.message,
  });

  await recordLeadHistoryEvent({
    leadId,
    companyId: lead.companyId,
    userId: actorId || null,
    action: LEAD_HISTORY_ACTIONS.CREATED,
    entityType: LEAD_HISTORY_ENTITY_TYPES.DISCUSSION,
    entityId: discussion.id,
    summary: `Added discussion: ${truncateMessage(input.message)}`,
  });

  return discussion;
}

async function updateLeadDiscussion(companyId, leadId, discussionId, data, { actorId } = {}) {
  const lead = await assertCompanyLead(companyId, leadId);

  const discussion = await LeadDiscussion.findOne({
    where: { id: discussionId, leadId },
  });
  if (!discussion) {
    throw new Error('Discussion not found.');
  }

  const before = discussionSnapshot(discussion);
  const input = normalizeDiscussionInput(data);
  const errors = validateDiscussionInput(input);
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  await assertCompanyUser(companyId, input.userId);

  await discussion.update({
    userId: input.userId,
    postedAt: new Date(input.postedAt),
    message: input.message,
  });

  const userMap = await buildUserMap(companyId);
  const changes = buildDiscussionChanges(before, discussionSnapshot(discussion), userMap);

  if (Object.keys(changes).length > 0) {
    await recordLeadHistoryEvent({
      leadId,
      companyId: lead.companyId,
      userId: actorId || null,
      action: LEAD_HISTORY_ACTIONS.UPDATED,
      entityType: LEAD_HISTORY_ENTITY_TYPES.DISCUSSION,
      entityId: discussion.id,
      summary: `Updated discussion: ${truncateMessage(input.message)}`,
      changes,
    });
  }

  return discussion;
}

async function deleteLeadDiscussion(companyId, leadId, discussionId, { actorId } = {}) {
  const lead = await assertCompanyLead(companyId, leadId);

  const discussion = await LeadDiscussion.findOne({
    where: { id: discussionId, leadId },
  });
  if (!discussion) {
    throw new Error('Discussion not found.');
  }

  await recordLeadHistoryEvent({
    leadId,
    companyId: lead.companyId,
    userId: actorId || null,
    action: LEAD_HISTORY_ACTIONS.DELETED,
    entityType: LEAD_HISTORY_ENTITY_TYPES.DISCUSSION,
    entityId: discussion.id,
    summary: `Deleted discussion: ${truncateMessage(discussion.message)}`,
  });

  await discussion.destroy();
}

module.exports = {
  createLeadDiscussion,
  updateLeadDiscussion,
  deleteLeadDiscussion,
};
