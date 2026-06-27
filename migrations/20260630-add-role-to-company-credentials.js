'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();

    if (dialect === 'postgres') {
      await queryInterface.addColumn('CompanyCredentials', 'role', {
        type: Sequelize.ENUM('ADMIN', 'USER'),
        allowNull: false,
        defaultValue: 'ADMIN',
      });

      await queryInterface.sequelize.query(
        'UPDATE "CompanyCredentials" SET role = \'ADMIN\' WHERE role IS NULL'
      );

      await queryInterface.removeConstraint('CompanyCredentials', 'CompanyCredentials_companyId_key');
      return;
    }

    if (dialect === 'sqlite') {
      await queryInterface.sequelize.transaction(async (transaction) => {
        await queryInterface.renameTable('CompanyCredentials', 'CompanyCredentials_old', { transaction });

        await queryInterface.createTable('CompanyCredentials', {
          id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
          },
          companyId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'Companies',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          adminName: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          email: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true,
          },
          password: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          role: {
            type: Sequelize.ENUM('ADMIN', 'USER'),
            allowNull: false,
            defaultValue: 'ADMIN',
          },
          isActive: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
        }, { transaction });

        await queryInterface.sequelize.query(
          `INSERT INTO CompanyCredentials (id, companyId, adminName, email, password, isActive, role, createdAt, updatedAt)
           SELECT id, companyId, adminName, email, password, isActive, 'ADMIN', createdAt, updatedAt
           FROM CompanyCredentials_old`,
          { transaction }
        );

        await queryInterface.dropTable('CompanyCredentials_old', { transaction });
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();

    if (dialect === 'postgres') {
      await queryInterface.addConstraint('CompanyCredentials', {
        fields: ['companyId'],
        type: 'unique',
        name: 'CompanyCredentials_companyId_key',
      });

      await queryInterface.removeColumn('CompanyCredentials', 'role');
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_CompanyCredentials_role";');
      return;
    }

    if (dialect === 'sqlite') {
      await queryInterface.sequelize.transaction(async (transaction) => {
        await queryInterface.renameTable('CompanyCredentials', 'CompanyCredentials_new', { transaction });

        await queryInterface.createTable('CompanyCredentials', {
          id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
          },
          companyId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            unique: true,
            references: {
              model: 'Companies',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          adminName: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          email: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true,
          },
          password: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          isActive: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
        }, { transaction });

        await queryInterface.sequelize.query(
          `INSERT INTO CompanyCredentials (id, companyId, adminName, email, password, isActive, createdAt, updatedAt)
           SELECT id, companyId, adminName, email, password, isActive, createdAt, updatedAt
           FROM CompanyCredentials_new`,
          { transaction }
        );

        await queryInterface.dropTable('CompanyCredentials_new', { transaction });
      });
    }
  },
};
