const {
  Company,
  CompanyRole,
  CompanyCredential,
  CompanySubscription,
  SubscriptionPlan,
} = require('../models');
const {
  buildFullPermissions,
  getPlanFeatureKeys,
  normalizePermissions,
  resolveEffectivePermissions,
  validateRolePermissions,
} = require('../utils/planFeatures');

const ADMINISTRATOR_SLUG = 'administrator';
const MEMBER_SLUG = 'member';

async function loadCompanySubscription(companyId) {
  return CompanySubscription.findOne({
    where: { companyId },
    include: [{ model: SubscriptionPlan, as: 'plan' }],
  });
}

async function getCompanyPlanFeatures(companyId) {
  const subscription = await loadCompanySubscription(companyId);
  return getPlanFeatureKeys(subscription?.plan);
}

async function seedDefaultRoles(companyId, transaction) {
  const adminRole = await CompanyRole.create({
    companyId,
    name: 'Administrator',
    slug: ADMINISTRATOR_SLUG,
    description: 'Full company administration access',
    isSystem: true,
    permissions: {},
    capabilities: [],
    isActive: true,
  }, { transaction });

  const memberRole = await CompanyRole.create({
    companyId,
    name: 'Member',
    slug: MEMBER_SLUG,
    description: 'Standard team member with role-assigned access',
    isSystem: true,
    permissions: {},
    capabilities: [],
    isActive: true,
  }, { transaction });

  return { adminRole, memberRole };
}

async function getAdministratorRole(companyId, transaction = null) {
  return CompanyRole.findOne({
    where: {
      companyId,
      slug: ADMINISTRATOR_SLUG,
      isSystem: true,
    },
    transaction,
  });
}

function resolveRolePermissions(role, planFeatures) {
  if (role.isSystem && role.slug === ADMINISTRATOR_SLUG) {
    return buildFullPermissions(planFeatures);
  }

  return normalizePermissions(role.permissions);
}

function resolveRoleCapabilities(role) {
  return Array.isArray(role.capabilities) ? role.capabilities : [];
}

function resolveCredentialAccess(credential, subscription, companyRole) {
  const planFeatures = getPlanFeatureKeys(subscription?.plan);
  const rolePermissions = resolveRolePermissions(companyRole, planFeatures);
  const capabilities = resolveRoleCapabilities(companyRole);
  const permissions = resolveEffectivePermissions(subscription, rolePermissions);

  return {
    roleId: companyRole.id,
    roleName: companyRole.name,
    roleSlug: companyRole.slug,
    permissions,
    capabilities,
    planFeatures,
    rawRolePermissions: rolePermissions,
  };
}

async function trimRolesToPlan(companyId) {
  const planFeatures = await getCompanyPlanFeatures(companyId);
  const roles = await CompanyRole.findAll({ where: { companyId } });

  await Promise.all(roles.map(async (role) => {
    if (role.isSystem && role.slug === ADMINISTRATOR_SLUG) {
      return;
    }

    const trimmedPermissions = validateRolePermissions(role.permissions, planFeatures);
    if (JSON.stringify(trimmedPermissions) !== JSON.stringify(role.permissions || {})) {
      await role.update({ permissions: trimmedPermissions });
    }
  }));
}

async function countActiveRoleUsers(companyId, roleId) {
  return CompanyCredential.count({
    where: {
      companyId,
      companyRoleId: roleId,
      isActive: true,
    },
  });
}

async function wouldLeaveWithoutAdministrator(companyId, targetCredential, updates) {
  const adminRole = await getAdministratorRole(companyId);
  if (!adminRole) {
    return false;
  }

  const nextRoleId = updates.companyRoleId !== undefined
    ? updates.companyRoleId
    : targetCredential.companyRoleId;
  const nextIsActive = updates.isActive !== undefined
    ? updates.isActive
    : targetCredential.isActive;

  if (nextRoleId === adminRole.id && nextIsActive) {
    return false;
  }

  const otherActiveAdmins = await CompanyCredential.count({
    where: {
      companyId,
      companyRoleId: adminRole.id,
      isActive: true,
      id: { [require('../models').Sequelize.Op.ne]: targetCredential.id },
    },
  });

  return otherActiveAdmins === 0;
}

function isAdministratorRole(role) {
  return role.isSystem && role.slug === ADMINISTRATOR_SLUG;
}

module.exports = {
  ADMINISTRATOR_SLUG,
  MEMBER_SLUG,
  loadCompanySubscription,
  getCompanyPlanFeatures,
  seedDefaultRoles,
  getAdministratorRole,
  resolveRolePermissions,
  resolveRoleCapabilities,
  resolveCredentialAccess,
  trimRolesToPlan,
  countActiveRoleUsers,
  wouldLeaveWithoutAdministrator,
  isAdministratorRole,
};
