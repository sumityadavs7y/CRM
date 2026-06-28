const { Op } = require('sequelize');
const {
  Quotation,
  QuotationLineItem,
  Invoice,
  InvoiceLineItem,
  Receipt,
  ProjectUnit,
  ProjectFloor,
  ProjectBlock,
} = require('../models');
const { assertCompanyProject } = require('./projectService');
const { recordLeadHistoryEvent } = require('./leadHistoryService');
const { LEAD_HISTORY_ACTIONS, LEAD_HISTORY_ENTITY_TYPES } = require('../constants/leadHistory');

async function assertCompanyUnit(companyId, projectId, unitId) {
  await assertCompanyProject(companyId, projectId);
  const unit = await ProjectUnit.findOne({
    where: { id: unitId },
    include: [{
      model: ProjectFloor,
      as: 'floor',
      required: true,
      include: [{
        model: ProjectBlock,
        as: 'block',
        where: { projectId },
        required: true,
      }],
    }],
  });
  if (!unit) {
    throw new Error('Unit not found.');
  }
  return unit;
}

async function findRelatedQuotationIds(companyId, unitId, transaction = null) {
  const rows = await QuotationLineItem.findAll({
    attributes: ['quotationId'],
    where: { projectUnitId: unitId },
    include: [{
      model: Quotation,
      as: 'quotation',
      attributes: [],
      where: { companyId },
      required: true,
    }],
    transaction,
    raw: true,
  });

  return [...new Set(rows.map((row) => row.quotationId))];
}

async function findRelatedInvoiceIds(companyId, unitId, transaction = null) {
  const rows = await InvoiceLineItem.findAll({
    attributes: ['invoiceId'],
    where: { projectUnitId: unitId },
    include: [{
      model: Invoice,
      as: 'invoice',
      attributes: [],
      where: { companyId },
      required: true,
    }],
    transaction,
    raw: true,
  });

  return [...new Set(rows.map((row) => row.invoiceId))];
}

async function getUnitAccountsImpact(companyId, projectId, unitId) {
  const unit = await assertCompanyUnit(companyId, projectId, unitId);
  const quotationIds = await findRelatedQuotationIds(companyId, unitId);
  const invoiceIds = await findRelatedInvoiceIds(companyId, unitId);

  let receiptCount = 0;
  if (invoiceIds.length) {
    receiptCount = await Receipt.count({
      where: {
        companyId,
        invoiceId: { [Op.in]: invoiceIds },
      },
    });
  }

  return {
    unitId: unit.id,
    unitNumber: unit.unitNumber,
    quotations: quotationIds.length,
    invoices: invoiceIds.length,
    receipts: receiptCount,
    hasRelated: quotationIds.length > 0 || invoiceIds.length > 0 || receiptCount > 0,
  };
}

async function releaseUnitHoldIfUnused(unitId, transaction) {
  const unit = await ProjectUnit.findByPk(unitId, { transaction });
  if (!unit || unit.status !== 'hold') {
    return;
  }

  const stillLinked = await QuotationLineItem.findOne({
    where: { projectUnitId: unitId },
    include: [{
      model: Quotation,
      as: 'quotation',
      where: {
        status: 'accepted',
        holdUnitsOnAccept: true,
      },
      required: true,
    }],
    transaction,
  });

  if (!stillLinked) {
    await unit.update({ status: 'available' }, { transaction });
  }
}

async function unlinkUnitFromAccounts(companyId, unitId, transaction) {
  await QuotationLineItem.update(
    { projectUnitId: null },
    { where: { projectUnitId: unitId }, transaction }
  );

  await InvoiceLineItem.update(
    { projectUnitId: null },
    { where: { projectUnitId: unitId }, transaction }
  );

  await releaseUnitHoldIfUnused(unitId, transaction);
}

async function deleteUnitRelatedAccounts(companyId, unitId, userId, transaction) {
  const quotationIds = await findRelatedQuotationIds(companyId, unitId, transaction);
  const invoiceIds = await findRelatedInvoiceIds(companyId, unitId, transaction);

  if (invoiceIds.length) {
    await Receipt.destroy({
      where: {
        companyId,
        invoiceId: { [Op.in]: invoiceIds },
      },
      transaction,
    });
  }

  if (invoiceIds.length) {
    const invoices = await Invoice.findAll({
      where: { companyId, id: { [Op.in]: invoiceIds } },
      transaction,
    });

    for (const invoice of invoices) {
      if (invoice.leadId) {
        await recordLeadHistoryEvent({
          leadId: invoice.leadId,
          companyId,
          userId: userId || null,
          action: LEAD_HISTORY_ACTIONS.DELETED,
          entityType: LEAD_HISTORY_ENTITY_TYPES.INVOICE,
          entityId: invoice.id,
          summary: `Invoice ${invoice.invoiceNumber} deleted (inventory unit removed)`,
        }, transaction);
      }

      await invoice.destroy({ transaction });
    }
  }

  if (quotationIds.length) {
    const quotations = await Quotation.findAll({
      where: { companyId, id: { [Op.in]: quotationIds } },
      transaction,
    });

    for (const quotation of quotations) {
      if (quotation.leadId) {
        await recordLeadHistoryEvent({
          leadId: quotation.leadId,
          companyId,
          userId: userId || null,
          action: LEAD_HISTORY_ACTIONS.DELETED,
          entityType: LEAD_HISTORY_ENTITY_TYPES.QUOTATION,
          entityId: quotation.id,
          summary: `Quotation ${quotation.quotationNumber} deleted (inventory unit removed)`,
        }, transaction);
      }

      await quotation.destroy({ transaction });
    }
  }
}

module.exports = {
  getUnitAccountsImpact,
  unlinkUnitFromAccounts,
  deleteUnitRelatedAccounts,
  releaseUnitHoldIfUnused,
};
