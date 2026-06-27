module.exports = (sequelize, DataTypes) => {
  const SubscriptionPlan = sequelize.define('SubscriptionPlan', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    maxUsers: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
    },
    maxContacts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100,
    },
    maxDeals: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 50,
    },
    maxStorageMb: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1024,
    },
    features: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  }, {
    tableName: 'SubscriptionPlans',
  });

  return SubscriptionPlan;
};
