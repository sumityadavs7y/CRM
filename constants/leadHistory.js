const LEAD_HISTORY_ACTIONS = {
  CREATED: 'created',
  UPDATED: 'updated',
  DELETED: 'deleted',
};

const LEAD_HISTORY_ENTITY_TYPES = {
  LEAD: 'lead',
  COMMUNICATION: 'communication',
  DISCUSSION: 'discussion',
  TASK: 'task',
};

const LEAD_FIELD_LABELS = {
  customerName: 'Customer name',
  email: 'Email',
  subject: 'Subject',
  assigneeId: 'Assignee',
  phone: 'Phone',
  followUpDate: 'Follow-up date',
  score: 'Score',
  quality: 'Quality',
  pipelineId: 'Pipeline',
  stageId: 'Stage',
  sourceIds: 'Sources',
  notes: 'Notes',
};

const COMMUNICATION_FIELD_LABELS = {
  itemType: 'Type',
  sentAt: 'Sent at',
  toAddress: 'To',
  subject: 'Subject',
  description: 'Description',
};

const DISCUSSION_FIELD_LABELS = {
  userId: 'User',
  postedAt: 'Posted at',
  message: 'Message',
};

const TASK_FIELD_LABELS = {
  name: 'Name',
  dueDate: 'Due date',
  dueTime: 'Due time',
  priority: 'Priority',
  status: 'Status',
};

const DEFAULT_HISTORY_PAGE_SIZE = 25;

module.exports = {
  LEAD_HISTORY_ACTIONS,
  LEAD_HISTORY_ENTITY_TYPES,
  LEAD_FIELD_LABELS,
  COMMUNICATION_FIELD_LABELS,
  DISCUSSION_FIELD_LABELS,
  TASK_FIELD_LABELS,
  DEFAULT_HISTORY_PAGE_SIZE,
};
