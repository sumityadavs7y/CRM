const express = require('express');
const bcrypt = require('bcrypt');
const { User, Company, CompanyCredential, CompanyRole, CompanySubscription, SubscriptionPlan } = require('../models');
const { getDefaultThemeLocals } = require('../utils/themes');
const { isSubscriptionValid } = require('../utils/subscription');
const { resolveCredentialAccess } = require('../services/companyRbacService');
const { applyAccessToSession, clearAccessSession } = require('../utils/sessionUser');
const router = express.Router();

function withDefaultTheme(data = {}) {
  return { ...getDefaultThemeLocals(), ...data };
}

function clearAuthSession(req) {
  delete req.session.userId;
  delete req.session.userName;
  delete req.session.userEmail;
  delete req.session.userRole;
  delete req.session.isSuperAdmin;
  delete req.session.companyId;
  delete req.session.companyName;
  delete req.session.credentialId;
  delete req.session.authType;
  clearAccessSession(req);
}

router.get('/login', (req, res) => {
  if (req.session && (req.session.userId || req.session.companyId)) {
    return res.redirect('/dashboard');
  }

  res.render('login', withDefaultTheme({ error: null, email: '' }));
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.render('login', withDefaultTheme({
        error: 'Email and password are required.',
        email: email || '',
      }));
    }

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user || !user.isActive) {
      return res.render('login', withDefaultTheme({
        error: 'Invalid email or password.',
        email,
      }));
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.render('login', withDefaultTheme({
        error: 'Invalid email or password.',
        email,
      }));
    }

    clearAuthSession(req);
    req.session.authType = 'platform';
    req.session.userId = user.id;
    req.session.userName = user.name;
    req.session.userEmail = user.email;
    req.session.userRole = user.role;
    req.session.isSuperAdmin = user.role === 'SUPER_ADMIN';

    res.redirect('/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    res.render('login', withDefaultTheme({
      error: 'Unable to log in. Please try again.',
      email: req.body.email || '',
    }));
  }
});

router.get('/company/login', (req, res) => {
  if (req.session && (req.session.userId || req.session.companyId)) {
    return res.redirect('/dashboard');
  }

  res.render('login-company', withDefaultTheme({ error: null, email: '' }));
});

router.post('/company/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.render('login-company', withDefaultTheme({
        error: 'Email and password are required.',
        email: email || '',
      }));
    }

    const credential = await CompanyCredential.findOne({
      where: { email: email.toLowerCase() },
      include: [{
        model: Company,
        as: 'company',
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

    if (!credential || !credential.isActive || !credential.company || !credential.company.isActive) {
      return res.render('login-company', withDefaultTheme({
        error: 'Invalid email or password.',
        email,
      }));
    }

    if (!isSubscriptionValid(credential.company.subscription)) {
      const hasSubscription = !!credential.company.subscription;
      return res.render('login-company', withDefaultTheme({
        error: hasSubscription
          ? 'Company subscription is inactive or expired. Contact the platform administrator.'
          : 'No subscription plan assigned yet. Contact the platform administrator.',
        email,
      }));
    }

    const passwordMatches = await bcrypt.compare(password, credential.password);
    if (!passwordMatches) {
      return res.render('login-company', withDefaultTheme({
        error: 'Invalid email or password.',
        email,
      }));
    }

    clearAuthSession(req);
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
      credential.companyRole
    );
    applyAccessToSession(req, access);

    res.redirect('/dashboard');
  } catch (error) {
    console.error('Company login error:', error);
    res.render('login-company', withDefaultTheme({
      error: 'Unable to log in. Please try again.',
      email: req.body.email || '',
    }));
  }
});

router.get('/logout', (req, res) => {
  const authType = req.session?.authType;
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout failed:', err);
    }
    res.clearCookie('connect.sid');
    if (authType === 'company') {
      return res.redirect('/auth/company/login');
    }
    res.redirect('/auth/login');
  });
});

router.get('/register', async (req, res) => {
  const count = await User.count();
  if (count > 0) {
    return res.redirect('/auth/login');
  }

  res.render('register', withDefaultTheme({ error: null, values: {} }));
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;
    const values = { name, email };

    if (!name || !email || !password || !confirmPassword) {
      return res.render('register', withDefaultTheme({
        error: 'All fields are required.',
        values,
      }));
    }

    if (password !== confirmPassword) {
      return res.render('register', withDefaultTheme({
        error: 'Passwords do not match.',
        values,
      }));
    }

    const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return res.render('register', withDefaultTheme({
        error: 'A user with that email already exists.',
        values,
      }));
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({
      name,
      email: email.toLowerCase(),
      password: passwordHash,
      role: 'SUPER_ADMIN',
    });

    res.redirect('/auth/login');
  } catch (error) {
    console.error('Registration error:', error);
    res.render('register', withDefaultTheme({
      error: 'Unable to create account.',
      values: req.body,
    }));
  }
});

module.exports = router;
