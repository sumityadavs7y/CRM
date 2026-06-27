'use strict';

const { Company, Pipeline } = require('../models');
const { seedDefaultPipelines } = require('../services/pipelineService');

module.exports = {
  async up() {
    const companies = await Company.findAll({
      attributes: ['id'],
      order: [['id', 'ASC']],
    });

    for (const company of companies) {
      const pipelineCount = await Pipeline.count({ where: { companyId: company.id } });
      if (pipelineCount === 0) {
        await seedDefaultPipelines(company.id);
      }
    }
  },

  async down() {
    // Data migration only; schema rollback handled by create-pipelines down.
  },
};
