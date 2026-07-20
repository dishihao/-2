(() => {
  'use strict';
  if (window.__specimenDirectClassifyLoadedV3) return;
  window.__specimenDirectClassifyLoadedV3 = true;

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

      // 已分类品种打开详情页。退回按钮由管理员权限模块验证密码。
      if (specimen.classified) {
        const result = openEditor(id);
        const saveButton = document.querySelector('#editMask .savebtn');
        const backButton = document.getElementById('backBtn');
        if (saveButton) saveButton.textContent = '保存修改';
        if (backButton) {
          backButton.textContent = '管理员退回待分类';
          backButton.style.display = 'block';
        }
        return result;
      }

      // 待分类品种点击一次即完成。不给页面增加观察器或轮询，避免卡死。
      const numericId = Number(id);
      if (busyIds.has(numericId)) return;
      busyIds.add(numericId);

      $('editId').value = String(id);
      $('editCat').value = specimen.category || specimen.suggestedCategory || '';
      $('editLoc').value = specimen.location || '';
      $('editNote').value = specimen.note || '';

      let result;
      try {
        result = classify();
      } catch (error) {
        busyIds.delete(numericId);
        console.error(error);
        toast('分类上架失败，请重试');
        return;
      }

      Promise.resolve(result)
        .catch(error => {
          console.error(error);
          toast('已在本机保存，联网后会继续同步');
        })
        .finally(() => busyIds.delete(numericId));
    };
  }

  install();
})();
