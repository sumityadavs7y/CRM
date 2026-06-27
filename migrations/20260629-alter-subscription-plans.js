'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.removeColumn('SubscriptionPlans', 'validityDays');
    await queryInterface.removeColumn('SubscriptionPlans', 'price');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('SubscriptionPlans', 'validityDays', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 365,
    });
    await queryInterface.addColumn('SubscriptionPlans', 'price', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });
  },
};
