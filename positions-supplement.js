(() => {
  'use strict';
  if (window.__specimenPositionSupplementV2) return;
  window.__specimenPositionSupplementV2 = true;

  const STATUS = '需要再找（有位置）';
  const ADDITIONS = {"炮姜炭":["24"],"升麻":["26","28"],"玄参":["20","23","24","28"],"桑枝":["20","23"],"白果仁":["28"],"槟榔":["21","22","23","24"],"炒决明子":["25"],"白英":["21"],"炒海螵蛸":["18","19","27"],"炒莱菔子":["19","20","24"],"鸡内金":["20","28"],"首乌藤":["24","28"],"炒山楂":["20"],"炒牛蒡子":["27"],"麸炒山药":["18"],"焦山楂":["22","24","27"],"炒路路通":["15","18"],"紫苏梗":["18"],"虎杖":["19"],"枸骨叶":["20"],"黄蜀葵花":["24"],"梅花":["18"],"冬瓜皮":["20"],"水红花子":["19"],"预知子":["22","23"],"广藿香":["28"],"鹿角霜":["19"],"铁落":["20"],"炮姜":["18"],"仙鹤草":["23"],"蚕沙":["15"],"五灵脂":["27"],"水蛭":["15"],"月季花":["18"],"艾叶":["17","20"],"钩藤":["23","24"],"海螵蛸":["15","22","23","26"],"延胡索":["15","20","21","26"],"百部":["21","26"],"代代花":["20"],"鹿茸":["17"],"浙贝母":["20","22","24"],"山茱萸":["20","22","23","25","26","28"],"赭石":["15","20"],"木蝴蝶":["21"],"黄芩":["21","22","23","26","27","28"],"乌药":["19"],"石斛":["18","21","22","28"],"川芎":["17","24"],"灵芝":["18","21","24"],"肉苁蓉":["20"],"党参":["18","21","22","23","24","25","26","27"],"旋复花":["20"],"防风":["17","23","24","26","28"],"谷芽":["18","20"],"橘核":["22"],"薄荷":["23","24","26"],"石见穿":["17","21","28"],"金蝉花":["20"],"益智":["23","24","26"],"稻芽":["23"],"天冬":["24","27","28"],"芡实":["27"],"凌霄花":["22"],"甘草":["15","18","20","21","22","23","24","25","27","28"],"马勃":["20"],"人参":["22","23","24","25","26","28"],"龙骨":["24","27"],"荷梗":["22"],"菥蓂":["21","23"],"牡蛎":["20","24","28"],"天葵子":["18"],"煨木香":["18"],"槐米炭":["18"],"八角茴香":["19","23"],"炒谷芽":["18"],"炒诃子肉":["18"],"炒郁李仁":["27"],"大麦":["26"],"胡椒":["19","20"],"焦麦芽":["18"],"橘络":["23"],"大蓟炭":["17"],"炒九香虫":["19","20"],"酒九香虫":["18"],"瓦楞子":["23"],"夜明砂":["19"],"炒槟榔":["27"],"佛手":["18","19"],"蔓荆子":["22"],"大黄":["21","27","28"],"益智仁":["24","27","28"],"赤石脂":["19"],"白薇":["20"],"附子":["26","28"],"香附":["17"],"刘寄奴":["22"],"炒王不留行":["28"],"醋莪术":["19","27"],"车前子":["27"],"干益母草":["28"],"地榆":["20","21"],"金樱子":["23"],"酒女贞子":["20","27"],"辣蓼":["27"],"燀苦杏仁":["18","26"],"穿破石":["24"],"毛冬青":["19","28"],"猫人参":["20"],"木通":["24","26"],"秦皮":["23","27"],"蒲黄":["20"],"旋覆花":["15","21","24","26"],"山楂炭":["27"],"没药":["19"],"绞股蓝":["23","26"],"煅龙骨":["20","24","27"],"麸炒枳实":["17","19"],"红参":["18","22","26","28"],"熟地":["15","18","20","27"],"淡豆豉":["20","27"],"半夏":["27"],"防己":["19"],"红芪":["23"],"炙甘草":["19","21"],"重楼":["17","18"],"紫菀":["15"],"炒枇杷叶":["28"],"青皮":["19","26"],"高良姜":["19"],"红景天":["18"],"麻黄根":["20","28"],"制玉竹":["27"],"肉桂":["18","27","28"],"枇杷叶":["28"],"寻骨风":["25"],"蜂房":["20"],"瓜蒌皮":["18"],"龙葵":["18","20","21"],"蜜紫菀":["18"],"侧柏炭":["19"],"燀山桃仁":["17","18"],"炒紫苏子":["21"],"鹿角":["18","22","24","28"],"射干":["23","24"],"碧桃干":["28"]};

  function mergePositions(current, extra) {
    return [...new Set([...(current || []), ...(extra || [])].map(x => String(x).padStart(2, '0')))]
      .filter(x => /^\d{2}$/.test(x) && Number(x) >= 1 && Number(x) <= 28)
      .sort((a, b) => Number(a) - Number(b));
  }

  function patchSource() {
    if (!Array.isArray(window.SPECIMEN_DATA)) return;
    for (const row of window.SPECIMEN_DATA) {
      const extra = row && row[3] === STATUS ? ADDITIONS[row[1]] : null;
      if (!extra) continue;
      row[4] = mergePositions(row[4], extra);
      row[5] = String(row[5] || '') + ' ' + extra.join(' ');
    }
  }

  function patchState() {
    if (typeof data === 'undefined' || !Array.isArray(data) || !data.length) return;
    for (const specimen of data) {
      const extra = specimen && specimen.sourceStatus === STATUS ? ADDITIONS[specimen.name] : null;
      if (!extra) continue;
      specimen.originalPositions = mergePositions(specimen.originalPositions, extra);
      specimen.searchKey = String(specimen.searchKey || '') + ' ' + extra.join(' ');
    }
  }

  function annotateCards() {
    if (typeof arr !== 'function') return;
    const visible = arr();
    document.querySelectorAll('#list .card').forEach((card, index) => {
      const specimen = visible[index];
      if (!specimen || specimen.sourceStatus !== STATUS || !(specimen.originalPositions || []).length) return;
      let line = card.querySelector('.find-positions');
      if (!line) {
        line = document.createElement('div');
        line.className = 'find-positions';
        const anchor = card.querySelector('.table-ref') || card.querySelector('.src');
        if (anchor) anchor.insertAdjacentElement('afterend', line);
      }
      line.textContent = '待找位置：' + specimen.originalPositions.join('、');
    });
  }

  const style = document.createElement('style');
  style.textContent = '.find-positions{font-size:13px;color:#1d4ed8;font-weight:800;margin-top:4px}';
  document.head.appendChild(style);

  patchSource();

  function install() {
    if (typeof render !== 'function' || typeof arr !== 'function') {
      setTimeout(install, 100);
      return;
    }
    patchState();
    const previousRender = render;
    render = function () {
      patchState();
      previousRender();
      annotateCards();
    };
    render();
  }

  install();
})();
