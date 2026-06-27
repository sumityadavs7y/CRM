const express = require('express');
const { SubscriptionPlan } = require('../models');
const { isSuperAdmin } = require('../middleware/auth');
const { withTheme } = require('../utils/themes');
const {
  getAvailablePlanFeatures,
  getFeatureLabel,
  parseSelectedFeatures,
} = require('../utils/planFeatures');
const router = express.Router();

router.get('/', isSuperAdmin, async (req, res) => {
  const plans = await SubscriptionPlan.findAll({
    order: [['createdAt', 'DESC']],
  });

  res.render('subscription-plans/index', withTheme(req, {
    user: buildUserContext(req),
    plans,
    getFeatureLabel,
    success: req.query.success || null,
    activeNav: 'subscription-plans',
  }));
});

router.get('/new', isSuperAdmin, (req, res) => {
  res.render('subscription-plans/create', withTheme(req, {
    user: buildUserContext(req),
    availableFeatures: getAvailablePlanFeatures(),
    error: null,
    values: {},
    activeNav: 'subscription-plans',
  }));
});

router.post('/', isSuperAdmin, async (req, res) => {
  const body = extractPlanBody(req.body);
  const values = { ...body, features: parseSelectedFeatures(req.body) };

  if (!body.name) {
    return renderCreate(req, res, 'Plan name is required.', values);
  }

  try {
    const plan = await SubscriptionPlan.create({
      name: body.name.trim(),
      description: body.description?.trim() || null,
      maxUsers: parseInt(body.maxUsers, 10) || 5,
      maxContacts: parseInt(body.maxContacts, 10) || 100,
      maxDeals: parseInt(body.maxDeals, 10) || 50,
      maxStorageMb: parseInt(body.maxStorageMb, 10) || 1024,
      features: parseSelectedFeatures(req.body),
    });

    res.redirect(`/subscription-plans/${plan.id}?success=Subscription plan created successfully.`);
  } catch (error) {
    console.error('Create subscription plan error:', error);
    renderCreate(req, res, 'Unable to create subscription plan. Please try again.', values);
  }
});

router.get('/:id', isSuperAdmin, async (req, res) => {
  const plan = await SubscriptionPlan.findByPk(req.params.id);

  if (!plan) {
    return res.redirect('/subscription-plans');
  }

  res.render('subscription-plans/view', withTheme(req, {
    user: buildUserContext(req),
    plan,
    getFeatureLabel,
    success: req.query.success || null,
    activeNav: 'subscription-plans',
  }));
});

router.get('/:id/edit', isSuperAdmin, async (req, res) => {
  const plan = await SubscriptionPlan.findByPk(req.params.id);

  if (!plan) {
    return res.redirect('/subscription-plans');
  }

  res.render('subscription-plans/edit', withTheme(req, {
    user: buildUserContext(req),
    plan,
    availableFeatures: getAvailablePlanFeatures(),
    error: null,
    values: planValuesFromPlan(plan),
    activeNav: 'subscription-plans',
  }));
});

router.post('/:id/edit', isSuperAdmin, async (req, res) => {
  const plan = await SubscriptionPlan.findByPk(req.params.id);

  if (!plan) {
    return res.redirect('/subscription-plans');
  }

  const body = extractPlanBody(req.body);
  const values = {
    ...body,
    features: parseSelectedFeatures(req.body),
    isActive: req.body.isActive === 'on',
  };

  if (!body.name) {
    return renderEdit(req, res, plan, 'Plan name is required.', values);
  }

  try {
    await plan.update({
      name: body.name.trim(),
      description: body.description?.trim() || null,
      maxUsers: parseInt(body.maxUsers, 10) || 5,
      maxContacts: parseInt(body.maxContacts, 10) || 100,
      maxDeals: parseInt(body.maxDeals, 10) || 50,
      maxStorageMb: parseInt(body.maxStorageMb, 10) || 1024,
      features: parseSelectedFeatures(req.body),
      isActive: req.body.isActive === 'on',
    });

    res.redirect(`/subscription-plans/${plan.id}?success=Subscription plan updated successfully.`);
  } catch (error) {
    console.error('Update subscription plan error:', error);
    renderEdit(req, res, plan, 'Unable to update subscription plan. Please try again.', values);
  }
});

function extractPlanBody(body) {
  return {
    name: body.name,
    description: body.description,
    maxUsers: body.maxUsers,
    maxContacts: body.maxContacts,
    maxDeals: body.maxDeals,
    maxStorageMb: body.maxStorageMb,
  };
}

function planValuesFromPlan(plan) {
  return {
    name: plan.name,
    description: plan.description,
    maxUsers: plan.maxUsers,
    maxContacts: plan.maxContacts,
    maxDeals: plan.maxDeals,
    maxStorageMb: plan.maxStorageMb,
    features: plan.features || [],
    isActive: plan.isActive,
  };
}

function renderCreate(req, res, error, values) {
  res.render('subscription-plans/create', withTheme(req, {
    user: buildUserContext(req),
    availableFeatures: getAvailablePlanFeatures(),
    error,
    values,
    activeNav: 'subscription-plans',
  }));
}

function renderEdit(req, res, plan, error, values) {
  res.render('subscription-plans/edit', withTheme(req, {
    user: buildUserContext(req),
    plan,
    availableFeatures: getAvailablePlanFeatures(),
    error,
    values,
    activeNav: 'subscription-plans',
  }));
}

function buildUserContext(req) {
  return {
    id: req.session.userId || req.session.credentialId,
    name: req.session.userName,
    email: req.session.userEmail,
    role: req.session.userRole,
    isSuperAdmin: req.session.isSuperAdmin,
    authType: req.session.authType,
    companyId: req.session.companyId || null,
    companyName: req.session.companyName || null,
  };
}

module.exports = router;
