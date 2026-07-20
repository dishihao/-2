(() => {
  'use strict';
  if (window.__specimenAdminReturnUiFixLoaded) return;
  window.__specimenAdminReturnUiFixLoaded = true;

  const ENTRY_KEY = 'specimen_admin_entry_visible_v2';

  function isAdminEntry() {
    return new URLSearchParams(location.search).get('admin') === '1' ||
      /\/admin\.html$/i.test(location.pathname) ||
      localStorage.getItem(ENTRY_KEY) === '1' ||
      document.documentElement.classList.contains('specimen-admin-entry');
  }

  const style = document.createElement('style');
  style.textContent = `html.specimen-admin-entry #backBtn{display:block!important}`;
  document.head.appendChild(style);

  function refreshReturnButton() {
    const button = document.getElementById('backBtn');
    if (!button) return;
    let current = null;
    try { current = typeof item === 'function' ? item() : null; } catch (_) {}
    const show = Boolean(isAdminEntry() && current && current.classified);
    button.style.setProperty('display', show ? 'block' : 'none', 'important');
    button.textContent = '退回待分类';
  }

  function install() {
    if (typeof edit !== 'function' || !document.getElementById('editMask')) {
      setTimeout(install, 100);
      return;
    }

    const previousEdit = edit;
    edit = function (id) {
      const result = previousEdit(id);
      setTimeout(refreshReturnButton, 0);
      setTimeout(refreshReturnButton, 100);
      setTimeout(refreshReturnButton, 300);
      return result;
    };

    const mask = document.getElementById('editMask');
    new MutationObserver(refreshReturnButton).observe(mask, {
      attributes: true,
      childList: true,
      subtree: true,
    });

    document.addEventListener('click', event => {
      if (event.target && event.target.id === 'backBtn') {
        setTimeout(refreshReturnButton, 0);
      }
    });

    setInterval(refreshReturnButton, 500);
    refreshReturnButton();
  }

  install();
})();
