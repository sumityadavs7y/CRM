const { CompanySubscription, SubscriptionPlan } = require('../models');
const { companyHasFeature, roleHasPermission } = require('../utils/planFeatures');

async function loadCompanySubscription(companyId) {
  return CompanySubscription.findOne({
    where: { companyId },
    include: [{ model: SubscriptionPlan, as: 'plan' }],
  });
}

function requireCompanyFeature(featureKey) {
  return async (req, res, next) => {
    if (req.session.authType !== 'company' || !req.session.companyId) {
      return res.redirect('/dashboard');
    }

    try {
      const subscription = await loadCompanySubscription(req.session.companyId);

      if (!companyHasFeature(subscription, featureKey)) {
        return res.status(403).render('errors/feature-unavailable', {
          featureKey,
          companyName: req.session.companyName,
        });
      }

      req.companySubscription = subscription;
      next();
    } catch (error) {
      console.error('Feature access check failed:', error);
      res.redirect('/dashboard');
    }
  };
}

function requirePermission(featureKey, action) {
  return async (req, res, next) => {
    if (req.session.authType !== 'company' || !req.session.companyId) {
      return res.redirect('/dashboard');
    }

    try {
      const subscription = await loadCompanySubscription(req.session.companyId);

      if (!companyHasFeature(subscription, featureKey)) {
        return res.status(403).render('errors/feature-unavailable', {
          featureKey,
          companyName: req.session.companyName,
        });
      }

      if (!roleHasPermission(req.session.permissions, featureKey, action)) {
        return res.status(403).render('errors/permission-denied', {
          featureKey,
          action,
          companyName: req.session.companyName,
        });
      }

      req.companySubscription = subscription;
      next();
    } catch (error) {
      console.error('Permission check failed:', error);
      res.redirect('/dashboard');
    }
  };
}

module.exports = {
  loadCompanySubscription,
  requireCompanyFeature,
  requirePermission,
};
