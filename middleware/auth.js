const { hasCapability } = require('../utils/capabilities');
const { roleHasPermission } = require('../utils/planFeatures');

function isAuthenticated(req, res, next) {
  if (req.session && (req.session.userId || req.session.companyId)) {
    return next();
  }
  res.redirect('/auth/login');
}

function isSuperAdmin(req, res, next) {
  if (req.session && req.session.authType === 'platform' && req.session.isSuperAdmin) {
    return next();
  }
  res.redirect('/dashboard');
}

function isCompanyAuthenticated(req, res, next) {
  if (req.session && req.session.authType === 'company' && req.session.companyId) {
    return next();
  }
  res.redirect('/dashboard');
}

function requireCapability(capabilityKey) {
  return (req, res, next) => {
    if (
      req.session
      && req.session.authType === 'company'
      && req.session.companyId
      && hasCapability(req.session.capabilities, capabilityKey)
    ) {
      return next();
    }
    res.redirect('/dashboard');
  };
}

function isCompanyAdmin(req, res, next) {
  if (
    req.session
    && req.session.authType === 'company'
    && req.session.companyId
    && roleHasPermission(req.session.permissions, 'user_management', 'edit')
  ) {
    return next();
  }
  res.redirect('/dashboard');
}

module.exports = {
  isAuthenticated,
  isSuperAdmin,
  isCompanyAuthenticated,
  requireCapability,
  isCompanyAdmin,
};
