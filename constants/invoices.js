const INVOICE_STATUSES = ['draft', 'sent', 'partial', 'overdue', 'paid', 'cancelled'];

const INVOICE_STATUS_LABELS = {
  draft: 'Draft',
  sent: 'Sent',
  partial: 'Partially paid',
  overdue: 'Overdue',
  paid: 'Paid',
  cancelled: 'Cancelled',
};

const INVOICE_STATUS_BADGE_CLASSES = {
  draft: 'bg-secondary-subtle text-secondary',
  sent: 'bg-info-subtle text-info',
  partial: 'bg-warning-subtle text-warning',
  overdue: 'bg-danger-subtle text-danger',
  paid: 'bg-success-subtle text-success',
  cancelled: 'bg-dark-subtle text-body',
};

const RECEIPTABLE_INVOICE_STATUSES = new Set(['sent', 'partial', 'overdue']);
const RECEIPT_DELETABLE_INVOICE_STATUSES = new Set(['sent', 'partial', 'overdue', 'paid']);

const INVOICE_NUMBER_PREFIX = 'INV';

const INVOICE_LIST_PAGE_SIZES = [10, 25, 50];
const DEFAULT_INVOICE_LIST_PAGE_SIZE = 25;
const INVOICE_LIST_SORT_COLUMNS = new Set(['invoiceNumber', 'customerName', 'issueDate', 'totalAmount', 'status']);

const DEFAULT_INVOICE_LIST_SORT = 'issueDate';
const DEFAULT_INVOICE_LIST_DIR = 'desc';

function formatInvoiceStatus(status) {
  return INVOICE_STATUS_LABELS[status] || status;
}

function getInvoiceStatusBadgeClass(status) {
  return INVOICE_STATUS_BADGE_CLASSES[status] || 'bg-light text-muted';
}

function canRecordReceiptOnInvoice(invoice) {
  return RECEIPTABLE_INVOICE_STATUSES.has(invoice?.status);
}

function canDeleteReceiptOnInvoice(invoice) {
  return RECEIPT_DELETABLE_INVOICE_STATUSES.has(invoice?.status);
}

module.exports = {
  INVOICE_STATUSES,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_BADGE_CLASSES,
  RECEIPTABLE_INVOICE_STATUSES,
  RECEIPT_DELETABLE_INVOICE_STATUSES,
  INVOICE_NUMBER_PREFIX,
  INVOICE_LIST_PAGE_SIZES,
  DEFAULT_INVOICE_LIST_PAGE_SIZE,
  INVOICE_LIST_SORT_COLUMNS,
  DEFAULT_INVOICE_LIST_SORT,
  DEFAULT_INVOICE_LIST_DIR,
  formatInvoiceStatus,
  getInvoiceStatusBadgeClass,
  canRecordReceiptOnInvoice,
  canDeleteReceiptOnInvoice,
};
