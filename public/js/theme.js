(function () {
  const THEME_STORAGE_KEY = 'crm-theme';
  const THEME_COOKIE_NAME = 'crm_theme';
  const COLOR_MODE_STORAGE_KEY = 'crm-color-mode';
  const COLOR_MODE_COOKIE_NAME = 'crm_color_mode';
  const DEFAULT_THEME = 'default';
  const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

  function getCookieValue(cookieName) {
    const match = document.cookie.match(new RegExp(`${cookieName}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function setCookie(cookieName, value) {
    document.cookie = `${cookieName}=${encodeURIComponent(value)};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
  }

  function getCurrentColorMode() {
    const htmlMode = document.documentElement.getAttribute('data-bs-theme');
    if (htmlMode === 'dark' || htmlMode === 'light') {
      return htmlMode;
    }
    return 'light';
  }

  function setColorMode(colorMode) {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, colorMode);
    setCookie(COLOR_MODE_COOKIE_NAME, colorMode);
    sessionStorage.setItem('data-bs-theme', colorMode);
    document.documentElement.setAttribute('data-bs-theme', colorMode);
  }

  function setTheme(themeId) {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
    setCookie(THEME_COOKIE_NAME, themeId);
    window.location.reload();
  }

  function syncCookieFromStorage(storageKey, cookieName) {
    const storedValue = localStorage.getItem(storageKey);
    if (!storedValue) {
      return false;
    }

    const cookieValue = getCookieValue(cookieName);
    if (storedValue === cookieValue) {
      return false;
    }

    setCookie(cookieName, storedValue);
    return true;
  }

  function syncPreferencesFromStorage() {
    const themeChanged = syncCookieFromStorage(THEME_STORAGE_KEY, THEME_COOKIE_NAME);
    const colorModeChanged = syncCookieFromStorage(COLOR_MODE_STORAGE_KEY, COLOR_MODE_COOKIE_NAME);

    if (themeChanged || colorModeChanged) {
      window.location.reload();
    }
  }

  document.querySelectorAll('[data-theme-id]').forEach(function (item) {
    item.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      const themeId = item.getAttribute('data-theme-id');
      if (themeId) {
        setTheme(themeId);
      }
    });
  });

  document.querySelectorAll('.light-dark-mode').forEach(function (button) {
    button.addEventListener('click', function () {
      window.setTimeout(function () {
        setColorMode(getCurrentColorMode());
      }, 0);
    });
  });

  document.querySelectorAll('.topbar-user .dropstart > .dropdown-toggle').forEach(function (toggle) {
    toggle.addEventListener('click', function (event) {
      event.stopPropagation();
    });
  });

  syncPreferencesFromStorage();
})();
