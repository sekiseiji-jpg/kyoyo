'use strict';

/* =========================================================
   都市の路線図 ― 一般教養Note の地図コーナーから開く別アプリ。
   線は data-rail.js の「通る駅の並び」から組み立てる。
     #tokyo  #osaka  #nagoya
   画面は「見る / クイズ」。クイズはデータから自動で作る。
   記録はこの端末のブラウザ（localStorage の rail.v1）だけに残る。
   ========================================================= */
(function () {
  const $ = (id) => document.getElementById(id);
  const DATA = window.MAP_RAIL;
  const KEY = 'rail.v1';
  const SVGNS = 'http://www.w3.org/2000/svg';

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const shuffle = (a) => {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
    return r;
  };

  // ---------- 記録 ----------
  const st = { rec: {} };
  try { const raw = localStorage.getItem(KEY); if (raw) { const o = JSON.parse(raw); if (o.rec) st.rec = o.rec; } }
  catch (e) { /* 読めなくても既定値で動く */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* 保存できない環境 */ } };
  function mark(key, ok) {
    const r = st.rec[key] || { o: 0, x: 0 };
    if (ok) r.o++; else r.x++;
    st.rec[key] = r; save();
  }

  function toast(msg) {
    const el = $('toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove('show'), 1800);
  }

  // ---------- いまの状態 ----------
  let cur = DATA.cities[0];
  let mode = 'look';
  let svg = null;
  let sel = null;        // 選んでいる駅
  let selLine = null;    // 強調している路線
  let quiz = null;

  /** その駅を通る路線 */
  const linesAt = (sid) => cur.lines.filter((l) => l.via.includes(sid));
  const stationIds = () => Object.keys(cur.stations);

  // =========================================================
  // 図を描く
  // =========================================================
  function draw() {
    const el = document.createElementNS(SVGNS, 'svg');
    el.setAttribute('viewBox', `0 0 ${cur.view[0]} ${cur.view[1]}`);
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', cur.name + 'の路線図');

    // 路線（駅をつないだ線）
    cur.lines.forEach((l) => {
      const pts = l.via.map((s) => cur.stations[s]).filter(Boolean);
      if (pts.length < 2) return;
      let d = 'M' + pts.map((p) => `${p.x} ${p.y}`).join('L');
      if (l.loop) d += 'Z';
      const path = document.createElementNS(SVGNS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('stroke', l.color);
      path.setAttribute('class', 'line');
      path.dataset.line = l.id;
      el.appendChild(path);
    });

    // 駅
    stationIds().forEach((sid) => {
      const s = cur.stations[sid];
      const n = linesAt(sid).length;
      const g = document.createElementNS(SVGNS, 'g');
      g.setAttribute('class', 'st');
      g.dataset.st = sid;
      const hit = document.createElementNS(SVGNS, 'circle');
      hit.setAttribute('cx', s.x); hit.setAttribute('cy', s.y); hit.setAttribute('r', 16);
      hit.setAttribute('class', 'hit');
      const c = document.createElementNS(SVGNS, 'circle');
      c.setAttribute('cx', s.x); c.setAttribute('cy', s.y);
      c.setAttribute('r', n > 1 ? 7 : 5);
      c.setAttribute('class', n > 1 ? 'dot junction' : 'dot');
      const t = document.createElementNS(SVGNS, 'text');
      t.setAttribute('x', s.x); t.setAttribute('y', s.y - 12);
      t.setAttribute('class', 'label');
      t.textContent = s.name;
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
    svg.querySelectorAll('.st').forEach((g) => {
      g.classList.toggle('on', g.dataset.st === sel);
      const onLine = !selLine || cur.lines.find((l) => l.id === selLine).via.includes(g.dataset.st);
      g.classList.toggle('dim', !!selLine && !onLine);
    });
  }

  // =========================================================
  // 拡大・移動（地図コーナーと同じ作り）
  // =========================================================
  let view = { x: 0, y: 0, w: 0, h: 0 };
  const applyView = () => svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);

  function clampView() {
    const min = cur.view[0] / 6;
    view.w = Math.max(min, Math.min(cur.view[0], view.w));
    view.h = view.w * (cur.view[1] / cur.view[0]);
    view.x = Math.max(-view.w * 0.15, Math.min(cur.view[0] - view.w * 0.85, view.x));
    view.y = Math.max(-view.h * 0.15, Math.min(cur.view[1] - view.h * 0.85, view.y));
  }

  function zoomAt(f, rx, ry) {
    const nx = view.x + view.w * rx, ny = view.y + view.h * ry;
    view.w *= f; clampView();
    view.x = nx - view.w * rx; view.y = ny - view.h * ry;
    clampView(); applyView();
  }

  const resetView = () => { view = { x: 0, y: 0, w: cur.view[0], h: cur.view[1] }; applyView(); };

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
          if (g) hit(g.dataset.st);
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
  // 見る
  // =========================================================
  function hit(sid) {
    if (mode === 'quiz') return quizTap(sid);
    sel = sid; paint(); showStation(sid);
  }

  function showStation(sid) {
    const s = cur.stations[sid];
    const ls = linesAt(sid);
    $('panel').innerHTML = `
      <h2>${esc(s.name)}</h2>
      <div class="yomi">${ls.length > 1 ? `${ls.length}路線が乗り入れる乗換駅` : '1路線の駅'}</div>
      <div class="chips">${ls.map((l) =>
        `<button class="chip" style="--c:${esc(l.color)}" data-line="${esc(l.id)}">${esc(l.name)}</button>`).join('')}</div>`;
    $('panel').querySelectorAll('[data-line]').forEach((b) => {
      b.onclick = () => selectLine(b.dataset.line);
    });
  }

  function selectLine(id) {
    selLine = selLine === id ? null : id;
    paint();
    drawLegend();
    if (!selLine) { $('panel').innerHTML = ''; return; }
    const l = cur.lines.find((x) => x.id === id);
    $('panel').innerHTML = `
      <h2><span class="swatch" style="background:${esc(l.color)}"></span>${esc(l.name)}</h2>
      <div class="yomi">${l.via.length}駅${l.loop ? '・環状運転' : ''}</div>
      <p class="note">${rich(l.note)}</p>
      <div class="chips">${l.via.map((s) =>
        `<button class="chip plain" data-go="${esc(s)}">${esc(cur.stations[s].name)}</button>`).join('')}</div>`;
    $('panel').querySelectorAll('[data-go]').forEach((b) => {
      b.onclick = () => { sel = b.dataset.go; paint(); showStation(sel); };
    });
  }

  function drawLegend() {
    $('legend').innerHTML = cur.lines.map((l) =>
      `<button class="chip${selLine === l.id ? ' on' : ''}" style="--c:${esc(l.color)}" data-line="${esc(l.id)}">${esc(l.name)}</button>`).join('');
    $('legend').querySelectorAll('[data-line]').forEach((b) => { b.onclick = () => selectLine(b.dataset.line); });
  }

  // =========================================================
  // クイズ（データから作る）
  // =========================================================
  function buildQuiz() {
    const qs = [];
    // 乗換駅の場所を当てる
    stationIds().filter((s) => linesAt(s).length > 1).forEach((s) => {
      qs.push({ k: 'spot-' + s, type: 'spot', a: s,
        q: `${cur.stations[s].name}駅はどこか。`,
        exp: `${cur.stations[s].name}は${linesAt(s).map((l) => l.name).join('・')}が乗り入れる乗換駅。` });
    });
    // その路線が通る駅はどれか
    cur.lines.forEach((l) => {
      const on = l.via;
      const off = stationIds().filter((s) => !on.includes(s));
      if (off.length < 3) return;
      const ans = on[Math.floor(on.length / 2)];
      qs.push({ k: 'line-' + l.id, type: 'mc',
        q: `${l.name}が通る駅はどれか。`,
        c: shuffle([ans, ...shuffle(off).slice(0, 3)]).map((s) => cur.stations[s].name),
        aName: cur.stations[ans].name,
        exp: `${l.name}は ${on.map((s) => cur.stations[s].name).join('→')} と進む。${l.note.replace(/\*\*/g, '')}` });
    });
    // 環状運転をするのはどれか
    const loops = cur.lines.filter((l) => l.loop);
    if (loops.length && cur.lines.length > loops.length) {
      qs.push({ k: 'loop', type: 'mc',
        q: 'この都市で環状運転をする路線はどれか。',
        c: shuffle(cur.lines.map((l) => l.name)),
        aName: loops[0].name,
        exp: `正解は${loops[0].name}。${loops[0].note.replace(/\*\*/g, '')}` });
    }
    return qs;
  }

  function quizMenu() {
    const pool = buildQuiz();
    const done = pool.filter((q) => st.rec[cur.id + '-' + q.k]).length;
    $('prompt').innerHTML = '';
    $('choices').innerHTML = '';
    selLine = null; sel = null; paint(); resetView();
    $('panel').innerHTML = `
      <h2>クイズ</h2>
      <div class="yomi">${cur.name}の路線図から${pool.length}問</div>
      <p class="note">乗換駅の場所を当てる問題と、路線の通る駅を選ぶ問題が出ます。解いたことがあるのは ${done} / ${pool.length} 問。</p>
      <div class="row"><button class="primary" id="q-start">${pool.length}問を解く</button></div>`;
    $('q-start').onclick = () => { quiz = { list: shuffle(pool), i: 0, ok: 0, wrong: [] }; nextQ(); };
    $('hint').textContent = '';
  }

  function nextQ() {
    if (quiz.i >= quiz.list.length) return quizResult();
    const q = quiz.list[quiz.i];
    const n = quiz.list.length;
    $('prompt').innerHTML = `
      <div class="q">${esc(q.q)}</div>
      <div class="meta">${quiz.i + 1} / ${n}　正解 ${quiz.ok}</div>
      <div class="bar-wrap"><i style="width:${(quiz.i / n) * 100}%"></i></div>`;
    $('panel').innerHTML = '';
    quiz.done = false;
    selLine = null; sel = null; paint(); resetView();
    if (q.type === 'spot') {
      $('choices').innerHTML = '';
      $('hint').textContent = '図の中の駅を押して答えます。';
    } else {
      $('hint').textContent = '';
      $('choices').innerHTML = q.c.map((c, i) => `<button data-pick="${i}">${esc(c)}</button>`).join('');
      $('choices').querySelectorAll('[data-pick]').forEach((b) => {
        b.onclick = () => answer(b.textContent === q.aName, b);
      });
    }
  }

  function quizTap(sid) {
    const q = quiz && quiz.list[quiz.i];
    if (!q || q.type !== 'spot' || quiz.done) return;
    sel = sid; paint();
    answer(sid === q.a, null);
  }

  function answer(ok, btn) {
    if (quiz.done) return;
    quiz.done = true;
    const q = quiz.list[quiz.i];
    mark(cur.id + '-' + q.k, ok);
    if (ok) quiz.ok++; else quiz.wrong.push(q.q);
    if (q.type === 'spot') {
      sel = q.a; paint();
      const g = svg.querySelector(`.st[data-st="${q.a}"]`);
      if (g) g.classList.add(ok ? 'ok' : 'bad');
    } else {
      $('choices').querySelectorAll('[data-pick]').forEach((b) => {
        b.disabled = true;
        if (b.textContent === q.aName) b.classList.add('pick-ok');
        else if (b === btn) b.classList.add('pick-bad');
      });
    }
    $('panel').innerHTML = `
      <div class="judge ${ok ? 'ok' : 'bad'}">${ok ? '正解' : 'まちがい'}</div>
      <p class="note">${rich(q.exp)}</p>
      <div class="row end"><button class="primary" id="q-next">次へ</button></div>`;
    $('q-next').onclick = () => { quiz.i++; nextQ(); window.scrollTo(0, 0); };
  }

  function quizResult() {
    const n = quiz.list.length;
    $('prompt').innerHTML = ''; $('choices').innerHTML = ''; $('hint').textContent = '';
    sel = null; selLine = null; paint(); resetView();
    $('panel').innerHTML = `
      <h2>おつかれさま</h2>
      <div class="yomi">${n}問中 ${quiz.ok}問 正解</div>
      ${quiz.wrong.length ? `<p class="note">まちがえた：${esc(quiz.wrong.join('　／　'))}</p>` : '<p class="note">全問正解です。</p>'}
      <div class="row">
        <button class="primary" id="q-again">もう一度</button>
        <button class="ghost" id="q-look">図で見直す</button>
      </div>`;
    $('q-again').onclick = quizMenu;
    $('q-look').onclick = () => setMode('look');
    quiz = null;
  }

  // =========================================================
  // 切り替え
  // =========================================================
  function setCity(id, keepHash) {
    const c = DATA.cities.find((x) => x.id === id) || DATA.cities[0];
    cur = c; quiz = null; sel = null; selLine = null;
    document.querySelectorAll('[data-city]').forEach((b) => b.classList.toggle('on', b.dataset.city === c.id));
    $('bar-title').textContent = c.name + 'の路線図';
    document.title = c.name + 'の路線図';
    document.querySelector('.bar-title .logo').textContent = c.emoji;
    $('city-lead').innerHTML = rich(c.lead);
    $('facts').innerHTML = rich(c.facts);
    draw();
    drawLegend();
    setMode(mode);
    if (!keepHash) location.hash = '#' + c.id;
  }

  function setMode(m) {
    mode = m;
    document.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === m));
    $('prompt').innerHTML = ''; $('choices').innerHTML = ''; $('panel').innerHTML = '';
    sel = null; selLine = null; quiz = null;
    paint(); drawLegend(); resetView();
    if (m === 'quiz') return quizMenu();
    $('hint').textContent = '駅を押すと乗り入れる路線が出ます。路線の名前を押すとその線だけを強調します。';
  }

  // =========================================================
  // 起動
  // =========================================================
  $('city-switch').innerHTML = DATA.cities
    .map((c) => `<button class="sw" data-city="${esc(c.id)}">${c.emoji} ${esc(c.name)}</button>`).join('');
  document.querySelectorAll('[data-city]').forEach((b) => { b.onclick = () => setCity(b.dataset.city); });
  document.querySelectorAll('[data-mode]').forEach((b) => { b.onclick = () => setMode(b.dataset.mode); });
  $('btn-reset').onclick = () => { resetView(); toast('表示をもとに戻しました'); };
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
