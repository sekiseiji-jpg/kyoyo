'use strict';

/* =========================================================
   地図 ― 一般教養Note の読書コーナーと同じく、分野から開く別アプリ。
   画面は「見る / クイズ / 一覧」の3つ。地図は data-jp.js と data-world.js が持つ。
     #jp     日本地図
     #world  世界地図
   記録はこの端末のブラウザ（localStorage の chizu.v1）だけに残る。
   ========================================================= */
(function () {
  const $ = (id) => document.getElementById(id);
  const MAPS = { jp: window.MAP_JP, world: window.MAP_WORLD };
  const KEY = 'chizu.v1';

  // 一般教養Note の解説カードのうち、その地図と関係の深いもの。
  // ../#t=<カードid> で本体がそのカードを開く（本体の app.js の起動処理が見ている）
  const CARDS = {
    jp: [
      ['5-8-03', '都道府県'],
      ['1-4-08', '日本の地形と地域性'],
      ['1-4-02', 'プレートと地形'],
    ],
    world: [
      ['5-8-02', '国と首都'],
      ['1-4-03', '気候区分'],
      ['1-4-07', '民族と宗教の分布'],
      ['1-4-09', '地図の読み方'],
    ],
  };
  const SVGNS = 'http://www.w3.org/2000/svg';
  const QUIZ_N = 20;

  // ---------- 記録 ----------
  const st = { rec: { jp: {}, world: {} }, color: false };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const o = JSON.parse(raw);
      if (o.rec) st.rec = Object.assign(st.rec, o.rec);
      if (typeof o.color === 'boolean') st.color = o.color;
    }
  } catch (e) { /* 読めなくても既定値で動く */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* 保存できない環境 */ } };

  const recOf = (mapId, id) => st.rec[mapId][id] || { o: 0, x: 0 };
  function mark(mapId, id, ok) {
    const r = recOf(mapId, id);
    if (ok) r.o++; else r.x++;
    st.rec[mapId][id] = r;
    save();
  }
  const isWeak = (mapId, id) => { const r = recOf(mapId, id); return r.x > r.o; };

  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove('show'), 1800);
  }

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = (a) => {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
    return r;
  };

  // ---------- いまの状態 ----------
  let cur = 'jp';          // jp / world
  let mode = 'look';       // look / quiz / list
  let svg = null;          // いま描いてある <svg>
  let pathOf = {};         // id -> <path>
  let groups = [];         // 色分けの並び順
  let quiz = null;         // 出題中のとき {dir, pool, i, cur, ok, wrong[]}

  const data = () => MAPS[cur];
  const itemOf = (id) => data().items.find((i) => i.id === id);

  // =========================================================
  // 地図を描く
  // =========================================================
  function drawMap() {
    const d = data();
    groups = [...new Set(d.items.map((i) => i.group))];
    const el = document.createElementNS(SVGNS, 'svg');
    el.setAttribute('viewBox', `0 0 ${d.view[0]} ${d.view[1]}`);
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', d.title);
    pathOf = {};
    d.items.forEach((it) => {
      const p = document.createElementNS(SVGNS, 'path');
      p.setAttribute('d', it.d);
      p.dataset.id = it.id;
      el.appendChild(p);
      pathOf[it.id] = p;
    });
    const stage = $('stage');
    stage.innerHTML = '';
    stage.appendChild(el);
    stage.appendChild(zoomButtons());
    svg = el;
    view = { x: 0, y: 0, w: d.view[0], h: d.view[1] };
    applyView();
    paint();
    bindPointer();
  }

  /** 色をぜんぶ塗り直す。sel は強調、quiz 中は答え合わせの色 */
  function paint(opt) {
    const o = opt || {};
    const d = data();
    d.items.forEach((it) => {
      const p = pathOf[it.id];
      p.className.baseVal = '';
      if (st.color && mode !== 'quiz') p.classList.add('g' + (groups.indexOf(it.group) % 8));
      if (o.dimOthers && it.id !== o.on) p.classList.add('dim');
      if (o.on === it.id) p.classList.add('on');
      if (o.ok === it.id) p.classList.add('ok');
      if (o.bad === it.id) p.classList.add('bad');
    });
  }

  // =========================================================
  // 拡大・移動
  // =========================================================
  let view = { x: 0, y: 0, w: 0, h: 0 };
  const applyView = () => svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);

  function clampView() {
    const d = data();
    const min = d.view[0] / 24;                       // これ以上は寄れない
    view.w = Math.max(min, Math.min(d.view[0], view.w));
    view.h = view.w * (d.view[1] / d.view[0]);
    view.x = Math.max(-view.w * 0.2, Math.min(d.view[0] - view.w * 0.8, view.x));
    view.y = Math.max(-view.h * 0.2, Math.min(d.view[1] - view.h * 0.8, view.y));
  }

  function zoomAt(factor, cxRatio, cyRatio) {
    const nx = view.x + view.w * cxRatio;
    const ny = view.y + view.h * cyRatio;
    view.w *= factor;
    clampView();
    view.x = nx - view.w * cxRatio;
    view.y = ny - view.h * cyRatio;
    clampView();
    applyView();
  }

  function resetView() {
    const d = data();
    view = { x: 0, y: 0, w: d.view[0], h: d.view[1] };
    applyView();
  }

  /** その土地が画面いっぱいに入るように寄る */
  function fitTo(id, pad) {
    const p = pathOf[id];
    if (!p) return;
    let b;
    try { b = p.getBBox(); } catch (e) { return; }
    if (!b || !b.width) return;
    const d = data();
    const m = (pad == null ? 2.2 : pad);
    let w = Math.max(b.width * m, b.height * m * (d.view[0] / d.view[1]), d.view[0] / 20);
    view.w = Math.min(w, d.view[0]);
    view.h = view.w * (d.view[1] / d.view[0]);
    view.x = b.x + b.width / 2 - view.w / 2;
    view.y = b.y + b.height / 2 - view.h / 2;
    clampView();
    applyView();
  }

  function zoomButtons() {
    const box = document.createElement('div');
    box.className = 'zoom';
    [['＋', 1 / 1.5], ['－', 1.5]].forEach(([t, f]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = t;
      b.title = f < 1 ? '拡大' : '縮小';
      b.onclick = (e) => { e.stopPropagation(); zoomAt(f, 0.5, 0.5); };
      box.appendChild(b);
    });
    return box;
  }

  // 指・マウスでの移動と拡大
  function bindPointer() {
    const pts = new Map();
    let moved = 0, last = null, pinch = 0;

    const ratio = (e) => {
      const r = svg.getBoundingClientRect();
      return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
    };

    svg.addEventListener('pointerdown', (e) => {
      pts.set(e.pointerId, e);
      // 指が画面の外へ出ても追えるようにする。掴めない種類の入力もあるので失敗は見逃す
      try { svg.setPointerCapture(e.pointerId); } catch (err) { /* 掴めなくても動く */ }
      if (pts.size === 1) { last = e; moved = 0; svg.classList.add('drag'); }
      if (pts.size === 2) pinch = dist();
    });

    function dist() {
      const [a, b] = [...pts.values()];
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    }

    svg.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, e);
      if (pts.size === 2) {
        const d2 = dist();
        if (pinch) { zoomAt(pinch / d2, 0.5, 0.5); }
        pinch = d2;
        return;
      }
      if (!last) return;
      const r = svg.getBoundingClientRect();
      const dx = (e.clientX - last.clientX) * (view.w / r.width);
      const dy = (e.clientY - last.clientY) * (view.h / r.height);
      moved += Math.abs(dx) + Math.abs(dy);
      view.x -= dx; view.y -= dy;
      clampView();
      applyView();
      last = e;
    });

    const up = (e) => {
      svg.classList.remove('drag');
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = 0;
      if (pts.size === 0) {
        // 動かさずに離したときだけ「押した」とみなす
        if (moved < view.w / 60 && e.target && e.target.dataset && e.target.dataset.id) {
          hit(e.target.dataset.id);
        }
        last = null;
      }
    };
    svg.addEventListener('pointerup', up);
    svg.addEventListener('pointercancel', up);

    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const [rx, ry] = ratio(e);
      zoomAt(e.deltaY > 0 ? 1.2 : 1 / 1.2, rx, ry);
    }, { passive: false });
  }

  // =========================================================
  // 見る
  // =========================================================
  function hit(id) {
    if (mode === 'quiz') return quizTap(id);
    showInfo(id);
  }

  /** 人口。日本は万人、世界は1万人単位で持っているので、大きければ億に直す */
  const fmtPop = (man) => {
    if (!man) return '';
    if (man >= 10000) return (man / 10000).toFixed(man >= 100000 ? 0 : 1) + '億人';
    return (man >= 100 ? Math.round(man).toLocaleString() : man) + '万人';
  };
  const fmtArea = (km2) => (km2 ? km2.toLocaleString() + ' km²' : '');

  /** その土地が全体の何番目の大きさか（人口・面積の感覚をつかむため） */
  function rankOf(id, key) {
    const list = data().items.filter((i) => i[key]);
    const sorted = list.slice().sort((a, b) => b[key] - a[key]);
    const i = sorted.findIndex((x) => x.id === id);
    return i < 0 ? '' : `${i + 1}位 / ${list.length}`;
  }

  function showInfo(id) {
    const it = itemOf(id);
    if (!it) return;
    paint({ on: id });
    const r = recOf(cur, id);
    const tried = r.o + r.x;
    const jp = cur === 'jp';
    $('panel').innerHTML = `
      <h2>${esc(it.name)}</h2>
      ${it.yomi ? `<div class="yomi">${esc(it.yomi)}</div>` : ''}
      <dl>
        ${it.capital ? `<dt>${jp ? '県庁所在地' : '首都'}</dt><dd>${esc(it.capital)}</dd>` : ''}
        <dt>${jp ? '地方' : '州'}</dt><dd>${esc(it.group)}</dd>
        ${it.pop ? `<dt>人口</dt><dd>${fmtPop(it.pop)}<span class="rank">${rankOf(id, 'pop')}</span></dd>` : ''}
        ${it.area ? `<dt>面積</dt><dd>${fmtArea(it.area)}<span class="rank">${rankOf(id, 'area')}</span></dd>` : ''}
        ${it.food ? `<dt>郷土料理</dt><dd>${esc(it.food)}</dd>` : ''}
        ${it.spots ? `<dt>名所</dt><dd>${esc(it.spots)}</dd>` : ''}
        ${tried ? `<dt>クイズ</dt><dd>${r.o} 正解 / ${r.x} まちがい</dd>` : ''}
      </dl>
      <div class="row end">
        <button class="ghost" id="btn-fit">寄って見る</button>
      </div>`;
    const b = $('btn-fit');
    if (b) b.onclick = () => fitTo(id);
  }

  // =========================================================
  // クイズ
  // =========================================================
  /**
   * 出題できるもの。世界地図は区分で分ける。
   *   find（地図で探す）… 押せる大きさのある国だけ
   *   name（名前を当てる）… 小さい国も出す。自動で寄るので答えられる
   */
  const targets = (dir) => data().items.filter((i) => {
    if (cur !== 'world') return true;
    return dir === 'find' ? i.quiz === 1 : i.quiz >= 1;
  });

  function quizMenu() {
    const all = targets('name');
    const findN = targets('find').length;
    const weak = all.filter((i) => isWeak(cur, i.id));
    $('prompt').innerHTML = '';
    $('choices').innerHTML = '';
    paint();
    resetView();
    $('panel').innerHTML = `
      <h2>クイズ</h2>
      <div class="yomi">${data().title}／出題できるのは ${all.length}${data().unit}</div>
      <dl>
        <dt>地図で探す</dt><dd>名前を見て、その場所を押す（${findN}${data().unit}）</dd>
        <dt>名前を当てる</dt><dd>光っている場所の名前を四択で選ぶ（${all.length}${data().unit}）</dd>
      </dl>
      ${cur === 'world' ? '<p class="note" style="border:none;padding:0;margin:6px 0 0;font-size:12px">'
        + '小さい国は押しにくいので「地図で探す」には出しません。「名前を当てる」なら自動で寄るので出ます。</p>' : ''}
      <div class="row">
        <button class="primary" data-start="find">地図で探す</button>
        <button class="primary" data-start="name">名前を当てる</button>
      </div>
      ${weak.length ? `<div class="row"><button class="ghost" data-start="weak">苦手な ${weak.length}${data().unit}だけ</button></div>` : ''}`;
    $('panel').querySelectorAll('[data-start]').forEach((b) => {
      b.onclick = () => {
        const k = b.dataset.start;
        startQuiz(k === 'weak' ? 'name' : k, k === 'weak');
      };
    });
    $('hint').textContent = '';
  }

  function startQuiz(dir, weakOnly) {
    let pool = targets(dir);
    if (weakOnly) pool = pool.filter((i) => isWeak(cur, i.id));
    pool = shuffle(pool).slice(0, Math.min(QUIZ_N, pool.length));
    quiz = { dir, pool, i: 0, ok: 0, wrong: [], answered: false, cur: null };
    nextQ();
  }

  function nextQ() {
    if (quiz.i >= quiz.pool.length) return quizResult();
    quiz.cur = quiz.pool[quiz.i];
    quiz.answered = false;
    const n = quiz.pool.length;
    $('prompt').innerHTML = `
      <div class="q">${quiz.dir === 'find'
        ? `${esc(quiz.cur.name)} はどこ？`
        : '光っている場所はどこ？'}</div>
      <div class="meta">${quiz.i + 1} / ${n}　正解 ${quiz.ok}</div>
      <div class="bar-wrap"><i style="width:${(quiz.i / n) * 100}%"></i></div>`;
    $('panel').innerHTML = '';

    if (quiz.dir === 'find') {
      paint();
      resetView();
      $('choices').innerHTML = '';
      $('hint').textContent = '地図を押して答えます。つまんで拡大、引いて移動できます。';
    } else {
      paint({ on: quiz.cur.id, dimOthers: true });
      fitTo(quiz.cur.id, 3.5);
      $('hint').textContent = '';
      drawChoices();
    }
  }

  function drawChoices() {
    const pool = targets(quiz.dir).filter((i) => i.id !== quiz.cur.id);
    const same = shuffle(pool.filter((i) => i.group === quiz.cur.group)).slice(0, 3);
    const rest = shuffle(pool).filter((i) => !same.includes(i)).slice(0, 3 - same.length);
    const list = shuffle([quiz.cur, ...same, ...rest].slice(0, 4));
    $('choices').innerHTML = list.map((i) => `<button data-pick="${esc(i.id)}">${esc(i.name)}</button>`).join('');
    $('choices').querySelectorAll('[data-pick]').forEach((b) => {
      b.onclick = () => answer(b.dataset.pick, b);
    });
  }

  function quizTap(id) {
    if (quiz.dir !== 'find' || quiz.answered) return;
    answer(id, null);
  }

  function answer(id, btn) {
    if (quiz.answered) return;
    quiz.answered = true;
    const ok = id === quiz.cur.id;
    if (ok) quiz.ok++; else quiz.wrong.push({ q: quiz.cur, picked: itemOf(id) });
    mark(cur, quiz.cur.id, ok);

    if (quiz.dir === 'find') {
      paint({ ok: quiz.cur.id, bad: ok ? null : id });
      fitTo(quiz.cur.id, 4);
    } else {
      $('choices').querySelectorAll('[data-pick]').forEach((b) => {
        b.disabled = true;
        if (b.dataset.pick === quiz.cur.id) b.classList.add('pick-ok');
        else if (b === btn) b.classList.add('pick-bad');
      });
      paint({ ok: quiz.cur.id, dimOthers: true });
    }

    const it = quiz.cur;
    const picked = ok ? null : itemOf(id);
    $('panel').innerHTML = `
      <div class="judge ${ok ? 'ok' : 'bad'}">${ok ? '正解' : 'まちがい'}</div>
      <h2>${esc(it.name)}</h2>
      ${it.yomi ? `<div class="yomi">${esc(it.yomi)}</div>` : ''}
      <dl>
        ${it.capital ? `<dt>${cur === 'jp' ? '県庁所在地' : '首都'}</dt><dd>${esc(it.capital)}</dd>` : ''}
        <dt>${cur === 'jp' ? '地方' : '州'}</dt><dd>${esc(it.group)}</dd>
        ${picked ? `<dt>押したのは</dt><dd>${esc(picked.name)}</dd>` : ''}
      </dl>
      <div class="row end"><button class="primary" id="btn-next">次へ</button></div>`;
    $('btn-next').onclick = () => { quiz.i++; nextQ(); };
  }

  function quizResult() {
    const n = quiz.pool.length;
    paint();
    resetView();
    $('prompt').innerHTML = '';
    $('choices').innerHTML = '';
    $('hint').textContent = '';
    const wrong = quiz.wrong.map((w) => w.q.name).join('、');
    $('panel').innerHTML = `
      <h2>おつかれさま</h2>
      <div class="yomi">${n}問中 ${quiz.ok}問 正解</div>
      ${wrong ? `<dl><dt>まちがえた</dt><dd>${esc(wrong)}</dd></dl>` : '<dl><dt></dt><dd>全問正解です。</dd></dl>'}
      <div class="row">
        <button class="primary" id="btn-again">もう一度</button>
        <button class="ghost" id="btn-menu">えらび直す</button>
      </div>`;
    const dir = quiz.dir;
    $('btn-again').onclick = () => startQuiz(dir, false);
    $('btn-menu').onclick = quizMenu;
    quiz = null;
  }

  // =========================================================
  // 一覧
  // =========================================================
  let listSort = 'group';   // group / pop / area

  function drawList() {
    const d = data();
    const jp = cur === 'jp';
    const row = (i) => {
      const r = recOf(cur, i.id);
      const weak = isWeak(cur, i.id);
      const sub = [i.capital || '—', fmtPop(i.pop), fmtArea(i.area)].filter(Boolean).join('　');
      return `<button data-go="${esc(i.id)}">
        <span class="n">${esc(i.name)}</span>
        <span class="s${weak ? ' miss' : ''}">${esc(sub)}${r.o + r.x ? `　${r.o}○ ${r.x}×` : ''}</span>
        ${i.food ? `<span class="s2">${esc(i.food)}</span>` : ''}
      </button>`;
    };

    let body;
    if (listSort === 'group') {
      const by = {};
      d.items.forEach((i) => { (by[i.group] = by[i.group] || []).push(i); });
      body = Object.keys(by).map((g) =>
        `<div class="group-head">${esc(g)}（${by[g].length}）</div><div class="list">${by[g].map(row).join('')}</div>`).join('');
    } else {
      const sorted = d.items.filter((i) => i[listSort]).sort((a, b) => b[listSort] - a[listSort]);
      body = `<div class="group-head">${listSort === 'pop' ? '人口' : '面積'}の多い順（${sorted.length}）</div>
        <div class="list">${sorted.map((i, n) => row(i).replace('<span class="n">', `<span class="n"><em>${n + 1}</em> `)).join('')}</div>`;
    }

    $('list-body').innerHTML = `
      <div class="sortbar">
        <button class="sw${listSort === 'group' ? ' on' : ''}" data-sort="group">${jp ? '地方' : '州'}ごと</button>
        <button class="sw${listSort === 'pop' ? ' on' : ''}" data-sort="pop">人口順</button>
        <button class="sw${listSort === 'area' ? ' on' : ''}" data-sort="area">面積順</button>
      </div>${body}`;

    $('list-body').querySelectorAll('[data-sort]').forEach((b) => {
      b.onclick = () => { listSort = b.dataset.sort; drawList(); };
    });
    $('list-body').querySelectorAll('[data-go]').forEach((b) => {
      b.onclick = () => {
        setMode('look');
        showInfo(b.dataset.go);
        fitTo(b.dataset.go);
        $('stage').scrollIntoView({ block: 'center' });
      };
    });
  }

  // =========================================================
  // 関係する解説カードへ
  // =========================================================
  function drawCards() {
    const list = CARDS[cur] || [];
    if (!list.length) { $('cards').innerHTML = ''; return; }
    $('cards').innerHTML = `
      <h2>この地図と関係する解説カード</h2>
      <p class="lead">一般教養Note の読み物に移ります。読み終えたら「学ぶ」から地図へ戻れます。</p>
      <div class="links">${list.map(([id, t]) => `<a href="../#t=${encodeURIComponent(id)}">${esc(t)}</a>`).join('')}</div>`;
  }

  // =========================================================
  // 切り替え
  // =========================================================
  function setMap(id, keepHash) {
    if (!MAPS[id]) id = 'jp';
    cur = id;
    quiz = null;
    document.querySelectorAll('[data-map]').forEach((b) => b.classList.toggle('on', b.dataset.map === id));
    $('bar-title').textContent = data().title;
    document.title = data().title;
    $('foot').textContent = `${data().items.length}${data().unit}／地図の出どころ: ${data().source}。形は簡略化してあります。`;
    drawCards();
    drawMap();
    setMode(mode);
    if (!keepHash) location.hash = '#' + id;
  }

  function setMode(m) {
    mode = m;
    document.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === m));
    $('view-map').classList.toggle('hidden', m === 'list');
    $('view-list').classList.toggle('hidden', m !== 'list');
    $('prompt').innerHTML = '';
    $('choices').innerHTML = '';
    $('panel').innerHTML = '';
    quiz = null;

    if (m === 'list') return drawList();
    if (m === 'quiz') return quizMenu();

    paint();
    resetView();
    $('hint').innerHTML = `地図を押すと名前が出ます。つまんで拡大、引いて移動できます。
      <button class="ghost" id="btn-color" style="padding:4px 10px;font-size:12px;margin-left:6px">
        ${st.color ? '色分けをやめる' : `${cur === 'jp' ? '地方' : '州'}で色分け`}</button>`;
    const c = $('btn-color');
    if (c) {
      c.onclick = () => { st.color = !st.color; save(); setMode('look'); };
    }
  }

  // =========================================================
  // 起動
  // =========================================================
  document.querySelectorAll('[data-map]').forEach((b) => {
    b.onclick = () => { mode = mode === 'list' ? 'list' : mode; setMap(b.dataset.map); };
  });
  document.querySelectorAll('[data-mode]').forEach((b) => {
    b.onclick = () => setMode(b.dataset.mode);
  });
  $('btn-reset').onclick = () => { resetView(); toast('表示をもとに戻しました'); };
  $('btn-back').onclick = () => {
    // 一般教養Note の地図コーナー（分野の中）に戻す。#chizu は本体の app.js が見ている
    location.href = '../#chizu';
  };
  window.addEventListener('hashchange', () => {
    const id = location.hash.replace('#', '');
    if (MAPS[id] && id !== cur) setMap(id, true);
  });

  setMap(location.hash.replace('#', '') || 'jp', true);
  setMode('look');

  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* 失敗しても動く */ }));
  }
})();
