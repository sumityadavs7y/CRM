const { envConfig } = require('../config');

function isDevEnvMode() {
    return envConfig.envMode === 'development';
}

module.exports = {
    isDevEnvMode
};
