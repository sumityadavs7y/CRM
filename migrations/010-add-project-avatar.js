'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Projects', 'avatarMediaFileId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'MediaFiles',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addIndex('Projects', ['avatarMediaFileId'], {
      name: 'projects_avatar_media_file_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('Projects', 'projects_avatar_media_file_id');
    await queryInterface.removeColumn('Projects', 'avatarMediaFileId');
  },
};
