(() => {
  'use strict';
  if (window.__specimenDirectClassifyLoadedV2) return;
  window.__specimenDirectClassifyLoadedV2 = true;

  const busyIds = new Set();

  function currentSpecimen() {
    const input = document.getElementById('editId');
    if (!input || !Array.isArray(window.data || data)) return null;
    const id = Number(input.value);
    return data.find(x => Number(x.id) === id) || null;
  }

  function forceReturnButton() {
    const mask = document.getElementById('editMask');
    const button = document.getElementById('backBtn');
    const specimen = currentSpecimen();
    if (!mask || !button) return;

    const shouldShow = mask.classList.contains('show') && specimen && specimen.classified;
    if (shouldShow) {
      button.textContent = '管理员退回待分类';
      button.setAttribute('aria-label', '管理员操作：退回待分类');
      button.style.setProperty('display', 'block', 'important');
    } else {
      button.style.removeProperty('display');
    }
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

      // 已分类品种打开详情页，并固定显示管理员退回入口。
      // 真正执行退回时仍由权限模块校验管理员密码。
      if (specimen.classified) {
        openEditor(id);
        const saveButton = document.querySelector('#editMask .savebtn');
        if (saveButton) saveButton.textContent = '保存修改';
        forceReturnButton();
        setTimeout(forceReturnButton, 0);
        setTimeout(forceReturnButton, 120);
        setTimeout(forceReturnButton, 500);
        return;
      }

      // 待分类品种点击“分类上架”后立即完成。
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

    const mask = document.getElementById('editMask');
    if (mask) {
      new MutationObserver(() => {
        const button = document.getElementById('backBtn');
        const specimen = currentSpecimen();
        if (mask.classList.contains('show') && specimen && specimen.classified && button && button.style.display !== 'block') {
          forceReturnButton();
        }
      }).observe(mask, { attributes: true, childList: true, subtree: true });
    }

    document.addEventListener('click', event => {
      const target = event.target && event.target.closest ? event.target.closest('#backBtn') : null;
      if (target) setTimeout(forceReturnButton, 0);
    });

    setInterval(() => {
      const maskNow = document.getElementById('editMask');
      if (maskNow && maskNow.classList.contains('show')) forceReturnButton();
    }, 500);
  }

  install();
})();
