const { Op } = require('sequelize');

async function getNextDocumentNumber(companyId, prefix, model, numberField) {
  const year = new Date().getFullYear();
  const pattern = `${prefix}-${year}-`;

  const last = await model.findOne({
    where: {
      companyId,
      [numberField]: {
        [Op.like]: `${pattern}%`,
      },
    },
    order: [[numberField, 'DESC']],
  });

  let sequence = 1;
  if (last && last[numberField]) {
    const parts = String(last[numberField]).split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!Number.isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }

  return `${pattern}${String(sequence).padStart(4, '0')}`;
}

module.exports = {
  getNextDocumentNumber,
};
