function toNumber(value) {
  if (value === undefined || value === null || value === '') {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sumDirectExpenses(item) {
  const expenses = item.expenses || [];
  return expenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
}

function buildItemTree(items) {
  const byId = new Map();
  const roots = [];

  items.forEach((item) => {
    const plain = item.get ? item.toJSON() : { ...item };
    plain.children = [];
    plain.expenses = plain.expenses || [];
    byId.set(plain.id, plain);
  });

  byId.forEach((item) => {
    if (item.parentId && byId.has(item.parentId)) {
      byId.get(item.parentId).children.push(item);
    } else {
      roots.push(item);
    }
  });

  const sortItems = (list) => {
    list.sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name));
    list.forEach((child) => sortItems(child.children));
  };
  sortItems(roots);

  return roots;
}

function computeItemRollup(item) {
  const children = item.children || [];
  const directSpent = sumDirectExpenses(item);
  const childrenRollups = children.map((child) => computeItemRollup(child));
  const childrenSpent = childrenRollups.reduce((sum, child) => sum + child.spent, 0);
  const spent = directSpent + childrenSpent;

  let expected;
  if (item.expectedAmount !== null && item.expectedAmount !== undefined && item.expectedAmount !== '') {
    expected = toNumber(item.expectedAmount);
  } else if (children.length) {
    expected = childrenRollups.reduce((sum, child) => sum + child.expected, 0);
  } else {
    expected = 0;
  }

  const remaining = expected - spent;
  const utilizedPercent = expected > 0 ? Math.round((spent / expected) * 100) : null;

  return {
    ...item,
    children: childrenRollups,
    directSpent,
    spent,
    expected,
    remaining,
    utilizedPercent,
    isOverBudget: expected > 0 && spent > expected,
  };
}

function computeBudgetTotals(items) {
  const rollups = items.map((item) => computeItemRollup(item));
  const expected = rollups.reduce((sum, item) => sum + item.expected, 0);
  const spent = rollups.reduce((sum, item) => sum + item.spent, 0);
  const remaining = expected - spent;
  const utilizedPercent = expected > 0 ? Math.round((spent / expected) * 100) : null;

  return {
    items: rollups,
    expected,
    spent,
    remaining,
    utilizedPercent,
    isOverBudget: expected > 0 && spent > expected,
  };
}

function enrichBudgetWithRollups(budget, items) {
  const tree = buildItemTree(items);
  const totals = computeBudgetTotals(tree);
  const plain = budget.get ? budget.toJSON() : { ...budget };

  return {
    ...plain,
    items: totals.items,
    expected: totals.expected,
    spent: totals.spent,
    remaining: totals.remaining,
    utilizedPercent: totals.utilizedPercent,
    isOverBudget: totals.isOverBudget,
  };
}

module.exports = {
  toNumber,
  buildItemTree,
  computeItemRollup,
  computeBudgetTotals,
  enrichBudgetWithRollups,
};
