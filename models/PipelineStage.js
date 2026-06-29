module.exports = (sequelize, DataTypes) => {
  const PipelineStage = sequelize.define('PipelineStage', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    pipelineId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    stageType: {
      type: DataTypes.ENUM('deal'),
      allowNull: false,
      defaultValue: 'deal',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  }, {
    tableName: 'PipelineStages',
    indexes: [
      {
        unique: true,
        fields: ['pipelineId', 'stageType', 'slug'],
      },
    ],
  });

  return PipelineStage;
};
