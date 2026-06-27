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
      if (features.includes('leads')) {
        continue;
      }

      features.push('leads');

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

    const plans = await queryInterface.sequelize.query(
      select,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    for (const plan of plans) {
      const features = parseJsonArray(plan.features).filter((key) => key !== 'leads');

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
