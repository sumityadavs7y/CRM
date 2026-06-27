const PERMISSION_ACTIONS = ['view', 'edit'];

const AVAILABLE_PLAN_FEATURES = [
  {
    key: 'user_management',
    label: 'Users',
    description: 'Create and manage company team members',
  },
  {
    key: 'role_management',
    label: 'Roles',
    description: 'Create and manage company roles and permissions',
  },
  {
    key: 'access_demo',
    label: 'Access Demo',
    description: 'Sandbox module for testing RBAC view/edit access',
  },
  {
    key: 'crm_setup',
    label: 'CRM Setup',
    description: 'Configure pipelines, lead stages, and deal stages',
  },
];

function getAvailablePlanFeatures() {
  return AVAILABLE_PLAN_FEATURES;
}

function getFeatureByKey(featureKey) {
  return AVAILABLE_PLAN_FEATURES.find((feature) => feature.key === featureKey);
}

function getFeatureLabel(featureKey) {
  const feature = getFeatureByKey(featureKey);
  return feature ? feature.label : featureKey;
}

function parseSelectedFeatures(body) {
  const selected = body?.features;
  if (!selected) {
    return [];
  }

  const selectedList = Array.isArray(selected) ? selected : [selected];
  const validKeys = new Set(AVAILABLE_PLAN_FEATURES.map((feature) => feature.key));

  return selectedList.filter((key) => validKeys.has(key));
}

function parseJsonArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function parseJsonObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return {};
}

function getPlanFeatureKeys(plan) {
  const features = parseJsonArray(plan?.features);

  return features.filter((key) => AVAILABLE_PLAN_FEATURES.some((feature) => feature.key === key));
}

function planIncludesFeature(plan, featureKey) {
  return getPlanFeatureKeys(plan).includes(featureKey);
}

function companyHasFeature(subscription, featureKey) {
  const { isSubscriptionValid } = require('./subscription');

  if (!isSubscriptionValid(subscription)) {
    return false;
  }

  return planIncludesFeature(subscription.plan, featureKey);
}

function buildFullPermissions(planFeatures) {
  const permissions = {};

  planFeatures.forEach((featureKey) => {
    permissions[featureKey] = [...PERMISSION_ACTIONS];
  });

  return permissions;
}

function actionsFromAccessLevel(level) {
  if (level === 'edit') {
    return ['view', 'edit'];
  }
  if (level === 'view') {
    return ['view'];
  }
  return [];
}

function getFeatureAccessLevel(permissions, featureKey) {
  const actions = normalizePermissions(permissions)[featureKey] || [];
  if (actions.includes('edit')) {
    return 'edit';
  }
  if (actions.includes('view')) {
    return 'view';
  }
  return 'none';
}

function normalizePermissions(permissions) {
  permissions = parseJsonObject(permissions);

  const normalized = {};

  Object.entries(permissions).forEach(([featureKey, actions]) => {
    if (!Array.isArray(actions)) {
      return;
    }

    const validActions = actions.filter((action) => PERMISSION_ACTIONS.includes(action));
    if (validActions.length > 0) {
      const uniqueActions = [...new Set(validActions)];
      if (uniqueActions.includes('edit') && !uniqueActions.includes('view')) {
        uniqueActions.unshift('view');
      }
      normalized[featureKey] = uniqueActions;
    }
  });

  return normalized;
}

function validateRolePermissions(permissions, planFeatures) {
  const normalized = normalizePermissions(permissions);
  const allowedFeatures = new Set(planFeatures);

  Object.keys(normalized).forEach((featureKey) => {
    if (!allowedFeatures.has(featureKey)) {
      delete normalized[featureKey];
    }
  });

  return normalized;
}

function parseRolePermissions(body, planFeatures) {
  let raw = body?.permissions;

  if (!raw || typeof raw !== 'object') {
    raw = {};
    Object.entries(body || {}).forEach(([key, value]) => {
      const checkboxMatch = key.match(/^permissions\[([^\]]+)\]\[\]$/);
      const radioMatch = key.match(/^permissions\[([^\]]+)\]$/);
      const featureKey = checkboxMatch?.[1] || radioMatch?.[1];
      if (!featureKey) {
        return;
      }

      if (checkboxMatch) {
        if (!raw[featureKey]) {
          raw[featureKey] = [];
        }
        const values = Array.isArray(value) ? value : [value];
        raw[featureKey].push(...values);
      } else if (radioMatch) {
        raw[featureKey] = value;
      }
    });
  }

  if (!raw || typeof raw !== 'object') {
    return {};
  }

  const permissions = {};

  Object.entries(raw).forEach(([featureKey, actions]) => {
    if (Array.isArray(actions)) {
      permissions[featureKey] = actions.filter((action) => PERMISSION_ACTIONS.includes(action));
      return;
    }

    if (typeof actions === 'string') {
      permissions[featureKey] = actionsFromAccessLevel(actions);
    }
  });

  return validateRolePermissions(permissions, planFeatures);
}

function resolveEffectivePermissions(subscription, rolePermissions) {
  const { isSubscriptionValid } = require('./subscription');

  if (!isSubscriptionValid(subscription)) {
    return {};
  }

  const planFeatures = getPlanFeatureKeys(subscription.plan);
  const validatedRolePermissions = validateRolePermissions(rolePermissions, planFeatures);
  const effective = {};

  planFeatures.forEach((featureKey) => {
    const roleActions = validatedRolePermissions[featureKey] || [];
    if (roleActions.length > 0) {
      effective[featureKey] = [...roleActions];
    }
  });

  return effective;
}

function roleHasPermission(effectivePermissions, featureKey, action) {
  const actions = effectivePermissions?.[featureKey];
  if (!Array.isArray(actions)) {
    return false;
  }

  if (actions.includes(action)) {
    return true;
  }

  // Edit access implies view access for navigation and read-only pages.
  if (action === 'view' && actions.includes('edit')) {
    return true;
  }

  return false;
}

module.exports = {
  AVAILABLE_PLAN_FEATURES,
  PERMISSION_ACTIONS,
  getAvailablePlanFeatures,
  getFeatureByKey,
  getFeatureLabel,
  parseSelectedFeatures,
  getPlanFeatureKeys,
  planIncludesFeature,
  companyHasFeature,
  buildFullPermissions,
  actionsFromAccessLevel,
  getFeatureAccessLevel,
  normalizePermissions,
  validateRolePermissions,
  parseRolePermissions,
  resolveEffectivePermissions,
  roleHasPermission,
};
