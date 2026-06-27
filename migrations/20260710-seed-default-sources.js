'use strict';

const { Company, Source } = require('../models');
const { seedDefaultSources } = require('../services/sourceService');

module.exports = {
  async up() {
    const companies = await Company.findAll({
      attributes: ['id'],
      order: [['id', 'ASC']],
    });

    for (const company of companies) {
      const sourceCount = await Source.count({ where: { companyId: company.id } });
      if (sourceCount === 0) {
        await seedDefaultSources(company.id);
      }
    }
  },

  async down() {
    // Data migration only; schema rollback handled by create-sources down.
  },
};
