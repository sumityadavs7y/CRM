'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Budgets', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      companyId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Companies', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      projectId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Projects', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      scope: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      phaseId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'ProjectPhases', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      currency: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'INR',
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

    await queryInterface.addIndex('Budgets', ['companyId'], {
      name: 'budgets_company_id',
    });
    await queryInterface.addIndex('Budgets', ['projectId'], {
      name: 'budgets_project_id',
    });
    await queryInterface.addIndex('Budgets', ['projectId'], {
      unique: true,
      name: 'budgets_project_scope_project_unique',
      where: { scope: 'project' },
    });
    await queryInterface.addIndex('Budgets', ['projectId'], {
      unique: true,
      name: 'budgets_project_scope_default_unique',
      where: { scope: 'default' },
    });
    await queryInterface.addIndex('Budgets', ['projectId', 'phaseId'], {
      unique: true,
      name: 'budgets_project_phase_unique',
      where: { scope: 'phase' },
    });

    await queryInterface.createTable('BudgetItems', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      budgetId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Budgets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      parentId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'BudgetItems', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      expectedAmount: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: true,
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
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

    await queryInterface.addIndex('BudgetItems', ['budgetId'], {
      name: 'budget_items_budget_id',
    });
    await queryInterface.addIndex('BudgetItems', ['parentId'], {
      name: 'budget_items_parent_id',
    });

    await queryInterface.createTable('BudgetExpenses', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      budgetItemId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'BudgetItems', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      amount: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
      },
      expenseDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      description: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdByCredentialId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'CompanyCredentials', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
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

    await queryInterface.addIndex('BudgetExpenses', ['budgetItemId'], {
      name: 'budget_expenses_budget_item_id',
    });
    await queryInterface.addIndex('BudgetExpenses', ['expenseDate'], {
      name: 'budget_expenses_expense_date',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('BudgetExpenses');
    await queryInterface.dropTable('BudgetItems');
    await queryInterface.dropTable('Budgets');
  },
};
