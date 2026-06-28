module.exports = (sequelize, DataTypes) => {
  const MediaFile = sequelize.define('MediaFile', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    folderId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    originalName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    storedName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    extension: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sizeBytes: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    storagePath: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    uploadedById: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    tableName: 'MediaFiles',
  });

  return MediaFile;
};
