(() => {
  'use strict';
  if (window.__specimenAdminReturnActionV2) return;
  window.__specimenAdminReturnActionV2 = true;

  // 待分类品种使用一键上架，不会打开编辑弹窗；因此编辑弹窗出现时
  // 当前品种必然已经分类。只用 CSS 固定显示管理员退回按钮，
  // 不再使用 MutationObserver 或定时轮询，避免页面反复重绘卡死。
  const style = document.createElement('style');
  style.textContent = `
    #editMask.show #backBtn {
      display: block !important;
      background: #fff7ed !important;
      border-color: #c2410c !important;
      color: #9a3412 !important;
      font-weight: 700 !important;
    }
  `;
  document.head.appendChild(style);
})();
