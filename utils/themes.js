const THEMES = [
  {
    id: 'default',
    label: 'Default',
    htmlAttrs: 'data-layout="vertical" data-topbar="light" data-sidebar="dark" data-sidebar-size="lg" data-sidebar-image="none" data-preloader="disable"',
    showAuthParticles: true,
    authCardClass: '',
  },
  {
    id: 'modern',
    label: 'Modern',
    htmlAttrs: 'data-layout="vertical" data-topbar="light" data-sidebar="dark" data-sidebar-size="sm-hover" data-sidebar-image="none" data-preloader="disable"',
    showAuthParticles: true,
    authCardClass: '',
  },
  {
    id: 'minimal',
    label: 'Minimal',
    htmlAttrs: 'data-layout="vertical" data-topbar="light" data-sidebar="light" data-sidebar-size="lg" data-sidebar-image="none" data-preloader="disable"',
    showAuthParticles: true,
    authCardClass: '',
  },
  {
    id: 'saas',
    label: 'SaaS',
    htmlAttrs: 'data-layout="horizontal" data-topbar="dark" data-sidebar-size="lg" data-sidebar="light" data-sidebar-image="none" data-preloader="disable"',
    showAuthParticles: true,
    authCardClass: '',
  },
  {
    id: 'corporate',
    label: 'Corporate',
    htmlAttrs: 'data-layout="semibox" data-sidebar-visibility="show" data-topbar="light" data-sidebar="light" data-sidebar-size="lg" data-sidebar-image="none" data-preloader="disable"',
    showAuthParticles: true,
    authCardClass: '',
  },
  {
    id: 'creative',
    label: 'Creative',
    htmlAttrs: 'data-layout="twocolumn" data-sidebar="light" data-sidebar-size="lg" data-sidebar-image="none" data-preloader="disable"',
    showAuthParticles: true,
    authCardClass: '',
  },
  {
    id: 'galaxy',
    label: 'Galaxy',
    htmlAttrs: 'data-layout="vertical" data-topbar="light" data-sidebar="dark" data-sidebar-size="lg" data-sidebar-image="none" data-bs-theme="dark" data-body-image="img-1" data-preloader="disable"',
    showAuthParticles: false,
    authCardClass: 'card-bg-fill',
  },
  {
    id: 'interactive',
    label: 'Interactive',
    htmlAttrs: 'data-layout="vertical" data-layout-style="detached" data-sidebar="light" data-topbar="dark" data-sidebar-size="lg" data-sidebar-image="none" data-preloader="disable"',
    showAuthParticles: true,
    authCardClass: '',
  },
  {
    id: 'material',
    label: 'Material',
    htmlAttrs: 'data-layout="vertical" data-topbar="light" data-sidebar="dark" data-sidebar-size="lg" data-sidebar-image="none" data-preloader="disable"',
    showAuthParticles: true,
    authCardClass: '',
  },
];

const DEFAULT_THEME_ID = 'default';
const THEME_STORAGE_KEY = 'crm-theme';
const THEME_COOKIE_NAME = 'crm_theme';

const themeMap = new Map(THEMES.map((theme) => [theme.id, theme]));

function getTheme(themeId) {
  return themeMap.get(themeId) || themeMap.get(DEFAULT_THEME_ID);
}

function parseThemeCookie(req) {
  const cookies = req.headers.cookie;
  if (!cookies) {
    return null;
  }

  const match = cookies
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${THEME_COOKIE_NAME}=`));

  if (!match) {
    return null;
  }

  return decodeURIComponent(match.slice(THEME_COOKIE_NAME.length + 1));
}

function resolveThemeId(req) {
  const candidate = parseThemeCookie(req) || DEFAULT_THEME_ID;
  return themeMap.has(candidate) ? candidate : DEFAULT_THEME_ID;
}

function buildThemeLocals(themeId) {
  const theme = getTheme(themeId);

  return {
    theme: theme.id,
    themeLabel: theme.label,
    themes: THEMES,
    assetBase: `/style/Admin/dist/${theme.id}`,
    htmlAttrs: theme.htmlAttrs,
    showAuthParticles: theme.showAuthParticles,
    authCardClass: theme.authCardClass,
  };
}

function getDefaultThemeLocals() {
  return buildThemeLocals(DEFAULT_THEME_ID);
}

function getThemeLocals(req) {
  return buildThemeLocals(resolveThemeId(req));
}

function withTheme(req, data = {}) {
  return { ...getThemeLocals(req), ...data };
}

module.exports = {
  THEMES,
  DEFAULT_THEME_ID,
  THEME_STORAGE_KEY,
  THEME_COOKIE_NAME,
  getTheme,
  resolveThemeId,
  getDefaultThemeLocals,
  getThemeLocals,
  withTheme,
};
