const { Op } = require('sequelize');
const {
  Receipt,
  Invoice,
  sequelize,
} = require('../models');
const { roundMoney } = require('../utils/quotationCalculations');
const {
  computeAmountDue,
  resolveInvoiceStatus,
  canRecordReceiptOnInvoice,
  todayDateOnly,
  applyOverdueStatus,
} = require('../utils/invoiceBalance');
const { canDeleteReceiptOnInvoice } = require('../constants/invoices');
const {
  syncInventoryUnitsForInvoiceStatusChange,
} = require('./invoiceUnitStatusService');
const { isValidPaymentMethod } = require('../constants/receipts');
const { recordLeadHistoryEvent } = require('./leadHistoryService');
const { LEAD_HISTORY_ACTIONS, LEAD_HISTORY_ENTITY_TYPES } = require('../constants/leadHistory');
const { formatIndianCurrency } = require('../utils/quotationCalculations');

async function findCompanyInvoiceForReceipt(companyId, invoiceId, transaction = null) {
  const invoice = await Invoice.findOne({
    where: { id: invoiceId, companyId },
    transaction,
  });
  if (!invoice) {
    throw new Error('Invoice not found.');
  }
  return invoice;
}

async function sumReceiptsForInvoice(invoiceId, transaction = null, excludeReceiptId = null) {
  const where = { invoiceId };
  if (excludeReceiptId) {
    where.id = { [Op.ne]: excludeReceiptId };
  }

  const total = await Receipt.sum('amount', { where, transaction });
  return roundMoney(total || 0);
}

async function recalculateInvoiceBalance(invoice, transaction = null) {
  const previousStatus = invoice.status;
  const amountPaid = await sumReceiptsForInvoice(invoice.id, transaction);
  const amountDue = computeAmountDue(invoice.totalAmount, amountPaid);
  const status = resolveInvoiceStatus(invoice, amountPaid);

  await invoice.update({
    amountPaid,
    amountDue,
    status,
  }, { transaction });

  invoice.amountPaid = amountPaid;
  invoice.amountDue = amountDue;
  invoice.status = status;

  await syncInventoryUnitsForInvoiceStatusChange(invoice, previousStatus, transaction);

  return invoice;
}

function normalizeReceiptInput(body) {
  return {
    amount: body?.amount,
    paymentDate: body?.paymentDate || todayDateOnly(),
    paymentMethod: body?.paymentMethod || 'bank_transfer',
    reference: String(body?.reference || '').trim() || null,
    notes: String(body?.notes || '').trim() || null,
  };
}

function validateReceiptInput(input, { existingTotal = 0, invoiceTotal = 0 } = {}) {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Enter a valid payment amount greater than zero.');
  }

  if (!input.paymentDate) {
    throw new Error('Payment date is required.');
  }

  if (!isValidPaymentMethod(input.paymentMethod)) {
    throw new Error('Select a valid payment method.');
  }

  const nextTotal = roundMoney(existingTotal + amount);
  if (nextTotal > roundMoney(invoiceTotal)) {
    throw new Error(`Payment exceeds invoice balance. Maximum allowed: ${formatIndianCurrency(invoiceTotal - existingTotal)}.`);
  }

  return {
    amount: roundMoney(amount),
    paymentDate: input.paymentDate,
    paymentMethod: input.paymentMethod,
    reference: input.reference,
    notes: input.notes,
  };
}

async function createReceipt(companyId, invoiceId, createdById, body) {
  const input = normalizeReceiptInput(body);

  let createdReceiptId;

  await sequelize.transaction(async (transaction) => {
    const invoice = await findCompanyInvoiceForReceipt(companyId, invoiceId, transaction);
    await applyOverdueStatus(invoice, transaction);

    if (!canRecordReceiptOnInvoice(invoice)) {
      throw new Error('Payments cannot be recorded on this invoice.');
    }

    const existingTotal = await sumReceiptsForInvoice(invoice.id, transaction);
    const validated = validateReceiptInput(input, {
      existingTotal,
      invoiceTotal: invoice.totalAmount,
    });

    const receipt = await Receipt.create({
      companyId,
      invoiceId: invoice.id,
      leadId: invoice.leadId,
      projectId: invoice.projectId,
      amount: validated.amount,
      paymentDate: validated.paymentDate,
      paymentMethod: validated.paymentMethod,
      reference: validated.reference,
      notes: validated.notes,
      createdById,
    }, { transaction });

    await recalculateInvoiceBalance(invoice, transaction);

    if (invoice.leadId) {
      await recordLeadHistoryEvent({
        leadId: invoice.leadId,
        companyId,
        userId: createdById,
        action: LEAD_HISTORY_ACTIONS.CREATED,
        entityType: LEAD_HISTORY_ENTITY_TYPES.RECEIPT,
        entityId: receipt.id,
        summary: `Receipt ${formatIndianCurrency(validated.amount)} recorded against invoice ${invoice.invoiceNumber}`,
      }, transaction);
    }

    createdReceiptId = receipt.id;
  });

  return Receipt.findByPk(createdReceiptId, {
    include: [{ association: 'createdBy', attributes: ['id', 'adminName'] }],
  });
}

async function deleteReceipt(companyId, receiptId, userId) {
  await sequelize.transaction(async (transaction) => {
    const receipt = await Receipt.findOne({
      where: { id: receiptId, companyId },
      include: [{ model: Invoice, as: 'invoice' }],
      transaction,
    });

    if (!receipt) {
      throw new Error('Receipt not found.');
    }

    const invoice = receipt.invoice;
    if (!canDeleteReceiptOnInvoice(invoice)) {
      throw new Error('Payments cannot be deleted on this invoice.');
    }

    const summary = `Receipt ${formatIndianCurrency(receipt.amount)} removed from invoice ${invoice.invoiceNumber}`;

    await receipt.destroy({ transaction });
    await recalculateInvoiceBalance(invoice, transaction);

    if (invoice.leadId) {
      await recordLeadHistoryEvent({
        leadId: invoice.leadId,
        companyId,
        userId: userId || null,
        action: LEAD_HISTORY_ACTIONS.DELETED,
        entityType: LEAD_HISTORY_ENTITY_TYPES.RECEIPT,
        entityId: receiptId,
        summary,
      }, transaction);
    }
  });
}

module.exports = {
  createReceipt,
  deleteReceipt,
  recalculateInvoiceBalance,
  sumReceiptsForInvoice,
};
