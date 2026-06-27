const { Op, fn, col, where } = require('sequelize');
const { Pipeline, PipelineStage, PipelineLabel, sequelize } = require('../models');
const {
  DEFAULT_PIPELINES,
  CUSTOM_PIPELINE_LEAD_STAGES,
  CUSTOM_PIPELINE_DEAL_STAGES,
} = require('../constants/defaultPipelines');
const {
  DEFAULT_PIPELINE_LABELS,
  DEFAULT_LABEL_COLOR,
} = require('../constants/defaultPipelineLabels');

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

async function findCompanyLabel(companyId, pipelineId, labelId) {
  const pipeline = await findCompanyPipeline(companyId, pipelineId);
  if (!pipeline) {
    return null;
  }

  return PipelineLabel.findOne({
    where: { id: labelId, pipelineId: pipeline.id },
  });
}

function validateLabelColor(color) {
  const trimmed = color?.trim();
  if (!trimmed) {
    throw new Error('Label color is required.');
  }

  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) {
    return trimmed;
  }

  throw new Error('Invalid label color. Choose a valid hex color.');
}

async function createLabelsForPipeline(pipelineId, labelConfigs, transaction) {
  const labels = [];

  for (let i = 0; i < labelConfigs.length; i += 1) {
    const config = labelConfigs[i];
    const label = await PipelineLabel.create({
      pipelineId,
      name: config.name,
      slug: slugify(config.name),
      color: validateLabelColor(config.color),
      sortOrder: i,
      isActive: true,
    }, { transaction });
    labels.push(label);
  }

  return labels;
}

async function seedDefaultLabelsForPipeline(pipelineId, transaction = null) {
  const existingCount = await PipelineLabel.count({
    where: { pipelineId },
    transaction,
  });

  if (existingCount > 0) {
    return [];
  }

  return createLabelsForPipeline(pipelineId, DEFAULT_PIPELINE_LABELS, transaction);
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
  await seedDefaultLabelsForPipeline(pipeline.id, transaction);

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

async function labelNameExists(pipelineId, name, excludeLabelId = null, transaction = null) {
  const whereClause = {
    pipelineId,
    [Op.and]: [caseInsensitiveNameMatch('name', name)],
  };

  if (excludeLabelId) {
    whereClause.id = { [Op.ne]: excludeLabelId };
  }

  const count = await PipelineLabel.count({ where: whereClause, transaction });
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

async function getPipelineWithDetails(companyId, pipelineId) {
  return findCompanyPipeline(companyId, pipelineId, {
    include: [
      {
        model: PipelineStage,
        as: 'stages',
        separate: true,
        order: [['stageType', 'ASC'], ['sortOrder', 'ASC']],
      },
      {
        model: PipelineLabel,
        as: 'labels',
        separate: true,
        order: [['sortOrder', 'ASC']],
      },
    ],
  });
}

async function getPipelineWithStages(companyId, pipelineId) {
  return getPipelineWithDetails(companyId, pipelineId);
}

async function listCompanyPipelines(companyId) {
  return Pipeline.findAll({
    where: { companyId },
    include: [
      {
        model: PipelineStage,
        as: 'stages',
        attributes: ['id', 'stageType'],
      },
      {
        model: PipelineLabel,
        as: 'labels',
        attributes: ['id'],
      },
    ],
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

async function createLabel(companyId, pipelineId, { name, color }) {
  const pipeline = await findCompanyPipeline(companyId, pipelineId);
  if (!pipeline) {
    throw new Error('Pipeline not found.');
  }

  const trimmedName = name?.trim();
  if (!trimmedName) {
    throw new Error('Label name is required.');
  }

  const validatedColor = validateLabelColor(color);

  const baseSlug = slugify(trimmedName);
  if (!baseSlug) {
    throw new Error('Label name must contain at least one letter or number.');
  }

  return sequelize.transaction(async (transaction) => {
    if (await labelNameExists(pipeline.id, trimmedName, null, transaction)) {
      throw new Error('A label with this name already exists in this pipeline.');
    }

    let slug = baseSlug;
    let suffix = 1;
    while (await PipelineLabel.count({
      where: { pipelineId: pipeline.id, slug },
      transaction,
    })) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    const maxOrder = await PipelineLabel.max('sortOrder', {
      where: { pipelineId: pipeline.id },
      transaction,
    });

    return PipelineLabel.create({
      pipelineId: pipeline.id,
      name: trimmedName,
      slug,
      color: validatedColor,
      sortOrder: (maxOrder ?? -1) + 1,
      isActive: true,
    }, { transaction });
  });
}

async function updateLabel(companyId, pipelineId, labelId, { name, color, sortOrder }) {
  const label = await findCompanyLabel(companyId, pipelineId, labelId);
  if (!label) {
    throw new Error('Label not found.');
  }

  if (name !== undefined) {
    const trimmedName = name?.trim();
    if (!trimmedName) {
      throw new Error('Label name is required.');
    }

    if (await labelNameExists(label.pipelineId, trimmedName, labelId)) {
      throw new Error('A label with this name already exists in this pipeline.');
    }

    const baseSlug = slugify(trimmedName);
    let slug = baseSlug;
    let suffix = 1;
    while (await PipelineLabel.count({
      where: {
        pipelineId: label.pipelineId,
        slug,
        id: { [Op.ne]: labelId },
      },
    })) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    label.name = trimmedName;
    label.slug = slug;
  }

  if (color !== undefined) {
    label.color = validateLabelColor(color);
  }

  if (sortOrder !== undefined && sortOrder !== null && sortOrder !== '') {
    label.sortOrder = Number(sortOrder);
  }

  await label.save();
  return label;
}

async function deleteLabel(companyId, pipelineId, labelId) {
  const label = await findCompanyLabel(companyId, pipelineId, labelId);
  if (!label) {
    throw new Error('Label not found.');
  }

  await label.destroy();
  return label;
}

function normalizeIdList(value) {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];
  return values
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);
}

function normalizeSyncItems(items) {
  if (!items) {
    return [];
  }

  if (!Array.isArray(items) && typeof items === 'object') {
    const names = items.name;
    if (names !== undefined) {
      const ids = items.id !== undefined
        ? (Array.isArray(items.id) ? items.id : [items.id])
        : [];
      const nameList = Array.isArray(names) ? names : [names];
      const colors = items.color !== undefined
        ? (Array.isArray(items.color) ? items.color : [items.color])
        : [];
      const length = Math.max(nameList.length, ids.length, colors.length);

      return Array.from({ length }, (_, index) => ({
        id: ids[index] ? Number(ids[index]) : null,
        name: String(nameList[index] ?? '').trim(),
        color: colors[index] ? String(colors[index]).trim() : null,
      })).filter((item) => item.name);
    }
  }

  const list = Array.isArray(items) ? items : [items];
  const merged = [];
  let pending = null;

  list.forEach((item) => {
    if (!item || typeof item !== 'object') {
      return;
    }

    const hasId = item.id !== undefined && item.id !== null && String(item.id).trim() !== '';
    const hasName = item.name !== undefined && item.name !== null && String(item.name).trim() !== '';
    const hasColor = item.color !== undefined && item.color !== null && String(item.color).trim() !== '';

    if (hasId && !hasName && !hasColor) {
      if (pending) {
        merged.push(pending);
      }
      pending = {
        id: Number(item.id) || null,
        name: '',
        color: null,
      };
      return;
    }

    const entry = {
      id: hasId ? Number(item.id) || null : (pending?.id ?? null),
      name: hasName ? String(item.name).trim() : (pending?.name ?? ''),
      color: hasColor ? String(item.color).trim() : (pending?.color ?? null),
    };

    if (pending && !hasId) {
      entry.id = pending.id;
      if (!hasColor && pending.color) {
        entry.color = pending.color;
      }
      pending = null;
    }

    if (entry.name) {
      merged.push(entry);
    } else if (hasId) {
      pending = entry;
    }
  });

  if (pending?.name) {
    merged.push(pending);
  }

  return merged;
}

function validateUniqueNames(items, entityLabel) {
  const seen = new Set();

  items.forEach((item) => {
    if (!item.name) {
      throw new Error(`${entityLabel} name is required.`);
    }

    const key = item.name.toLowerCase();
    if (seen.has(key)) {
      throw new Error(`A ${entityLabel.toLowerCase()} with this name already exists in this pipeline.`);
    }

    seen.add(key);
  });
}

async function generateUniqueStageSlug(pipelineId, stageType, baseSlug, excludeId, transaction) {
  let slug = baseSlug;
  let suffix = 1;

  while (await PipelineStage.count({
    where: {
      pipelineId,
      stageType,
      slug,
      ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}),
    },
    transaction,
  })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

async function generateUniqueLabelSlug(pipelineId, baseSlug, excludeId, transaction) {
  let slug = baseSlug;
  let suffix = 1;

  while (await PipelineLabel.count({
    where: {
      pipelineId,
      slug,
      ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}),
    },
    transaction,
  })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

async function syncStages(companyId, pipelineId, stageType, { items, deletedIds }) {
  const pipeline = await findCompanyPipeline(companyId, pipelineId);
  if (!pipeline) {
    throw new Error('Pipeline not found.');
  }

  if (!['lead', 'deal'].includes(stageType)) {
    throw new Error('Invalid stage type.');
  }

  const normalizedItems = normalizeSyncItems(items);
  const normalizedDeletedIds = normalizeIdList(deletedIds);

  if (normalizedItems.length < 1) {
    throw new Error('Each pipeline must have at least one stage per type.');
  }

  validateUniqueNames(normalizedItems, 'Stage');

  return sequelize.transaction(async (transaction) => {
    if (normalizedDeletedIds.length > 0) {
      await PipelineStage.destroy({
        where: {
          id: normalizedDeletedIds,
          pipelineId: pipeline.id,
          stageType,
        },
        transaction,
      });
    }

    for (let i = 0; i < normalizedItems.length; i += 1) {
      const item = normalizedItems[i];
      const baseSlug = slugify(item.name);

      if (!baseSlug) {
        throw new Error('Stage name must contain at least one letter or number.');
      }

      if (item.id) {
        const stage = await PipelineStage.findOne({
          where: { id: item.id, pipelineId: pipeline.id, stageType },
          transaction,
        });

        if (!stage) {
          throw new Error('Stage not found.');
        }

        const slug = await generateUniqueStageSlug(
          pipeline.id,
          stageType,
          baseSlug,
          stage.id,
          transaction,
        );

        stage.name = item.name;
        stage.slug = slug;
        stage.sortOrder = i;
        await stage.save({ transaction });
      } else {
        const slug = await generateUniqueStageSlug(
          pipeline.id,
          stageType,
          baseSlug,
          null,
          transaction,
        );

        await PipelineStage.create({
          pipelineId: pipeline.id,
          stageType,
          name: item.name,
          slug,
          sortOrder: i,
          isActive: true,
        }, { transaction });
      }
    }

    return getPipelineWithDetails(companyId, pipelineId);
  });
}

async function syncLabels(companyId, pipelineId, { items, deletedIds }) {
  const pipeline = await findCompanyPipeline(companyId, pipelineId);
  if (!pipeline) {
    throw new Error('Pipeline not found.');
  }

  const normalizedItems = normalizeSyncItems(items);
  const normalizedDeletedIds = normalizeIdList(deletedIds);

  if (normalizedItems.length > 0) {
    validateUniqueNames(normalizedItems, 'Label');
  }

  return sequelize.transaction(async (transaction) => {
    if (normalizedDeletedIds.length > 0) {
      await PipelineLabel.destroy({
        where: {
          id: normalizedDeletedIds,
          pipelineId: pipeline.id,
        },
        transaction,
      });
    }

    for (let i = 0; i < normalizedItems.length; i += 1) {
      const item = normalizedItems[i];
      const baseSlug = slugify(item.name);

      if (!baseSlug) {
        throw new Error('Label name must contain at least one letter or number.');
      }

      const color = validateLabelColor(item.color || DEFAULT_LABEL_COLOR);

      if (item.id) {
        const label = await PipelineLabel.findOne({
          where: { id: item.id, pipelineId: pipeline.id },
          transaction,
        });

        if (!label) {
          throw new Error('Label not found.');
        }

        const slug = await generateUniqueLabelSlug(
          pipeline.id,
          baseSlug,
          label.id,
          transaction,
        );

        label.name = item.name;
        label.slug = slug;
        label.color = color;
        label.sortOrder = i;
        await label.save({ transaction });
      } else {
        const slug = await generateUniqueLabelSlug(
          pipeline.id,
          baseSlug,
          null,
          transaction,
        );

        await PipelineLabel.create({
          pipelineId: pipeline.id,
          name: item.name,
          slug,
          color,
          sortOrder: i,
          isActive: true,
        }, { transaction });
      }
    }

    return getPipelineWithDetails(companyId, pipelineId);
  });
}

module.exports = {
  slugify,
  findCompanyPipeline,
  findCompanyStage,
  findCompanyLabel,
  validateLabelColor,
  seedDefaultPipelines,
  seedDefaultLabelsForPipeline,
  createPipeline,
  updatePipeline,
  deletePipeline,
  getPipelineWithDetails,
  getPipelineWithStages,
  listCompanyPipelines,
  createStage,
  updateStage,
  deleteStage,
  createLabel,
  updateLabel,
  deleteLabel,
  syncStages,
  syncLabels,
  DEFAULT_LABEL_COLOR,
};
