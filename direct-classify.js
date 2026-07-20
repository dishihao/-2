(() => {
  'use strict';
  if (window.__specimenDirectClassifyLoaded) return;
  window.__specimenDirectClassifyLoaded = true;

  const busyIds = new Set();

  function isAdminEntry() {
    return document.documentElement.classList.contains('specimen-admin-entry') ||
      new URLSearchParams(location.search).get('admin') === '1';
  }

  function install() {
    if (typeof edit !== 'function' || typeof classify !== 'function' || !Array.isArray(data) || typeof $ !== 'function') {
      setTimeout(install, 100);
      return;
    }

    const openEditor = edit;

    edit = function (id) {
      const specimen = data.find(x => Number(x.id) === Number(id));
      if (!specimen) return;

      // 已分类品种仍可打开编辑页。管理员入口始终显示“退回待分类”，
      // 未解锁时点击按钮会由权限模块要求输入管理员密码。
      if (specimen.classified) {
        openEditor(id);
        const saveButton = document.querySelector('#editMask .savebtn');
        if (saveButton) saveButton.textContent = '保存修改';
        const backButton = document.getElementById('backBtn');
        if (backButton) {
          backButton.textContent = '退回待分类';
          backButton.style.display = isAdminEntry() ? 'block' : 'none';
        }
        return;
      }

      // 待分类品种点击“分类上架”后立即完成，不再弹出二次保存步骤。
      if (busyIds.has(Number(id))) return;
      busyIds.add(Number(id));

      $('editId').value = String(id);
      $('editCat').value = specimen.category || specimen.suggestedCategory || '';
      $('editLoc').value = specimen.location || '';
      $('editNote').value = specimen.note || '';

      const result = classify();
      Promise.resolve(result)
        .then(() => toast('已直接分类上架'))
        .catch(error => {
          console.error(error);
          toast('分类上架失败，请重试');
        })
        .finally(() => busyIds.delete(Number(id)));
    };

    const saveButton = document.querySelector('#editMask .savebtn');
    if (saveButton) saveButton.textContent = '保存修改';
  }

  install();
})();
