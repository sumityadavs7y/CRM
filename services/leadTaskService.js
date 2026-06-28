const { Lead, LeadTask } = require('../models');
const {
  VALID_LEAD_TASK_PRIORITIES,
  VALID_LEAD_TASK_STATUSES,
} = require('../constants/leadTask');
const {
  recordLeadHistoryEvent,
  buildTaskChanges,
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

function taskSnapshot(task) {
  return {
    name: task.name,
    dueDate: task.dueDate,
    dueTime: task.dueTime || '',
    priority: task.priority || '',
    status: task.status || 'ongoing',
  };
}

async function createLeadTask(companyId, leadId, data, { actorId } = {}) {
  const lead = await assertCompanyLead(companyId, leadId);

  const input = normalizeTaskInput(data);
  const errors = validateTaskInput(input);
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  const task = await LeadTask.create({
    leadId,
    name: input.name,
    dueDate: input.dueDate,
    dueTime: input.dueTime,
    priority: input.priority,
    status: input.status,
  });

  await recordLeadHistoryEvent({
    leadId,
    companyId: lead.companyId,
    userId: actorId || null,
    action: LEAD_HISTORY_ACTIONS.CREATED,
    entityType: LEAD_HISTORY_ENTITY_TYPES.TASK,
    entityId: task.id,
    summary: `Added task: ${input.name}`,
  });

  return task;
}

async function updateLeadTask(companyId, leadId, taskId, data, { actorId } = {}) {
  const lead = await assertCompanyLead(companyId, leadId);

  const task = await LeadTask.findOne({
    where: { id: taskId, leadId },
  });
  if (!task) {
    throw new Error('Task not found.');
  }

  const before = taskSnapshot(task);
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

  const changes = buildTaskChanges(before, taskSnapshot(task));

  if (Object.keys(changes).length > 0) {
    await recordLeadHistoryEvent({
      leadId,
      companyId: lead.companyId,
      userId: actorId || null,
      action: LEAD_HISTORY_ACTIONS.UPDATED,
      entityType: LEAD_HISTORY_ENTITY_TYPES.TASK,
      entityId: task.id,
      summary: `Updated task: ${input.name}`,
      changes,
    });
  }

  return task;
}

async function deleteLeadTask(companyId, leadId, taskId, { actorId } = {}) {
  const lead = await assertCompanyLead(companyId, leadId);

  const task = await LeadTask.findOne({
    where: { id: taskId, leadId },
  });
  if (!task) {
    throw new Error('Task not found.');
  }

  await recordLeadHistoryEvent({
    leadId,
    companyId: lead.companyId,
    userId: actorId || null,
    action: LEAD_HISTORY_ACTIONS.DELETED,
    entityType: LEAD_HISTORY_ENTITY_TYPES.TASK,
    entityId: task.id,
    summary: `Deleted task: ${task.name}`,
  });

  await task.destroy();
}

module.exports = {
  createLeadTask,
  updateLeadTask,
  deleteLeadTask,
};
