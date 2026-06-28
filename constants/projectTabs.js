const PROJECT_TABS = [
  { key: 'general', label: 'General' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'rera', label: 'RERA' },
  { key: 'milestones', label: 'Milestones' },
  { key: 'approvals', label: 'Approvals' },
];

const VALID_PROJECT_TAB_KEYS = PROJECT_TABS.map((tab) => tab.key);

function resolveActiveProjectTab(tab) {
  return VALID_PROJECT_TAB_KEYS.includes(tab) ? tab : 'general';
}

module.exports = {
  PROJECT_TABS,
  VALID_PROJECT_TAB_KEYS,
  resolveActiveProjectTab,
};
