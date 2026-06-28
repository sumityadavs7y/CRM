const { Op } = require('sequelize');
const { ProjectReraRegistration } = require('../models');
const { assertCompanyProject } = require('./projectService');
const { RERA_STATUSES, RERA_STATES } = require('../constants/projectManagement');

function parseOptionalDate(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed || null;
}

function normalizeReraInput(data) {
  return {
    registrationNumber: data.registrationNumber?.trim() || '',
    state: data.state?.trim() || '',
    promoterName: data.promoterName?.trim() || null,
    projectNameOnRera: data.projectNameOnRera?.trim() || null,
    validFrom: parseOptionalDate(data.validFrom),
    validUntil: parseOptionalDate(data.validUntil),
    status: data.status?.trim() || 'pending',
    reraPortalUrl: data.reraPortalUrl?.trim() || null,
    notes: data.notes?.trim() || null,
  };
}

function validateReraInput(input) {
  const errors = [];

  if (!input.registrationNumber) {
    errors.push('RERA registration number is required.');
  }

  if (!input.state) {
    errors.push('RERA state is required.');
  } else if (!RERA_STATES.includes(input.state)) {
    errors.push('Invalid RERA state.');
  }

  if (!RERA_STATUSES.includes(input.status)) {
    errors.push('Invalid RERA status.');
  }

  return errors;
}

async function assertCompanyRera(companyId, projectId, reraId) {
  await assertCompanyProject(companyId, projectId);
  const registration = await ProjectReraRegistration.findOne({
    where: { id: reraId, projectId },
  });
  if (!registration) {
    throw new Error('RERA registration not found.');
  }
  return registration;
}

async function listProjectReraRegistrations(companyId, projectId) {
  await assertCompanyProject(companyId, projectId);
  return ProjectReraRegistration.findAll({
    where: { projectId },
    order: [['validUntil', 'DESC'], ['registrationNumber', 'ASC']],
  });
}

async function createReraRegistration(companyId, projectId, data) {
  await assertCompanyProject(companyId, projectId);
  const input = normalizeReraInput(data);
  const errors = validateReraInput(input);
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  const existing = await ProjectReraRegistration.findOne({
    where: { projectId, registrationNumber: input.registrationNumber },
  });
  if (existing) {
    throw new Error('A RERA registration with this number already exists for this project.');
  }

  return ProjectReraRegistration.create({
    projectId,
    ...input,
  });
}

async function updateReraRegistration(companyId, projectId, reraId, data) {
  const registration = await assertCompanyRera(companyId, projectId, reraId);
  const input = normalizeReraInput(data);
  const errors = validateReraInput(input);
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  if (input.registrationNumber !== registration.registrationNumber) {
    const existing = await ProjectReraRegistration.findOne({
      where: {
        projectId,
        registrationNumber: input.registrationNumber,
        id: { [Op.ne]: reraId },
      },
    });
    if (existing) {
      throw new Error('A RERA registration with this number already exists for this project.');
    }
  }

  await registration.update(input);
  return registration;
}

async function deleteReraRegistration(companyId, projectId, reraId) {
  const registration = await assertCompanyRera(companyId, projectId, reraId);
  await registration.destroy();
}

function getReraFormOptions() {
  return {
    reraStatuses: RERA_STATUSES,
    reraStates: RERA_STATES,
  };
}

module.exports = {
  normalizeReraInput,
  validateReraInput,
  listProjectReraRegistrations,
  createReraRegistration,
  updateReraRegistration,
  deleteReraRegistration,
  getReraFormOptions,
};
