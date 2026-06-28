module.exports = (sequelize, DataTypes) => {
  const ProjectPhase = sequelize.define('ProjectPhase', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'planning',
    },
    launchDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    possessionDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  }, {
    tableName: 'ProjectPhases',
    indexes: [
      {
        unique: true,
        fields: ['projectId', 'slug'],
      },
    ],
  });

  return ProjectPhase;
};
