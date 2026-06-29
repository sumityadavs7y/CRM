(function () {
  const config = window.projectDetailConfig || {};
  const projectId = config.projectId;
  if (!projectId || !config.canViewBudget) {
    return;
  }

  let editingItemId = null;
  let editingExpenseId = null;

  function getModal(id) {
    const el = document.getElementById(id);
    if (!el || !window.bootstrap) {
      return null;
    }
    return window.bootstrap.Modal.getOrCreateInstance(el);
  }

  function parseJsonAttr(button, attr) {
    const raw = button.getAttribute(attr);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function showFormError(el, message) {
    el.textContent = message;
    el.classList.remove('d-none');
  }

  function clearFormError(el) {
    el.textContent = '';
    el.classList.add('d-none');
  }

  async function submitJson(url, method, body) {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Requested-With': 'fetch',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Request failed.');
    }
    return data;
  }

  function getActivePhaseTabKey() {
    const activeTab = document.querySelector('#budgetPhaseTabs .nav-link.active');
    return activeTab?.getAttribute('data-inventory-phase-tab')
      || config.inventoryPhaseTab
      || null;
  }

  function reloadBudgetTab() {
    const params = new URLSearchParams({
      tab: 'budget',
      success: 'Saved successfully.',
    });
    const phaseTab = getActivePhaseTabKey();
    if (phaseTab) {
      params.set('phaseTab', phaseTab);
    }
    window.location.href = `/company/projects/${projectId}?${params.toString()}`;
  }

  function getFormData(form) {
    const formData = new FormData(form);
    const body = {};
    formData.forEach((value, key) => {
      if (value !== '') {
        body[key] = value;
      }
    });
    return body;
  }

  function todayIsoDate() {
    return new Date().toISOString().slice(0, 10);
  }

  function openItemModal({ budgetId, item, parentId, parentName }) {
    const modal = getModal('budgetItemModal');
    if (!modal) {
      return;
    }

    editingItemId = item ? item.id : null;
    document.getElementById('budgetItemModalLabel').textContent = item
      ? 'Edit Budget Item'
      : (parentId ? `Add Sub-item${parentName ? ` under ${parentName}` : ''}` : 'Add Budget Item');
    document.getElementById('budgetItemBudgetId').value = budgetId;
    document.getElementById('budgetItemParentId').value = parentId || (item?.parentId || '');
    document.getElementById('budgetItemName').value = item ? item.name : '';
    document.getElementById('budgetItemExpectedAmount').value = item && item.expectedAmount != null ? item.expectedAmount : '';
    document.getElementById('budgetItemDescription').value = item ? (item.description || '') : '';
    clearFormError(document.getElementById('budgetItemFormError'));
    modal.show();
  }

  function openExpenseModal({ budgetId, itemId, itemName, expense }) {
    const modal = getModal('budgetExpenseModal');
    if (!modal) {
      return;
    }

    editingExpenseId = expense ? expense.id : null;
    document.getElementById('budgetExpenseModalLabel').textContent = expense ? 'Edit Expense' : 'Add Expense';
    document.getElementById('budgetExpenseBudgetId').value = budgetId;
    document.getElementById('budgetExpenseItemId').value = itemId;
    document.getElementById('budgetExpenseItemLabel').textContent = itemName ? `Item: ${itemName}` : '';
    document.getElementById('budgetExpenseAmount').value = expense && expense.amount != null ? expense.amount : '';
    document.getElementById('budgetExpenseDate').value = expense ? (expense.expenseDate || '') : todayIsoDate();
    document.getElementById('budgetExpenseDescription').value = expense ? (expense.description || '') : '';
    document.getElementById('budgetExpenseNotes').value = expense ? (expense.notes || '') : '';
    clearFormError(document.getElementById('budgetExpenseFormError'));
    modal.show();
  }

  function initBudgetForms() {
    if (!config.canEditBudget) {
      return;
    }

    const itemForm = document.getElementById('budgetItemForm');
    if (itemForm) {
      itemForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const errorEl = document.getElementById('budgetItemFormError');
        clearFormError(errorEl);
        const budgetId = document.getElementById('budgetItemBudgetId').value;
        const body = getFormData(event.target);

        try {
          if (editingItemId) {
            await submitJson(`/company/projects/${projectId}/budgets/${budgetId}/items/${editingItemId}`, 'PATCH', body);
          } else {
            await submitJson(`/company/projects/${projectId}/budgets/${budgetId}/items`, 'POST', body);
          }
          getModal('budgetItemModal')?.hide();
          reloadBudgetTab();
        } catch (error) {
          showFormError(errorEl, error.message);
        }
      });
    }

    const expenseForm = document.getElementById('budgetExpenseForm');
    if (expenseForm) {
      expenseForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const errorEl = document.getElementById('budgetExpenseFormError');
        clearFormError(errorEl);
        const budgetId = document.getElementById('budgetExpenseBudgetId').value;
        const itemId = document.getElementById('budgetExpenseItemId').value;
        const body = getFormData(event.target);

        try {
          if (editingExpenseId) {
            await submitJson(`/company/projects/${projectId}/budgets/${budgetId}/expenses/${editingExpenseId}`, 'PATCH', body);
          } else {
            await submitJson(`/company/projects/${projectId}/budgets/${budgetId}/items/${itemId}/expenses`, 'POST', body);
          }
          getModal('budgetExpenseModal')?.hide();
          reloadBudgetTab();
        } catch (error) {
          showFormError(errorEl, error.message);
        }
      });
    }
  }

  function initBudgetActions() {
    document.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-budget-action]');
      if (!button || !config.canEditBudget) {
        return;
      }

      event.preventDefault();
      const action = button.getAttribute('data-budget-action');

      if (action === 'create-budget') {
        const scope = button.getAttribute('data-budget-scope');
        const phaseId = button.getAttribute('data-phase-id');
        const body = { scope };
        if (scope === 'phase' && phaseId) {
          body.phaseId = phaseId;
        }
        try {
          await submitJson(`/company/projects/${projectId}/budgets`, 'POST', body);
          reloadBudgetTab();
        } catch (error) {
          alert(error.message);
        }
        return;
      }

      if (action === 'delete-budget') {
        const budgetId = button.getAttribute('data-budget-id');
        const label = button.getAttribute('data-scope-label') || 'this scope';
        if (!confirm(`Delete the budget for ${label}? All items and expenses will be removed.`)) {
          return;
        }
        try {
          await submitJson(`/company/projects/${projectId}/budgets/${budgetId}/delete`, 'POST', {});
          reloadBudgetTab();
        } catch (error) {
          alert(error.message);
        }
        return;
      }

      if (action === 'add-item') {
        openItemModal({ budgetId: button.getAttribute('data-budget-id') });
        return;
      }

      if (action === 'add-child-item') {
        openItemModal({
          budgetId: button.getAttribute('data-budget-id'),
          parentId: button.getAttribute('data-item-id'),
          parentName: button.getAttribute('data-item-name'),
        });
        return;
      }

      if (action === 'edit-item') {
        const item = parseJsonAttr(button, 'data-item');
        openItemModal({ budgetId: button.getAttribute('data-budget-id'), item });
        return;
      }

      if (action === 'delete-item') {
        const budgetId = button.getAttribute('data-budget-id');
        const itemId = button.getAttribute('data-item-id');
        const itemName = button.getAttribute('data-item-name') || 'this item';
        if (!confirm(`Delete ${itemName} and all sub-items and expenses?`)) {
          return;
        }
        try {
          await submitJson(`/company/projects/${projectId}/budgets/${budgetId}/items/${itemId}/delete`, 'POST', {});
          reloadBudgetTab();
        } catch (error) {
          alert(error.message);
        }
        return;
      }

      if (action === 'add-expense') {
        openExpenseModal({
          budgetId: button.getAttribute('data-budget-id'),
          itemId: button.getAttribute('data-item-id'),
          itemName: button.getAttribute('data-item-name'),
        });
        return;
      }

      if (action === 'edit-expense') {
        const expense = parseJsonAttr(button, 'data-expense');
        openExpenseModal({
          budgetId: button.getAttribute('data-budget-id'),
          itemId: button.getAttribute('data-item-id'),
          itemName: button.getAttribute('data-item-name'),
          expense,
        });
        return;
      }

      if (action === 'delete-expense') {
        const budgetId = button.getAttribute('data-budget-id');
        const expenseId = button.getAttribute('data-expense-id');
        if (!confirm('Delete this expense?')) {
          return;
        }
        try {
          await submitJson(`/company/projects/${projectId}/budgets/${budgetId}/expenses/${expenseId}/delete`, 'POST', {});
          reloadBudgetTab();
        } catch (error) {
          alert(error.message);
        }
      }
    });
  }

  function initBudgetPhaseTabs() {
    const phaseTab = config.inventoryPhaseTab || new URLSearchParams(window.location.search).get('phaseTab');
    if (!phaseTab) {
      return;
    }
    const tabButton = document.querySelector(`#budgetPhaseTabs [data-inventory-phase-tab="${phaseTab}"]`);
    if (tabButton && window.bootstrap) {
      window.bootstrap.Tab.getOrCreateInstance(tabButton).show();
    }
  }

  function init() {
    initBudgetForms();
    initBudgetActions();
    if ((config.activeTab || new URLSearchParams(window.location.search).get('tab')) === 'budget') {
      initBudgetPhaseTabs();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
