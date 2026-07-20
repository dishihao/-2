(() => {
  'use strict';
  if (window.__specimenAdminReturnActionLoaded) return;
  window.__specimenAdminReturnActionLoaded = true;

  function currentSpecimen() {
    const id = Number(document.getElementById('editId')?.value || 0);
    if (!id || typeof data === 'undefined' || !Array.isArray(data)) return null;
    return data.find(x => Number(x.id) === id) || null;
  }

  function refresh() {
    const mask = document.getElementById('editMask');
    const button = document.getElementById('backBtn');
    const specimen = currentSpecimen();
    if (!mask || !button) return;

    if (mask.classList.contains('show') && specimen?.classified) {
      button.textContent = '管理员退回待分类';
      button.style.setProperty('display', 'block', 'important');
      button.style.setProperty('background', '#fff7ed');
      button.style.setProperty('border-color', '#c2410c');
      button.style.setProperty('color', '#9a3412');
      button.style.setProperty('font-weight', '700');
    } else {
      button.style.setProperty('display', 'none', 'important');
    }
  }

  function start() {
    if (typeof edit !== 'function' || !document.getElementById('editMask')) {
      setTimeout(start, 100);
      return;
    }

    const previousEdit = edit;
    edit = function (id) {
      const result = previousEdit(id);
      refresh();
      setTimeout(refresh, 0);
      setTimeout(refresh, 100);
      setTimeout(refresh, 400);
      return result;
    };

    const mask = document.getElementById('editMask');
    new MutationObserver(refresh).observe(mask, {
      attributes: true,
      childList: true,
      subtree: true,
    });

    setInterval(() => {
      if (mask.classList.contains('show')) refresh();
    }, 300);
  }

  start();
})();
