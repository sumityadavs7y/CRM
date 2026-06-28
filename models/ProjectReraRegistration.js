module.exports = (sequelize, DataTypes) => {
  const ProjectReraRegistration = sequelize.define('ProjectReraRegistration', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    registrationNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    state: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    promoterName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    projectNameOnRera: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    validFrom: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    validUntil: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pending',
    },
    reraPortalUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'ProjectReraRegistrations',
    indexes: [
      {
        unique: true,
        fields: ['projectId', 'registrationNumber'],
      },
    ],
  });

  return ProjectReraRegistration;
};
