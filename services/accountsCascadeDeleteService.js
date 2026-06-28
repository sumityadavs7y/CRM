const { Op } = require('sequelize');
const {
  Quotation,
  QuotationLineItem,
  Invoice,
  InvoiceLineItem,
  Receipt,
  ProjectUnit,
} = require('../models');
const { recordLeadHistoryEvent } = require('./leadHistoryService');
const { LEAD_HISTORY_ACTIONS, LEAD_HISTORY_ENTITY_TYPES } = require('../constants/leadHistory');

const RELEASABLE_UNIT_STATUSES = new Set(['hold', 'sold', 'booked']);

function collectProjectUnitIds(lines) {
  return [...new Set((lines || []).map((line) => line.projectUnitId).filter(Boolean))];
}

async function markUnitsAvailableFromProjectUnitIds(unitIds, transaction = null) {
  const ids = [...new Set((unitIds || []).filter(Boolean))];
  if (!ids.length) {
    return 0;
  }

  const units = await ProjectUnit.findAll({
    where: { id: { [Op.in]: ids } },
    transaction,
  });

  let updated = 0;
  for (const unit of units) {
    if (RELEASABLE_UNIT_STATUSES.has(unit.status)) {
      await unit.update({ status: 'available' }, { transaction });
      updated += 1;
    }
  }

  return updated;
}

async function resolveLinkedInvoiceForQuotation(companyId, quotation, transaction = null) {
  if (quotation.convertedInvoiceId) {
    const byConverted = await Invoice.findOne({
      where: { companyId, id: quotation.convertedInvoiceId },
      transaction,
    });
    if (byConverted) {
      return byConverted;
    }
  }

  return Invoice.findOne({
    where: { companyId, quotationId: quotation.id },
    transaction,
  });
}

async function countReceiptsForInvoice(companyId, invoiceId, transaction = null) {
  return Receipt.count({
    where: { companyId, invoiceId },
    transaction,
  });
}

async function destroyInvoiceAndReceipts(invoice, companyId, userId, transaction) {
  const receiptCount = await countReceiptsForInvoice(companyId, invoice.id, transaction);

  await Receipt.destroy({
    where: { companyId, invoiceId: invoice.id },
    transaction,
  });

  const invoiceLines = await InvoiceLineItem.findAll({
    where: { invoiceId: invoice.id },
    transaction,
  });
  const unitIds = collectProjectUnitIds(invoiceLines);

  if (invoice.leadId) {
    await recordLeadHistoryEvent({
      leadId: invoice.leadId,
      companyId,
      userId: userId || null,
      action: LEAD_HISTORY_ACTIONS.DELETED,
      entityType: LEAD_HISTORY_ENTITY_TYPES.INVOICE,
      entityId: invoice.id,
      summary: `Invoice ${invoice.invoiceNumber} deleted`,
    }, transaction);
  }

  await invoice.destroy({ transaction });

  return { receiptCount, unitIds };
}

async function cascadeDeleteQuotation(companyId, quotation, userId, transaction) {
  const linkedInvoice = await resolveLinkedInvoiceForQuotation(companyId, quotation, transaction);
  let invoiceReceiptCount = 0;
  let unitIds = collectProjectUnitIds(quotation.lineItems);

  if (linkedInvoice) {
    const invoiceResult = await destroyInvoiceAndReceipts(linkedInvoice, companyId, userId, transaction);
    invoiceReceiptCount = invoiceResult.receiptCount;
    unitIds = [...new Set([...unitIds, ...invoiceResult.unitIds])];
  } else if (!quotation.lineItems) {
    const lines = await QuotationLineItem.findAll({
      where: { quotationId: quotation.id },
      transaction,
    });
    unitIds = collectProjectUnitIds(lines);
  }

  await markUnitsAvailableFromProjectUnitIds(unitIds, transaction);

  const quotationNumber = quotation.quotationNumber;
  const leadId = quotation.leadId;

  if (leadId) {
    await recordLeadHistoryEvent({
      leadId,
      companyId,
      userId: userId || null,
      action: LEAD_HISTORY_ACTIONS.DELETED,
      entityType: LEAD_HISTORY_ENTITY_TYPES.QUOTATION,
      entityId: quotation.id,
      summary: `Quotation ${quotationNumber} deleted`,
    }, transaction);
  }

  await quotation.destroy({ transaction });

  return {
    linkedInvoice,
    invoiceReceiptCount,
  };
}

async function cascadeDeleteInvoice(companyId, invoice, userId, transaction) {
  const receiptCount = await countReceiptsForInvoice(companyId, invoice.id, transaction);

  let quotation = null;
  if (invoice.quotationId) {
    quotation = await Quotation.findOne({
      where: { companyId, id: invoice.quotationId },
      include: [{
        model: QuotationLineItem,
        as: 'lineItems',
      }],
      transaction,
    });
  }

  const invoiceLines = invoice.lineItems || await InvoiceLineItem.findAll({
    where: { invoiceId: invoice.id },
    transaction,
  });

  let unitIds = collectProjectUnitIds(invoiceLines);
  if (quotation) {
    unitIds = [...new Set([...unitIds, ...collectProjectUnitIds(quotation.lineItems)])];
  }

  await Receipt.destroy({
    where: { companyId, invoiceId: invoice.id },
    transaction,
  });

  if (invoice.leadId) {
    await recordLeadHistoryEvent({
      leadId: invoice.leadId,
      companyId,
      userId: userId || null,
      action: LEAD_HISTORY_ACTIONS.DELETED,
      entityType: LEAD_HISTORY_ENTITY_TYPES.INVOICE,
      entityId: invoice.id,
      summary: `Invoice ${invoice.invoiceNumber} deleted`,
    }, transaction);
  }

  await invoice.destroy({ transaction });

  if (quotation) {
    if (quotation.leadId) {
      await recordLeadHistoryEvent({
        leadId: quotation.leadId,
        companyId,
        userId: userId || null,
        action: LEAD_HISTORY_ACTIONS.DELETED,
        entityType: LEAD_HISTORY_ENTITY_TYPES.QUOTATION,
        entityId: quotation.id,
        summary: `Quotation ${quotation.quotationNumber} deleted (with invoice)`,
      }, transaction);
    }

    await quotation.destroy({ transaction });
  }

  await markUnitsAvailableFromProjectUnitIds(unitIds, transaction);

  return {
    quotation,
    receiptCount,
  };
}

async function getQuotationDeleteMeta(companyId, quotation) {
  const json = quotation.toJSON ? quotation.toJSON() : quotation;
  const linkedInvoice = await resolveLinkedInvoiceForQuotation(companyId, quotation);
  const receiptCount = linkedInvoice
    ? await countReceiptsForInvoice(companyId, linkedInvoice.id)
    : 0;
  const hasLinkedUnits = (json.lineItems || []).some((line) => line.projectUnitId);

  let confirmMessage = `Permanently delete quotation ${json.quotationNumber}? This cannot be undone.`;

  if (linkedInvoice) {
    confirmMessage += `\n\nThe linked invoice ${linkedInvoice.invoiceNumber} will also be deleted.`;
    if (receiptCount > 0) {
      confirmMessage += `\n${receiptCount} payment(s) on that invoice will be deleted.`;
    }
  }

  if (hasLinkedUnits) {
    confirmMessage += '\n\nLinked inventory units will be marked as available.';
  }

  return {
    canDelete: true,
    blockReason: null,
    confirmMessage,
    linkedInvoice,
    receiptCount,
    hasLinkedUnits,
  };
}

async function getInvoiceDeleteMeta(companyId, invoice) {
  const json = invoice.toJSON ? invoice.toJSON() : invoice;
  const quotation = json.quotationId
    ? await Quotation.findOne({
      where: { companyId, id: json.quotationId },
      attributes: ['id', 'quotationNumber'],
    })
    : null;
  const receiptCount = await countReceiptsForInvoice(companyId, json.id);
  const hasLinkedUnits = (json.lineItems || []).some((line) => line.projectUnitId);

  let confirmMessage = `Permanently delete invoice ${json.invoiceNumber}? This cannot be undone.`;

  if (receiptCount > 0) {
    confirmMessage += `\n\n${receiptCount} payment(s) will be deleted.`;
  }

  if (quotation) {
    confirmMessage += `\n\nThe linked quotation ${quotation.quotationNumber} will also be deleted.`;
  }

  if (hasLinkedUnits) {
    confirmMessage += '\n\nLinked inventory units will be marked as available.';
  }

  return {
    canDelete: true,
    blockReason: null,
    confirmMessage,
    quotation,
    receiptCount,
    hasLinkedUnits,
  };
}

module.exports = {
  collectProjectUnitIds,
  markUnitsAvailableFromProjectUnitIds,
  resolveLinkedInvoiceForQuotation,
  countReceiptsForInvoice,
  cascadeDeleteQuotation,
  cascadeDeleteInvoice,
  getQuotationDeleteMeta,
  getInvoiceDeleteMeta,
};
