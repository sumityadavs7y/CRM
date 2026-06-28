module.exports = (sequelize, DataTypes) => {
  const Project = sequelize.define('Project', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    companyId: {
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
    projectType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'residential',
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'planning',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    addressLine1: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    addressLine2: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    state: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pincode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    totalLandAreaSqft: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    launchDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    possessionDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  }, {
    tableName: 'Projects',
    indexes: [
      {
        unique: true,
        fields: ['companyId', 'slug'],
      },
    ],
  });

  return Project;
};
