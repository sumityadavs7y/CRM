const { hasCapability } = require('./capabilities');
const { roleHasPermission } = require('./planFeatures');
const { getUserInitials, getInitialsColorClass } = require('./userInitials');

function buildUserContext(req) {
  const permissions = req.session?.permissions || {};
  const capabilities = req.session?.capabilities || [];

  return {
    id: req.session.userId || req.session.credentialId,
    name: req.session.userName,
    email: req.session.userEmail,
    role: req.session.userRole,
    roleName: req.session.companyRoleName || req.session.userRole || null,
    companyRoleId: req.session.companyRoleId || null,
    permissions,
    capabilities,
    isSuperAdmin: req.session.isSuperAdmin,
    authType: req.session.authType,
    companyId: req.session.companyId || null,
    companyName: req.session.companyName || null,
    avatarUrl: req.session.avatarUrl || null,
    initials: getUserInitials(req.session.userName),
    initialsColorClass: getInitialsColorClass(req.session.userName),
    themeId: req.session.themeId || null,
    colorMode: req.session.colorMode || null,
    can(featureKey, action) {
      return roleHasPermission(permissions, featureKey, action);
    },
    hasCapability(capabilityKey) {
      return hasCapability(capabilities, capabilityKey);
    },
  };
}

function applyProfileToSession(req, credential) {
  req.session.userName = credential.adminName;
  req.session.userEmail = credential.email;
  req.session.themeId = credential.themeId || null;
  req.session.colorMode = credential.colorMode || null;
  req.session.avatarUrl = credential.avatarPath ? '/profile/avatar' : null;
}

function applyAccessToSession(req, access) {
  req.session.companyRoleId = access.roleId;
  req.session.companyRoleName = access.roleName;
  req.session.userRole = access.roleName;
  req.session.permissions = access.permissions;
  req.session.capabilities = access.capabilities;
  req.session.planFeatures = access.planFeatures;
  req.session.rawRolePermissions = access.rawRolePermissions;
}

function clearAccessSession(req) {
  delete req.session.companyRoleId;
  delete req.session.companyRoleName;
  delete req.session.permissions;
  delete req.session.capabilities;
  delete req.session.planFeatures;
  delete req.session.rawRolePermissions;
}

module.exports = {
  buildUserContext,
  applyAccessToSession,
  applyProfileToSession,
  clearAccessSession,
};
