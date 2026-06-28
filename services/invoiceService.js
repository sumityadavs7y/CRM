const {
  Invoice,
  InvoiceLineItem,
  Quotation,
  QuotationLineItem,
  Receipt,
  Project,
  sequelize,
} = require('../models');
const { INVOICE_NUMBER_PREFIX } = require('../constants/invoices');
const { getNextDocumentNumber } = require('../utils/documentNumbering');
const { buildPaginationMeta } = require('../utils/pagination');
const { computeAmountDue, applyOverdueStatus } = require('../utils/invoiceBalance');
const { holdUnitsForInvoice } = require('./invoiceUnitStatusService');
const {
  cascadeDeleteInvoice,
  getInvoiceDeleteMeta,
} = require('./accountsCascadeDeleteService');
const { recordLeadHistoryEvent } = require('./leadHistoryService');
const { LEAD_HISTORY_ACTIONS, LEAD_HISTORY_ENTITY_TYPES } = require('../constants/leadHistory');

const INVOICE_INCLUDES = [
  { model: Quotation, as: 'quotation', attributes: ['id', 'quotationNumber'] },
  { model: Project, as: 'project', attributes: ['id', 'name'] },
  {
    model: InvoiceLineItem,
    as: 'lineItems',
    separate: true,
    order: [['sortOrder', 'ASC'], ['id', 'ASC']],
  },
  {
    model: Receipt,
    as: 'receipts',
    separate: true,
    order: [['paymentDate', 'DESC'], ['id', 'DESC']],
    include: [{ association: 'createdBy', attributes: ['id', 'adminName'] }],
  },
];

async function hydrateInvoiceBalance(invoice) {
  if (!invoice) {
    return invoice;
  }
  return applyOverdueStatus(invoice);
}

async function findCompanyInvoice(companyId, invoiceId) {
  const invoice = await Invoice.findOne({
    where: { id: invoiceId, companyId },
    include: INVOICE_INCLUDES,
  });
  if (!invoice) {
    throw new Error('Invoice not found.');
  }
  return hydrateInvoiceBalance(invoice);
}

async function listCompanyInvoicesPaginated(companyId, options = {}) {
  const {
    page = 1,
    pageSize = 25,
    sort = 'issueDate',
    dir = 'desc',
  } = options;

  const orderDir = dir === 'asc' ? 'ASC' : 'DESC';
  const { count, rows } = await Invoice.findAndCountAll({
    where: { companyId },
    include: [{
      model: Quotation,
      as: 'quotation',
      attributes: ['id', 'quotationNumber'],
    }],
    order: [[sort, orderDir]],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    distinct: true,
  });

  return {
    invoices: await Promise.all(rows.map((invoice) => hydrateInvoiceBalance(invoice))),
    pagination: buildPaginationMeta({ page, pageSize, total: count }),
  };
}

async function createInvoiceFromQuotation(companyId, quotationId, createdById) {
  const quotation = await Quotation.findOne({
    where: { id: quotationId, companyId },
    include: [{
      model: QuotationLineItem,
      as: 'lineItems',
      order: [['sortOrder', 'ASC'], ['id', 'ASC']],
    }],
  });

  if (!quotation) {
    throw new Error('Quotation not found.');
  }
  if (quotation.status !== 'accepted') {
    throw new Error('Only accepted quotations can be converted to invoices.');
  }
  if (quotation.convertedInvoiceId) {
    throw new Error('This quotation has already been converted to an invoice.');
  }

  const invoiceNumber = await getNextDocumentNumber(companyId, INVOICE_NUMBER_PREFIX, Invoice, 'invoiceNumber');
  const issueDate = new Date().toISOString().slice(0, 10);

  let createdInvoiceId;

  await sequelize.transaction(async (transaction) => {
    const invoice = await Invoice.create({
      companyId,
      invoiceNumber,
      status: 'sent',
      issueDate,
      dueDate: quotation.validUntil || null,
      quotationId: quotation.id,
      leadId: quotation.leadId,
      projectId: quotation.projectId,
      customerName: quotation.customerName,
      customerEmail: quotation.customerEmail,
      customerPhone: quotation.customerPhone,
      customerAddress: quotation.customerAddress,
      assigneeId: quotation.assigneeId,
      createdById,
      subtotal: quotation.subtotal,
      discountAmount: quotation.discountAmount,
      taxAmount: quotation.taxAmount,
      totalAmount: quotation.totalAmount,
      amountPaid: 0,
      amountDue: computeAmountDue(quotation.totalAmount, 0),
      notes: quotation.notes,
      termsAndConditions: quotation.termsAndConditions,
    }, { transaction });

    const lineItems = quotation.lineItems || [];
    if (lineItems.length > 0) {
      await InvoiceLineItem.bulkCreate(
        lineItems.map((line) => ({
          invoiceId: invoice.id,
          sortOrder: line.sortOrder,
          description: line.description,
          projectUnitId: line.projectUnitId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountAmount: line.discountAmount,
          taxRate: line.taxRate,
          taxAmount: line.taxAmount,
          lineTotal: line.lineTotal,
          unitSnapshot: line.unitSnapshot,
        })),
        { transaction }
      );
    }

    await quotation.update({ convertedInvoiceId: invoice.id }, { transaction });

    await holdUnitsForInvoice(invoice, transaction);

    if (quotation.leadId) {
      await recordLeadHistoryEvent({
        leadId: quotation.leadId,
        companyId,
        userId: createdById,
        action: LEAD_HISTORY_ACTIONS.CREATED,
        entityType: LEAD_HISTORY_ENTITY_TYPES.INVOICE,
        entityId: invoice.id,
        summary: `Invoice ${invoiceNumber} created from quotation ${quotation.quotationNumber}`,
      }, transaction);
    }

    createdInvoiceId = invoice.id;
  });

  return findCompanyInvoice(companyId, createdInvoiceId);
}

async function deleteInvoice(companyId, invoiceId, userId) {
  const invoice = await findCompanyInvoice(companyId, invoiceId);

  await sequelize.transaction(async (transaction) => {
    await cascadeDeleteInvoice(companyId, invoice, userId, transaction);
  });
}

module.exports = {
  findCompanyInvoice,
  listCompanyInvoicesPaginated,
  createInvoiceFromQuotation,
  deleteInvoice,
  getInvoiceDeleteMeta,
};
