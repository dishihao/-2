(() => {
  'use strict';
  if (window.__specimenDirectClassifyLoaded) return;
  window.__specimenDirectClassifyLoaded = true;

  const busyIds = new Set();

  function install() {
    if (typeof edit !== 'function' || typeof classify !== 'function' || !Array.isArray(data) || typeof $ !== 'function') {
      setTimeout(install, 100);
      return;
    }

    const openEditor = edit;

    edit = function (id) {
      const specimen = data.find(x => Number(x.id) === Number(id));
      if (!specimen) return;

      // 已分类品种可以打开详情页修改资料，并始终显示管理员退回入口。
      // 点击退回时由权限模块验证管理员密码，普通用户无法执行。
      if (specimen.classified) {
        openEditor(id);
        const saveButton = document.querySelector('#editMask .savebtn');
        if (saveButton) saveButton.textContent = '保存修改';
        const backButton = document.getElementById('backBtn');
        if (backButton) {
          backButton.textContent = '管理员退回待分类';
          backButton.style.display = 'block';
          backButton.setAttribute('aria-label', '管理员操作：退回待分类');
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
