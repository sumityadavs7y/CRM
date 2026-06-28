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
const COLOR_MODE_STORAGE_KEY = 'crm-color-mode';
const COLOR_MODE_COOKIE_NAME = 'crm_color_mode';
const VALID_COLOR_MODES = new Set(['light', 'dark']);

const themeMap = new Map(THEMES.map((theme) => [theme.id, theme]));
const VALID_THEME_IDS = new Set(THEMES.map((theme) => theme.id));
const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

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
  const fromCookie = parseThemeCookie(req);
  if (fromCookie && themeMap.has(fromCookie)) {
    return fromCookie;
  }

  const fromSession = req?.session?.themeId;
  if (fromSession && themeMap.has(fromSession)) {
    return fromSession;
  }

  return DEFAULT_THEME_ID;
}

function parseColorModeCookie(req) {
  const cookies = req?.headers?.cookie;
  if (!cookies) {
    return null;
  }

  const match = cookies
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COLOR_MODE_COOKIE_NAME}=`));

  if (!match) {
    return null;
  }

  return decodeURIComponent(match.slice(COLOR_MODE_COOKIE_NAME.length + 1));
}

function resolveColorMode(req) {
  const fromCookie = parseColorModeCookie(req);
  if (VALID_COLOR_MODES.has(fromCookie)) {
    return fromCookie;
  }

  const fromSession = req?.session?.colorMode;
  if (VALID_COLOR_MODES.has(fromSession)) {
    return fromSession;
  }

  return null;
}

function applyUserThemeCookies(res, { themeId, colorMode }) {
  const cookieOptions = {
    path: '/',
    maxAge: THEME_COOKIE_MAX_AGE,
    sameSite: 'Lax',
  };

  if (themeId && VALID_THEME_IDS.has(themeId)) {
    res.cookie(THEME_COOKIE_NAME, themeId, cookieOptions);
  }

  if (colorMode && VALID_COLOR_MODES.has(colorMode)) {
    res.cookie(COLOR_MODE_COOKIE_NAME, colorMode, cookieOptions);
  }
}

function upsertHtmlAttr(htmlAttrs, attrName, attrValue) {
  const pattern = new RegExp(`${attrName}="[^"]*"`);
  if (pattern.test(htmlAttrs)) {
    return htmlAttrs.replace(pattern, `${attrName}="${attrValue}"`);
  }
  return `${htmlAttrs} ${attrName}="${attrValue}"`;
}

function applyColorModeToHtmlAttrs(htmlAttrs, colorMode) {
  if (!colorMode) {
    return htmlAttrs;
  }
  return upsertHtmlAttr(htmlAttrs, 'data-bs-theme', colorMode);
}

function buildThemeLocals(themeId, req) {
  const theme = getTheme(themeId);
  const colorMode = req ? resolveColorMode(req) : null;

  return {
    theme: theme.id,
    themeLabel: theme.label,
    themes: THEMES,
    assetBase: `/style/Admin/dist/${theme.id}`,
    htmlAttrs: applyColorModeToHtmlAttrs(theme.htmlAttrs, colorMode),
    showAuthParticles: theme.showAuthParticles,
    authCardClass: theme.authCardClass,
  };
}

function getDefaultThemeLocals(req) {
  return buildThemeLocals(DEFAULT_THEME_ID, req);
}

function getThemeLocals(req) {
  return buildThemeLocals(resolveThemeId(req), req);
}

function withTheme(req, data = {}) {
  return { ...getThemeLocals(req), ...data };
}

module.exports = {
  THEMES,
  DEFAULT_THEME_ID,
  VALID_THEME_IDS,
  THEME_STORAGE_KEY,
  THEME_COOKIE_NAME,
  COLOR_MODE_STORAGE_KEY,
  COLOR_MODE_COOKIE_NAME,
  getTheme,
  resolveThemeId,
  resolveColorMode,
  applyUserThemeCookies,
  getDefaultThemeLocals,
  getThemeLocals,
  withTheme,
};
