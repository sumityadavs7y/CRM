'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Invoices', 'amountPaid', {
      type: Sequelize.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn('Invoices', 'amountDue', {
      type: Sequelize.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.sequelize.query(`
      UPDATE "Invoices"
      SET "amountDue" = "totalAmount", "amountPaid" = 0
    `);

    await queryInterface.createTable('Receipts', {
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
      invoiceId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Invoices', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      leadId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Leads', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      projectId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Projects', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      amount: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
      },
      paymentDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      paymentMethod: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'bank_transfer',
      },
      reference: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdById: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'CompanyCredentials', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
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

    await queryInterface.addIndex('Receipts', ['companyId', 'invoiceId'], {
      name: 'receipts_company_invoice_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Receipts');
    await queryInterface.removeColumn('Invoices', 'amountDue');
    await queryInterface.removeColumn('Invoices', 'amountPaid');
  },
};
