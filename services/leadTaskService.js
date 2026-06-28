const { Lead, LeadTask } = require('../models');
const {
  VALID_LEAD_TASK_PRIORITIES,
  VALID_LEAD_TASK_STATUSES,
} = require('../constants/leadTask');

async function assertCompanyLead(companyId, leadId) {
  const lead = await Lead.findOne({
    where: { id: leadId, companyId },
  });
  if (!lead) {
    throw new Error('Lead not found.');
  }
  return lead;
}

function normalizeTaskInput(data) {
  const priority = data.priority?.trim() || '';
  const status = data.status?.trim() || '';

  return {
    name: data.name?.trim() || '',
    dueDate: data.dueDate?.trim() || '',
    dueTime: data.dueTime?.trim() || null,
    priority: priority || null,
    status: status || 'ongoing',
  };
}

function validateTaskInput(input) {
  const errors = [];

  if (!input.name) {
    errors.push('Name is required.');
  }
  if (!input.dueDate) {
    errors.push('Date is required.');
  } else if (Number.isNaN(new Date(input.dueDate).getTime())) {
    errors.push('Date must be valid.');
  }
  if (input.dueTime && !/^\d{2}:\d{2}(:\d{2})?$/.test(input.dueTime)) {
    errors.push('Time must be valid.');
  }
  if (input.priority && !VALID_LEAD_TASK_PRIORITIES.has(input.priority)) {
    errors.push('Priority must be high, medium, or low.');
  }
  if (!VALID_LEAD_TASK_STATUSES.has(input.status)) {
    errors.push('Status must be ongoing or complete.');
  }

  return errors;
}

async function createLeadTask(companyId, leadId, data) {
  await assertCompanyLead(companyId, leadId);

  const input = normalizeTaskInput(data);
  const errors = validateTaskInput(input);
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  return LeadTask.create({
    leadId,
    name: input.name,
    dueDate: input.dueDate,
    dueTime: input.dueTime,
    priority: input.priority,
    status: input.status,
  });
}

async function updateLeadTask(companyId, leadId, taskId, data) {
  await assertCompanyLead(companyId, leadId);

  const task = await LeadTask.findOne({
    where: { id: taskId, leadId },
  });
  if (!task) {
    throw new Error('Task not found.');
  }

  const input = normalizeTaskInput(data);
  const errors = validateTaskInput(input);
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  await task.update({
    name: input.name,
    dueDate: input.dueDate,
    dueTime: input.dueTime,
    priority: input.priority,
    status: input.status,
  });

  return task;
}

async function deleteLeadTask(companyId, leadId, taskId) {
  await assertCompanyLead(companyId, leadId);

  const task = await LeadTask.findOne({
    where: { id: taskId, leadId },
  });
  if (!task) {
    throw new Error('Task not found.');
  }

  await task.destroy();
}

module.exports = {
  createLeadTask,
  updateLeadTask,
  deleteLeadTask,
};
