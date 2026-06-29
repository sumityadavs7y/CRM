const express = require('express');
const bcrypt = require('bcrypt');
const {
  sequelize,
  Company,
  CompanyCredential,
  CompanyRole,
  User,
  SubscriptionPlan,
  CompanySubscription,
} = require('../models');
const { isSuperAdmin } = require('../middleware/auth');
const { withTheme } = require('../utils/themes');
const { parseSubscriptionDates, formatSubscriptionStatus, toDateInputValue } = require('../utils/subscription');
const { getFeatureLabel } = require('../utils/planFeatures');
const { getPrimaryAdmin } = require('../utils/companyCredential');
const { buildUserContext } = require('../utils/sessionUser');
const { seedDefaultRoles, trimRolesToPlan } = require('../services/companyRbacService');
const { seedDefaultPipelines } = require('../services/pipelineService');
const router = express.Router();

router.get('/', isSuperAdmin, async (req, res) => {
  const companies = await Company.findAll({
    include: [
      { model: CompanyCredential, as: 'credentials', include: [{ model: CompanyRole, as: 'companyRole' }] },
      {
        model: CompanySubscription,
        as: 'subscription',
        include: [{ model: SubscriptionPlan, as: 'plan' }],
      },
    ],
    order: [['createdAt', 'DESC']],
  });

  res.render('companies/index', withTheme(req, {
    user: buildUserContext(req),
    companies,
    getPrimaryAdmin,
    formatSubscriptionStatus,
    success: req.query.success || null,
    activeNav: 'companies',
  }));
});

router.get('/new', isSuperAdmin, (req, res) => {
  res.render('companies/create', withTheme(req, {
    user: buildUserContext(req),
    error: null,
    values: {},
    activeNav: 'companies',
  }));
});

router.post('/', isSuperAdmin, async (req, res) => {
  const { companyName, adminName, email, password, confirmPassword } = req.body;
  const values = { companyName, adminName, email };

  function renderCreate(error) {
    return res.render('companies/create', withTheme(req, {
      user: buildUserContext(req),
      error,
      values,
      activeNav: 'companies',
    }));
  }

  if (!companyName || !adminName || !email || !password || !confirmPassword) {
    return renderCreate('All fields are required.');
  }

  if (password !== confirmPassword) {
    return renderCreate('Passwords do not match.');
  }

  const normalizedEmail = email.toLowerCase();
  const existingCredential = await CompanyCredential.findOne({ where: { email: normalizedEmail } });
  const existingUser = await User.findOne({ where: { email: normalizedEmail } });
  if (existingCredential || existingUser) {
    return renderCreate('That email is already in use for another login.');
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const company = await sequelize.transaction(async (transaction) => {
      const createdCompany = await Company.create({ name: companyName.trim() }, { transaction });
      const { adminRole } = await seedDefaultRoles(createdCompany.id, transaction);
      await seedDefaultPipelines(createdCompany.id, transaction);
      await CompanyCredential.create({
        companyId: createdCompany.id,
        companyRoleId: adminRole.id,
        adminName: adminName.trim(),
        email: normalizedEmail,
        password: passwordHash,
      }, { transaction });
      return createdCompany;
    });

    res.redirect(`/companies/${company.id}?success=Company created. You can optionally assign a subscription plan when editing.`);
  } catch (error) {
    console.error('Create company error:', error);
    return renderCreate('Unable to create company. Please try again.');
  }
});

router.get('/:id', isSuperAdmin, async (req, res) => {
  const company = await Company.findByPk(req.params.id, {
    include: [
      { model: CompanyCredential, as: 'credentials', include: [{ model: CompanyRole, as: 'companyRole' }] },
      {
        model: CompanySubscription,
        as: 'subscription',
        include: [{ model: SubscriptionPlan, as: 'plan' }],
      },
    ],
  });

  if (!company) {
    return res.redirect('/companies');
  }

  res.render('companies/view', withTheme(req, {
    user: buildUserContext(req),
    company,
    getPrimaryAdmin,
    getFeatureLabel,
    formatSubscriptionStatus,
    success: req.query.success || null,
    activeNav: 'companies',
  }));
});

router.get('/:id/edit', isSuperAdmin, async (req, res) => {
  const company = await Company.findByPk(req.params.id, {
    include: [
      { model: CompanyCredential, as: 'credentials', include: [{ model: CompanyRole, as: 'companyRole' }] },
      {
        model: CompanySubscription,
        as: 'subscription',
        include: [{ model: SubscriptionPlan, as: 'plan' }],
      },
    ],
  });

  if (!company) {
    return res.redirect('/companies');
  }

  const plans = await SubscriptionPlan.findAll({
    where: { isActive: true },
    order: [['name', 'ASC']],
  });

  res.render('companies/edit', withTheme(req, {
    user: buildUserContext(req),
    company,
    plans,
    getPrimaryAdmin,
    getFeatureLabel,
    toDateInputValue,
    formatSubscriptionStatus,
    error: null,
    success: req.query.success || null,
    values: {},
    activeNav: 'companies',
  }));
});

router.post('/:id/edit', isSuperAdmin, async (req, res) => {
  const company = await Company.findByPk(req.params.id, {
    include: [
      { model: CompanyCredential, as: 'credentials', include: [{ model: CompanyRole, as: 'companyRole' }] },
      { model: CompanySubscription, as: 'subscription' },
    ],
  });

  if (!company) {
    return res.redirect('/companies');
  }

  const plans = await SubscriptionPlan.findAll({
    where: { isActive: true },
    order: [['name', 'ASC']],
  });

  const {
    companyName,
    subscriptionPlanId,
    startsAt: startsAtInput,
    expiresAt: expiresAtInput,
  } = req.body;

  const values = {
    companyName,
    subscriptionPlanId,
    startsAt: startsAtInput,
    expiresAt: expiresAtInput,
  };

  function renderEdit(error) {
    return res.render('companies/edit', withTheme(req, {
      user: buildUserContext(req),
      company,
      plans,
      getPrimaryAdmin,
      getFeatureLabel,
      toDateInputValue,
      formatSubscriptionStatus,
      error,
      success: null,
      values,
      activeNav: 'companies',
    }));
  }

  if (!companyName) {
    return renderEdit('Company name is required.');
  }

  const hasPlan = subscriptionPlanId && String(subscriptionPlanId).trim();

  if (!hasPlan) {
    try {
      await sequelize.transaction(async (transaction) => {
        await company.update({ name: companyName.trim() }, { transaction });

        if (company.subscription) {
          await company.subscription.destroy({ transaction });
        }
      });

      await trimRolesToPlan(company.id);

      return res.redirect(`/companies/${company.id}?success=Company updated successfully.`);
    } catch (error) {
      console.error('Update company error:', error);
      return renderEdit('Unable to update company. Please try again.');
    }
  }

  if (!expiresAtInput) {
    return renderEdit('Valid until date is required when a subscription plan is selected.');
  }

  const { startsAt, expiresAt } = parseSubscriptionDates(startsAtInput, expiresAtInput);

  if (!expiresAt) {
    return renderEdit('Please enter a valid until date.');
  }

  if (startsAtInput && String(startsAtInput).trim() && !startsAt) {
    return renderEdit('Please enter a valid start date.');
  }

  if (expiresAt <= startsAt) {
    return renderEdit('Valid until date must be after the start date.');
  }

  const plan = await SubscriptionPlan.findOne({
    where: { id: subscriptionPlanId, isActive: true },
  });

  if (!plan) {
    return renderEdit('Please select a valid subscription plan.');
  }

  try {
    await sequelize.transaction(async (transaction) => {
      await company.update({ name: companyName.trim() }, { transaction });

      if (company.subscription) {
        await company.subscription.update({
          subscriptionPlanId: plan.id,
          startsAt,
          expiresAt,
        }, { transaction });
      } else {
        await CompanySubscription.create({
          companyId: company.id,
          subscriptionPlanId: plan.id,
          startsAt,
          expiresAt,
        }, { transaction });
      }
    });

    await trimRolesToPlan(company.id);

    res.redirect(`/companies/${company.id}?success=Company subscription updated successfully.`);
  } catch (error) {
    console.error('Update company error:', error);
    return renderEdit('Unable to update company. Please try again.');
  }
});


module.exports = router;
