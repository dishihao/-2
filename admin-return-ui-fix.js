(() => {
  'use strict';
  if (window.__specimenAdminReturnUiFixLoaded) return;
  window.__specimenAdminReturnUiFixLoaded = true;

  function isAdminEntry() {
    return new URLSearchParams(location.search).get('admin') === '1' ||
      document.documentElement.classList.contains('specimen-admin-entry');
  }

  function refreshReturnButton() {
    const button = document.getElementById('backBtn');
    if (!button) return;
    let current = null;
    try { current = typeof item === 'function' ? item() : null; } catch (_) {}
    const show = Boolean(isAdminEntry() && current && current.classified);
    button.style.display = show ? 'block' : 'none';
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
      setTimeout(refreshReturnButton, 120);
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

    refreshReturnButton();
  }

  install();
})();
