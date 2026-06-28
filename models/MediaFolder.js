module.exports = (sequelize, DataTypes) => {
  const MediaFolder = sequelize.define('MediaFolder', {
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
  }, {
    tableName: 'MediaFolders',
  });

  return MediaFolder;
};
