module.exports = (sequelize, DataTypes) => {
  const ProjectBlock = sequelize.define('ProjectBlock', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    phaseId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    totalFloors: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  }, {
    tableName: 'ProjectBlocks',
    indexes: [
      {
        unique: true,
        fields: ['projectId', 'slug'],
      },
    ],
  });

  return ProjectBlock;
};
