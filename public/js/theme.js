(function () {
  const STORAGE_KEY = 'crm-theme';
  const COOKIE_NAME = 'crm_theme';
  const DEFAULT_THEME = 'default';
  const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

  function getStoredTheme() {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
  }

  function getCookieTheme() {
    const match = document.cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function setThemeCookie(themeId) {
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(themeId)};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
  }

  function setTheme(themeId) {
    localStorage.setItem(STORAGE_KEY, themeId);
    setThemeCookie(themeId);
    sessionStorage.clear();
    window.location.reload();
  }

  function syncCookieFromStorage() {
    const storedTheme = localStorage.getItem(STORAGE_KEY);
    if (!storedTheme) {
      return;
    }

    const cookieTheme = getCookieTheme();
    if (storedTheme === cookieTheme) {
      return;
    }

    setThemeCookie(storedTheme);
    window.location.reload();
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

  document.querySelectorAll('.topbar-user .dropstart > .dropdown-toggle').forEach(function (toggle) {
    toggle.addEventListener('click', function (event) {
      event.stopPropagation();
    });
  });

  syncCookieFromStorage();
})();
