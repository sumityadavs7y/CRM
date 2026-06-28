'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('MediaFolders', {
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
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex('MediaFolders', ['companyId'], {
      name: 'media_folders_company_id',
    });

    await queryInterface.addIndex('MediaFolders', ['companyId', 'slug'], {
      unique: true,
      name: 'media_folders_company_slug_unique',
    });

    await queryInterface.createTable('MediaFiles', {
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
      folderId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'MediaFolders',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      originalName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      storedName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      mimeType: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      extension: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      sizeBytes: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      storagePath: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      uploadedById: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'CompanyCredentials',
          key: 'id',
        },
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

    await queryInterface.addIndex('MediaFiles', ['companyId'], {
      name: 'media_files_company_id',
    });

    await queryInterface.addIndex('MediaFiles', ['companyId', 'folderId'], {
      name: 'media_files_company_folder_id',
    });

    await queryInterface.addIndex('MediaFiles', ['companyId', 'createdAt'], {
      name: 'media_files_company_created_at',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('MediaFiles');
    await queryInterface.dropTable('MediaFolders');
  },
};
