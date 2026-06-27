const express = require('express');
const { isAuthenticated } = require('../middleware/auth');
const { withTheme } = require('../utils/themes');
const { buildUserContext } = require('../utils/sessionUser');
const router = express.Router();

router.get('/', (req, res) => {
  res.redirect('/auth/login');
});

router.get('/dashboard', isAuthenticated, (req, res) => {
  res.render('dashboard', withTheme(req, {
    user: buildUserContext(req),
  }));
});

module.exports = router;
