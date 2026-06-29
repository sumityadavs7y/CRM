const express = require('express');
const { isCompanyAuthenticated } = require('../middleware/auth');
const { requirePermission } = require('../middleware/companyFeatures');
const { assertCompanyProject } = require('../services/projectService');
const {
  createBudget,
  deleteBudget,
  createBudgetItem,
  updateBudgetItem,
  deleteBudgetItem,
  createBudgetExpense,
  updateBudgetExpense,
  deleteBudgetExpense,
  loadBudgetWithRollups,
} = require('../services/budgetService');

const router = express.Router({ mergeParams: true });

function wantsJson(req) {
  const accept = req.get('Accept') || '';
  const contentType = req.get('Content-Type') || '';
  return accept.includes('application/json')
    || contentType.includes('application/json')
    || req.get('X-Requested-With') === 'fetch';
}

function jsonOk(res, payload = {}) {
  return res.json({ ok: true, ...payload });
}

function jsonError(res, status, message) {
  return res.status(status).json({ ok: false, error: message });
}

function handleBudgetError(res, error, req) {
  if (wantsJson(req)) {
    return jsonError(res, 400, error.message);
  }
  const projectId = req.params.id;
  return res.redirect(`/company/projects/${projectId}?tab=budget&error=${encodeURIComponent(error.message)}`);
}

router.post('/:id/budgets', isCompanyAuthenticated, requirePermission('budget_management', 'edit'), async (req, res) => {
  try {
    const budget = await createBudget(req.session.companyId, req.params.id, req.body);
    if (wantsJson(req)) {
      return jsonOk(res, { budget });
    }
    return res.redirect(`/company/projects/${req.params.id}?tab=budget&success=${encodeURIComponent('Budget created.')}`);
  } catch (error) {
    return handleBudgetError(res, error, req);
  }
});

router.post('/:id/budgets/:budgetId/delete', isCompanyAuthenticated, requirePermission('budget_management', 'edit'), async (req, res) => {
  try {
    await deleteBudget(req.session.companyId, req.params.id, req.params.budgetId);
    if (wantsJson(req)) {
      return jsonOk(res);
    }
    return res.redirect(`/company/projects/${req.params.id}?tab=budget&success=${encodeURIComponent('Budget deleted.')}`);
  } catch (error) {
    return handleBudgetError(res, error, req);
  }
});

router.post('/:id/budgets/:budgetId/items', isCompanyAuthenticated, requirePermission('budget_management', 'edit'), async (req, res) => {
  try {
    const budget = await createBudgetItem(req.session.companyId, req.params.id, req.params.budgetId, req.body);
    if (wantsJson(req)) {
      return jsonOk(res, { budget });
    }
    return res.redirect(`/company/projects/${req.params.id}?tab=budget&success=${encodeURIComponent('Item added.')}`);
  } catch (error) {
    return handleBudgetError(res, error, req);
  }
});

router.patch('/:id/budgets/:budgetId/items/:itemId', isCompanyAuthenticated, requirePermission('budget_management', 'edit'), async (req, res) => {
  try {
    const budget = await updateBudgetItem(
      req.session.companyId,
      req.params.id,
      req.params.budgetId,
      req.params.itemId,
      req.body,
    );
    if (wantsJson(req)) {
      return jsonOk(res, { budget });
    }
    return res.redirect(`/company/projects/${req.params.id}?tab=budget&success=${encodeURIComponent('Item updated.')}`);
  } catch (error) {
    return handleBudgetError(res, error, req);
  }
});

router.post('/:id/budgets/:budgetId/items/:itemId/delete', isCompanyAuthenticated, requirePermission('budget_management', 'edit'), async (req, res) => {
  try {
    const budget = await deleteBudgetItem(
      req.session.companyId,
      req.params.id,
      req.params.budgetId,
      req.params.itemId,
    );
    if (wantsJson(req)) {
      return jsonOk(res, { budget });
    }
    return res.redirect(`/company/projects/${req.params.id}?tab=budget&success=${encodeURIComponent('Item deleted.')}`);
  } catch (error) {
    return handleBudgetError(res, error, req);
  }
});

router.post('/:id/budgets/:budgetId/items/:itemId/expenses', isCompanyAuthenticated, requirePermission('budget_management', 'edit'), async (req, res) => {
  try {
    const budget = await createBudgetExpense(
      req.session.companyId,
      req.params.id,
      req.params.budgetId,
      req.params.itemId,
      req.body,
      req.session.credentialId || null,
    );
    if (wantsJson(req)) {
      return jsonOk(res, { budget });
    }
    return res.redirect(`/company/projects/${req.params.id}?tab=budget&success=${encodeURIComponent('Expense added.')}`);
  } catch (error) {
    return handleBudgetError(res, error, req);
  }
});

router.patch('/:id/budgets/:budgetId/expenses/:expenseId', isCompanyAuthenticated, requirePermission('budget_management', 'edit'), async (req, res) => {
  try {
    const budget = await updateBudgetExpense(
      req.session.companyId,
      req.params.id,
      req.params.budgetId,
      req.params.expenseId,
      req.body,
    );
    if (wantsJson(req)) {
      return jsonOk(res, { budget });
    }
    return res.redirect(`/company/projects/${req.params.id}?tab=budget&success=${encodeURIComponent('Expense updated.')}`);
  } catch (error) {
    return handleBudgetError(res, error, req);
  }
});

router.post('/:id/budgets/:budgetId/expenses/:expenseId/delete', isCompanyAuthenticated, requirePermission('budget_management', 'edit'), async (req, res) => {
  try {
    const budget = await deleteBudgetExpense(
      req.session.companyId,
      req.params.id,
      req.params.budgetId,
      req.params.expenseId,
    );
    if (wantsJson(req)) {
      return jsonOk(res, { budget });
    }
    return res.redirect(`/company/projects/${req.params.id}?tab=budget&success=${encodeURIComponent('Expense deleted.')}`);
  } catch (error) {
    return handleBudgetError(res, error, req);
  }
});

router.get('/:id/budgets/:budgetId', isCompanyAuthenticated, requirePermission('budget_management', 'view'), async (req, res) => {
  try {
    await assertCompanyProject(req.session.companyId, req.params.id);
    const budget = await loadBudgetWithRollups(req.params.budgetId);
    if (!budget || Number(budget.projectId) !== Number(req.params.id)) {
      return jsonError(res, 404, 'Budget not found.');
    }
    return jsonOk(res, { budget });
  } catch (error) {
    return jsonError(res, 400, error.message);
  }
});

module.exports = router;
