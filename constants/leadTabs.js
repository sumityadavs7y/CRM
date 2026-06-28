const LEAD_TABS = [
  { key: 'general', label: 'General' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'history', label: 'History' },
];

const VALID_LEAD_TAB_KEYS = LEAD_TABS.map((tab) => tab.key);

function resolveActiveTab(tab) {
  return VALID_LEAD_TAB_KEYS.includes(tab) ? tab : 'general';
}

module.exports = {
  LEAD_TABS,
  VALID_LEAD_TAB_KEYS,
  resolveActiveTab,
};
