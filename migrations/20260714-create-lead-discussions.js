'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('LeadDiscussions', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      leadId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Leads',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'CompanyCredentials',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      postedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
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

    await queryInterface.addIndex('LeadDiscussions', ['leadId', 'postedAt'], {
      name: 'lead_discussions_lead_posted_at',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('LeadDiscussions');
  },
};
