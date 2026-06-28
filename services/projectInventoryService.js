const { Op } = require('sequelize');
const {
  Project,
  ProjectPhase,
  ProjectBlock,
  ProjectFloor,
  ProjectUnit,
} = require('../models');
const { assertCompanyProject, slugify } = require('./projectService');
const {
  PHASE_STATUSES,
  UNIT_TYPES,
  UNIT_STATUSES,
  UNIT_FACINGS,
} = require('../constants/projectManagement');

async function assertCompanyPhase(companyId, projectId, phaseId) {
  await assertCompanyProject(companyId, projectId);
  const phase = await ProjectPhase.findOne({
    where: { id: phaseId, projectId },
  });
  if (!phase) {
    throw new Error('Phase not found.');
  }
  return phase;
}

async function assertCompanyBlock(companyId, projectId, blockId) {
  await assertCompanyProject(companyId, projectId);
  const block = await ProjectBlock.findOne({
    where: { id: blockId, projectId },
  });
  if (!block) {
    throw new Error('Block not found.');
  }
  return block;
}

async function assertCompanyFloor(companyId, projectId, floorId) {
  await assertCompanyProject(companyId, projectId);
  const floor = await ProjectFloor.findOne({
    where: { id: floorId },
    include: [{
      model: ProjectBlock,
      as: 'block',
      where: { projectId },
      required: true,
    }],
  });
  if (!floor) {
    throw new Error('Floor not found.');
  }
  return floor;
}

async function assertCompanyUnit(companyId, projectId, unitId) {
  await assertCompanyProject(companyId, projectId);
  const unit = await ProjectUnit.findOne({
    where: { id: unitId },
    include: [{
      model: ProjectFloor,
      as: 'floor',
      required: true,
      include: [{
        model: ProjectBlock,
        as: 'block',
        where: { projectId },
        required: true,
      }],
    }],
  });
  if (!unit) {
    throw new Error('Unit not found.');
  }
  return unit;
}

async function generateUniquePhaseSlug(projectId, name, excludePhaseId = null) {
  const baseSlug = slugify(name) || 'phase';
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const where = { projectId, slug };
    if (excludePhaseId) {
      where.id = { [Op.ne]: excludePhaseId };
    }
    const existing = await ProjectPhase.findOne({ where });
    if (!existing) {
      return slug;
    }
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

async function generateUniqueBlockSlug(projectId, name, excludeBlockId = null) {
  const baseSlug = slugify(name) || 'block';
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const where = { projectId, slug };
    if (excludeBlockId) {
      where.id = { [Op.ne]: excludeBlockId };
    }
    const existing = await ProjectBlock.findOne({ where });
    if (!existing) {
      return slug;
    }
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

function parseOptionalId(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalDecimal(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalInt(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePhaseInput(data) {
  return {
    name: data.name?.trim() || '',
    status: data.status?.trim() || 'planning',
    launchDate: data.launchDate?.trim() || null,
    possessionDate: data.possessionDate?.trim() || null,
  };
}

function validatePhaseInput(input) {
  const errors = [];
  if (!input.name) {
    errors.push('Phase name is required.');
  }
  if (!PHASE_STATUSES.includes(input.status)) {
    errors.push('Invalid phase status.');
  }
  return errors;
}

function normalizeBlockInput(data) {
  return {
    name: data.name?.trim() || '',
    phaseId: parseOptionalId(data.phaseId),
    totalFloors: parseOptionalInt(data.totalFloors),
  };
}

function validateBlockInput(input) {
  const errors = [];
  if (!input.name) {
    errors.push('Block name is required.');
  }
  return errors;
}

function normalizeFloorInput(data) {
  const floorNumber = parseOptionalInt(data.floorNumber);
  const label = data.label?.trim() || (floorNumber !== null ? String(floorNumber) : '');

  return {
    label,
    floorNumber,
  };
}

function validateFloorInput(input) {
  const errors = [];
  if (!input.label) {
    errors.push('Floor label is required.');
  }
  if (input.floorNumber === null) {
    errors.push('Floor number is required.');
  }
  return errors;
}

function normalizeUnitInput(data) {
  return {
    unitNumber: data.unitNumber?.trim() || '',
    unitType: data.unitType?.trim() || '2bhk',
    carpetAreaSqft: parseOptionalDecimal(data.carpetAreaSqft),
    superBuiltUpAreaSqft: parseOptionalDecimal(data.superBuiltUpAreaSqft),
    facing: data.facing?.trim() || null,
    basePrice: parseOptionalDecimal(data.basePrice),
    status: data.status?.trim() || 'available',
  };
}

function validateUnitInput(input) {
  const errors = [];
  if (!input.unitNumber) {
    errors.push('Unit number is required.');
  }
  if (!UNIT_TYPES.includes(input.unitType)) {
    errors.push('Invalid unit type.');
  }
  if (input.facing && !UNIT_FACINGS.includes(input.facing)) {
    errors.push('Invalid facing direction.');
  }
  if (!UNIT_STATUSES.includes(input.status)) {
    errors.push('Invalid unit status.');
  }
  return errors;
}

async function getNextSortOrder(Model, where) {
  const max = await Model.max('sortOrder', { where });
  return (max ?? -1) + 1;
}

async function createPhase(companyId, projectId, data) {
  await assertCompanyProject(companyId, projectId);
  const input = normalizePhaseInput(data);
  const errors = validatePhaseInput(input);
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  const slug = await generateUniquePhaseSlug(projectId, input.name);
  const sortOrder = await getNextSortOrder(ProjectPhase, { projectId });

  return ProjectPhase.create({
    projectId,
    slug,
    sortOrder,
    ...input,
  });
}

async function updatePhase(companyId, projectId, phaseId, data) {
  const phase = await assertCompanyPhase(companyId, projectId, phaseId);
  const input = normalizePhaseInput(data);
  const errors = validatePhaseInput(input);
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  if (input.name !== phase.name) {
    phase.slug = await generateUniquePhaseSlug(projectId, input.name, phaseId);
  }

  await phase.update(input);
  return phase;
}

async function deletePhase(companyId, projectId, phaseId) {
  const phase = await assertCompanyPhase(companyId, projectId, phaseId);
  await phase.destroy();
}

async function createBlock(companyId, projectId, data) {
  await assertCompanyProject(companyId, projectId);
  const input = normalizeBlockInput(data);
  const errors = validateBlockInput(input);
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  if (input.phaseId) {
    const phase = await ProjectPhase.findOne({
      where: { id: input.phaseId, projectId },
    });
    if (!phase) {
      throw new Error('Phase not found.');
    }
  }

  const slug = await generateUniqueBlockSlug(projectId, input.name);
  const sortOrder = await getNextSortOrder(ProjectBlock, { projectId });

  return ProjectBlock.create({
    projectId,
    slug,
    sortOrder,
    ...input,
  });
}

async function updateBlock(companyId, projectId, blockId, data) {
  const block = await assertCompanyBlock(companyId, projectId, blockId);
  const input = normalizeBlockInput(data);
  const errors = validateBlockInput(input);
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  if (input.phaseId) {
    const phase = await ProjectPhase.findOne({
      where: { id: input.phaseId, projectId },
    });
    if (!phase) {
      throw new Error('Phase not found.');
    }
  }

  if (input.name !== block.name) {
    block.slug = await generateUniqueBlockSlug(projectId, input.name, blockId);
  }

  await block.update(input);
  return block;
}

async function deleteBlock(companyId, projectId, blockId) {
  const block = await assertCompanyBlock(companyId, projectId, blockId);
  await block.destroy();
}

async function createFloor(companyId, projectId, blockId, data) {
  await assertCompanyBlock(companyId, projectId, blockId);
  const input = normalizeFloorInput(data);
  const errors = validateFloorInput(input);
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  const existing = await ProjectFloor.findOne({
    where: { blockId, floorNumber: input.floorNumber },
  });
  if (existing) {
    throw new Error('A floor with this number already exists in this block.');
  }

  const sortOrder = await getNextSortOrder(ProjectFloor, { blockId });

  return ProjectFloor.create({
    blockId,
    sortOrder,
    ...input,
  });
}

async function updateFloor(companyId, projectId, floorId, data) {
  const floor = await assertCompanyFloor(companyId, projectId, floorId);
  const input = normalizeFloorInput(data);
  const errors = validateFloorInput(input);
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  if (input.floorNumber !== floor.floorNumber) {
    const existing = await ProjectFloor.findOne({
      where: {
        blockId: floor.blockId,
        floorNumber: input.floorNumber,
        id: { [Op.ne]: floorId },
      },
    });
    if (existing) {
      throw new Error('A floor with this number already exists in this block.');
    }
  }

  await floor.update(input);
  return floor;
}

async function deleteFloor(companyId, projectId, floorId) {
  const floor = await assertCompanyFloor(companyId, projectId, floorId);
  await floor.destroy();
}

async function createUnit(companyId, projectId, floorId, data) {
  await assertCompanyFloor(companyId, projectId, floorId);
  const input = normalizeUnitInput(data);
  const errors = validateUnitInput(input);
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  const existing = await ProjectUnit.findOne({
    where: { floorId, unitNumber: input.unitNumber },
  });
  if (existing) {
    throw new Error('A unit with this number already exists on this floor.');
  }

  return ProjectUnit.create({
    floorId,
    ...input,
  });
}

async function updateUnit(companyId, projectId, unitId, data) {
  const unit = await assertCompanyUnit(companyId, projectId, unitId);
  const input = normalizeUnitInput({
    unitNumber: data.unitNumber !== undefined ? data.unitNumber : unit.unitNumber,
    unitType: data.unitType !== undefined ? data.unitType : unit.unitType,
    carpetAreaSqft: data.carpetAreaSqft !== undefined ? data.carpetAreaSqft : unit.carpetAreaSqft,
    superBuiltUpAreaSqft: data.superBuiltUpAreaSqft !== undefined ? data.superBuiltUpAreaSqft : unit.superBuiltUpAreaSqft,
    facing: data.facing !== undefined ? data.facing : unit.facing,
    basePrice: data.basePrice !== undefined ? data.basePrice : unit.basePrice,
    status: data.status !== undefined ? data.status : unit.status,
  });
  const errors = validateUnitInput(input);
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  if (input.unitNumber !== unit.unitNumber) {
    const existing = await ProjectUnit.findOne({
      where: {
        floorId: unit.floorId,
        unitNumber: input.unitNumber,
        id: { [Op.ne]: unitId },
      },
    });
    if (existing) {
      throw new Error('A unit with this number already exists on this floor.');
    }
  }

  await unit.update(input);
  return unit;
}

async function deleteUnit(companyId, projectId, unitId) {
  const unit = await assertCompanyUnit(companyId, projectId, unitId);
  await unit.destroy();
}

function getInventoryFormOptions() {
  return {
    phaseStatuses: PHASE_STATUSES,
    unitTypes: UNIT_TYPES,
    unitStatuses: UNIT_STATUSES,
    unitFacings: UNIT_FACINGS,
  };
}

module.exports = {
  assertCompanyPhase,
  assertCompanyBlock,
  assertCompanyFloor,
  assertCompanyUnit,
  normalizePhaseInput,
  normalizeBlockInput,
  normalizeFloorInput,
  normalizeUnitInput,
  createPhase,
  updatePhase,
  deletePhase,
  createBlock,
  updateBlock,
  deleteBlock,
  createFloor,
  updateFloor,
  deleteFloor,
  createUnit,
  updateUnit,
  deleteUnit,
  getInventoryFormOptions,
};
