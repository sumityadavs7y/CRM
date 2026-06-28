const QUOTATION_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired', 'cancelled'];

const QUOTATION_STATUS_LABELS = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  rejected: 'Rejected',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

const QUOTATION_STATUS_BADGE_CLASSES = {
  draft: 'bg-secondary-subtle text-secondary',
  sent: 'bg-info-subtle text-info',
  accepted: 'bg-success-subtle text-success',
  rejected: 'bg-danger-subtle text-danger',
  expired: 'bg-warning-subtle text-warning',
  cancelled: 'bg-dark-subtle text-body',
};

const QUOTATION_NUMBER_PREFIX = 'QT';

const EDITABLE_QUOTATION_STATUSES = new Set(['draft']);

const DEFAULT_QUOTATION_LIST_SORT = 'issueDate';
const DEFAULT_QUOTATION_LIST_DIR = 'desc';
const QUOTATION_LIST_PAGE_SIZES = [10, 25, 50];
const DEFAULT_QUOTATION_LIST_PAGE_SIZE = 25;

const QUOTATION_LIST_SORT_COLUMNS = new Set([
  'quotationNumber',
  'customerName',
  'issueDate',
  'validUntil',
  'totalAmount',
  'status',
]);

function formatQuotationStatus(status) {
  return QUOTATION_STATUS_LABELS[status] || status;
}

function getQuotationStatusBadgeClass(status) {
  return QUOTATION_STATUS_BADGE_CLASSES[status] || 'bg-light text-muted';
}

function isQuotationEditable(status) {
  return EDITABLE_QUOTATION_STATUSES.has(status);
}

module.exports = {
  QUOTATION_STATUSES,
  QUOTATION_STATUS_LABELS,
  QUOTATION_STATUS_BADGE_CLASSES,
  QUOTATION_NUMBER_PREFIX,
  EDITABLE_QUOTATION_STATUSES,
  DEFAULT_QUOTATION_LIST_SORT,
  DEFAULT_QUOTATION_LIST_DIR,
  QUOTATION_LIST_PAGE_SIZES,
  DEFAULT_QUOTATION_LIST_PAGE_SIZE,
  QUOTATION_LIST_SORT_COLUMNS,
  formatQuotationStatus,
  getQuotationStatusBadgeClass,
  isQuotationEditable,
};
