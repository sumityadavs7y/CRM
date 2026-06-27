const { Lead, LeadDiscussion, CompanyCredential } = require('../models');

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

async function createLeadDiscussion(companyId, leadId, data) {
  await assertCompanyLead(companyId, leadId);

  const input = normalizeDiscussionInput(data);
  const errors = validateDiscussionInput(input);
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  await assertCompanyUser(companyId, input.userId);

  return LeadDiscussion.create({
    leadId,
    userId: input.userId,
    postedAt: new Date(input.postedAt),
    message: input.message,
  });
}

async function updateLeadDiscussion(companyId, leadId, discussionId, data) {
  await assertCompanyLead(companyId, leadId);

  const discussion = await LeadDiscussion.findOne({
    where: { id: discussionId, leadId },
  });
  if (!discussion) {
    throw new Error('Discussion not found.');
  }

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

  return discussion;
}

async function deleteLeadDiscussion(companyId, leadId, discussionId) {
  await assertCompanyLead(companyId, leadId);

  const discussion = await LeadDiscussion.findOne({
    where: { id: discussionId, leadId },
  });
  if (!discussion) {
    throw new Error('Discussion not found.');
  }

  await discussion.destroy();
}

module.exports = {
  createLeadDiscussion,
  updateLeadDiscussion,
  deleteLeadDiscussion,
};
