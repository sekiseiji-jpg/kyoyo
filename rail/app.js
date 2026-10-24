'use strict';

/* =========================================================
   都市の路線図 ― 一般教養Note の地図コーナーから開く別アプリ。
     #tokyo #osaka #nagoya #fukuoka #sapporo #kyoto

   data-rail.js は「路線の全駅の並び」と、節になる駅の座標だけを持つ。
   座標のない駅は、前後の節のあいだに均等に置く（layout）。
   駅名は、節と選んでいる駅はいつも出し、それ以外は拡大したときに出す。
   ========================================================= */
(function () {
  const $ = (id) => document.getElementById(id);
  const DATA = window.MAP_RAIL;
  const SVGNS = 'http://www.w3.org/2000/svg';

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  function toast(msg) {
    const el = $('toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove('show'), 1800);
  }

  let cur = DATA.cities[0];
  let svg = null;
  let pos = {};          // 駅id → {x, y, anchor}
  let sel = null;        // 選んでいる駅
  let selLine = null;    // 強調している路線

  const linesAt = (sid) => cur.lines.filter((l) => l.all.includes(sid));
  /** その路線での隣の駅 */
  function neighbors(lineId, sid) {
    const l = cur.lines.find((x) => x.id === lineId);
    const i = l.all.indexOf(sid);
    if (i < 0) return [];
    const n = l.all.length;
    const prev = i > 0 ? l.all[i - 1] : (l.loop ? l.all[n - 1] : null);
    const next = i < n - 1 ? l.all[i + 1] : (l.loop ? l.all[0] : null);
    return [prev, next].filter(Boolean);
  }

  // =========================================================
  // 駅の位置を決める
  // =========================================================
  function layout() {
    pos = {};
    Object.entries(cur.stations).forEach(([id, s]) => {
      if (s.x != null && s.y != null) pos[id] = { x: s.x, y: s.y, anchor: true };
    });
    cur.lines.forEach((l) => {
      const at = [];
      l.all.forEach((id, i) => { if (pos[id] && pos[id].anchor) at.push(i); });
      if (!at.length) return;
      const fill = (ia, ib) => {
        const a = pos[l.all[ia % l.all.length]];
        const b = pos[l.all[ib % l.all.length]];
        for (let j = ia + 1; j < ib; j++) {
          const id = l.all[j % l.all.length];
          if (pos[id]) continue;                       // ほかの路線で置かれていればそのまま
          const t = (j - ia) / (ib - ia);
          pos[id] = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
        }
      };
      for (let k = 0; k < at.length - 1; k++) fill(at[k], at[k + 1]);
      // 環状線は、最後の節から最初の節へ戻る区間も埋める
      if (l.loop) fill(at[at.length - 1], at[0] + l.all.length);
      // 環状でないとき、両端が節でなければ端まで伸ばせないので、その駅は描かない
    });
  }

  // =========================================================
  // 描く
  // =========================================================
  function draw() {
    layout();
    const el = document.createElementNS(SVGNS, 'svg');
    el.setAttribute('viewBox', `0 0 ${cur.view[0]} ${cur.view[1]}`);
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', cur.name + 'の路線図');

    // 路線（節をつないだ線）
    cur.lines.forEach((l) => {
      const pts = l.all.filter((id) => pos[id] && pos[id].anchor).map((id) => pos[id]);
      if (pts.length < 2) return;
      const path = document.createElementNS(SVGNS, 'path');
      path.setAttribute('d', 'M' + pts.map((p) => `${p.x} ${p.y}`).join('L') + (l.loop ? 'Z' : ''));
      path.setAttribute('stroke', l.color);
      path.setAttribute('class', 'line');
      path.dataset.line = l.id;
      el.appendChild(path);
    });

    // 駅
    Object.keys(cur.stations).forEach((sid) => {
      const p = pos[sid];
      if (!p) return;
      const n = linesAt(sid).length;
      const g = document.createElementNS(SVGNS, 'g');
      g.setAttribute('class', 'st' + (p.anchor ? ' major' : '') + (n > 1 ? ' junction' : ''));
      g.dataset.st = sid;
      const hit = document.createElementNS(SVGNS, 'circle');
      hit.setAttribute('cx', p.x); hit.setAttribute('cy', p.y); hit.setAttribute('r', 8);
      hit.setAttribute('class', 'hit');
      const c = document.createElementNS(SVGNS, 'circle');
      c.setAttribute('cx', p.x); c.setAttribute('cy', p.y);
      c.setAttribute('r', n > 1 ? 5.5 : (p.anchor ? 4.2 : 2.6));
      c.setAttribute('class', 'dot');
      const t = document.createElementNS(SVGNS, 'text');
      t.setAttribute('x', p.x); t.setAttribute('y', p.y - 10);
      t.setAttribute('class', 'label' + (p.anchor || n > 1 ? '' : ' sub'));
      t.textContent = cur.stations[sid].name;
      g.appendChild(hit); g.appendChild(c); g.appendChild(t);
      el.appendChild(g);
    });

    const stage = $('stage');
    stage.innerHTML = '';
    stage.appendChild(el);
    stage.appendChild(zoomButtons());
    svg = el;
    view = { x: 0, y: 0, w: cur.view[0], h: cur.view[1] };
    applyView();
    bindPointer();
    paint();
  }

  function paint() {
    if (!svg) return;
    svg.querySelectorAll('.line').forEach((p) => {
      p.classList.toggle('dim', !!selLine && p.dataset.line !== selLine);
      p.classList.toggle('hi', p.dataset.line === selLine);
    });
    const onLine = selLine ? cur.lines.find((l) => l.id === selLine).all : null;
    svg.querySelectorAll('.st').forEach((g) => {
      g.classList.toggle('on', g.dataset.st === sel);
      g.classList.toggle('dim', !!onLine && !onLine.includes(g.dataset.st));
    });
  }

  // =========================================================
  // 拡大・移動
  // =========================================================
  let view = { x: 0, y: 0, w: 0, h: 0 };
  function applyView() {
    svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
    // 寄るほど図は拡大されるので、駅名と丸の大きさに同じ比率を掛けて
    // 画面上の見た目を一定に保つ（--k は「いまの縮尺」）
    svg.style.setProperty('--k', view.w / cur.view[0]);
    // 十分に寄ったら、途中の駅の名前も出す
    svg.classList.toggle('zoomed', view.w < cur.view[0] * 0.62);
  }

  function clampView() {
    const min = cur.view[0] / 7;
    view.w = Math.max(min, Math.min(cur.view[0], view.w));
    view.h = view.w * (cur.view[1] / cur.view[0]);
    view.x = Math.max(-view.w * 0.12, Math.min(cur.view[0] - view.w * 0.88, view.x));
    view.y = Math.max(-view.h * 0.12, Math.min(cur.view[1] - view.h * 0.88, view.y));
  }

  function zoomAt(f, rx, ry) {
    const nx = view.x + view.w * rx, ny = view.y + view.h * ry;
    view.w *= f; clampView();
    view.x = nx - view.w * rx; view.y = ny - view.h * ry;
    clampView(); applyView();
  }

  const resetView = () => { view = { x: 0, y: 0, w: cur.view[0], h: cur.view[1] }; applyView(); };

  /** その駅が見えるところまで寄る */
  function focusStation(sid) {
    const p = pos[sid];
    if (!p) return;
    view.w = cur.view[0] / 3;
    view.h = view.w * (cur.view[1] / cur.view[0]);
    view.x = p.x - view.w / 2;
    view.y = p.y - view.h / 2;
    clampView(); applyView();
  }

  function zoomButtons() {
    const box = document.createElement('div');
    box.className = 'zoom';
    [['＋', 1 / 1.5], ['－', 1.5]].forEach(([t, f]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = t; b.title = f < 1 ? '拡大' : '縮小';
      b.onclick = (e) => { e.stopPropagation(); zoomAt(f, 0.5, 0.5); };
      box.appendChild(b);
    });
    return box;
  }

  function bindPointer() {
    const pts = new Map();
    let moved = 0, last = null, pinch = 0;
    const dist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); };

    svg.addEventListener('pointerdown', (e) => {
      pts.set(e.pointerId, e);
      try { svg.setPointerCapture(e.pointerId); } catch (err) { /* 掴めなくても動く */ }
      if (pts.size === 1) { last = e; moved = 0; svg.classList.add('drag'); }
      if (pts.size === 2) pinch = dist();
    });
    svg.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, e);
      if (pts.size === 2) { const d2 = dist(); if (pinch) zoomAt(pinch / d2, 0.5, 0.5); pinch = d2; return; }
      if (!last) return;
      const r = svg.getBoundingClientRect();
      const dx = (e.clientX - last.clientX) * (view.w / r.width);
      const dy = (e.clientY - last.clientY) * (view.h / r.height);
      moved += Math.abs(dx) + Math.abs(dy);
      view.x -= dx; view.y -= dy; clampView(); applyView(); last = e;
    });
    const up = (e) => {
      svg.classList.remove('drag');
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = 0;
      if (pts.size === 0) {
        if (moved < view.w / 50) {
          const g = e.target.closest ? e.target.closest('.st') : null;
          if (g) showStation(g.dataset.st);
        }
        last = null;
      }
    };
    svg.addEventListener('pointerup', up);
    svg.addEventListener('pointercancel', up);
    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = svg.getBoundingClientRect();
      zoomAt(e.deltaY > 0 ? 1.2 : 1 / 1.2, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    }, { passive: false });
  }

  // =========================================================
  // 駅と路線
  // =========================================================
  function showStation(sid) {
    sel = sid; paint();
    const s = cur.stations[sid];
    const ls = linesAt(sid);
    const near = ls.map((l) => {
      const ns = neighbors(l.id, sid).map((n) => esc(cur.stations[n].name)).join('　／　');
      return `<div class="nb"><span class="nb-line" style="--c:${esc(l.color)}">${esc(l.name)}</span>
        <span class="nb-st">${ns}</span></div>`;
    }).join('');
    $('panel').innerHTML = `
      <h2>${esc(s.name)}</h2>
      <div class="yomi">${ls.length > 1 ? `${ls.length}路線が乗り入れる乗換駅` : '1路線の駅'}</div>
      <div class="chips">${ls.map((l) =>
        `<button class="chip" style="--c:${esc(l.color)}" data-line="${esc(l.id)}">${esc(l.name)}</button>`).join('')}</div>
      <div class="nbs"><div class="nb-head">となりの駅</div>${near}</div>
      <div class="row end"><button class="ghost" id="btn-focus">寄って見る</button></div>`;
    $('panel').querySelectorAll('[data-line]').forEach((b) => { b.onclick = () => selectLine(b.dataset.line); });
    $('btn-focus').onclick = () => focusStation(sid);
  }

  function selectLine(id) {
    selLine = selLine === id ? null : id;
    sel = null;
    paint(); drawLegend();
    if (!selLine) { $('panel').innerHTML = ''; return; }
    const l = cur.lines.find((x) => x.id === id);
    $('panel').innerHTML = `
      <h2><span class="swatch" style="background:${esc(l.color)}"></span>${esc(l.name)}</h2>
      <div class="yomi">全${l.all.length}駅${l.loop ? '・環状運転' : ''}${l.min ? `・${l.loop ? '1周' : '全線'}およそ${l.min}分` : ''}</div>
      <p class="note">${rich(l.note)}</p>
      <div class="chips">${l.all.map((s) =>
        `<button class="chip plain" data-go="${esc(s)}">${esc(cur.stations[s].name)}</button>`).join('')}</div>`;
    $('panel').querySelectorAll('[data-go]').forEach((b) => {
      b.onclick = () => { showStation(b.dataset.go); focusStation(b.dataset.go); $('stage').scrollIntoView({ block: 'center' }); };
    });
  }

  function drawLegend() {
    $('legend').innerHTML = cur.lines.map((l) =>
      `<button class="chip${selLine === l.id ? ' on' : ''}" style="--c:${esc(l.color)}" data-line="${esc(l.id)}">${esc(l.name)}</button>`).join('');
    $('legend').querySelectorAll('[data-line]').forEach((b) => { b.onclick = () => selectLine(b.dataset.line); });
  }

  /** 主要区間の所要時間。押すとその路線を強調する */
  function drawTimes() {
    const list = cur.times || [];
    if (!list.length) { $('times').innerHTML = ''; return; }
    $('times').innerHTML = list.map(([lid, a, b, min, memo]) => {
      const l = cur.lines.find((x) => x.id === lid);
      const label = a === b ? `${esc(cur.stations[a].name)} 1周` : `${esc(cur.stations[a].name)} → ${esc(cur.stations[b].name)}`;
      return `<button class="timerow" data-line="${esc(lid)}">
        <span class="tm-route">${label}</span>
        <span class="tm-line" style="--c:${esc(l.color)}">${esc(l.name)}</span>
        <span class="tm-min">約${min}分</span>
        ${memo ? `<span class="tm-memo">${esc(memo)}</span>` : ''}
      </button>`;
    }).join('');
    $('times').querySelectorAll('[data-line]').forEach((b) => {
      b.onclick = () => { selectLine(b.dataset.line); $('stage').scrollIntoView({ block: 'center' }); };
    });
  }

  // =========================================================
  // 切り替え
  // =========================================================
  function setCity(id, keepHash) {
    const c = DATA.cities.find((x) => x.id === id) || DATA.cities[0];
    cur = c; sel = null; selLine = null;
    document.querySelectorAll('[data-city]').forEach((b) => b.classList.toggle('on', b.dataset.city === c.id));
    $('bar-title').textContent = c.name + 'の路線図';
    document.title = c.name + 'の路線図';
    document.querySelector('.bar-title .logo').textContent = c.emoji;
    $('city-lead').innerHTML = rich(c.lead);
    $('facts').innerHTML = rich(c.facts);
    $('panel').innerHTML = '';
    const total = c.lines.reduce((set, l) => { l.all.forEach((s) => set.add(s)); return set; }, new Set()).size;
    $('hint').textContent = `${c.lines.length}路線・${total}駅。駅を押すと乗り入れる路線ととなりの駅が出ます。`
      + 'つまんで拡大すると、すべての駅名が出ます。';
    draw(); drawLegend(); drawTimes();
    if (!keepHash) location.hash = '#' + c.id;
  }

  // =========================================================
  // 起動
  // =========================================================
  $('city-switch').innerHTML = DATA.cities
    .map((c) => `<button class="sw" data-city="${esc(c.id)}">${c.emoji} ${esc(c.name)}</button>`).join('');
  document.querySelectorAll('[data-city]').forEach((b) => { b.onclick = () => setCity(b.dataset.city); });
  $('btn-reset').onclick = () => { sel = null; selLine = null; paint(); drawLegend(); resetView(); $('panel').innerHTML = ''; toast('表示をもとに戻しました'); };
  $('btn-back').onclick = () => { location.href = '../#chizu'; };
  window.addEventListener('hashchange', () => {
    const id = location.hash.replace('#', '');
    if (DATA.cities.some((c) => c.id === id) && id !== cur.id) setCity(id, true);
  });

  $('foot').textContent = DATA.source;
  setCity(location.hash.replace('#', '') || DATA.cities[0].id, true);

  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* 失敗しても動く */ }));
  }
})();
