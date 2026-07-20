(() => {
  'use strict';

  const SESSION_KEY = 'specimen_admin_entry_visible_v1';
  const queryAllows = new URLSearchParams(location.search).get('admin') === '1';
  if (queryAllows) sessionStorage.setItem(SESSION_KEY, '1');
  const allowed = queryAllows || sessionStorage.getItem(SESSION_KEY) === '1';

  const style = document.createElement('style');
  style.textContent = `
    #adminPermissionBox{display:none!important}
    html.specimen-admin-entry #adminPermissionBox{display:block!important}
  `;
  document.head.appendChild(style);

  if (allowed) document.documentElement.classList.add('specimen-admin-entry');
})();
