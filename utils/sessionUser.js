const { hasCapability } = require('./capabilities');
const { roleHasPermission } = require('./planFeatures');
const { getUserInitials, getInitialsColorClass } = require('./userInitials');

function getCompanyAcronym(companyName) {
  const words = String(companyName || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return 'CRM';
  }

  if (words.length === 1) {
    return words[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase();
  }

  const chars = [];
  const firstWord = words[0].replace(/[^a-zA-Z0-9]/g, '');
  if (firstWord[0]) {
    chars.push(firstWord[0]);
  }
  if (firstWord[1] && chars.length < 3) {
    chars.push(firstWord[1]);
  }

  for (let i = 1; i < words.length && chars.length < 3; i += 1) {
    const letter = words[i].replace(/[^a-zA-Z0-9]/g, '')[0];
    if (letter) {
      chars.push(letter);
    }
  }

  return chars.join('').slice(0, 3).toUpperCase();
}

function getNavBrandLabel(session) {
  if (session?.authType === 'company' && session.companyName) {
    return `${session.companyName}'s CRM`;
  }
  return 'CRM';
}

function getNavBrandShortLabel(session) {
  if (session?.authType === 'company' && session.companyName) {
    return getCompanyAcronym(session.companyName);
  }
  return 'CRM';
}

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
    navBrandLabel: getNavBrandLabel(req.session),
    navBrandShortLabel: getNavBrandShortLabel(req.session),
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
  getCompanyAcronym,
  getNavBrandLabel,
  getNavBrandShortLabel,
  applyAccessToSession,
  applyProfileToSession,
  clearAccessSession,
};
