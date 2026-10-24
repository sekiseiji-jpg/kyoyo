'use strict';

/* =========================================================
   マナー ― 一般教養Note の分野から開く別アプリ。
   画面は「図で見る / クイズ」の2つ。中身は data-manner.js が持つ。
     #yoshoku  洋食   #washoku  和食   #sekiji  席次
   図の押せる部分（.hot）を押すと説明が出る。クイズは図そのものを答えに使う。
   記録はこの端末のブラウザ（localStorage の manner.v1）だけに残る。
   ========================================================= */
(function () {
  const $ = (id) => document.getElementById(id);
  const DATA = window.MANNER;
  const KEY = 'manner.v1';

  // 一般教養Note の関係する解説カード。../#t=<カードid> で本体が開く
  const CARDS = [
    ['5-1-01', 'マナーに型がある理由'],
    ['5-1-05', '来客応対と席次'],
    ['5-1-08', '服装とTPO'],
    ['5-2-01', '作法は地域と宗派で変わる'],
  ];

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // 本文の **〜** を太字にする。esc のあとに置き換えるので、データに HTML があっても安全
  const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const shuffle = (a) => {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
    return r;
  };

  // ---------- 記録 ----------
  const st = { rec: {} };            // 'yoshoku-3' -> {o, x}
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const o = JSON.parse(raw); if (o.rec) st.rec = o.rec; }
  } catch (e) { /* 読めなくても既定値で動く */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* 保存できない環境 */ } };
  function mark(key, ok) {
    const r = st.rec[key] || { o: 0, x: 0 };
    if (ok) r.o++; else r.x++;
    st.rec[key] = r;
    save();
  }

  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove('show'), 1800);
  }

  // ---------- いまの状態 ----------
  let cur = DATA.units[0];
  let mode = 'learn';
  let quiz = null;

  // =========================================================
  // 図で見る
  // =========================================================
  function drawLearn() {
    $('view-learn').innerHTML = cur.figs.map((f, i) => `
      <div class="card" data-fig="${esc(f.id)}">
        <h2>${i + 1}. ${esc(f.title)}</h2>
        <p class="lead">${rich(f.lead)}</p>
        <div class="fig">${f.svg}</div>
        ${f.parts ? '<div class="part" data-slot></div><p class="part-hint">図の中を押すと、その部分の説明が出ます。</p>' : ''}
        ${f.note ? `<p class="note">${rich(f.note)}</p>` : ''}
      </div>`).join('');

    $('view-learn').querySelectorAll('[data-fig]').forEach((card) => {
      const fig = cur.figs.find((f) => f.id === card.dataset.fig);
      if (!fig || !fig.parts) return;
      card.querySelectorAll('.hot').forEach((g) => {
        g.addEventListener('click', () => {
          const p = fig.parts.find((x) => x.id === g.dataset.part);
          if (!p) return;
          card.querySelectorAll('.hot').forEach((o) => o.classList.toggle('on', o === g));
          card.querySelector('[data-slot]').innerHTML = `<b>${esc(p.label)}</b>${rich(p.text)}`;
        });
      });
    });
  }

  // =========================================================
  // クイズ
  // =========================================================
  function quizMenu() {
    const n = cur.quiz.length;
    const done = cur.quiz.reduce((a, q, i) => a + (st.rec[cur.id + '-' + i] ? 1 : 0), 0);
    const weak = cur.quiz.filter((q, i) => {
      const r = st.rec[cur.id + '-' + i];
      return r && r.x > r.o;
    }).length;
    $('view-quiz').innerHTML = `
      <div class="card">
        <h2>クイズ</h2>
        <p class="lead">${esc(cur.name)}から${n}問。図を押して答えるもの、絵を選ぶもの、言葉を選ぶものがあります。</p>
        <p class="note" style="border:none;padding:0;margin:0">
          解いたことがあるのは ${done} / ${n} 問${weak ? `、そのうち苦手が ${weak} 問` : ''}。</p>
        <div class="row">
          <button class="primary" data-start="all">${n}問を解く</button>
          ${weak ? `<button class="ghost" data-start="weak">苦手な ${weak}問だけ</button>` : ''}
        </div>
      </div>`;
    $('view-quiz').querySelectorAll('[data-start]').forEach((b) => {
      b.onclick = () => startQuiz(b.dataset.start === 'weak');
    });
  }

  function startQuiz(weakOnly) {
    let items = cur.quiz.map((q, i) => ({ q, key: cur.id + '-' + i }));
    if (weakOnly) items = items.filter((it) => { const r = st.rec[it.key]; return r && r.x > r.o; });
    quiz = { list: shuffle(items), i: 0, ok: 0, wrong: [] };
    nextQ();
  }

  function nextQ() {
    if (quiz.i >= quiz.list.length) return quizResult();
    const { q } = quiz.list[quiz.i];
    const n = quiz.list.length;
    const head = `
      <div class="prompt">
        <div class="q">${rich(q.q)}</div>
        <div class="meta">${quiz.i + 1} / ${n}　正解 ${quiz.ok}</div>
        <div class="bar-wrap"><i style="width:${(quiz.i / n) * 100}%"></i></div>
      </div>`;

    if (q.type === 'spot') {
      const fig = cur.figs.find((f) => f.id === q.fig);
      $('view-quiz').innerHTML = `<div class="card">${head}
        <div class="fig">${fig.svg}</div>
        <p class="part-hint">図の中の正しい場所を押してください。</p>
        <div class="part" data-slot></div><div data-foot></div></div>`;
      $('view-quiz').querySelectorAll('.hot').forEach((g) => {
        g.addEventListener('click', () => answerSpot(g, fig));
      });
    } else {
      const cls = q.type === 'img' ? 'img' : 'text';
      const body = q.c.map((c, i) => q.type === 'img'
        ? `<button data-pick="${i}"><span class="fig">${c.svg}</span><span class="lb">${esc(c.label)}</span></button>`
        : `<button data-pick="${i}">${esc(c)}</button>`).join('');
      $('view-quiz').innerHTML = `<div class="card">${head}
        <div class="choices ${cls}">${body}</div>
        <div class="part" data-slot></div><div data-foot></div></div>`;
      $('view-quiz').querySelectorAll('[data-pick]').forEach((b) => {
        b.onclick = () => answerPick(Number(b.dataset.pick), b);
      });
    }
  }

  function finish(ok, html) {
    mark(quiz.list[quiz.i].key, ok);
    if (ok) quiz.ok++; else quiz.wrong.push(quiz.list[quiz.i].q);
    const q = quiz.list[quiz.i].q;
    $('view-quiz').querySelector('[data-slot]').innerHTML =
      `<div class="judge ${ok ? 'ok' : 'bad'}">${ok ? '正解' : 'まちがい'}</div>${html || ''}<div class="exp">${rich(q.exp)}</div>`;
    $('view-quiz').querySelector('[data-foot]').innerHTML =
      '<div class="row end"><button class="primary" id="btn-next">次へ</button></div>';
    $('btn-next').onclick = () => { quiz.i++; nextQ(); window.scrollTo(0, 0); };
  }

  function answerSpot(g, fig) {
    if (quiz.done) return;
    quiz.done = true;
    const q = quiz.list[quiz.i].q;
    const ok = g.dataset.part === q.a;
    const right = $('view-quiz').querySelector(`.hot[data-part="${q.a}"]`);
    $('view-quiz').querySelectorAll('.hot').forEach((o) => { o.style.cursor = 'default'; });
    if (right) right.classList.add('ok');
    if (!ok) g.classList.add('bad');
    const part = fig.parts.find((p) => p.id === q.a);
    finish(ok, part ? `<b>${esc(part.label)}</b>` : '');
    quiz.done = false;
  }

  function answerPick(i, btn) {
    if (quiz.done) return;
    quiz.done = true;
    const q = quiz.list[quiz.i].q;
    const ok = i === q.a;
    $('view-quiz').querySelectorAll('[data-pick]').forEach((b) => {
      b.disabled = true;
      if (Number(b.dataset.pick) === q.a) b.classList.add('pick-ok');
      else if (b === btn) b.classList.add('pick-bad');
    });
    finish(ok, '');
    quiz.done = false;
  }

  function quizResult() {
    const n = quiz.list.length;
    const wrong = quiz.wrong.map((q) => q.q).join('　／　');
    $('view-quiz').innerHTML = `
      <div class="card">
        <h2>おつかれさま</h2>
        <p class="lead">${n}問中 ${quiz.ok}問 正解</p>
        ${wrong ? `<div class="part"><b>まちがえた問題</b>${esc(wrong)}</div>` : '<div class="part">全問正解です。</div>'}
        <div class="row">
          <button class="primary" id="btn-again">もう一度</button>
          <button class="ghost" id="btn-learn">図で見直す</button>
        </div>
      </div>`;
    $('btn-again').onclick = quizMenu;
    $('btn-learn').onclick = () => setMode('learn');
    quiz = null;
  }

  // =========================================================
  // 関係する解説カードへ
  // =========================================================
  function drawCards() {
    $('cards').innerHTML = `
      <h2>関係する解説カード</h2>
      <p class="lead">一般教養Note の読み物に移ります。読み終えたら「学ぶ」からここへ戻れます。</p>
      <div class="links">${CARDS.map(([id, t]) => `<a href="../#t=${encodeURIComponent(id)}">${esc(t)}</a>`).join('')}</div>`;
  }

  // =========================================================
  // 切り替え
  // =========================================================
  function setUnit(id, keepHash) {
    const u = DATA.units.find((x) => x.id === id) || DATA.units[0];
    cur = u;
    quiz = null;
    document.querySelectorAll('[data-unit]').forEach((b) => b.classList.toggle('on', b.dataset.unit === u.id));
    $('bar-title').textContent = u.name;
    document.title = u.name;
    document.querySelector('.bar-title .logo').textContent = u.emoji;
    $('unit-lead').innerHTML = rich(u.lead);
    setMode(mode);
    if (!keepHash) location.hash = '#' + u.id;
  }

  function setMode(m) {
    mode = m;
    document.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === m));
    $('view-learn').classList.toggle('hidden', m !== 'learn');
    $('view-quiz').classList.toggle('hidden', m !== 'quiz');
    if (m === 'learn') drawLearn(); else quizMenu();
  }

  // =========================================================
  // 起動
  // =========================================================
  /** #washoku&f=haizen → {unit:'washoku', fig:'haizen'} */
  function parseHash() {
    const parts = location.hash.replace('#', '').split('&');
    const q = { unit: parts[0] };
    parts.slice(1).forEach((p) => { const [k, v] = p.split('='); if (k === 'f') q.fig = decodeURIComponent(v || ''); });
    return q;
  }

  /** 解説カードなどから名指しで開かれた図へ寄る */
  function focusFig(figId) {
    if (!figId) return;
    setMode('learn');
    const card = document.querySelector(`[data-fig="${CSS.escape(figId)}"]`);
    if (!card) return;
    card.classList.add('focus');
    card.scrollIntoView({ block: 'start', behavior: 'smooth' });
    setTimeout(() => card.classList.remove('focus'), 2400);
  }

  function openHash(first) {
    const q = parseHash();
    const u = DATA.units.find((x) => x.id === q.unit);
    if (first || (u && u.id !== cur.id)) setUnit(u ? u.id : DATA.units[0].id, true);
    if (q.fig) focusFig(q.fig);
  }

  $('unit-switch').innerHTML = DATA.units
    .map((u) => `<button class="sw" data-unit="${esc(u.id)}">${u.emoji} ${esc(u.short || u.name)}</button>`).join('');
  document.querySelectorAll('[data-unit]').forEach((b) => { b.onclick = () => setUnit(b.dataset.unit); });
  document.querySelectorAll('[data-mode]').forEach((b) => { b.onclick = () => setMode(b.dataset.mode); });

  $('btn-back').onclick = () => {
    // 一般教養Note のマナー分野に戻す。#manner は本体の app.js が見ている
    location.href = '../#manner';
  };
  window.addEventListener('hashchange', () => openHash(false));

  $('foot').textContent = DATA.source;
  drawCards();
  openHash(true);

  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* 失敗しても動く */ }));
  }
})();
