const express = require('express');
const {
  CompanyRole,
  CompanyCredential,
  Sequelize,
} = require('../models');
const { isCompanyAuthenticated } = require('../middleware/auth');
const { requirePermission } = require('../middleware/companyFeatures');
const { withTheme } = require('../utils/themes');
const { buildUserContext } = require('../utils/sessionUser');
const {
  getCompanyPlanFeatures,
  countActiveRoleUsers,
  ADMINISTRATOR_SLUG,
} = require('../services/companyRbacService');
const {
  getAvailablePlanFeatures,
  parseRolePermissions,
  getFeatureAccessLevel,
  PERMISSION_ACTIONS,
} = require('../utils/planFeatures');

const router = express.Router();

function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function findCompanyRole(companyId, roleId) {
  return CompanyRole.findOne({
    where: { id: roleId, companyId },
  });
}

async function getAssignableRolesContext(companyId) {
  const planFeatures = await getCompanyPlanFeatures(companyId);
  const availableFeatures = getAvailablePlanFeatures().filter(
    (feature) => planFeatures.includes(feature.key)
  );

  return {
    planFeatures,
    availableFeatures,
    permissionActions: PERMISSION_ACTIONS,
    getFeatureAccessLevel,
  };
}

router.get('/', isCompanyAuthenticated, requirePermission('role_management', 'view'), async (req, res) => {
  const companyId = req.session.companyId;
  const roles = await CompanyRole.findAll({
    where: { companyId },
    order: [['isSystem', 'DESC'], ['name', 'ASC']],
  });

  const roleUserCounts = {};
  await Promise.all(roles.map(async (role) => {
    roleUserCounts[role.id] = await CompanyCredential.count({
      where: { companyId, companyRoleId: role.id },
    });
  }));

  res.render('company-roles/index', withTheme(req, {
    user: buildUserContext(req),
    roles,
    roleUserCounts,
    success: req.query.success || null,
    activeNav: 'company-roles',
  }));
});

router.get('/new', isCompanyAuthenticated, requirePermission('role_management', 'edit'), async (req, res) => {
  const assignable = await getAssignableRolesContext(req.session.companyId);

  res.render('company-roles/create', withTheme(req, {
    user: buildUserContext(req),
    error: null,
    values: { permissions: {} },
    ...assignable,
    activeNav: 'company-roles',
  }));
});

router.post('/', isCompanyAuthenticated, requirePermission('role_management', 'edit'), async (req, res) => {
  const companyId = req.session.companyId;
  const { name, description } = req.body;
  const assignable = await getAssignableRolesContext(companyId);
  const permissions = parseRolePermissions(req.body, assignable.planFeatures);
  const values = { name, description, permissions };

  function renderCreate(error) {
    return res.render('company-roles/create', withTheme(req, {
      user: buildUserContext(req),
      error,
      values,
      ...assignable,
      activeNav: 'company-roles',
    }));
  }

  if (!name || !name.trim()) {
    return renderCreate('Role name is required.');
  }

  const slug = slugify(name);
  if ([ADMINISTRATOR_SLUG, 'member'].includes(slug)) {
    return renderCreate('That role name is reserved.');
  }

  const existing = await CompanyRole.findOne({ where: { companyId, slug } });
  if (existing) {
    return renderCreate('A role with that name already exists.');
  }

  try {
    await CompanyRole.create({
      companyId,
      name: name.trim(),
      slug,
      description: description?.trim() || null,
      isSystem: false,
      permissions,
      capabilities: [],
      isActive: true,
    });

    res.redirect('/company/roles?success=Role created successfully.');
  } catch (error) {
    console.error('Create company role error:', error);
    return renderCreate('Unable to create role. Please try again.');
  }
});

router.get('/:id/edit', isCompanyAuthenticated, requirePermission('role_management', 'edit'), async (req, res) => {
  const role = await findCompanyRole(req.session.companyId, req.params.id);

  if (!role) {
    return res.redirect('/company/roles');
  }

  const assignable = await getAssignableRolesContext(req.session.companyId);
  const userCount = await countActiveRoleUsers(req.session.companyId, role.id);

  res.render('company-roles/edit', withTheme(req, {
    user: buildUserContext(req),
    role,
    userCount,
    error: null,
    values: {},
    ...assignable,
    activeNav: 'company-roles',
  }));
});

router.post('/:id/edit', isCompanyAuthenticated, requirePermission('role_management', 'edit'), async (req, res) => {
  const companyId = req.session.companyId;
  const role = await findCompanyRole(companyId, req.params.id);

  if (!role) {
    return res.redirect('/company/roles');
  }

  const assignable = await getAssignableRolesContext(companyId);
  const userCount = await countActiveRoleUsers(companyId, role.id);
  const { name, description, isActive } = req.body;
  const permissions = parseRolePermissions(req.body, assignable.planFeatures);
  const values = {
    name,
    description,
    isActive: isActive === 'on',
    permissions,
  };

  function renderEdit(error) {
    return res.render('company-roles/edit', withTheme(req, {
      user: buildUserContext(req),
      role,
      userCount,
      error,
      values,
      ...assignable,
      activeNav: 'company-roles',
    }));
  }

  if (!name || !name.trim()) {
    return renderEdit('Role name is required.');
  }

  if (role.isSystem && role.slug === ADMINISTRATOR_SLUG) {
    return renderEdit('The Administrator system role cannot be edited.');
  }

  const nextIsActive = isActive === 'on';

  if (!role.isSystem && !nextIsActive && userCount > 0) {
    return renderEdit('Deactivate or reassign team members before deactivating this role.');
  }

  const slug = slugify(name);
  if (!role.isSystem && [ADMINISTRATOR_SLUG, 'member'].includes(slug)) {
    return renderEdit('That role name is reserved.');
  }

  const duplicate = await CompanyRole.findOne({
    where: {
      companyId,
      slug: role.isSystem ? role.slug : slug,
      id: { [Sequelize.Op.ne]: role.id },
    },
  });
  if (!role.isSystem && duplicate) {
    return renderEdit('A role with that name already exists.');
  }

  try {
    await role.update({
      name: role.isSystem ? role.name : name.trim(),
      slug: role.isSystem ? role.slug : slug,
      description: role.isSystem ? role.description : (description?.trim() || null),
      permissions: role.slug === ADMINISTRATOR_SLUG ? role.permissions : permissions,
      capabilities: role.isSystem ? role.capabilities : [],
      isActive: role.isSystem ? role.isActive : nextIsActive,
    });

    res.redirect('/company/roles?success=Role updated successfully.');
  } catch (error) {
    console.error('Update company role error:', error);
    return renderEdit('Unable to update role. Please try again.');
  }
});

module.exports = router;
