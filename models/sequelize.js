const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');
const { databaseConfig } = require('../config');

const sequelizeConfig = {
  dialect: databaseConfig.dialect,
  logging: databaseConfig.logging,
  define: {
    timestamps: true,
    underscored: false,
  },
};

if (databaseConfig.dialect === 'postgres') {
  sequelizeConfig.host = databaseConfig.host;
  sequelizeConfig.port = databaseConfig.port;
  sequelizeConfig.database = databaseConfig.database;
  sequelizeConfig.username = databaseConfig.username;
  sequelizeConfig.password = databaseConfig.password;
  sequelizeConfig.pool = databaseConfig.pool;

  sequelizeConfig.dialectOptions = {
    ssl: process.env.DB_SSL === 'true' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  };
} else if (databaseConfig.dialect === 'sqlite') {
  fs.mkdirSync(path.dirname(databaseConfig.storage), { recursive: true });
  sequelizeConfig.storage = databaseConfig.storage;
}

const sequelize = new Sequelize(sequelizeConfig);

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  }
};

// NOTE: Database schema changes should be done through migrations
// DO NOT use sequelize.sync() in production

module.exports = {
  sequelize,
  Sequelize,
  testConnection
};
