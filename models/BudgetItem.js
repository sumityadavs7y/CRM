module.exports = (sequelize, DataTypes) => {
  const BudgetItem = sequelize.define('BudgetItem', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    budgetId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    expectedAmount: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: true,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'BudgetItems',
  });

  return BudgetItem;
};
