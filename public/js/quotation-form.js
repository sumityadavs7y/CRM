(function () {
  function roundMoney(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  function formatCurrency(value) {
    return `₹${roundMoney(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function calculateLineTotal(row) {
    const qty = Number(row.querySelector('.line-qty')?.value) || 0;
    const rate = Number(row.querySelector('.line-rate')?.value) || 0;
    const discount = Number(row.querySelector('.line-discount')?.value) || 0;
    const taxRate = Number(row.querySelector('.line-tax-rate')?.value) || 0;
    const base = Math.max(0, qty * rate - discount);
    const tax = base * (taxRate / 100);
    return roundMoney(base + tax);
  }

  function calculateLineTax(row) {
    const qty = Number(row.querySelector('.line-qty')?.value) || 0;
    const rate = Number(row.querySelector('.line-rate')?.value) || 0;
    const discount = Number(row.querySelector('.line-discount')?.value) || 0;
    const taxRate = Number(row.querySelector('.line-tax-rate')?.value) || 0;
    const base = Math.max(0, qty * rate - discount);
    return roundMoney(base * (taxRate / 100));
  }

  function updateTotals() {
    const rows = document.querySelectorAll('#lineItemsBody .line-item-row');
    let subtotal = 0;
    let taxTotal = 0;

    rows.forEach((row) => {
      const qty = Number(row.querySelector('.line-qty')?.value) || 0;
      const rate = Number(row.querySelector('.line-rate')?.value) || 0;
      const discount = Number(row.querySelector('.line-discount')?.value) || 0;
      subtotal += Math.max(0, qty * rate - discount);
      taxTotal += calculateLineTax(row);
      const totalCell = row.querySelector('.line-total-display');
      if (totalCell) {
        totalCell.textContent = formatCurrency(calculateLineTotal(row));
      }
    });

    const headerDiscount = Number(document.getElementById('discountAmount')?.value) || 0;
    const total = subtotal - headerDiscount + taxTotal;

    const subtotalEl = document.getElementById('quoteSubtotal');
    const taxEl = document.getElementById('quoteTax');
    const headerDiscountEl = document.getElementById('quoteHeaderDiscount');
    const totalEl = document.getElementById('quoteTotal');

    if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
    if (taxEl) taxEl.textContent = formatCurrency(taxTotal);
    if (headerDiscountEl) headerDiscountEl.textContent = formatCurrency(headerDiscount);
    if (totalEl) totalEl.textContent = formatCurrency(Math.max(0, total));
  }

  let unitsCache = [];
  let lineIndex = document.querySelectorAll('#lineItemsBody .line-item-row').length;

  function populateUnitSelect(select, selectedId) {
    const current = selectedId || select.value;
    select.innerHTML = '<option value="">— Manual —</option>';
    unitsCache.forEach((unit) => {
      const option = document.createElement('option');
      option.value = unit.id;
      option.textContent = unit.label;
      option.dataset.description = unit.description;
      option.dataset.basePrice = unit.basePrice || '';
      if (String(unit.id) === String(current)) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  }

  async function loadUnitsForProject(projectId) {
    if (!projectId) {
      unitsCache = [];
      document.querySelectorAll('.line-unit-select').forEach((select) => populateUnitSelect(select));
      return;
    }

    const response = await fetch(`/company/accounts/quotations/api/projects/${projectId}/units`);
    const data = await response.json();
    if (!response.ok) {
      unitsCache = [];
      return;
    }
    unitsCache = data.units || [];
    document.querySelectorAll('.line-unit-select').forEach((select) => populateUnitSelect(select, select.value));
  }

  function bindRowEvents(row) {
    row.querySelectorAll('input').forEach((input) => {
      input.addEventListener('input', updateTotals);
    });

    const unitSelect = row.querySelector('.line-unit-select');
    if (unitSelect) {
      unitSelect.addEventListener('change', () => {
        const option = unitSelect.selectedOptions[0];
        if (!option || !option.value) {
          return;
        }
        const descriptionInput = row.querySelector('.line-description');
        const rateInput = row.querySelector('.line-rate');
        if (descriptionInput && option.dataset.description) {
          descriptionInput.value = option.dataset.description;
        }
        if (rateInput && option.dataset.basePrice) {
          rateInput.value = option.dataset.basePrice;
        }
        updateTotals();
      });
    }

    const removeBtn = row.querySelector('.remove-line-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        const rows = document.querySelectorAll('#lineItemsBody .line-item-row');
        if (rows.length <= 1) {
          return;
        }
        row.remove();
        reindexRows();
        updateTotals();
      });
    }
  }

  function reindexRows() {
    document.querySelectorAll('#lineItemsBody .line-item-row').forEach((row, index) => {
      row.dataset.index = index;
      row.querySelectorAll('[name^="lineItems["]').forEach((input) => {
        input.name = input.name.replace(/lineItems\[\d+\]/, `lineItems[${index}]`);
      });
    });
    lineIndex = document.querySelectorAll('#lineItemsBody .line-item-row').length;
  }

  function addLineRow(values) {
    const tbody = document.getElementById('lineItemsBody');
    if (!tbody) {
      return;
    }

    const index = lineIndex;
    lineIndex += 1;

    const tr = document.createElement('tr');
    tr.className = 'line-item-row';
    tr.dataset.index = index;
    tr.innerHTML = `
      <td>
        <select class="form-select form-select-sm line-unit-select" name="lineItems[${index}][projectUnitId]">
          <option value="">— Manual —</option>
        </select>
      </td>
      <td><input type="text" class="form-control form-control-sm line-description" name="lineItems[${index}][description]" value="${values?.description || ''}" required></td>
      <td><input type="number" step="0.01" min="0" class="form-control form-control-sm line-qty" name="lineItems[${index}][quantity]" value="${values?.quantity || '1'}"></td>
      <td><input type="number" step="0.01" min="0" class="form-control form-control-sm line-rate" name="lineItems[${index}][unitPrice]" value="${values?.unitPrice || ''}" required></td>
      <td><input type="number" step="0.01" min="0" class="form-control form-control-sm line-discount" name="lineItems[${index}][discountAmount]" value="${values?.discountAmount || '0'}"></td>
      <td><input type="number" step="0.01" min="0" class="form-control form-control-sm line-tax-rate" name="lineItems[${index}][taxRate]" value="${values?.taxRate || ''}"></td>
      <td class="line-total-display text-end fw-medium">₹0.00</td>
      <td><button type="button" class="btn btn-soft-danger btn-sm remove-line-btn" title="Remove line"><i class="ri-delete-bin-line"></i></button></td>
    `;

    tbody.appendChild(tr);
    populateUnitSelect(tr.querySelector('.line-unit-select'), values?.projectUnitId || '');
    bindRowEvents(tr);
    updateTotals();
  }

  function applyLeadSelection() {
    const leadSelect = document.getElementById('leadId');
    if (!leadSelect) {
      return;
    }

    leadSelect.addEventListener('change', () => {
      const option = leadSelect.selectedOptions[0];
      if (!option || !option.value) {
        return;
      }

      const nameInput = document.getElementById('customerName');
      const emailInput = document.getElementById('customerEmail');
      const phoneInput = document.getElementById('customerPhone');
      const assigneeSelect = document.getElementById('assigneeId');

      if (nameInput) nameInput.value = option.dataset.customerName || '';
      if (emailInput) emailInput.value = option.dataset.customerEmail || '';
      if (phoneInput) phoneInput.value = option.dataset.customerPhone || '';
      if (assigneeSelect && option.dataset.assigneeId) {
        assigneeSelect.value = option.dataset.assigneeId;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#lineItemsBody .line-item-row').forEach(bindRowEvents);

    const projectSelect = document.getElementById('projectId');
    if (projectSelect) {
      projectSelect.addEventListener('change', () => {
        loadUnitsForProject(projectSelect.value);
      });
      if (projectSelect.value) {
        loadUnitsForProject(projectSelect.value).then(() => {
          const initialDataEl = document.getElementById('initialLineItemsData');
          if (!initialDataEl) {
            return;
          }
          try {
            const initialLines = JSON.parse(initialDataEl.textContent || '[]');
            document.querySelectorAll('#lineItemsBody .line-item-row').forEach((row, index) => {
              const line = initialLines[index];
              if (line?.projectUnitId) {
                populateUnitSelect(row.querySelector('.line-unit-select'), line.projectUnitId);
              }
            });
          } catch {
            // ignore parse errors
          }
        });
      }
    }

    const addBtn = document.getElementById('addLineItemBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => addLineRow({}));
    }

    const discountInput = document.getElementById('discountAmount');
    if (discountInput) {
      discountInput.addEventListener('input', updateTotals);
    }

    applyLeadSelection();
    updateTotals();
  });
})();
