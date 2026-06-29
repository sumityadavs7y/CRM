'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Projects', {
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
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      slug: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      projectType: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'residential',
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'planning',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      addressLine1: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      addressLine2: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      city: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      state: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      pincode: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      totalLandAreaSqft: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      },
      launchDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      possessionDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      isActive: {
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

    await queryInterface.addIndex('Projects', ['companyId', 'slug'], {
      unique: true,
      name: 'projects_company_slug_unique',
    });

    await queryInterface.createTable('ProjectPhases', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      projectId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Projects',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      slug: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'planning',
      },
      launchDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      possessionDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
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

    await queryInterface.addIndex('ProjectPhases', ['projectId', 'slug'], {
      unique: true,
      name: 'project_phases_project_slug_unique',
    });

    await queryInterface.createTable('ProjectBlocks', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      projectId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Projects',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      phaseId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'ProjectPhases',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      slug: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      totalFloors: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
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

    await queryInterface.addIndex('ProjectBlocks', ['projectId', 'slug'], {
      unique: true,
      name: 'project_blocks_project_slug_unique',
    });

    await queryInterface.createTable('ProjectFloors', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      blockId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'ProjectBlocks',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      label: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      floorNumber: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
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

    await queryInterface.addIndex('ProjectFloors', ['blockId', 'floorNumber'], {
      unique: true,
      name: 'project_floors_block_floor_number_unique',
    });

    await queryInterface.createTable('ProjectUnits', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      floorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'ProjectFloors',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      unitNumber: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      unitType: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '2bhk',
      },
      carpetAreaSqft: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      superBuiltUpAreaSqft: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      facing: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      basePrice: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'available',
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

    await queryInterface.addIndex('ProjectUnits', ['floorId', 'unitNumber'], {
      unique: true,
      name: 'project_units_floor_unit_number_unique',
    });

    await queryInterface.createTable('ProjectReraRegistrations', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      projectId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Projects',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      registrationNumber: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      state: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      promoterName: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      projectNameOnRera: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      validFrom: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      validUntil: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'pending',
      },
      reraPortalUrl: {
        type: Sequelize.STRING,
        allowNull: true,
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

    await queryInterface.addIndex('ProjectReraRegistrations', ['projectId', 'registrationNumber'], {
      unique: true,
      name: 'project_rera_project_registration_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ProjectReraRegistrations');
    await queryInterface.dropTable('ProjectUnits');
    await queryInterface.dropTable('ProjectFloors');
    await queryInterface.dropTable('ProjectBlocks');
    await queryInterface.dropTable('ProjectPhases');
    await queryInterface.dropTable('Projects');
  },
};
