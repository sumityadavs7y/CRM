'use strict';

const { ADMIN_CAPABILITIES } = require('../utils/capabilities');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('CompanyRoles', {
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
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      slug: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      isSystem: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      permissions: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: {},
      },
      capabilities: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: [],
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
    });

    await queryInterface.addIndex('CompanyRoles', ['companyId', 'slug'], {
      unique: true,
      name: 'company_roles_company_slug_unique',
    });

    await queryInterface.addColumn('CompanyCredentials', 'companyRoleId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'CompanyRoles',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });

    const dialect = queryInterface.sequelize.getDialect();
    const [companies] = dialect === 'postgres'
      ? await queryInterface.sequelize.query('SELECT id FROM "Companies"')
      : await queryInterface.sequelize.query('SELECT id FROM Companies');
    const companyRows = companies.length ? companies : [];

    for (const company of companyRows) {
      const now = new Date();
      const companyId = company.id;

      await queryInterface.bulkInsert('CompanyRoles', [
        {
          companyId,
          name: 'Administrator',
          slug: 'administrator',
          description: 'Full company administration access',
          isSystem: true,
          permissions: JSON.stringify({}),
          capabilities: JSON.stringify(ADMIN_CAPABILITIES),
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          companyId,
          name: 'Member',
          slug: 'member',
          description: 'Standard team member with role-assigned access',
          isSystem: true,
          permissions: JSON.stringify({}),
          capabilities: JSON.stringify([]),
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      ]);

      let adminRoleId;
      let memberRoleId;

      if (dialect === 'postgres') {
        const [adminRoles] = await queryInterface.sequelize.query(
          `SELECT id FROM "CompanyRoles" WHERE "companyId" = ${companyId} AND slug = 'administrator' LIMIT 1`
        );
        const [memberRoles] = await queryInterface.sequelize.query(
          `SELECT id FROM "CompanyRoles" WHERE "companyId" = ${companyId} AND slug = 'member' LIMIT 1`
        );
        adminRoleId = adminRoles[0].id;
        memberRoleId = memberRoles[0].id;
      } else {
        const [adminRoles] = await queryInterface.sequelize.query(
          "SELECT id FROM CompanyRoles WHERE companyId = ? AND slug = 'administrator' LIMIT 1",
          { replacements: [companyId] }
        );
        const [memberRoles] = await queryInterface.sequelize.query(
          "SELECT id FROM CompanyRoles WHERE companyId = ? AND slug = 'member' LIMIT 1",
          { replacements: [companyId] }
        );
        adminRoleId = adminRoles[0].id;
        memberRoleId = memberRoles[0].id;
      }

      if (dialect === 'postgres') {
        await queryInterface.sequelize.query(
          `UPDATE "CompanyCredentials" SET "companyRoleId" = ${adminRoleId} WHERE "companyId" = ${companyId} AND role = 'ADMIN'`
        );
        await queryInterface.sequelize.query(
          `UPDATE "CompanyCredentials" SET "companyRoleId" = ${memberRoleId} WHERE "companyId" = ${companyId} AND role = 'USER'`
        );
        await queryInterface.sequelize.query(
          `UPDATE "CompanyCredentials" SET "companyRoleId" = ${adminRoleId} WHERE "companyId" = ${companyId} AND "companyRoleId" IS NULL`
        );
      } else {
        await queryInterface.sequelize.query(
          "UPDATE CompanyCredentials SET companyRoleId = ? WHERE companyId = ? AND role = 'ADMIN'",
          { replacements: [adminRoleId, companyId] }
        );
        await queryInterface.sequelize.query(
          "UPDATE CompanyCredentials SET companyRoleId = ? WHERE companyId = ? AND role = 'USER'",
          { replacements: [memberRoleId, companyId] }
        );
        await queryInterface.sequelize.query(
          'UPDATE CompanyCredentials SET companyRoleId = ? WHERE companyId = ? AND companyRoleId IS NULL',
          { replacements: [adminRoleId, companyId] }
        );
      }
    }

    if (dialect === 'postgres') {
      await queryInterface.changeColumn('CompanyCredentials', 'companyRoleId', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'CompanyRoles',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      });
      await queryInterface.removeColumn('CompanyCredentials', 'role');
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
          companyRoleId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'CompanyRoles',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
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
          `INSERT INTO CompanyCredentials (id, companyId, companyRoleId, adminName, email, password, isActive, createdAt, updatedAt)
           SELECT id, companyId, companyRoleId, adminName, email, password, isActive, createdAt, updatedAt
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
      await queryInterface.addColumn('CompanyCredentials', 'role', {
        type: Sequelize.ENUM('ADMIN', 'USER'),
        allowNull: false,
        defaultValue: 'ADMIN',
      });

      await queryInterface.sequelize.query(`
        UPDATE "CompanyCredentials" cc
        SET role = CASE
          WHEN cr.slug = 'administrator' THEN 'ADMIN'::"enum_CompanyCredentials_role"
          ELSE 'USER'::"enum_CompanyCredentials_role"
        END
        FROM "CompanyRoles" cr
        WHERE cc."companyRoleId" = cr.id
      `);

      await queryInterface.removeColumn('CompanyCredentials', 'companyRoleId');
      await queryInterface.dropTable('CompanyRoles');
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
          `INSERT INTO CompanyCredentials (id, companyId, adminName, email, password, role, isActive, createdAt, updatedAt)
           SELECT ccn.id, ccn.companyId, ccn.adminName, ccn.email, ccn.password,
             CASE WHEN cr.slug = 'administrator' THEN 'ADMIN' ELSE 'USER' END,
             ccn.isActive, ccn.createdAt, ccn.updatedAt
           FROM CompanyCredentials_new ccn
           JOIN CompanyRoles cr ON ccn.companyRoleId = cr.id`,
          { transaction }
        );

        await queryInterface.dropTable('CompanyCredentials_new', { transaction });
        await queryInterface.dropTable('CompanyRoles', { transaction });
      });
    }
  },
};
