'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Leads', {
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
      customerName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      subject: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      assigneeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'CompanyCredentials',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      followUpDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      pipelineId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Pipelines',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      stageId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'PipelineStages',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      notes: {
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

    await queryInterface.addIndex('Leads', ['companyId', 'createdAt'], {
      name: 'leads_company_created_at',
    });

    await queryInterface.createTable('LeadSources', {
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
      sourceId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Sources',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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

    await queryInterface.addIndex('LeadSources', ['leadId', 'sourceId'], {
      unique: true,
      name: 'lead_sources_lead_source_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('LeadSources');
    await queryInterface.dropTable('Leads');
  },
};
