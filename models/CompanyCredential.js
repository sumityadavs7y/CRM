module.exports = (sequelize, DataTypes) => {
  const CompanyCredential = sequelize.define('CompanyCredential', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    companyRoleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    adminName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    avatarPath: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    themeId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    colorMode: {
      type: DataTypes.STRING(10),
      allowNull: true,
      validate: {
        isIn: [['light', 'dark']],
      },
    },
  }, {
    tableName: 'CompanyCredentials',
  });

  return CompanyCredential;
};
