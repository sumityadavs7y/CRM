const TRANSACTION_VIEWS = [
  { key: 'all', label: 'All' },
  { key: 'money_in', label: 'Money In' },
  { key: 'money_out', label: 'Money Out' },
  { key: 'income', label: 'Income' },
  { key: 'expense', label: 'Expense' },
];

const MERGED_TRANSACTION_FEATURE_KEYS = [
  'daybook',
  'income_expense',
  'receipts',
  'payments',
];

const ACCOUNTS_MODULES = [
  {
    key: 'quotations',
    label: 'Quotations',
    slug: 'quotations',
    activeNav: 'accounts-quotations',
    icon: 'ri-file-text-line',
    placeholderDescription: 'Quotation creation and management will be available in a future update.',
  },
  {
    key: 'invoices',
    label: 'Invoices',
    slug: 'invoices',
    activeNav: 'accounts-invoices',
    icon: 'ri-file-list-3-line',
    placeholderDescription: 'Invoice creation and management will be available in a future update.',
  },
  {
    key: 'transactions',
    label: 'Transactions',
    slug: 'transactions',
    activeNav: 'accounts-transactions',
    icon: 'ri-exchange-funds-line',
    placeholderDescription: 'Record money in, money out, and view income and expense — all from one place.',
  },
  {
    key: 'reconciliations',
    label: 'Reconciliation',
    slug: 'reconciliations',
    activeNav: 'accounts-reconciliations',
    icon: 'ri-scales-3-line',
    placeholderDescription: 'Bank and account reconciliations will be available in a future update.',
  },
];

function getAccountsModuleBySlug(slug) {
  return ACCOUNTS_MODULES.find((module) => module.slug === slug);
}

function getAccountsActiveNavValues() {
  return ACCOUNTS_MODULES.map((module) => module.activeNav);
}

function getAccountsFeatureKeys() {
  return ACCOUNTS_MODULES.map((module) => module.key);
}

module.exports = {
  ACCOUNTS_MODULES,
  TRANSACTION_VIEWS,
  MERGED_TRANSACTION_FEATURE_KEYS,
  getAccountsModuleBySlug,
  getAccountsActiveNavValues,
  getAccountsFeatureKeys,
};
