module.exports = (sequelize, DataTypes) => {
  const ProjectUnit = sequelize.define('ProjectUnit', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    floorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    unitNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    unitType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '2bhk',
    },
    carpetAreaSqft: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    superBuiltUpAreaSqft: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    facing: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    basePrice: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'available',
    },
  }, {
    tableName: 'ProjectUnits',
    indexes: [
      {
        unique: true,
        fields: ['floorId', 'unitNumber'],
      },
    ],
  });

  return ProjectUnit;
};
