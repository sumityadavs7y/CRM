const { Op, fn, col, where } = require('sequelize');
const { Pipeline, PipelineStage, sequelize } = require('../models');
const {
  DEFAULT_PIPELINES,
  CUSTOM_PIPELINE_LEAD_STAGES,
  CUSTOM_PIPELINE_DEAL_STAGES,
} = require('../constants/defaultPipelines');

function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function findCompanyPipeline(companyId, pipelineId, options = {}) {
  return Pipeline.findOne({
    where: { id: pipelineId, companyId },
    ...options,
  });
}

async function findCompanyStage(companyId, pipelineId, stageId) {
  const pipeline = await findCompanyPipeline(companyId, pipelineId);
  if (!pipeline) {
    return null;
  }

  return PipelineStage.findOne({
    where: { id: stageId, pipelineId: pipeline.id },
  });
}

async function createStagesForPipeline(pipelineId, stageType, stageNames, transaction) {
  const stages = [];

  for (let i = 0; i < stageNames.length; i += 1) {
    const name = stageNames[i];
    const stage = await PipelineStage.create({
      pipelineId,
      stageType,
      name,
      slug: slugify(name),
      sortOrder: i,
      isActive: true,
    }, { transaction });
    stages.push(stage);
  }

  return stages;
}

function normalizeDescription(description) {
  const trimmed = description?.trim();
  return trimmed || null;
}

async function createPipelineWithStages(companyId, { name, description, slug, isSystem, sortOrder, leadStages, dealStages }, transaction) {
  const pipeline = await Pipeline.create({
    companyId,
    name,
    description: normalizeDescription(description),
    slug,
    sortOrder,
    isSystem,
    isActive: true,
  }, { transaction });

  await createStagesForPipeline(pipeline.id, 'lead', leadStages, transaction);
  await createStagesForPipeline(pipeline.id, 'deal', dealStages, transaction);

  return pipeline;
}

async function seedDefaultPipelines(companyId, transaction = null) {
  const run = async (tx) => {
    const existingCount = await Pipeline.count({ where: { companyId }, transaction: tx });
    if (existingCount > 0) {
      return [];
    }

    const pipelines = [];

    for (let i = 0; i < DEFAULT_PIPELINES.length; i += 1) {
      const config = DEFAULT_PIPELINES[i];
      const pipeline = await createPipelineWithStages(companyId, {
        name: config.name,
        slug: config.slug,
        isSystem: true,
        sortOrder: i,
        leadStages: config.leadStages,
        dealStages: config.dealStages,
      }, tx);
      pipelines.push(pipeline);
    }

    return pipelines;
  };

  if (transaction) {
    return run(transaction);
  }

  return sequelize.transaction(run);
}

async function getNextPipelineSortOrder(companyId, transaction = null) {
  const maxOrder = await Pipeline.max('sortOrder', { where: { companyId }, transaction });
  return (maxOrder ?? -1) + 1;
}

function caseInsensitiveNameMatch(fieldName, value) {
  return where(fn('lower', col(fieldName)), fn('lower', value.trim()));
}

async function pipelineNameExists(companyId, name, excludePipelineId = null, transaction = null) {
  const whereClause = {
    companyId,
    [Op.and]: [caseInsensitiveNameMatch('name', name)],
  };

  if (excludePipelineId) {
    whereClause.id = { [Op.ne]: excludePipelineId };
  }

  const count = await Pipeline.count({ where: whereClause, transaction });
  return count > 0;
}

async function stageNameExists(pipelineId, stageType, name, excludeStageId = null, transaction = null) {
  const whereClause = {
    pipelineId,
    stageType,
    [Op.and]: [caseInsensitiveNameMatch('name', name)],
  };

  if (excludeStageId) {
    whereClause.id = { [Op.ne]: excludeStageId };
  }

  const count = await PipelineStage.count({ where: whereClause, transaction });
  return count > 0;
}

async function createPipeline(companyId, { name, description }) {
  const trimmedName = name?.trim();
  if (!trimmedName) {
    throw new Error('Pipeline name is required.');
  }

  const baseSlug = slugify(trimmedName);
  if (!baseSlug) {
    throw new Error('Pipeline name must contain at least one letter or number.');
  }

  return sequelize.transaction(async (transaction) => {
    if (await pipelineNameExists(companyId, trimmedName, null, transaction)) {
      throw new Error('A pipeline with this name already exists.');
    }

    let slug = baseSlug;
    let suffix = 1;
    while (await Pipeline.count({ where: { companyId, slug }, transaction })) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    const sortOrder = await getNextPipelineSortOrder(companyId, transaction);

    return createPipelineWithStages(companyId, {
      name: trimmedName,
      description,
      slug,
      isSystem: false,
      sortOrder,
      leadStages: CUSTOM_PIPELINE_LEAD_STAGES,
      dealStages: CUSTOM_PIPELINE_DEAL_STAGES,
    }, transaction);
  });
}

async function updatePipeline(companyId, pipelineId, { name, description }) {
  const pipeline = await findCompanyPipeline(companyId, pipelineId);
  if (!pipeline) {
    throw new Error('Pipeline not found.');
  }

  const trimmedName = name?.trim();
  if (!trimmedName) {
    throw new Error('Pipeline name is required.');
  }

  if (await pipelineNameExists(companyId, trimmedName, pipelineId)) {
    throw new Error('A pipeline with this name already exists.');
  }

  pipeline.name = trimmedName;
  if (description !== undefined) {
    pipeline.description = normalizeDescription(description);
  }
  await pipeline.save();
  return pipeline;
}

async function deletePipeline(companyId, pipelineId) {
  const pipeline = await findCompanyPipeline(companyId, pipelineId);
  if (!pipeline) {
    throw new Error('Pipeline not found.');
  }

  await pipeline.destroy();
  return pipeline;
}

async function getPipelineWithStages(companyId, pipelineId) {
  return findCompanyPipeline(companyId, pipelineId, {
    include: [{
      model: PipelineStage,
      as: 'stages',
      separate: true,
      order: [['stageType', 'ASC'], ['sortOrder', 'ASC']],
    }],
  });
}

async function listCompanyPipelines(companyId) {
  return Pipeline.findAll({
    where: { companyId },
    include: [{
      model: PipelineStage,
      as: 'stages',
      attributes: ['id', 'stageType'],
    }],
    order: [['sortOrder', 'ASC'], ['name', 'ASC']],
  });
}

async function createStage(companyId, pipelineId, { stageType, name }) {
  const pipeline = await findCompanyPipeline(companyId, pipelineId);
  if (!pipeline) {
    throw new Error('Pipeline not found.');
  }

  if (!['lead', 'deal'].includes(stageType)) {
    throw new Error('Invalid stage type.');
  }

  const trimmedName = name?.trim();
  if (!trimmedName) {
    throw new Error('Stage name is required.');
  }

  const baseSlug = slugify(trimmedName);
  if (!baseSlug) {
    throw new Error('Stage name must contain at least one letter or number.');
  }

  return sequelize.transaction(async (transaction) => {
    if (await stageNameExists(pipeline.id, stageType, trimmedName, null, transaction)) {
      throw new Error('A stage with this name already exists in this pipeline.');
    }

    let slug = baseSlug;
    let suffix = 1;
    while (await PipelineStage.count({
      where: { pipelineId: pipeline.id, stageType, slug },
      transaction,
    })) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    const maxOrder = await PipelineStage.max('sortOrder', {
      where: { pipelineId: pipeline.id, stageType },
      transaction,
    });

    return PipelineStage.create({
      pipelineId: pipeline.id,
      stageType,
      name: trimmedName,
      slug,
      sortOrder: (maxOrder ?? -1) + 1,
      isActive: true,
    }, { transaction });
  });
}

async function updateStage(companyId, pipelineId, stageId, { name, sortOrder }) {
  const stage = await findCompanyStage(companyId, pipelineId, stageId);
  if (!stage) {
    throw new Error('Stage not found.');
  }

    if (name !== undefined) {
    const trimmedName = name?.trim();
    if (!trimmedName) {
      throw new Error('Stage name is required.');
    }

    if (await stageNameExists(stage.pipelineId, stage.stageType, trimmedName, stageId)) {
      throw new Error('A stage with this name already exists in this pipeline.');
    }

    const baseSlug = slugify(trimmedName);
    let slug = baseSlug;
    let suffix = 1;
    while (await PipelineStage.count({
      where: {
        pipelineId: stage.pipelineId,
        stageType: stage.stageType,
        slug,
        id: { [Op.ne]: stageId },
      },
    })) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    stage.name = trimmedName;
    stage.slug = slug;
  }

  if (sortOrder !== undefined && sortOrder !== null && sortOrder !== '') {
    stage.sortOrder = Number(sortOrder);
  }

  await stage.save();
  return stage;
}

async function deleteStage(companyId, pipelineId, stageId) {
  const stage = await findCompanyStage(companyId, pipelineId, stageId);
  if (!stage) {
    throw new Error('Stage not found.');
  }

  const remainingCount = await PipelineStage.count({
    where: {
      pipelineId: stage.pipelineId,
      stageType: stage.stageType,
      id: { [Op.ne]: stageId },
    },
  });

  if (remainingCount < 1) {
    throw new Error('Each pipeline must have at least one stage per type.');
  }

  await stage.destroy();
  return stage;
}

module.exports = {
  slugify,
  findCompanyPipeline,
  findCompanyStage,
  seedDefaultPipelines,
  createPipeline,
  updatePipeline,
  deletePipeline,
  getPipelineWithStages,
  listCompanyPipelines,
  createStage,
  updateStage,
  deleteStage,
};
