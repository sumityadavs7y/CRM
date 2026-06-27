const {
  Company,
  CompanyCredential,
  CompanyRole,
  CompanySubscription,
  SubscriptionPlan,
} = require('../models');
const { isDevEnvMode } = require('../utils/helpers');
const { isSubscriptionValid } = require('../utils/subscription');
const { resolveCredentialAccess } = require('../services/companyRbacService');
const { applyAccessToSession } = require('../utils/sessionUser');

function setCompanySession(req, credential) {
  req.session.authType = 'company';
  req.session.companyId = credential.company.id;
  req.session.companyName = credential.company.name;
  req.session.credentialId = credential.id;
  req.session.userName = credential.adminName;
  req.session.userEmail = credential.email;
  req.session.isSuperAdmin = false;

  const access = resolveCredentialAccess(
    credential,
    credential.company.subscription,
    credential.companyRole,
  );
  applyAccessToSession(req, access);
}

async function findCompanyCredential(email) {
  return CompanyCredential.findOne({
    where: { email: email.toLowerCase(), isActive: true },
    include: [{
      model: Company,
      as: 'company',
      where: { isActive: true },
      include: [{
        model: CompanySubscription,
        as: 'subscription',
        include: [{ model: SubscriptionPlan, as: 'plan' }],
      }],
    }, {
      model: CompanyRole,
      as: 'companyRole',
    }],
  });
}

function createCompanyAutoLogin(email, label) {
  let noticeLogged = false;

  return async function companyAutoLogin(req, res, next) {
    if (!isDevEnvMode()) {
      return next();
    }

    if (req.session?.userId || req.session?.companyId) {
      return next();
    }

    try {
      const credential = await findCompanyCredential(email);
      if (!credential || !isSubscriptionValid(credential.company.subscription)) {
        return next();
      }

      setCompanySession(req, credential);

      if (!noticeLogged) {
        console.log(`🧪 Dev auto-login enabled: signed in as ${label} (${credential.email})`);
        noticeLogged = true;
      }

      next();
    } catch (error) {
      console.error(`Dev auto-login (${label}) failed:`, error);
      next();
    }
  };
}

module.exports = {
  createCompanyAutoLogin,
};
