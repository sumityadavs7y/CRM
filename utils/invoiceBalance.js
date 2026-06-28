const { roundMoney } = require('../utils/quotationCalculations');
const { RECEIPTABLE_INVOICE_STATUSES } = require('../constants/invoices');

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

function computeAmountDue(totalAmount, amountPaid) {
  return roundMoney(Math.max(0, Number(totalAmount) - Number(amountPaid)));
}

function resolveInvoiceStatus(invoice, amountPaid) {
  if (invoice.status === 'cancelled') {
    return 'cancelled';
  }

  const total = Number(invoice.totalAmount) || 0;
  const paid = Number(amountPaid) || 0;
  const due = computeAmountDue(total, paid);

  if (paid >= total && total > 0) {
    return 'paid';
  }

  if (invoice.dueDate && invoice.dueDate < todayDateOnly() && due > 0) {
    return 'overdue';
  }

  if (paid > 0) {
    return 'partial';
  }

  if (invoice.status === 'draft') {
    return 'draft';
  }

  return 'sent';
}

function canRecordReceiptOnInvoice(invoice) {
  return RECEIPTABLE_INVOICE_STATUSES.has(invoice.status);
}

async function applyOverdueStatus(invoice, transaction = null) {
  if (!invoice || invoice.status === 'cancelled' || invoice.status === 'paid') {
    return invoice;
  }

  const amountPaid = Number(invoice.amountPaid) || 0;
  const status = resolveInvoiceStatus(invoice, amountPaid);

  if (status !== invoice.status) {
    await invoice.update({ status }, { transaction });
    invoice.status = status;
  }

  return invoice;
}

module.exports = {
  todayDateOnly,
  computeAmountDue,
  resolveInvoiceStatus,
  canRecordReceiptOnInvoice,
  applyOverdueStatus,
};
