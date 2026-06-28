const LEAD_LIST_PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_LEAD_LIST_PAGE_SIZE = 25;
const DEFAULT_LEAD_LIST_SORT = 'createdAt';
const DEFAULT_LEAD_LIST_DIR = 'desc';

const LEAD_LIST_COLUMNS = [
  { key: 'customerName', label: 'Customer', defaultVisible: true },
  { key: 'email', label: 'Email', defaultVisible: true },
  { key: 'subject', label: 'Subject', defaultVisible: true },
  { key: 'assignee', label: 'Assignee', defaultVisible: true },
  { key: 'phone', label: 'Phone', defaultVisible: true },
  { key: 'followUpDate', label: 'Follow-up', defaultVisible: true },
  { key: 'score', label: 'Score', defaultVisible: true },
  { key: 'quality', label: 'Quality', defaultVisible: true },
  { key: 'pipeline', label: 'Pipeline', defaultVisible: true },
  { key: 'stage', label: 'Stage', defaultVisible: true },
  { key: 'notes', label: 'Notes', defaultVisible: false },
  { key: 'sources', label: 'Sources', defaultVisible: false },
  { key: 'createdAt', label: 'Created', defaultVisible: false },
  { key: 'updatedAt', label: 'Updated', defaultVisible: false },
  { key: 'communicationCount', label: 'Emails/Messages', defaultVisible: false, type: 'count' },
  { key: 'taskCount', label: 'Tasks', defaultVisible: false, type: 'count' },
  { key: 'discussionCount', label: 'Discussions', defaultVisible: false, type: 'count' },
];

const LEAD_LIST_DEFAULT_VISIBLE_COLUMNS = LEAD_LIST_COLUMNS
  .filter((column) => column.defaultVisible !== false)
  .map((column) => column.key);

const LEAD_LIST_COLUMNS_STORAGE_KEY = 'crm.leads-list.visible-columns';

const LEAD_LIST_SORT_COLUMNS = new Set([
  'createdAt',
  'customerName',
  'email',
  'subject',
  'assignee',
  'phone',
  'followUpDate',
  'score',
  'quality',
  'pipeline',
  'stage',
  'notes',
  'updatedAt',
  'communicationCount',
  'taskCount',
  'discussionCount',
]);

module.exports = {
  LEAD_LIST_PAGE_SIZES,
  DEFAULT_LEAD_LIST_PAGE_SIZE,
  DEFAULT_LEAD_LIST_SORT,
  DEFAULT_LEAD_LIST_DIR,
  LEAD_LIST_SORT_COLUMNS,
  LEAD_LIST_COLUMNS,
  LEAD_LIST_DEFAULT_VISIBLE_COLUMNS,
  LEAD_LIST_COLUMNS_STORAGE_KEY,
};
