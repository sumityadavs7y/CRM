module.exports = (sequelize, DataTypes) => {
  const LeadCommunication = sequelize.define('LeadCommunication', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    leadId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    itemType: {
      type: DataTypes.ENUM('email', 'message'),
      allowNull: false,
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    toAddress: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'LeadCommunications',
  });

  return LeadCommunication;
};
