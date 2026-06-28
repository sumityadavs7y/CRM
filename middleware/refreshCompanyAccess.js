const {
  Company,
  CompanyCredential,
  CompanyRole,
  CompanySubscription,
  SubscriptionPlan,
} = require('../models');
const { resolveCredentialAccess } = require('../services/companyRbacService');
const { applyAccessToSession, applyProfileToSession } = require('../utils/sessionUser');
const { isSubscriptionValid } = require('../utils/subscription');

async function refreshCompanyAccess(req, res, next) {
  if (req.session?.authType !== 'company' || !req.session.credentialId) {
    return next();
  }

  try {
    const credential = await CompanyCredential.findByPk(req.session.credentialId, {
      include: [
        { model: CompanyRole, as: 'companyRole' },
        {
          model: Company,
          as: 'company',
          include: [{
            model: CompanySubscription,
            as: 'subscription',
            include: [{ model: SubscriptionPlan, as: 'plan' }],
          }],
        },
      ],
    });

    if (
      !credential
      || !credential.isActive
      || !credential.companyRole
      || !credential.company
      || !credential.company.isActive
      || !isSubscriptionValid(credential.company.subscription)
    ) {
      return next();
    }

    const access = resolveCredentialAccess(
      credential,
      credential.company.subscription,
      credential.companyRole
    );
    applyAccessToSession(req, access);
    applyProfileToSession(req, credential);
  } catch (error) {
    console.error('Failed to refresh company access:', error);
  }

  next();
}

module.exports = {
  refreshCompanyAccess,
};
