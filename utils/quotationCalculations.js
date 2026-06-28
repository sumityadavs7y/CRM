const { Op } = require('sequelize');

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function calculateLineAmounts(quantity, unitPrice, discountAmount = 0, taxRate = 0) {
  const qty = Number(quantity) || 0;
  const price = Number(unitPrice) || 0;
  const discount = Number(discountAmount) || 0;
  const rate = Number(taxRate) || 0;
  const base = Math.max(0, qty * price - discount);
  const taxAmount = roundMoney(base * (rate / 100));
  const lineTotal = roundMoney(base + taxAmount);

  return { taxAmount, lineTotal };
}

function calculateDocumentTotals(lineItems, headerDiscountAmount = 0) {
  const subtotal = lineItems.reduce((sum, line) => {
    const qty = Number(line.quantity) || 0;
    const price = Number(line.unitPrice) || 0;
    const discount = Number(line.discountAmount) || 0;
    return sum + Math.max(0, qty * price - discount);
  }, 0);

  const taxAmount = lineItems.reduce((sum, line) => sum + (Number(line.taxAmount) || 0), 0);
  const discountAmount = Number(headerDiscountAmount) || 0;
  const totalAmount = subtotal - discountAmount + taxAmount;

  return {
    subtotal: roundMoney(subtotal),
    taxAmount: roundMoney(taxAmount),
    discountAmount: roundMoney(discountAmount),
    totalAmount: roundMoney(Math.max(0, totalAmount)),
  };
}

function formatIndianCurrency(amount) {
  if (amount === null || amount === undefined || amount === '') {
    return '—';
  }
  return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

module.exports = {
  roundMoney,
  calculateLineAmounts,
  calculateDocumentTotals,
  formatIndianCurrency,
};
