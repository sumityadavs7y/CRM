'use strict';

const { Pipeline } = require('../models');
const { seedDefaultLabelsForPipeline } = require('../services/pipelineService');

module.exports = {
  async up() {
    const pipelines = await Pipeline.findAll({
      attributes: ['id'],
      order: [['id', 'ASC']],
    });

    for (const pipeline of pipelines) {
      await seedDefaultLabelsForPipeline(pipeline.id);
    }
  },

  async down() {
    // Data migration only; schema rollback handled by create-pipeline-labels down.
  },
};
