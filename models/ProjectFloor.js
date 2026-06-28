module.exports = (sequelize, DataTypes) => {
  const ProjectFloor = sequelize.define('ProjectFloor', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    blockId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    label: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    floorNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  }, {
    tableName: 'ProjectFloors',
    indexes: [
      {
        unique: true,
        fields: ['blockId', 'floorNumber'],
      },
    ],
  });

  return ProjectFloor;
};
