'use strict';

const { MERGED_TRANSACTION_FEATURE_KEYS } = require('../constants/accountsModules');

const DEPRECATED_FEATURE_KEYS = MERGED_TRANSACTION_FEATURE_KEYS;
const NEW_TRANSACTION_KEY = 'transactions';

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

function getPlanTableSql(dialect) {
  if (dialect === 'postgres') {
    return {
      select: 'SELECT id, features FROM "SubscriptionPlans"',
      update: 'UPDATE "SubscriptionPlans" SET features = :features, "updatedAt" = :updatedAt WHERE id = :id',
    };
  }

  return {
    select: 'SELECT id, features FROM SubscriptionPlans',
    update: 'UPDATE SubscriptionPlans SET features = :features, updatedAt = :updatedAt WHERE id = :id',
  };
}

function getRoleTableSql(dialect) {
  if (dialect === 'postgres') {
    return {
      select: 'SELECT id, permissions FROM "CompanyRoles"',
      update: 'UPDATE "CompanyRoles" SET permissions = :permissions, "updatedAt" = :updatedAt WHERE id = :id',
    };
  }

  return {
    select: 'SELECT id, permissions FROM CompanyRoles',
    update: 'UPDATE CompanyRoles SET permissions = :permissions, updatedAt = :updatedAt WHERE id = :id',
  };
}

function consolidatePlanFeatures(features) {
  const next = features.filter((key) => !DEPRECATED_FEATURE_KEYS.includes(key));
  const hadDeprecated = features.some((key) => DEPRECATED_FEATURE_KEYS.includes(key));
  const hasTransactions = next.includes(NEW_TRANSACTION_KEY);

  if (hadDeprecated && !hasTransactions) {
    next.push(NEW_TRANSACTION_KEY);
  }

  return next;
}

function mergeTransactionPermissions(permissions) {
  const next = { ...permissions };
  let hasEdit = false;
  let hasView = false;

  DEPRECATED_FEATURE_KEYS.forEach((featureKey) => {
    const actions = next[featureKey];
    if (Array.isArray(actions)) {
      if (actions.includes('edit')) {
        hasEdit = true;
      }
      if (actions.includes('view')) {
        hasView = true;
      }
    }
    delete next[featureKey];
  });

  const existing = next[NEW_TRANSACTION_KEY];
  if (Array.isArray(existing)) {
    if (existing.includes('edit')) {
      hasEdit = true;
    }
    if (existing.includes('view')) {
      hasView = true;
    }
  }

  if (hasEdit) {
    next[NEW_TRANSACTION_KEY] = ['view', 'edit'];
  } else if (hasView) {
    next[NEW_TRANSACTION_KEY] = ['view'];
  } else {
    delete next[NEW_TRANSACTION_KEY];
  }

  return next;
}

module.exports = {
  async up(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();
    const planSql = getPlanTableSql(dialect);
    const roleSql = getRoleTableSql(dialect);

    const plans = await queryInterface.sequelize.query(
      planSql.select,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    for (const plan of plans) {
      const features = parseJsonArray(plan.features);
      const nextFeatures = consolidatePlanFeatures(features);

      if (JSON.stringify(nextFeatures) === JSON.stringify(features)) {
        continue;
      }

      await queryInterface.sequelize.query(
        planSql.update,
        {
          replacements: {
            id: plan.id,
            features: JSON.stringify(nextFeatures),
            updatedAt: new Date(),
          },
        }
      );
    }

    const roles = await queryInterface.sequelize.query(
      roleSql.select,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    for (const role of roles) {
      const permissions = parseJsonObject(role.permissions);
      const nextPermissions = mergeTransactionPermissions(permissions);

      if (JSON.stringify(nextPermissions) === JSON.stringify(permissions)) {
        continue;
      }

      await queryInterface.sequelize.query(
        roleSql.update,
        {
          replacements: {
            id: role.id,
            permissions: JSON.stringify(nextPermissions),
            updatedAt: new Date(),
          },
        }
      );
    }
  },

  async down(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();
    const planSql = getPlanTableSql(dialect);
    const roleSql = getRoleTableSql(dialect);

    const plans = await queryInterface.sequelize.query(
      planSql.select,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    for (const plan of plans) {
      const features = parseJsonArray(plan.features);
      if (!features.includes(NEW_TRANSACTION_KEY)) {
        continue;
      }

      const nextFeatures = features.filter((key) => key !== NEW_TRANSACTION_KEY);
      DEPRECATED_FEATURE_KEYS.forEach((key) => {
        if (!nextFeatures.includes(key)) {
          nextFeatures.push(key);
        }
      });

      await queryInterface.sequelize.query(
        planSql.update,
        {
          replacements: {
            id: plan.id,
            features: JSON.stringify(nextFeatures),
            updatedAt: new Date(),
          },
        }
      );
    }

    const roles = await queryInterface.sequelize.query(
      roleSql.select,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    for (const role of roles) {
      const permissions = parseJsonObject(role.permissions);
      const transactionActions = permissions[NEW_TRANSACTION_KEY];
      if (!Array.isArray(transactionActions) || transactionActions.length === 0) {
        continue;
      }

      const nextPermissions = { ...permissions };
      delete nextPermissions[NEW_TRANSACTION_KEY];

      DEPRECATED_FEATURE_KEYS.forEach((featureKey) => {
        nextPermissions[featureKey] = [...transactionActions];
      });

      await queryInterface.sequelize.query(
        roleSql.update,
        {
          replacements: {
            id: role.id,
            permissions: JSON.stringify(nextPermissions),
            updatedAt: new Date(),
          },
        }
      );
    }
  },
};
