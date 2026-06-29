(function () {
  function initProjectTabs() {
    const tabButtons = document.querySelectorAll('[data-bs-toggle="tab"][data-project-tab]');
    if (!tabButtons.length) {
      return;
    }

    tabButtons.forEach((button) => {
      button.addEventListener('shown.bs.tab', () => {
        const tabKey = button.getAttribute('data-project-tab');
        if (!tabKey) {
          return;
        }

        const url = new URL(window.location.href);
        if (tabKey === 'general') {
          url.searchParams.delete('tab');
        } else {
          url.searchParams.set('tab', tabKey);
        }
        if (tabKey !== 'inventory') {
          url.searchParams.delete('unitId');
        }
        if (tabKey !== 'inventory' && tabKey !== 'budget') {
          url.searchParams.delete('phaseTab');
        }
        url.searchParams.delete('success');
        url.searchParams.delete('error');
        window.history.replaceState({}, '', url.toString());
      });
    });
  }

  function init() {
    initProjectTabs();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
