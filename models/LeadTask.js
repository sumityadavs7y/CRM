module.exports = (sequelize, DataTypes) => {
  const LeadTask = sequelize.define('LeadTask', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    leadId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    dueTime: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    priority: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'ongoing',
    },
  }, {
    tableName: 'LeadTasks',
  });

  return LeadTask;
};
