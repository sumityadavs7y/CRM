const express = require('express');
const bcrypt = require('bcrypt');
const {
  CompanyCredential,
  CompanyRole,
  User,
  CompanySubscription,
  SubscriptionPlan,
  Sequelize,
} = require('../models');
const { isCompanyAuthenticated } = require('../middleware/auth');
const { withTheme } = require('../utils/themes');
const { buildUserContext } = require('../utils/sessionUser');
const { loadCompanySubscription, requirePermission } = require('../middleware/companyFeatures');
const {
  wouldLeaveWithoutAdministrator,
} = require('../services/companyRbacService');

const router = express.Router();

async function getCompanyCredentials(companyId) {
  return CompanyCredential.findAll({
    where: { companyId },
    include: [{ model: CompanyRole, as: 'companyRole' }],
    order: [['createdAt', 'ASC']],
  });
}

async function findCompanyCredential(companyId, credentialId) {
  return CompanyCredential.findOne({
    where: { id: credentialId, companyId },
    include: [{ model: CompanyRole, as: 'companyRole' }],
  });
}

async function getActiveCompanyRoles(companyId) {
  return CompanyRole.findAll({
    where: { companyId, isActive: true },
    order: [['isSystem', 'DESC'], ['name', 'ASC']],
  });
}

async function getActiveUserCount(companyId) {
  return CompanyCredential.count({
    where: { companyId, isActive: true },
  });
}

async function emailInUse(email, excludeCredentialId = null) {
  const normalizedEmail = email.toLowerCase();
  const credentialWhere = { email: normalizedEmail };
  if (excludeCredentialId) {
    credentialWhere.id = { [Sequelize.Op.ne]: excludeCredentialId };
  }

  const existingCredential = await CompanyCredential.findOne({ where: credentialWhere });
  const existingUser = await User.findOne({ where: { email: normalizedEmail } });
  return !!(existingCredential || existingUser);
}

router.get('/', isCompanyAuthenticated, requirePermission('user_management', 'view'), async (req, res) => {
  const credentials = await getCompanyCredentials(req.session.companyId);
  const subscription = await loadCompanySubscription(req.session.companyId);
  const maxUsers = subscription?.plan?.maxUsers || null;

  res.render('company-users/index', withTheme(req, {
    user: buildUserContext(req),
    credentials,
    maxUsers,
    activeUserCount: credentials.filter((credential) => credential.isActive).length,
    success: req.query.success || null,
    activeNav: 'company-users',
  }));
});

router.get('/new', isCompanyAuthenticated, requirePermission('user_management', 'edit'), async (req, res) => {
  const roles = await getActiveCompanyRoles(req.session.companyId);

  res.render('company-users/create', withTheme(req, {
    user: buildUserContext(req),
    error: null,
    values: {},
    roles,
    activeNav: 'company-users',
  }));
});

router.post('/', isCompanyAuthenticated, requirePermission('user_management', 'edit'), async (req, res) => {
  const { adminName, email, password, confirmPassword, companyRoleId } = req.body;
  const values = { adminName, email, companyRoleId };
  const companyId = req.session.companyId;
  const roles = await getActiveCompanyRoles(companyId);

  function renderCreate(error) {
    return res.render('company-users/create', withTheme(req, {
      user: buildUserContext(req),
      error,
      values,
      roles,
      activeNav: 'company-users',
    }));
  }

  if (!adminName || !email || !password || !confirmPassword || !companyRoleId) {
    return renderCreate('All fields are required.');
  }

  if (password !== confirmPassword) {
    return renderCreate('Passwords do not match.');
  }

  const selectedRole = roles.find((role) => String(role.id) === String(companyRoleId));
  if (!selectedRole) {
    return renderCreate('Please select a valid role.');
  }

  const subscription = await CompanySubscription.findOne({
    where: { companyId },
    include: [{ model: SubscriptionPlan, as: 'plan' }],
  });

  if (subscription?.plan) {
    const activeUserCount = await getActiveUserCount(companyId);
    if (activeUserCount >= subscription.plan.maxUsers) {
      return renderCreate(`User limit reached (${subscription.plan.maxUsers}). Upgrade your plan or deactivate a user.`);
    }
  }

  if (await emailInUse(email)) {
    return renderCreate('That email is already in use for another login.');
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    await CompanyCredential.create({
      companyId,
      companyRoleId: selectedRole.id,
      adminName: adminName.trim(),
      email: email.toLowerCase(),
      password: passwordHash,
    });

    res.redirect('/company/users?success=Team member created successfully.');
  } catch (error) {
    console.error('Create company user error:', error);
    return renderCreate('Unable to create team member. Please try again.');
  }
});

router.get('/:id/edit', isCompanyAuthenticated, requirePermission('user_management', 'edit'), async (req, res) => {
  const credential = await findCompanyCredential(req.session.companyId, req.params.id);

  if (!credential) {
    return res.redirect('/company/users');
  }

  const roles = await getActiveCompanyRoles(req.session.companyId);

  res.render('company-users/edit', withTheme(req, {
    user: buildUserContext(req),
    credential,
    error: null,
    values: {},
    roles,
    isSelf: credential.id === req.session.credentialId,
    activeNav: 'company-users',
  }));
});

router.post('/:id/edit', isCompanyAuthenticated, requirePermission('user_management', 'edit'), async (req, res) => {
  const companyId = req.session.companyId;
  const credential = await findCompanyCredential(companyId, req.params.id);

  if (!credential) {
    return res.redirect('/company/users');
  }

  const roles = await getActiveCompanyRoles(companyId);
  const { adminName, companyRoleId, isActive, password, confirmPassword } = req.body;
  const values = {
    adminName,
    companyRoleId,
    isActive: isActive === 'on',
  };

  function renderEdit(error) {
    return res.render('company-users/edit', withTheme(req, {
      user: buildUserContext(req),
      credential,
      error,
      values,
      roles,
      isSelf: credential.id === req.session.credentialId,
      activeNav: 'company-users',
    }));
  }

  if (!adminName) {
    return renderEdit('Name is required.');
  }

  const selectedRole = roles.find((role) => String(role.id) === String(companyRoleId));
  if (!selectedRole) {
    return renderEdit('Please select a valid role.');
  }

  const nextIsActive = values.isActive;

  if (await wouldLeaveWithoutAdministrator(companyId, credential, {
    companyRoleId: selectedRole.id,
    isActive: nextIsActive,
  })) {
    return renderEdit('Each company must have at least one active Administrator.');
  }

  if (password || confirmPassword) {
    if (password !== confirmPassword) {
      return renderEdit('Passwords do not match.');
    }
  }

  try {
    const updates = {
      adminName: adminName.trim(),
      companyRoleId: selectedRole.id,
      isActive: nextIsActive,
    };

    if (password) {
      updates.password = await bcrypt.hash(password, 10);
    }

    await credential.update(updates);
    res.redirect('/company/users?success=Team member updated successfully.');
  } catch (error) {
    console.error('Update company user error:', error);
    return renderEdit('Unable to update team member. Please try again.');
  }
});

module.exports = router;
