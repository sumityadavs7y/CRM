module.exports = (sequelize, DataTypes) => {
  const Quotation = sequelize.define('Quotation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    quotationNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'draft',
    },
    issueDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    validUntil: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    leadId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    customerName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    customerEmail: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    customerPhone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    customerAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    assigneeId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    createdById: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    subtotal: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },
    discountAmount: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },
    taxAmount: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    termsAndConditions: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    acceptedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rejectedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    convertedInvoiceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    holdUnitsOnAccept: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  }, {
    tableName: 'Quotations',
    indexes: [
      {
        unique: true,
        fields: ['companyId', 'quotationNumber'],
      },
    ],
  });

  return Quotation;
};
