const express = require('express');
const { isCompanyAuthenticated } = require('../middleware/auth');
const { requirePermission } = require('../middleware/companyFeatures');
const { withTheme } = require('../utils/themes');
const { buildUserContext } = require('../utils/sessionUser');
const { ACCOUNTS_MODULES, TRANSACTION_VIEWS } = require('../constants/accountsModules');

const PLACEHOLDER_MODULES = ACCOUNTS_MODULES.filter(
  (module) => !['quotations', 'invoices'].includes(module.key)
);

const router = express.Router();

PLACEHOLDER_MODULES.forEach((module) => {
  router.get(`/${module.slug}`, isCompanyAuthenticated, requirePermission(module.key, 'view'), (req, res) => {
    res.render('accounts/module', withTheme(req, {
      user: buildUserContext(req),
      activeNav: module.activeNav,
      module,
      transactionViews: TRANSACTION_VIEWS,
    }));
  });
});

module.exports = router;
