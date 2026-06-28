module.exports = (sequelize, DataTypes) => {
  const InvoiceLineItem = sequelize.define('InvoiceLineItem', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    invoiceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    projectUnitId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 1,
    },
    unitPrice: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
    },
    discountAmount: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },
    taxRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    taxAmount: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },
    lineTotal: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
    },
    unitSnapshot: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  }, {
    tableName: 'InvoiceLineItems',
  });

  return InvoiceLineItem;
};
