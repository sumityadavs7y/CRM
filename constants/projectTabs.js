const PROJECT_TABS = [
  { key: 'general', label: 'General' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'rera', label: 'RERA' },
  { key: 'budget', label: 'Project Budget' },
  { key: 'milestones', label: 'Milestones' },
  { key: 'approvals', label: 'Approvals' },
];

const VALID_PROJECT_TAB_KEYS = PROJECT_TABS.map((tab) => tab.key);

function resolveActiveProjectTab(tab) {
  return VALID_PROJECT_TAB_KEYS.includes(tab) ? tab : 'general';
}

function getVisibleProjectTabs(user) {
  return PROJECT_TABS.filter((tab) => {
    if (tab.key === 'budget') {
      return user && user.can && user.can('budget_management', 'view');
    }
    return true;
  });
}

module.exports = {
  PROJECT_TABS,
  VALID_PROJECT_TAB_KEYS,
  resolveActiveProjectTab,
  getVisibleProjectTabs,
};
