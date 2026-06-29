module.exports = (sequelize, DataTypes) => {
  const Budget = sequelize.define('Budget', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    scope: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phaseId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'INR',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'Budgets',
  });

  return Budget;
};
