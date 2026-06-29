const {
  Budget,
  BudgetItem,
  BudgetExpense,
  ProjectPhase,
  sequelize,
} = require('../models');
const { assertCompanyProject } = require('./projectService');
const {
  BUDGET_SCOPES,
  DEFAULT_BUDGET_CURRENCY,
} = require('../constants/budgetManagement');
const { enrichBudgetWithRollups } = require('../utils/budgetCalculations');

const BUDGET_ITEM_INCLUDES = [
  {
    model: BudgetExpense,
    as: 'expenses',
    separate: true,
    order: [['expenseDate', 'DESC'], ['id', 'DESC']],
  },
];

const BUDGET_INCLUDES = [
  {
    model: BudgetItem,
    as: 'items',
    separate: true,
    order: [['sortOrder', 'ASC'], ['name', 'ASC']],
    include: BUDGET_ITEM_INCLUDES,
  },
];

function parseOptionalDecimal(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalId(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalDate(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed || null;
}

function normalizeBudgetInput(data) {
  return {
    scope: data.scope?.trim() || '',
    phaseId: parseOptionalId(data.phaseId),
    notes: data.notes?.trim() || null,
    currency: data.currency?.trim() || DEFAULT_BUDGET_CURRENCY,
  };
}

function validateBudgetInput(input) {
  const errors = [];

  if (!BUDGET_SCOPES.includes(input.scope)) {
    errors.push('Invalid budget scope.');
  }

  if (input.scope === 'phase' && !input.phaseId) {
    errors.push('Phase is required for phase budgets.');
  }

  if ((input.scope === 'project' || input.scope === 'default') && input.phaseId) {
    errors.push('Phase must not be set for this budget scope.');
  }

  return errors;
}

function normalizeBudgetItemInput(data) {
  return {
    name: data.name?.trim() || '',
    parentId: parseOptionalId(data.parentId),
    expectedAmount: parseOptionalDecimal(data.expectedAmount),
    description: data.description?.trim() || null,
    sortOrder: parseOptionalId(data.sortOrder) ?? 0,
  };
}

function validateBudgetItemInput(input) {
  const errors = [];
  if (!input.name) {
    errors.push('Item name is required.');
  }
  if (input.expectedAmount !== null && input.expectedAmount < 0) {
    errors.push('Expected amount cannot be negative.');
  }
  return errors;
}

function normalizeBudgetExpenseInput(data) {
  return {
    amount: parseOptionalDecimal(data.amount),
    expenseDate: parseOptionalDate(data.expenseDate),
    description: data.description?.trim() || null,
    notes: data.notes?.trim() || null,
  };
}

function validateBudgetExpenseInput(input) {
  const errors = [];
  if (!input.amount || input.amount <= 0) {
    errors.push('Expense amount must be greater than zero.');
  }
  if (!input.expenseDate) {
    errors.push('Expense date is required.');
  }
  return errors;
}

async function assertBudgetForProject(companyId, projectId, budgetId) {
  const budget = await Budget.findOne({
    where: { id: budgetId, companyId, projectId },
  });
  if (!budget) {
    throw new Error('Budget not found.');
  }
  return budget;
}

async function assertPhaseInProject(projectId, phaseId) {
  const phase = await ProjectPhase.findOne({
    where: { id: phaseId, projectId },
  });
  if (!phase) {
    throw new Error('Phase not found.');
  }
  return phase;
}

async function findBudgetByScope(companyId, projectId, scope, phaseId = null) {
  const where = { companyId, projectId, scope };
  if (scope === 'phase') {
    where.phaseId = phaseId;
  }
  return Budget.findOne({ where, include: BUDGET_INCLUDES });
}

async function loadBudgetWithRollups(budgetId) {
  const budget = await Budget.findByPk(budgetId, { include: BUDGET_INCLUDES });
  if (!budget) {
    return null;
  }
  return enrichBudgetWithRollups(budget, budget.items || []);
}

async function listProjectBudgetsEnriched(companyId, projectId) {
  const budgets = await Budget.findAll({
    where: { companyId, projectId },
    include: BUDGET_INCLUDES,
    order: [['scope', 'ASC'], ['id', 'ASC']],
  });

  return budgets.map((budget) => enrichBudgetWithRollups(budget, budget.items || []));
}

function indexBudgetsByScopeTab(budgets, phases) {
  const byTab = {
    project: null,
    default: null,
  };

  (budgets || []).forEach((budget) => {
    if (budget.scope === 'project') {
      byTab.project = budget;
    } else if (budget.scope === 'default') {
      byTab.default = budget;
    } else if (budget.scope === 'phase' && budget.phaseId) {
      byTab[`phase-${budget.phaseId}`] = budget;
    }
  });

  return byTab;
}

async function createBudget(companyId, projectId, data) {
  await assertCompanyProject(companyId, projectId);
  const input = normalizeBudgetInput(data);
  const errors = validateBudgetInput(input);
  if (errors.length) {
    throw new Error(errors.join(' '));
  }

  if (input.scope === 'phase') {
    await assertPhaseInProject(projectId, input.phaseId);
  }

  const existing = await findBudgetByScope(companyId, projectId, input.scope, input.phaseId);
  if (existing) {
    throw new Error('A budget already exists for this scope.');
  }

  const budget = await Budget.create({
    companyId,
    projectId,
    scope: input.scope,
    phaseId: input.scope === 'phase' ? input.phaseId : null,
    currency: input.currency,
    notes: input.notes,
  });

  return loadBudgetWithRollups(budget.id);
}

async function deleteBudget(companyId, projectId, budgetId) {
  const budget = await assertBudgetForProject(companyId, projectId, budgetId);
  await budget.destroy();
}

async function assertBudgetItem(budgetId, itemId) {
  const item = await BudgetItem.findOne({
    where: { id: itemId, budgetId },
  });
  if (!item) {
    throw new Error('Budget item not found.');
  }
  return item;
}

async function createBudgetItem(companyId, projectId, budgetId, data) {
  const budget = await assertBudgetForProject(companyId, projectId, budgetId);
  const input = normalizeBudgetItemInput(data);
  const errors = validateBudgetItemInput(input);
  if (errors.length) {
    throw new Error(errors.join(' '));
  }

  if (input.parentId) {
    await assertBudgetItem(budget.id, input.parentId);
  }

  await BudgetItem.create({
    budgetId: budget.id,
    parentId: input.parentId,
    name: input.name,
    expectedAmount: input.expectedAmount,
    description: input.description,
    sortOrder: input.sortOrder,
  });

  return loadBudgetWithRollups(budget.id);
}

async function updateBudgetItem(companyId, projectId, budgetId, itemId, data) {
  const budget = await assertBudgetForProject(companyId, projectId, budgetId);
  const item = await assertBudgetItem(budget.id, itemId);
  const input = normalizeBudgetItemInput({ ...item.toJSON(), ...data });
  const errors = validateBudgetItemInput(input);
  if (errors.length) {
    throw new Error(errors.join(' '));
  }

  if (input.parentId) {
    if (input.parentId === item.id) {
      throw new Error('An item cannot be its own parent.');
    }
    await assertBudgetItem(budget.id, input.parentId);
  }

  await item.update({
    parentId: input.parentId,
    name: input.name,
    expectedAmount: input.expectedAmount,
    description: input.description,
    sortOrder: input.sortOrder,
  });

  return loadBudgetWithRollups(budget.id);
}

async function deleteBudgetItem(companyId, projectId, budgetId, itemId) {
  const budget = await assertBudgetForProject(companyId, projectId, budgetId);
  const item = await assertBudgetItem(budget.id, itemId);

  await sequelize.transaction(async (transaction) => {
    const descendantIds = await collectDescendantItemIds(item.id, transaction);
    const allIds = [item.id, ...descendantIds];
    await BudgetExpense.destroy({
      where: { budgetItemId: allIds },
      transaction,
    });
    await BudgetItem.destroy({
      where: { id: allIds },
      transaction,
    });
  });

  return loadBudgetWithRollups(budget.id);
}

async function collectDescendantItemIds(parentId, transaction) {
  const children = await BudgetItem.findAll({
    where: { parentId },
    attributes: ['id'],
    transaction,
  });
  const ids = [];
  for (const child of children) {
    ids.push(child.id);
    ids.push(...await collectDescendantItemIds(child.id, transaction));
  }
  return ids;
}

async function assertBudgetExpense(budgetId, expenseId) {
  const expense = await BudgetExpense.findOne({
    where: { id: expenseId },
    include: [{
      model: BudgetItem,
      as: 'budgetItem',
      where: { budgetId },
      required: true,
    }],
  });
  if (!expense) {
    throw new Error('Expense not found.');
  }
  return expense;
}

async function createBudgetExpense(companyId, projectId, budgetId, itemId, data, credentialId = null) {
  const budget = await assertBudgetForProject(companyId, projectId, budgetId);
  await assertBudgetItem(budget.id, itemId);

  const input = normalizeBudgetExpenseInput(data);
  const errors = validateBudgetExpenseInput(input);
  if (errors.length) {
    throw new Error(errors.join(' '));
  }

  await BudgetExpense.create({
    budgetItemId: itemId,
    amount: input.amount,
    expenseDate: input.expenseDate,
    description: input.description,
    notes: input.notes,
    createdByCredentialId: credentialId,
  });

  return loadBudgetWithRollups(budget.id);
}

async function updateBudgetExpense(companyId, projectId, budgetId, expenseId, data) {
  const budget = await assertBudgetForProject(companyId, projectId, budgetId);
  const expense = await assertBudgetExpense(budget.id, expenseId);

  const input = normalizeBudgetExpenseInput({ ...expense.toJSON(), ...data });
  const errors = validateBudgetExpenseInput(input);
  if (errors.length) {
    throw new Error(errors.join(' '));
  }

  await expense.update({
    amount: input.amount,
    expenseDate: input.expenseDate,
    description: input.description,
    notes: input.notes,
  });

  return loadBudgetWithRollups(budget.id);
}

async function deleteBudgetExpense(companyId, projectId, budgetId, expenseId) {
  const budget = await assertBudgetForProject(companyId, projectId, budgetId);
  const expense = await assertBudgetExpense(budget.id, expenseId);
  await expense.destroy();
  return loadBudgetWithRollups(budget.id);
}

function resolveBudgetScopeFromPhaseTab(phaseTab, phases) {
  if (!phaseTab || phaseTab === 'project') {
    return { scope: 'project', phaseId: null };
  }
  if (phaseTab === 'default') {
    return { scope: 'default', phaseId: null };
  }
  const match = String(phaseTab).match(/^phase-(\d+)$/);
  if (match) {
    const phaseId = parseInt(match[1], 10);
    const exists = (phases || []).some((phase) => Number(phase.id) === phaseId);
    if (exists) {
      return { scope: 'phase', phaseId };
    }
  }
  return null;
}

module.exports = {
  listProjectBudgetsEnriched,
  indexBudgetsByScopeTab,
  loadBudgetWithRollups,
  createBudget,
  deleteBudget,
  createBudgetItem,
  updateBudgetItem,
  deleteBudgetItem,
  createBudgetExpense,
  updateBudgetExpense,
  deleteBudgetExpense,
  normalizeBudgetInput,
  normalizeBudgetItemInput,
  normalizeBudgetExpenseInput,
  resolveBudgetScopeFromPhaseTab,
};
