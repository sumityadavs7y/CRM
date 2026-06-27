const path = require('path');

const envMode = process.env.ENV_MODE || process.env.NODE_ENV || 'production';
const isDev = envMode === 'development';

const sqliteStorage = process.env.DB_DIALECT === 'sqlite'
    ? (process.env.DB_STORAGE
        ? path.resolve(process.env.DB_STORAGE)
        : path.join(__dirname, 'database/app.db'))
    : undefined;

exports.envConfig = {
    port: process.env.PORT || "80",
    sessionSecret: process.env.SESSION_SECRET || 'crm-secret-key-2024',
    envMode,
};

exports.databaseConfig = {
    dialect: process.env.DB_DIALECT || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'crm',
    username: process.env.DB_USER || 'crmuser',
    password: process.env.DB_PASSWORD || (isDev ? 'crmpassword' : undefined),
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    storage: sqliteStorage,
};
