(() => {
  'use strict';
  if (window.__specimenAdminReturnActionV5) return;
  window.__specimenAdminReturnActionV5 = true;

  const FIRST_STATUS = '需要再找（有位置）';
  const TABLES = [
    { value: 'all', label: '三张表连续顺序（809种）', status: '' },
    { value: 't1', label: '表1：需要再找（有位置，349种）', status: FIRST_STATUS },
    { value: 't2', label: '表2：未找到且无位置（158种）', status: '未找到且无位置' },
    { value: 't3', label: '表3：已装瓶待分类（302种）', status: '已装瓶待分类' },
  ];
  const rank = new Map(TABLES.slice(1).map((x, i) => [x.status, i]));
  let tableMode = localStorage.getItem('specimen_table_order_mode_v1') || 'all';
  if (!TABLES.some(x => x.value === tableMode)) tableMode = 'all';

  const style = document.createElement('style');
  style.textContent = `
    #editMask.show #backBtn{display:block!important;background:#fff7ed!important;border-color:#c2410c!important;color:#9a3412!important;font-weight:700!important}
    .table-order-bar{display:flex;align-items:center;gap:8px;margin:10px 0 2px;padding:9px 10px;background:#fff;border:1px solid #d7dce0;border-radius:12px}
    .table-order-bar label{font-size:13px;font-weight:700;white-space:nowrap;color:#14532d}
    .table-order-bar select{flex:1;min-width:0;border:0;background:#fff;font-size:14px;outline:0;color:#111827}
    .table-ref{font-size:12px;color:#1d4ed8;font-weight:700;margin-top:3px}
    .table-pos{font-size:12px;color:#9a3412;font-weight:700;margin-top:2px}
  `;
  document.head.appendChild(style);

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function loadUpdateData() {
    window.__SPECIMEN_TABLE_UPDATE = [];
    const files = [1, 2, 3, 4, 5, 6, 7].map(i => `./table-update-part-${i}.js?v=20260722-v5`);
    for (const file of files) await loadScript(file);
    const rows = window.__SPECIMEN_TABLE_UPDATE;
    const unique = new Set(rows.map(x => x[0]));
    if (rows.length !== 349 || unique.size !== 349) {
      throw new Error(`更新表校验失败：${rows.length}/${unique.size}`);
    }
    return rows;
  }

  function waitForApp() {
    return new Promise(resolve => {
      const check = () => {
        if (typeof arr === 'function' && typeof render === 'function' && Array.isArray(data) && data.length === 809 && document.getElementById('sources')) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  function applyUpdate(rows) {
    const classifiedBefore = data.filter(x => x.classified).length;
    const snapshot = data.map(x => ({
      item: x,
      sourceStatus: x.sourceStatus,
      originalPositions: Array.isArray(x.originalPositions) ? x.originalPositions.slice() : [],
      suggestedCategory: x.suggestedCategory,
      searchKey: x.searchKey,
    }));
    const map = new Map(rows.map(x => [x[0], x]));
    let matched = 0;

    for (const specimen of data) {
      const update = map.get(specimen.name);
      if (!update) continue;
      matched += 1;
      specimen.sourceStatus = FIRST_STATUS;
      specimen.originalPositions = update[1].slice();
      specimen.suggestedCategory = update[2] || specimen.suggestedCategory;
      specimen.searchKey = [specimen.searchKey, FIRST_STATUS, update[2], ...update[1]].filter(Boolean).join(' ');
    }

    const counts = {
      t1: data.filter(x => x.sourceStatus === FIRST_STATUS).length,
      t2: data.filter(x => x.sourceStatus === '未找到且无位置').length,
      t3: data.filter(x => x.sourceStatus === '已装瓶待分类').length,
      classified: data.filter(x => x.classified).length,
    };

    if (matched !== 349 || counts.t1 !== 349 || counts.t2 !== 158 || counts.t3 !== 302 || counts.classified !== classifiedBefore) {
      for (const old of snapshot) {
        old.item.sourceStatus = old.sourceStatus;
        old.item.originalPositions = old.originalPositions;
        old.item.suggestedCategory = old.suggestedCategory;
        old.item.searchKey = old.searchKey;
      }
      throw new Error(`表格更新校验失败：${matched}/${counts.t1}/${counts.t2}/${counts.t3}/${counts.classified}`);
    }
  }

  function installUi() {
    const oldBar = document.getElementById('tableOrderBar');
    if (oldBar) oldBar.remove();

    const rowMaps = new Map();
    for (const table of TABLES.slice(1)) {
      const items = data.filter(x => x.sourceStatus === table.status).sort((a, b) => Number(a.id) - Number(b.id));
      rowMaps.set(table.status, new Map(items.map((x, i) => [Number(x.id), i + 1])));
    }

    const bar = document.createElement('div');
    bar.id = 'tableOrderBar';
    bar.className = 'table-order-bar';
    bar.innerHTML = `<label for="tableOrderSelect">按新表对照</label><select id="tableOrderSelect">${TABLES.map(x => `<option value="${x.value}">${x.label}</option>`).join('')}</select>`;
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
          ref.textContent = `新表${tableNo} · 第${rowNo}项`;
          source.insertAdjacentElement('afterend', ref);
        }
        if (source && specimen.originalPositions?.length && !card.querySelector('.table-pos')) {
          const pos = document.createElement('div');
          pos.className = 'table-pos';
          pos.textContent = '原表位置：' + specimen.originalPositions.join('、');
          const anchor = card.querySelector('.table-ref') || source;
          anchor.insertAdjacentElement('afterend', pos);
        }
      });
    };

    select.addEventListener('change', () => {
      tableMode = select.value;
      localStorage.setItem('specimen_table_order_mode_v1', tableMode);
      if (typeof src !== 'undefined') src = '全部来源';
      render();
    });

    render();
  }

  (async () => {
    try {
      const rows = await loadUpdateData();
      await waitForApp();
      applyUpdate(rows);
      installUi();
    } catch (error) {
      console.error(error);
      if (typeof toast === 'function') toast('新表更新未应用，原有上架数据保持不变');
    }
  })();
})();
