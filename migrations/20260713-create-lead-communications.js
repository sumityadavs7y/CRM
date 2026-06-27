'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('LeadCommunications', {
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
      itemType: {
        type: Sequelize.ENUM('email', 'message'),
        allowNull: false,
      },
      sentAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      toAddress: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      subject: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
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

    await queryInterface.addIndex('LeadCommunications', ['leadId', 'sentAt'], {
      name: 'lead_communications_lead_sent_at',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('LeadCommunications');
  },
};
