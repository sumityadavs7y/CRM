const express = require('express');
const { isCompanyAuthenticated } = require('../middleware/auth');
const { requirePermission } = require('../middleware/companyFeatures');
const { withTheme } = require('../utils/themes');
const { buildUserContext } = require('../utils/sessionUser');
const { getFeatureLabel, PERMISSION_ACTIONS } = require('../utils/planFeatures');
const { loadCompanySubscription } = require('../services/companyRbacService');

const router = express.Router();

router.get('/', isCompanyAuthenticated, requirePermission('access_demo', 'view'), async (req, res) => {
  const user = buildUserContext(req);
  const subscription = await loadCompanySubscription(req.session.companyId);
  const planFeatures = req.session.planFeatures || [];
  const rawRolePermissions = req.session.rawRolePermissions || {};

  res.render('access-demo/index', withTheme(req, {
    user,
    subscription,
    planFeatures,
    rawRolePermissions,
    effectivePermissions: user.permissions,
    permissionActions: PERMISSION_ACTIONS,
    getFeatureLabel,
    success: req.query.success || null,
    activeNav: 'access-demo',
  }));
});

router.post('/edit', isCompanyAuthenticated, requirePermission('access_demo', 'edit'), (req, res) => {
  res.redirect('/access-demo?success=Edit action succeeded. Your role has edit permission for Access Demo.');
});

module.exports = router;
