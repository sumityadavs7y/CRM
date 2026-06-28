const { Op } = require('sequelize');
const {
  Invoice,
  InvoiceLineItem,
  ProjectUnit,
} = require('../models');

const HOLDABLE_UNIT_STATUSES = new Set(['available']);
const SELLABLE_UNIT_STATUSES = new Set(['available', 'hold', 'booked']);

async function getInvoiceUnitIds(invoiceId, transaction = null) {
  const lines = await InvoiceLineItem.findAll({
    attributes: ['projectUnitId'],
    where: {
      invoiceId,
      projectUnitId: { [Op.ne]: null },
    },
    transaction,
  });

  return [...new Set(lines.map((line) => line.projectUnitId))];
}

async function unitHasOtherPaidInvoice(companyId, unitId, excludeInvoiceId, transaction = null) {
  const count = await InvoiceLineItem.count({
    where: { projectUnitId: unitId },
    include: [{
      model: Invoice,
      as: 'invoice',
      where: {
        companyId,
        status: 'paid',
        id: { [Op.ne]: excludeInvoiceId },
      },
      required: true,
    }],
    transaction,
  });

  return count > 0;
}

async function holdUnitsForInvoice(invoice, transaction = null) {
  const unitIds = await getInvoiceUnitIds(invoice.id, transaction);
  if (!unitIds.length) {
    return;
  }

  const units = await ProjectUnit.findAll({
    where: { id: { [Op.in]: unitIds } },
    transaction,
  });

  for (const unit of units) {
    if (HOLDABLE_UNIT_STATUSES.has(unit.status)) {
      await unit.update({ status: 'hold' }, { transaction });
    }
  }
}

async function markInvoiceUnitsSold(invoice, transaction = null) {
  const unitIds = await getInvoiceUnitIds(invoice.id, transaction);
  if (!unitIds.length) {
    return;
  }

  const units = await ProjectUnit.findAll({
    where: { id: { [Op.in]: unitIds } },
    transaction,
  });

  for (const unit of units) {
    if (SELLABLE_UNIT_STATUSES.has(unit.status)) {
      await unit.update({ status: 'sold' }, { transaction });
    }
  }
}

async function revertInvoiceUnitsFromSold(invoice, transaction = null) {
  const unitIds = await getInvoiceUnitIds(invoice.id, transaction);
  if (!unitIds.length) {
    return;
  }

  const units = await ProjectUnit.findAll({
    where: { id: { [Op.in]: unitIds } },
    transaction,
  });

  for (const unit of units) {
    if (unit.status !== 'sold') {
      continue;
    }

    const hasOtherPaid = await unitHasOtherPaidInvoice(
      invoice.companyId,
      unit.id,
      invoice.id,
      transaction
    );

    if (!hasOtherPaid) {
      await unit.update({ status: 'hold' }, { transaction });
    }
  }
}

async function syncInventoryUnitsForInvoiceStatusChange(invoice, previousStatus, transaction = null) {
  if (invoice.status === 'paid' && previousStatus !== 'paid') {
    await markInvoiceUnitsSold(invoice, transaction);
    return;
  }

  if (previousStatus === 'paid' && invoice.status !== 'paid') {
    await revertInvoiceUnitsFromSold(invoice, transaction);
  }
}

module.exports = {
  holdUnitsForInvoice,
  markInvoiceUnitsSold,
  revertInvoiceUnitsFromSold,
  syncInventoryUnitsForInvoiceStatusChange,
};
