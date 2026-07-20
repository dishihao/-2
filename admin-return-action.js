(() => {
  'use strict';
  if (window.__specimenAdminReturnActionV3) return;
  window.__specimenAdminReturnActionV3 = true;

  // 已分类详情页固定显示管理员退回按钮；不使用观察器和轮询。
  const style = document.createElement('style');
  style.textContent = `
    #editMask.show #backBtn {
      display: block !important;
      background: #fff7ed !important;
      border-color: #c2410c !important;
      color: #9a3412 !important;
      font-weight: 700 !important;
    }
    .table-order-bar{
      display:flex;align-items:center;gap:8px;margin:10px 0 2px;padding:9px 10px;
      background:#fff;border:1px solid #d7dce0;border-radius:12px;
    }
    .table-order-bar label{font-size:13px;font-weight:700;white-space:nowrap;color:#14532d}
    .table-order-bar select{flex:1;min-width:0;border:0;background:#fff;font-size:14px;outline:0;color:#111827}
    .table-ref{font-size:12px;color:#1d4ed8;font-weight:700;margin-top:3px}
  `;
  document.head.appendChild(style);

  const TABLES = [
    { value: 'all', label: '三张表连续顺序', status: '' },
    { value: 't1', label: '表1：需要再找（有位置）', status: '需要再找（有位置）' },
    { value: 't2', label: '表2：未找到且无位置', status: '未找到且无位置' },
    { value: 't3', label: '表3：已装瓶待分类', status: '已装瓶待分类' },
  ];
  const rank = new Map(TABLES.slice(1).map((x, i) => [x.status, i]));
  let tableMode = localStorage.getItem('specimen_table_order_mode_v1') || 'all';
  if (!TABLES.some(x => x.value === tableMode)) tableMode = 'all';

  function installTableOrder() {
    if (typeof arr !== 'function' || typeof render !== 'function' || !Array.isArray(data) || !document.getElementById('sources')) {
      setTimeout(installTableOrder, 100);
      return;
    }
    if (document.getElementById('tableOrderBar')) return;

    const rowMaps = new Map();
    for (const table of TABLES.slice(1)) {
      const ids = data.filter(x => x.sourceStatus === table.status).sort((a, b) => Number(a.id) - Number(b.id));
      rowMaps.set(table.status, new Map(ids.map((x, i) => [Number(x.id), i + 1])));
    }

    const bar = document.createElement('div');
    bar.id = 'tableOrderBar';
    bar.className = 'table-order-bar';
    bar.innerHTML = `<label for="tableOrderSelect">按原表对照</label><select id="tableOrderSelect">${TABLES.map(x => `<option value="${x.value}">${x.label}</option>`).join('')}</select>`;
    document.getElementById('sources').insertAdjacentElement('afterend', bar);
    const select = document.getElementById('tableOrderSelect');
    select.value = tableMode;

    const originalArr = arr;
    arr = function () {
      let list = originalArr();
      const selected = TABLES.find(x => x.value === tableMode);
      if (selected && selected.status) list = list.filter(x => x.sourceStatus === selected.status);
      if (view !== 'location') {
        list.sort((a, b) => {
          const ar = rank.has(a.sourceStatus) ? rank.get(a.sourceStatus) : 99;
          const br = rank.has(b.sourceStatus) ? rank.get(b.sourceStatus) : 99;
          return ar - br || Number(a.id) - Number(b.id);
        });
      }
      return list;
    };

    const originalRender = render;
    render = function () {
      originalRender();
      const visible = arr();
      const cards = document.querySelectorAll('#list .card');
      cards.forEach((card, index) => {
        const specimen = visible[index];
        if (!specimen) return;
        const tableNo = (rank.get(specimen.sourceStatus) ?? 99) + 1;
        const rowNo = rowMaps.get(specimen.sourceStatus)?.get(Number(specimen.id));
        const source = card.querySelector('.src');
        if (source && rowNo && !card.querySelector('.table-ref')) {
          const ref = document.createElement('div');
          ref.className = 'table-ref';
          ref.textContent = `原表${tableNo} · 第${rowNo}项`;
          source.insertAdjacentElement('afterend', ref);
        }
      });
    };

    select.addEventListener('change', () => {
      tableMode = select.value;
      localStorage.setItem('specimen_table_order_mode_v1', tableMode);
      render();
    });

    render();
  }

  installTableOrder();
})();
