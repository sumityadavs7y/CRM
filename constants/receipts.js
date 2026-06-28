const PAYMENT_METHODS = [
  { key: 'bank_transfer', label: 'Bank transfer' },
  { key: 'cheque', label: 'Cheque' },
  { key: 'cash', label: 'Cash' },
  { key: 'upi', label: 'UPI' },
  { key: 'card', label: 'Card' },
  { key: 'other', label: 'Other' },
];

const PAYMENT_METHOD_KEYS = new Set(PAYMENT_METHODS.map((method) => method.key));

function formatPaymentMethod(key) {
  const method = PAYMENT_METHODS.find((item) => item.key === key);
  return method ? method.label : key;
}

function isValidPaymentMethod(key) {
  return PAYMENT_METHOD_KEYS.has(key);
}

module.exports = {
  PAYMENT_METHODS,
  PAYMENT_METHOD_KEYS,
  formatPaymentMethod,
  isValidPaymentMethod,
};
