module.exports = (sequelize, DataTypes) => {
  const BudgetExpense = sequelize.define('BudgetExpense', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    budgetItemId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
    },
    expenseDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdByCredentialId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    tableName: 'BudgetExpenses',
  });

  return BudgetExpense;
};
