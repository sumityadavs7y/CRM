const BUDGET_SCOPES = ['project', 'phase', 'default'];

const BUDGET_SCOPE_LABELS = {
  project: 'Project',
  phase: 'Phase',
  default: 'Default',
};

const DEFAULT_BUDGET_CURRENCY = 'INR';

function formatBudgetScope(scope) {
  return BUDGET_SCOPE_LABELS[scope] || scope;
}

function formatBudgetCurrency(amount) {
  if (amount === undefined || amount === null || amount === '') {
    return '—';
  }
  const value = Number(amount);
  if (!Number.isFinite(value)) {
    return '—';
  }
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function budgetScopeTabKey(budget) {
  if (!budget) {
    return null;
  }
  if (budget.scope === 'phase' && budget.phaseId) {
    return `phase-${budget.phaseId}`;
  }
  if (budget.scope === 'default') {
    return 'default';
  }
  return 'project';
}

module.exports = {
  BUDGET_SCOPES,
  BUDGET_SCOPE_LABELS,
  DEFAULT_BUDGET_CURRENCY,
  formatBudgetScope,
  formatBudgetCurrency,
  budgetScopeTabKey,
};
