module.exports = (sequelize, DataTypes) => {
  const CompanySubscription = sequelize.define('CompanySubscription', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    subscriptionPlanId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    startsAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  }, {
    tableName: 'CompanySubscriptions',
  });

  return CompanySubscription;
};
