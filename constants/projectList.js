const PROJECT_LIST_PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_PROJECT_LIST_PAGE_SIZE = 25;
const DEFAULT_PROJECT_LIST_SORT = 'name';
const DEFAULT_PROJECT_LIST_DIR = 'asc';

const PROJECT_LIST_COLUMNS = [
  { key: 'name', label: 'Name', defaultVisible: true },
  { key: 'projectType', label: 'Type', defaultVisible: true },
  { key: 'status', label: 'Status', defaultVisible: true },
  { key: 'city', label: 'City', defaultVisible: true },
  { key: 'state', label: 'State', defaultVisible: false },
  { key: 'location', label: 'Location', defaultVisible: false },
  { key: 'units', label: 'Units', defaultVisible: true },
  { key: 'reraStatus', label: 'RERA', defaultVisible: true },
  { key: 'launchDate', label: 'Launch', defaultVisible: false },
  { key: 'possessionDate', label: 'Possession', defaultVisible: false },
  { key: 'expectedStartDate', label: 'Expected start', defaultVisible: false },
  { key: 'expectedEndDate', label: 'Expected end', defaultVisible: false },
  { key: 'expectedProfits', label: 'Expected profits', defaultVisible: false },
  { key: 'isActive', label: 'Active', defaultVisible: false },
  { key: 'createdAt', label: 'Created', defaultVisible: false },
  { key: 'updatedAt', label: 'Updated', defaultVisible: false },
];

const PROJECT_LIST_DEFAULT_VISIBLE_COLUMNS = PROJECT_LIST_COLUMNS
  .filter((column) => column.defaultVisible !== false)
  .map((column) => column.key);

const PROJECT_LIST_COLUMNS_STORAGE_KEY = 'crm.projects-list.visible-columns';
const PROJECT_LIST_FILTERS_EXPANDED_STORAGE_KEY = 'crm.projects-list.filters-expanded';

const PROJECT_LIST_SORT_COLUMNS = new Set([
  'name',
  'projectType',
  'status',
  'city',
  'state',
  'launchDate',
  'possessionDate',
  'expectedStartDate',
  'expectedEndDate',
  'expectedProfits',
  'createdAt',
  'updatedAt',
]);

const PROJECT_LIST_VIEW_MODES = ['list', 'grid'];
const DEFAULT_PROJECT_LIST_VIEW = 'grid';
const PROJECT_LIST_VIEW_STORAGE_KEY = 'crm.projects-list.view-mode';

module.exports = {
  PROJECT_LIST_PAGE_SIZES,
  DEFAULT_PROJECT_LIST_PAGE_SIZE,
  DEFAULT_PROJECT_LIST_SORT,
  DEFAULT_PROJECT_LIST_DIR,
  PROJECT_LIST_COLUMNS,
  PROJECT_LIST_DEFAULT_VISIBLE_COLUMNS,
  PROJECT_LIST_COLUMNS_STORAGE_KEY,
  PROJECT_LIST_FILTERS_EXPANDED_STORAGE_KEY,
  PROJECT_LIST_SORT_COLUMNS,
  PROJECT_LIST_VIEW_MODES,
  DEFAULT_PROJECT_LIST_VIEW,
  PROJECT_LIST_VIEW_STORAGE_KEY,
};
