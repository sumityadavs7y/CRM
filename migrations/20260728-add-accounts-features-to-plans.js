'use strict';

const { getAccountsFeatureKeys } = require('../constants/accountsModules');

const ACCOUNTS_FEATURE_KEYS = getAccountsFeatureKeys();

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

module.exports = {
  async up(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();
    const { select, update } = getPlanTableSql(dialect);

    const plans = await queryInterface.sequelize.query(
      select,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    for (const plan of plans) {
      const features = parseJsonArray(plan.features);
      let changed = false;

      ACCOUNTS_FEATURE_KEYS.forEach((featureKey) => {
        if (!features.includes(featureKey)) {
          features.push(featureKey);
          changed = true;
        }
      });

      if (!changed) {
        continue;
      }

      await queryInterface.sequelize.query(
        update,
        {
          replacements: {
            id: plan.id,
            features: JSON.stringify(features),
            updatedAt: new Date(),
          },
        }
      );
    }
  },

  async down(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();
    const { select, update } = getPlanTableSql(dialect);
    const featureKeySet = new Set(ACCOUNTS_FEATURE_KEYS);

    const plans = await queryInterface.sequelize.query(
      select,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    for (const plan of plans) {
      const features = parseJsonArray(plan.features).filter((key) => !featureKeySet.has(key));

      await queryInterface.sequelize.query(
        update,
        {
          replacements: {
            id: plan.id,
            features: JSON.stringify(features),
            updatedAt: new Date(),
          },
        }
      );
    }
  },
};
