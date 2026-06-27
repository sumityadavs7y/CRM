module.exports = (sequelize, DataTypes) => {
  const LeadDiscussion = sequelize.define('LeadDiscussion', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    leadId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    postedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  }, {
    tableName: 'LeadDiscussions',
  });

  return LeadDiscussion;
};
