const express = require('express');
const { isCompanyAuthenticated } = require('../middleware/auth');
const { requirePermission } = require('../middleware/companyFeatures');
const { withTheme } = require('../utils/themes');
const { buildUserContext } = require('../utils/sessionUser');
const { parsePaginationQuery, buildQueryString } = require('../utils/pagination');
const { formatIndianCurrency } = require('../utils/quotationCalculations');
const {
  DEFAULT_INVOICE_LIST_SORT,
  DEFAULT_INVOICE_LIST_DIR,
  INVOICE_LIST_PAGE_SIZES,
  DEFAULT_INVOICE_LIST_PAGE_SIZE,
  INVOICE_LIST_SORT_COLUMNS,
  formatInvoiceStatus,
  getInvoiceStatusBadgeClass,
  canRecordReceiptOnInvoice,
  canDeleteReceiptOnInvoice,
} = require('../constants/invoices');
const { PAYMENT_METHODS, formatPaymentMethod } = require('../constants/receipts');
const {
  findCompanyInvoice,
  listCompanyInvoicesPaginated,
  deleteInvoice,
  getInvoiceDeleteMeta,
} = require('../services/invoiceService');
const { createReceipt, deleteReceipt } = require('../services/receiptService');
const { buildProjectInventoryUrl, hasLinkedInventoryUnits, getLineProjectUnitId } = require('../utils/projectInventoryUrl');

const router = express.Router();

function buildListUrl(query) {
  return `/company/accounts/invoices${buildQueryString(query)}`;
}

function canManagePayments(req) {
  return buildUserContext(req).can('transactions', 'edit');
}

router.get('/', isCompanyAuthenticated, requirePermission('invoices', 'view'), async (req, res) => {
  try {
    const paginationQuery = parsePaginationQuery(req.query, {
      defaultSort: DEFAULT_INVOICE_LIST_SORT,
      defaultDir: DEFAULT_INVOICE_LIST_DIR,
      defaultPageSize: DEFAULT_INVOICE_LIST_PAGE_SIZE,
      allowedPageSizes: INVOICE_LIST_PAGE_SIZES,
      allowedSortColumns: INVOICE_LIST_SORT_COLUMNS,
    });

    const { invoices, pagination } = await listCompanyInvoicesPaginated(req.session.companyId, {
      page: paginationQuery.page,
      pageSize: paginationQuery.pageSize,
      sort: paginationQuery.sort,
      dir: paginationQuery.dir,
    });

    res.render('invoices/index', withTheme(req, {
      user: buildUserContext(req),
      activeNav: 'accounts-invoices',
      invoices,
      pagination,
      buildListUrl,
      formatInvoiceStatus,
      getInvoiceStatusBadgeClass,
      formatIndianCurrency,
      canDeleteInvoice: canManageInvoices(req),
      success: req.query.success || null,
      error: req.query.error || null,
    }));
  } catch (error) {
    console.error('Invoice list failed:', error);
    res.status(500).render('errors/500', withTheme(req, { user: buildUserContext(req) }));
  }
});

function canManageInvoices(req) {
  return buildUserContext(req).can('invoices', 'edit');
}

router.post('/:id/delete', isCompanyAuthenticated, requirePermission('invoices', 'edit'), async (req, res) => {
  const invoiceId = parseInt(req.params.id, 10);

  try {
    await deleteInvoice(req.session.companyId, invoiceId, req.session.credentialId);
    res.redirect('/company/accounts/invoices?success=' + encodeURIComponent('Invoice deleted.'));
  } catch (error) {
    res.redirect(`/company/accounts/invoices?error=${encodeURIComponent(error.message || 'Failed to delete invoice.')}`);
  }
});

router.post('/:id/receipts', isCompanyAuthenticated, requirePermission('transactions', 'edit'), async (req, res) => {
  const invoiceId = parseInt(req.params.id, 10);

  try {
    await createReceipt(
      req.session.companyId,
      invoiceId,
      req.session.credentialId,
      req.body
    );
    res.redirect(`/company/accounts/invoices/${invoiceId}?success=${encodeURIComponent('Payment recorded.')}`);
  } catch (error) {
    res.redirect(`/company/accounts/invoices/${invoiceId}?error=${encodeURIComponent(error.message || 'Failed to record payment.')}`);
  }
});

router.post('/:invoiceId/receipts/:receiptId/delete', isCompanyAuthenticated, requirePermission('transactions', 'edit'), async (req, res) => {
  const invoiceId = parseInt(req.params.invoiceId, 10);
  const receiptId = parseInt(req.params.receiptId, 10);

  try {
    await deleteReceipt(req.session.companyId, receiptId, req.session.credentialId);
    res.redirect(`/company/accounts/invoices/${invoiceId}?success=${encodeURIComponent('Payment removed.')}`);
  } catch (error) {
    res.redirect(`/company/accounts/invoices/${invoiceId}?error=${encodeURIComponent(error.message || 'Failed to remove payment.')}`);
  }
});

router.get('/:id', isCompanyAuthenticated, requirePermission('invoices', 'view'), async (req, res) => {
  try {
    const invoice = await findCompanyInvoice(req.session.companyId, parseInt(req.params.id, 10));
    const user = buildUserContext(req);
    const canManage = canManagePayments(req);
    const canRecord = canManage && canRecordReceiptOnInvoice(invoice);
    const canDelete = canManage && canDeleteReceiptOnInvoice(invoice);
    const canDeleteInvoice = canManageInvoices(req);
    const deleteMeta = await getInvoiceDeleteMeta(req.session.companyId, invoice);

    res.render('invoices/show', withTheme(req, {
      user,
      activeNav: 'accounts-invoices',
      invoice,
      formatInvoiceStatus,
      getInvoiceStatusBadgeClass,
      formatIndianCurrency,
      formatPaymentMethod,
      paymentMethods: PAYMENT_METHODS,
      canRecordPayments: canRecord,
      canDeletePayments: canDelete,
      canDeleteInvoice,
      deleteConfirmMessage: deleteMeta.confirmMessage,
      canViewProjects: user.can('project_management', 'view'),
      hasLinkedInventory: hasLinkedInventoryUnits(invoice.lineItems),
      getLineProjectUnitId,
      buildProjectInventoryUrl,
      success: req.query.success || null,
      error: req.query.error || null,
    }));
  } catch (error) {
    res.status(404).render('errors/404', withTheme(req, { user: buildUserContext(req) }));
  }
});

module.exports = router;
