'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Quotations', {
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
      quotationNumber: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'draft',
      },
      issueDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      validUntil: {
        type: Sequelize.DATEONLY,
        allowNull: true,
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
      customerName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      customerEmail: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      customerPhone: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      customerAddress: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      assigneeId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'CompanyCredentials', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdById: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'CompanyCredentials', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      subtotal: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      discountAmount: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      taxAmount: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      totalAmount: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      termsAndConditions: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      sentAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      acceptedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      rejectedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      convertedInvoiceId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      holdUnitsOnAccept: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    await queryInterface.addIndex('Quotations', ['companyId', 'quotationNumber'], {
      unique: true,
      name: 'quotations_company_number_unique',
    });

    await queryInterface.createTable('QuotationLineItems', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      quotationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Quotations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      description: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      projectUnitId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'ProjectUnits', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 1,
      },
      unitPrice: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
      },
      discountAmount: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      taxRate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      taxAmount: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      lineTotal: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
      },
      unitSnapshot: {
        type: Sequelize.JSON,
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

    await queryInterface.createTable('Invoices', {
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
      invoiceNumber: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'draft',
      },
      issueDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      dueDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      quotationId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Quotations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
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
      customerName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      customerEmail: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      customerPhone: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      customerAddress: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      assigneeId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'CompanyCredentials', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdById: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'CompanyCredentials', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      subtotal: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      discountAmount: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      taxAmount: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      totalAmount: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      termsAndConditions: {
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

    await queryInterface.addIndex('Invoices', ['companyId', 'invoiceNumber'], {
      unique: true,
      name: 'invoices_company_number_unique',
    });

    await queryInterface.addConstraint('Quotations', {
      fields: ['convertedInvoiceId'],
      type: 'foreign key',
      name: 'quotations_converted_invoice_id_fkey',
      references: {
        table: 'Invoices',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.createTable('InvoiceLineItems', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      invoiceId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Invoices', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      description: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      projectUnitId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'ProjectUnits', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 1,
      },
      unitPrice: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
      },
      discountAmount: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      taxRate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      taxAmount: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      lineTotal: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
      },
      unitSnapshot: {
        type: Sequelize.JSON,
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable('InvoiceLineItems');
    await queryInterface.removeConstraint('Quotations', 'quotations_converted_invoice_id_fkey');
    await queryInterface.dropTable('Invoices');
    await queryInterface.dropTable('QuotationLineItems');
    await queryInterface.dropTable('Quotations');
  },
};
