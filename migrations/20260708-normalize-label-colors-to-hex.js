'use strict';

function extractHexColor(color) {
  if (!color) {
    return '#6366f1';
  }

  const trimmed = String(color).trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) {
    return trimmed;
  }

  const match = trimmed.match(/#[0-9a-fA-F]{3,8}/);
  return match ? match[0] : '#6366f1';
}

module.exports = {
  async up(queryInterface) {
    const labels = await queryInterface.sequelize.query(
      'SELECT id, color FROM PipelineLabels',
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );

    for (const label of labels) {
      const hexColor = extractHexColor(label.color);
      if (hexColor !== label.color) {
        await queryInterface.sequelize.query(
          'UPDATE PipelineLabels SET color = :color, updatedAt = :updatedAt WHERE id = :id',
          {
            replacements: {
              color: hexColor,
              updatedAt: new Date(),
              id: label.id,
            },
          },
        );
      }
    }
  },

  async down() {
    // Data normalization only.
  },
};
