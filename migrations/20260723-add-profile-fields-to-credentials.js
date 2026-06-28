'use strict';

async function addColumnIfNotExists(queryInterface, Sequelize, tableName, columnName, definition) {
  const table = await queryInterface.describeTable(tableName);
  if (!table[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

async function removeColumnIfExists(queryInterface, tableName, columnName) {
  const table = await queryInterface.describeTable(tableName);
  if (table[columnName]) {
    await queryInterface.removeColumn(tableName, columnName);
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await addColumnIfNotExists(queryInterface, Sequelize, 'CompanyCredentials', 'avatarPath', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await addColumnIfNotExists(queryInterface, Sequelize, 'CompanyCredentials', 'themeId', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await addColumnIfNotExists(queryInterface, Sequelize, 'CompanyCredentials', 'colorMode', {
      type: Sequelize.STRING(10),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await removeColumnIfExists(queryInterface, 'CompanyCredentials', 'colorMode');
    await removeColumnIfExists(queryInterface, 'CompanyCredentials', 'themeId');
    await removeColumnIfExists(queryInterface, 'CompanyCredentials', 'avatarPath');
  },
};
