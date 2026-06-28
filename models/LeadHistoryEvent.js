module.exports = (sequelize, DataTypes) => {
  const LeadHistoryEvent = sequelize.define('LeadHistoryEvent', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    leadId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    entityType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    entityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    changes: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  }, {
    tableName: 'LeadHistoryEvents',
    updatedAt: false,
  });

  return LeadHistoryEvent;
};
