'use strict';

function parseJsonArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function parseJsonObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return {};
}

function getRoleTableSql(dialect) {
  if (dialect === 'postgres') {
    return {
      select: 'SELECT id, permissions, capabilities FROM "CompanyRoles"',
      update: 'UPDATE "CompanyRoles" SET permissions = :permissions, capabilities = :capabilities, "updatedAt" = :updatedAt WHERE id = :id',
    };
  }

  return {
    select: 'SELECT id, permissions, capabilities FROM CompanyRoles',
    update: 'UPDATE CompanyRoles SET permissions = :permissions, capabilities = :capabilities, updatedAt = :updatedAt WHERE id = :id',
  };
}

module.exports = {
  async up(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();
    const { select, update } = getRoleTableSql(dialect);

    const roles = await queryInterface.sequelize.query(
      select,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    for (const role of roles) {
      const capabilities = parseJsonArray(role.capabilities);
      if (!capabilities.includes('manage_roles')) {
        continue;
      }

      const permissions = parseJsonObject(role.permissions);
      if (!permissions.role_management || permissions.role_management.length === 0) {
        permissions.role_management = ['view', 'edit'];
      }

      const nextCapabilities = capabilities.filter((key) => key !== 'manage_roles');

      await queryInterface.sequelize.query(
        update,
        {
          replacements: {
            id: role.id,
            permissions: JSON.stringify(permissions),
            capabilities: JSON.stringify(nextCapabilities),
            updatedAt: new Date(),
          },
        }
      );
    }
  },

  async down(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();
    const { select, update } = getRoleTableSql(dialect);

    const roles = await queryInterface.sequelize.query(
      select,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    for (const role of roles) {
      const permissions = parseJsonObject(role.permissions);
      const roleManagement = permissions.role_management;

      if (!Array.isArray(roleManagement) || roleManagement.length === 0) {
        continue;
      }

      delete permissions.role_management;

      const capabilities = parseJsonArray(role.capabilities);
      if (!capabilities.includes('manage_roles')) {
        capabilities.push('manage_roles');
      }

      await queryInterface.sequelize.query(
        update,
        {
          replacements: {
            id: role.id,
            permissions: JSON.stringify(permissions),
            capabilities: JSON.stringify(capabilities),
            updatedAt: new Date(),
          },
        }
      );
    }
  },
};
