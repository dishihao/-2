(() => {
  'use strict';

  const ENTRY_KEY = 'specimen_admin_entry_visible_v2';
  const params = new URLSearchParams(location.search);
  const queryValue = params.get('admin');
  const pathAllows = /\/admin\.html$/i.test(location.pathname);

  if (queryValue === '1' || pathAllows) localStorage.setItem(ENTRY_KEY, '1');
  if (queryValue === '0') localStorage.removeItem(ENTRY_KEY);

  const allowed = queryValue === '1' || pathAllows || localStorage.getItem(ENTRY_KEY) === '1';

  const style = document.createElement('style');
  style.textContent = `
    #adminPermissionBox{display:none!important}
    html.specimen-admin-entry #adminPermissionBox{display:block!important}
    html.specimen-admin-entry #backBtn{display:block!important}
  `;
  document.head.appendChild(style);

  if (allowed) document.documentElement.classList.add('specimen-admin-entry');
})();
