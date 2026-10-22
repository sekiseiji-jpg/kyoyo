'use strict';

/* =========================================================
   きょうよう Note
   画面は6タブ（今日 / 学ぶ / クイズ / 辞典 / 記録 / 保存）。
   データは data-units.js（40単元の骨格）と data-*.js（カード・クイズ）。
   ========================================================= */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const FIELDS = window.FIELDS || [];
const PRI_PLAN = window.PRI_PLAN || {};
const TOPICS = window.TOPICS || [];
const QUIZ = window.QUIZ || [];
const TERMS = window.TERMS || {};

// ---------- 保存 ----------
const store = {
  get(key, def) {
    try { const v = localStorage.getItem('kyoyo:' + key); return v == null ? def : JSON.parse(v); }
    catch { return def; }
  },
  set(key, val) {
    try { localStorage.setItem('kyoyo:' + key, JSON.stringify(val)); } catch { /* 保存できない環境 */ }
  },
};

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), 2000);
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const shuffle = (a) => {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
};

const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const fmtMin = (sec) => {
  const m = Math.floor(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)}時間${m % 60}分` : `${m}分`;
};

// ---------- 索引（データから作る） ----------
const UNITS = [];                 // {id, name, pri, field, fieldName, emoji}
FIELDS.forEach((f) => f.units.forEach((u) => UNITS.push({ ...u, field: f.key, fieldName: f.name, emoji: f.emoji })));
const UNIT_BY_ID = new Map(UNITS.map((u) => [u.id, u]));
const TOPIC_BY_ID = new Map(TOPICS.map((t) => [t.id, t]));
const QUIZ_BY_ID = new Map(QUIZ.map((q) => [q.id, q]));

const topicsOf = (unitId) => TOPICS.filter((t) => t.unit === unitId);
const quizOf = (unitId) => QUIZ.filter((q) => q.unit === unitId);
const isReady = (unitId) => topicsOf(unitId).length > 0;
const readyUnits = () => UNITS.filter((u) => isReady(u.id));

// ---------- 学習記録 ----------
const KINDS = { quiz: '✏️ クイズ', read: '📖 読み物', daily: '📅 1日1問' };

const stats = {
  lastActivity: Date.now(),

  day(key = dayKey()) {
    const log = store.get('log', {});
    return log[key] || { sec: 0, n: {}, ok: {} };
  },

  update(fn) {
    const log = store.get('log', {});
    const key = dayKey();
    log[key] = log[key] || { sec: 0, n: {}, ok: {} };
    fn(log[key]);
    store.set('log', log);
  },

  /** 練習を1回記録。ok は正解なら true（正誤のない読み物は省略） */
  add(kind, ok) {
    this.update((d) => {
      d.n[kind] = (d.n[kind] || 0) + 1;
      if (ok) d.ok[kind] = (d.ok[kind] || 0) + 1;
    });
    this.lastActivity = Date.now();
  },

  isActive(d) { return d && (d.sec >= 60 || Object.values(d.n).some((v) => v > 0)); },

  streak() {
    const log = store.get('log', {});
    const d = new Date();
    if (!this.isActive(log[dayKey(d)])) d.setDate(d.getDate() - 1); // 今日まだなら昨日から数える
    let n = 0;
    while (this.isActive(log[dayKey(d)])) { n++; d.setDate(d.getDate() - 1); }
    return n;
  },
};

// 操作中かつ画面表示中の時間だけを学習時間として数える
const TICK = 15;
['click', 'keydown', 'touchstart', 'input'].forEach((ev) =>
  document.addEventListener(ev, () => { stats.lastActivity = Date.now(); }, { passive: true }));
setInterval(() => {
  if (document.hidden || Date.now() - stats.lastActivity > 90_000) return;
  stats.update((d) => { d.sec += TICK; });
}, TICK * 1000);

// ---------- 正誤・読了・保存 ----------
const marks = {
  ok: store.get('ok', {}),
  miss: store.get('miss', {}),
  read: store.get('read', {}),
  saved: store.get('saved', { t: [], q: [] }),

  answer(id, ok) {
    const m = ok ? this.ok : this.miss;
    m[id] = (m[id] || 0) + 1;
    store.set(ok ? 'ok' : 'miss', m);
  },
  /** 弱点 = まちがえた回数が正解した回数より多い問題 */
  isWeak(id) { return (this.miss[id] || 0) > (this.ok[id] || 0); },
  weakIds() { return QUIZ.filter((q) => this.isWeak(q.id)).map((q) => q.id); },

  isRead(id) { return !!this.read[id]; },
  toggleRead(id) {
    if (this.read[id]) delete this.read[id]; else this.read[id] = 1;
    store.set('read', this.read);
    return !!this.read[id];
  },

  isSaved(kind, id) { return this.saved[kind].includes(id); },
  toggleSave(kind, id) {
    const a = this.saved[kind];
    const i = a.indexOf(id);
    if (i < 0) a.push(id); else a.splice(i, 1);
    store.set('saved', this.saved);
    return i < 0;
  },
};

const settings = Object.assign({ goalMin: 15, shuffle: true }, store.get('settings', {}));
const saveSettings = () => store.set('settings', settings);

// =========================================================
// タブ
// =========================================================
const VIEWS = {};  // tab 名 → render 関数（各機能が登録する）

function show(tab) {
  $$('.tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  $$('.panel').forEach((p) => p.classList.toggle('on', p.id === 'p-' + tab));
  store.set('tab', tab);
  if (VIEWS[tab]) VIEWS[tab]();
  window.scrollTo(0, 0);
}

$$('.tab').forEach((b) => b.addEventListener('click', () => show(b.dataset.tab)));

function renderStreak() {
  $('#streak').textContent = `🔥 ${stats.streak()}`;
}

// =========================================================
// 📅 今日（1日1問）
// =========================================================
const today = {
  /** 日付から決まる擬似乱数。同じ日なら必ず同じ問題が出る */
  seed(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) / 4294967296;
  },

  pick(list, salt) {
    if (!list.length) return null;
    return list[Math.floor(this.seed(dayKey() + salt) * list.length) % list.length];
  },

  render() {
    const key = dayKey();
    const daily = store.get('daily', {});
    const done = daily[key];

    const d = new Date();
    const wd = '日月火水木金土'[d.getDay()];
    $('#today-head').innerHTML = `
      <span class="date">${d.getMonth() + 1}月${d.getDate()}日（${wd}）</span>
      <span class="muted small">連続 ${stats.streak()} 日 ／ 今日 ${fmtMin(stats.day().sec)}</span>`;

    // 1日1問
    const q = done ? QUIZ_BY_ID.get(done.id) : this.pick(QUIZ, 'q');
    const box = $('#today-quiz');
    if (!q) { box.innerHTML = '<h2>📅 今日の1問</h2><p class="muted">問題がまだありません。</p>'; }
    else if (done) {
      box.innerHTML = `<h2>📅 今日の1問</h2>
        <p>${done.ok ? '<span class="pill">正解しました</span>' : '<span class="pill bad">まちがえました</span>'}</p>
        <div class="q-text">${esc(q.q)}</div>
        <div class="judge"><div class="exp">${esc(q.exp)}</div></div>
        <p class="muted small">${unitLabel(q.unit)}</p>`;
    } else {
      box.innerHTML = '<h2>📅 今日の1問</h2><div id="today-q"></div>';
      quizView.renderOne($('#today-q'), q, (ok) => {
        const dl = store.get('daily', {});
        dl[key] = { id: q.id, ok };
        store.set('daily', dl);
        stats.add('daily', ok);
        renderStreak();
        setTimeout(() => this.render(), 1200);
      });
    }

    // 今日の読み物
    const t = this.pick(TOPICS, 'r');
    $('#today-read').innerHTML = t
      ? `<h2>📖 今日の読み物</h2>
         <button class="tile" data-goread="${esc(t.id)}" style="width:100%">
           <span class="t-name">${esc(t.title)}</span>
           <span class="t-sub">${unitLabel(t.unit)}${marks.isRead(t.id) ? ' ・ 読了' : ''}</span>
         </button>`
      : '';
  },
};

$('#today-read').addEventListener('click', (e) => {
  const b = e.target.closest('[data-goread]');
  if (!b) return;
  learn.openTopic(b.dataset.goread);
});

const unitLabel = (unitId) => {
  const u = UNIT_BY_ID.get(unitId);
  return u ? `${u.emoji} ${u.fieldName} ／ ${u.id} ${u.name}` : unitId;
};

VIEWS.today = () => today.render();

// =========================================================
// 📖 学ぶ
// =========================================================
const learn = {
  state: { field: null, unit: null, topic: null },

  render() {
    const s = this.state;
    const nav = ['<button data-go="root">分野を選ぶ</button>'];
    if (s.field) {
      const f = FIELDS.find((x) => x.key === s.field);
      nav.push('<span class="sep">›</span>', `<button data-go="field">${esc(f.emoji + ' ' + f.name)}</button>`);
    }
    if (s.unit) {
      const u = UNIT_BY_ID.get(s.unit);
      nav.push('<span class="sep">›</span>', `<button data-go="unit">${esc(u.id + ' ' + u.name)}</button>`);
    }
    if (s.topic) nav.push('<span class="sep">›</span>', '<span class="muted">カード</span>');
    $('#learn-nav').innerHTML = nav.join('');

    if (s.topic) this.viewTopic();
    else if (s.unit) this.viewUnit();
    else if (s.field) this.viewField();
    else this.viewRoot();
  },

  viewRoot() {
    const html = FIELDS.map((f) => {
      const n = f.units.filter((u) => isReady(u.id)).length;
      const cards = f.units.reduce((a, u) => a + topicsOf(u.id).length, 0);
      return `<button class="tile" data-field="${esc(f.key)}">
        <span class="t-emoji">${f.emoji}</span>
        <span class="t-name">${esc(f.name)}</span>
        <span class="t-sub">${f.units.length}単元 ／ 公開 ${n}単元・カード${cards}枚</span>
      </button>`;
    }).join('');
    $('#learn-body').innerHTML = `<div class="grid">${html}</div>`;
  },

  viewField() {
    const f = FIELDS.find((x) => x.key === this.state.field);
    const html = f.units.map((u) => {
      const ready = isReady(u.id);
      const ts = topicsOf(u.id);
      const readN = ts.filter((t) => marks.isRead(t.id)).length;
      const plan = PRI_PLAN[u.pri] || {};
      return `<button class="tile" data-unit="${esc(u.id)}" ${ready ? '' : 'disabled'}>
        <span class="t-name">${esc(u.id)} ${esc(u.name)}</span>
        <span class="t-sub">
          <span class="pill ${u.pri === 'A' ? '' : 'gray'}">優先${u.pri}</span>
          ${ready
            ? ` カード${ts.length}枚（読了${readN}）・クイズ${quizOf(u.id).length}問`
            : ` 準備中（予定 ${plan.cards || 0}枚・${plan.quiz || 0}問）`}
        </span>
      </button>`;
    }).join('');
    $('#learn-body').innerHTML = `<div class="grid">${html}</div>`;
  },

  viewUnit() {
    const u = UNIT_BY_ID.get(this.state.unit);
    const ts = topicsOf(u.id);
    const html = ts.map((t, i) => `<li>
      <span class="lk">
        <button class="key" data-topic="${esc(t.id)}" style="background:none;color:var(--text);padding:0;font-size:15px;text-align:left">
          ${i + 1}. ${esc(t.title)}
        </button>
      </span>
      <span class="muted small">${marks.isRead(t.id) ? '読了' : '—'}</span>
    </li>`).join('');
    $('#learn-body').innerHTML = `
      <div class="card">
        <h2>${esc(u.id)} ${esc(u.name)}</h2>
        <p class="muted small">カード${ts.length}枚・クイズ${quizOf(u.id).length}問</p>
        <ul class="list">${html}</ul>
        <div class="row end" style="margin-top:12px">
          <button class="primary" data-unitquiz="${esc(u.id)}">この単元のクイズを解く</button>
        </div>
      </div>`;
  },

  viewTopic() {
    const t = TOPIC_BY_ID.get(this.state.topic);
    const ts = topicsOf(t.unit);
    const i = ts.findIndex((x) => x.id === t.id);
    const paras = t.body.split('\n\n').map((p) => `<p>${esc(p)}</p>`).join('');
    const keys = (t.keys || []).map((k) => `<button class="key" data-term="${esc(k)}">${esc(k)}</button>`).join('');

    $('#learn-body').innerHTML = `
      <div class="card">
        <div class="q-head">
          <span>${esc(t.unit)} ・ ${i + 1} / ${ts.length}</span>
          <button class="star ${marks.isSaved('t', t.id) ? 'on' : ''}" data-save="${esc(t.id)}" title="保存">⭐</button>
        </div>
        <h2>${esc(t.title)}</h2>
        <div class="read-body">${paras}</div>
        ${keys ? `<div class="key-row">${keys}</div>` : ''}
        ${t.asof ? `<div class="asof">数値の確認日: ${esc(t.asof)}</div>` : ''}
        <div class="row" style="margin-top:14px">
          <button class="ghost" data-move="-1" ${i === 0 ? 'disabled' : ''}>← 前</button>
          <button class="${marks.isRead(t.id) ? 'ghost' : 'primary'}" data-read="${esc(t.id)}">
            ${marks.isRead(t.id) ? '読了を取り消す' : '読んだ'}
          </button>
          <button class="ghost" data-move="1" ${i === ts.length - 1 ? 'disabled' : ''}>次 →</button>
        </div>
      </div>`;
  },

  openTopic(id) {
    const t = TOPIC_BY_ID.get(id);
    if (!t) return;
    const u = UNIT_BY_ID.get(t.unit);
    this.state = { field: u.field, unit: t.unit, topic: id };
    show('learn');
  },

  onClick(e) {
    const s = this.state;
    const go = e.target.closest('[data-go]');
    if (go) {
      if (go.dataset.go === 'root') this.state = { field: null, unit: null, topic: null };
      if (go.dataset.go === 'field') this.state = { field: s.field, unit: null, topic: null };
      if (go.dataset.go === 'unit') this.state = { field: s.field, unit: s.unit, topic: null };
      return this.render();
    }
    const f = e.target.closest('[data-field]');
    if (f) { this.state = { field: f.dataset.field, unit: null, topic: null }; return this.render(); }

    const u = e.target.closest('[data-unit]');
    if (u) { this.state = { field: s.field, unit: u.dataset.unit, topic: null }; return this.render(); }

    const t = e.target.closest('[data-topic]');
    if (t) { this.state = { field: s.field, unit: s.unit, topic: t.dataset.topic }; return this.render(); }

    const mv = e.target.closest('[data-move]');
    if (mv) {
      const ts = topicsOf(s.unit);
      const i = ts.findIndex((x) => x.id === s.topic) + Number(mv.dataset.move);
      if (ts[i]) { this.state.topic = ts[i].id; this.render(); window.scrollTo(0, 0); }
      return;
    }
    const rd = e.target.closest('[data-read]');
    if (rd) {
      const on = marks.toggleRead(rd.dataset.read);
      if (on) { stats.add('read'); renderStreak(); }
      toast(on ? '読了にしました' : '読了を取り消しました');
      return this.render();
    }
    const sv = e.target.closest('[data-save]');
    if (sv) {
      const on = marks.toggleSave('t', sv.dataset.save);
      sv.classList.toggle('on', on);
      return toast(on ? '⭐に保存しました' : '保存を外しました');
    }
    const term = e.target.closest('[data-term]');
    if (term) return dict.open(term.dataset.term);

    const uq = e.target.closest('[data-unitquiz]');
    if (uq) return quizView.start({ scope: 'unit', unit: uq.dataset.unitquiz });
  },
};

$('#p-learn').addEventListener('click', (e) => learn.onClick(e));
VIEWS.learn = () => learn.render();

// =========================================================
// ✏️ クイズ
// =========================================================
const TYPE_NAME = { mc: '四択', tf: '○✕', cloze: '穴埋め', order: '並べ替え' };

const quizView = {
  session: null,

  renderMenu() {
    const units = readyUnits();
    const weak = marks.weakIds().length;
    const opts = units.map((u) => `<option value="${esc(u.id)}">${esc(u.id)} ${esc(u.name)}（${quizOf(u.id).length}問）</option>`).join('');
    const count = store.get('quizCount', 10);

    $('#quiz-menu').innerHTML = `
      <div class="card">
        <h2>✏️ クイズ</h2>
        <label class="field">
          <span class="label">範囲</span>
          <select id="q-scope">
            <option value="all">全分野からランダム（${QUIZ.length}問）</option>
            ${units.map((u) => `<option value="u:${esc(u.id)}">${esc(u.id)} ${esc(u.name)}</option>`).join('')}
            <option value="weak" ${weak ? '' : 'disabled'}>弱点のみ（${weak}問）</option>
          </select>
        </label>
        <label class="field">
          <span class="label">問題数</span>
          <select id="q-count">
            ${[5, 10, 20, 30].map((n) => `<option value="${n}" ${n === count ? 'selected' : ''}>${n}問</option>`).join('')}
          </select>
        </label>
        <div class="row end">
          <button class="primary" id="q-start">はじめる</button>
        </div>
        <p class="muted small">弱点は、まちがえた回数が正解した回数を上回っている問題です。</p>
      </div>`;
    void opts;

    $('#q-start').addEventListener('click', () => {
      const v = $('#q-scope').value;
      const n = Number($('#q-count').value);
      store.set('quizCount', n);
      if (v === 'all') this.start({ scope: 'all', n });
      else if (v === 'weak') this.start({ scope: 'weak', n });
      else this.start({ scope: 'unit', unit: v.slice(2), n });
    });
  },

  start({ scope, unit, n = 10 }) {
    let pool = [];
    if (scope === 'unit') pool = quizOf(unit);
    else if (scope === 'weak') pool = marks.weakIds().map((id) => QUIZ_BY_ID.get(id)).filter(Boolean);
    else pool = QUIZ.slice();

    if (!pool.length) { toast('出題できる問題がありません'); return; }
    // 弱点・まちがえた回数が多い順を優先し、同点はランダム
    const sorted = shuffle(pool).sort((a, b) => ((marks.miss[b.id] || 0) - (marks.ok[b.id] || 0)) - ((marks.miss[a.id] || 0) - (marks.ok[a.id] || 0)));
    const list = sorted.slice(0, Math.min(n, sorted.length));

    this.session = { list: shuffle(list), i: 0, ok: 0, log: [], label: scope === 'unit' ? unitLabel(unit) : (scope === 'weak' ? '弱点のみ' : '全分野からランダム') };
    show('quiz');
    $('#quiz-menu').innerHTML = '';
    this.renderQ();
  },

  renderQ() {
    const s = this.session;
    if (s.i >= s.list.length) return this.finish();
    const q = s.list[s.i];
    $('#quiz-area').innerHTML = `
      <div class="card">
        <div class="q-head">
          <span>${s.i + 1} / ${s.list.length} ・ ${TYPE_NAME[q.type] || q.type}</span>
          <span>正解 ${s.ok}</span>
        </div>
        <div class="q-bar"><i style="width:${(s.i / s.list.length) * 100}%"></i></div>
        <div id="q-one"></div>
      </div>`;
    this.renderOne($('#q-one'), q, (ok) => {
      s.ok += ok ? 1 : 0;
      s.log.push({ id: q.id, ok });
      s.i++;
    }, true);
  },

  /** 1問を描く。done(ok) は採点後に呼ばれる。next が true なら「次へ」ボタンを出す */
  renderOne(box, q, done, next) {
    const star = `<button class="star ${marks.isSaved('q', q.id) ? 'on' : ''}" data-qsave="${esc(q.id)}" title="保存">⭐</button>`;
    let answered = false;

    const judge = (ok, picked) => {
      if (answered) return;
      answered = true;
      marks.answer(q.id, ok);
      stats.add('quiz', ok);
      renderStreak();

      box.querySelectorAll('.q-choices button, .ord-slots button, .ord-pool button').forEach((b) => { b.disabled = true; });
      if (q.type === 'mc' || q.type === 'cloze') {
        const btns = box.querySelectorAll('.q-choices button');
        btns.forEach((b, i) => {
          if (i === picked.correct) b.classList.add('pick-ok');
          else if (i === picked.chosen) b.classList.add('pick-bad');
        });
      } else if (q.type === 'tf') {
        box.querySelectorAll('.q-choices button').forEach((b) => {
          if (String(q.a) === b.dataset.v) b.classList.add('pick-ok');
          else if (b.dataset.v === String(!q.a)) b.classList.add('pick-bad');
        });
      }

      const j = document.createElement('div');
      j.className = 'judge';
      j.innerHTML = `
        <div class="verdict ${ok ? 'ok' : 'ng'}">${ok ? '◯ 正解' : '✕ まちがい'}</div>
        <div class="exp">${esc(q.exp || '')}</div>
        <div class="row end" style="margin-top:10px">
          ${q.topic && TOPIC_BY_ID.has(q.topic) ? `<button class="ghost" data-goread2="${esc(q.topic)}">解説カードを読む</button>` : ''}
          ${next ? '<button class="primary" data-next="1">次へ</button>' : ''}
        </div>`;
      box.appendChild(j);
      done(ok);
    };

    if (q.type === 'tf') {
      box.innerHTML = `
        <div class="q-head" style="justify-content:flex-end">${star}</div>
        <div class="q-text">${esc(q.q)}</div>
        <div class="q-choices">
          <button data-v="true">◯ 正しい</button>
          <button data-v="false">✕ 誤り</button>
        </div>`;
      box.querySelectorAll('[data-v]').forEach((b) =>
        b.addEventListener('click', () => judge((b.dataset.v === 'true') === !!q.a, {})));

    } else if (q.type === 'order') {
      const correct = q.c;
      const pool = shuffle(correct);
      const placed = [];
      const draw = () => {
        box.innerHTML = `
          <div class="q-head" style="justify-content:flex-end">${star}</div>
          <div class="q-text">${esc(q.q)}</div>
          <div class="ord-slots">${placed.map((v, i) => `<button data-un="${i}">${i + 1}. ${esc(v)}</button>`).join('')}</div>
          <div class="ord-pool">${pool.filter((v) => !placed.includes(v)).map((v) => `<button data-add="${esc(v)}">${esc(v)}</button>`).join('')}</div>`;
        box.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => {
          placed.push(b.dataset.add);
          if (placed.length === correct.length) { draw(); judge(placed.every((v, i) => v === correct[i]), {}); }
          else draw();
        }));
        box.querySelectorAll('[data-un]').forEach((b) => b.addEventListener('click', () => {
          placed.splice(Number(b.dataset.un), 1); draw();
        }));
      };
      draw();

    } else { // mc / cloze
      let idx = q.c.map((_, i) => i);
      if (settings.shuffle) idx = shuffle(idx);
      const correct = idx.indexOf(q.a);
      box.innerHTML = `
        <div class="q-head" style="justify-content:flex-end">${star}</div>
        <div class="q-text">${esc(q.q)}</div>
        <div class="q-choices">
          ${idx.map((src, i) => `<button data-i="${i}" data-src="${src}">${esc(q.c[src])}</button>`).join('')}
        </div>`;
      box.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => {
        const chosen = Number(b.dataset.i);
        judge(Number(b.dataset.src) === q.a, { chosen, correct });
      }));
    }
  },

  finish() {
    const s = this.session;
    const rate = Math.round((s.ok / s.list.length) * 100);
    const wrong = s.log.filter((x) => !x.ok);
    $('#quiz-area').innerHTML = `
      <div class="card center">
        <h2>結果</h2>
        <div class="stat-tiles" style="margin:12px 0">
          <div class="stat-tile"><div class="v">${s.ok} / ${s.list.length}</div><div class="k">正解</div></div>
          <div class="stat-tile"><div class="v">${rate}%</div><div class="k">正答率</div></div>
        </div>
        <p class="muted small">${esc(s.label)}</p>
        ${wrong.length ? `<h3>まちがえた問題</h3><ul class="list" style="text-align:left">${wrong.map((x) => {
          const q = QUIZ_BY_ID.get(x.id);
          return `<li><span class="lk">${esc(q.q)}</span>${q.topic && TOPIC_BY_ID.has(q.topic) ? `<button class="ghost small" data-goread2="${esc(q.topic)}">解説</button>` : ''}</li>`;
        }).join('')}</ul>` : '<p>全問正解です。</p>'}
        <div class="row end" style="margin-top:14px">
          <button class="ghost" data-again="1">もう一度</button>
          <button class="primary" data-menu="1">範囲を選びなおす</button>
        </div>
      </div>`;
    this.session = null;
  },

  onClick(e) {
    if (e.target.closest('[data-next]')) return this.renderQ();
    if (e.target.closest('[data-menu]')) { $('#quiz-area').innerHTML = ''; return this.renderMenu(); }
    if (e.target.closest('[data-again]')) { $('#quiz-area').innerHTML = ''; return this.renderMenu(); }
    const r = e.target.closest('[data-goread2]');
    if (r) return learn.openTopic(r.dataset.goread2);
    const sv = e.target.closest('[data-qsave]');
    if (sv) {
      const on = marks.toggleSave('q', sv.dataset.qsave);
      sv.classList.toggle('on', on);
      return toast(on ? '⭐に保存しました' : '保存を外しました');
    }
  },
};

document.addEventListener('click', (e) => {
  if (e.target.closest('#p-quiz') || e.target.closest('#p-today')) quizView.onClick(e);
});

VIEWS.quiz = () => { if (!quizView.session) { $('#quiz-area').innerHTML = ''; quizView.renderMenu(); } };

// =========================================================
// 🔍 辞典
// =========================================================
const dict = {
  render(q) {
    const word = (q == null ? $('#dict-q').value : q).trim();
    const body = $('#dict-body');
    if (!word) {
      const all = Object.keys(TERMS).sort((a, b) => a.localeCompare(b, 'ja'));
      $('#dict-count').textContent = `見出し ${all.length} 語`;
      body.innerHTML = `<div class="card"><h3>見出しの一覧</h3><div class="key-row">
        ${all.slice(0, 80).map((t) => `<button class="key" data-term="${esc(t)}">${esc(t)}</button>`).join('')}
        ${all.length > 80 ? `<span class="muted small">ほか ${all.length - 80} 語</span>` : ''}
      </div></div>`;
      return;
    }

    const hitTerms = Object.keys(TERMS).filter((t) => t.includes(word));
    const ids = new Set();
    hitTerms.forEach((t) => (TERMS[t].t || []).forEach((id) => ids.add(id)));
    // 見出しに無い語は本文からも探す
    TOPICS.forEach((t) => { if (t.title.includes(word) || t.body.includes(word)) ids.add(t.id); });

    const hits = Array.from(ids).map((id) => TOPIC_BY_ID.get(id)).filter(Boolean);
    const qHits = QUIZ.filter((x) => x.q.includes(word) || (x.exp || '').includes(word));
    $('#dict-count').textContent = `「${word}」 カード ${hits.length} 件 ／ 問題 ${qHits.length} 件`;

    body.innerHTML = `
      ${hitTerms.length ? `<div class="card"><h3>見出し</h3><div class="key-row">
        ${hitTerms.map((t) => `<button class="key" data-term="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>` : ''}
      ${hits.length ? `<div class="card"><h3>解説カード</h3><div class="grid">
        ${hits.map((t) => `<button class="tile" data-topic2="${esc(t.id)}">
          <span class="t-name">${esc(t.title)}</span>
          <span class="t-sub">${unitLabel(t.unit)}</span></button>`).join('')}</div></div>` : ''}
      ${qHits.length ? `<div class="card"><h3>関連する問題</h3><ul class="list">
        ${qHits.slice(0, 20).map((x) => `<li><span class="lk">${esc(x.q)}</span>
          <span class="muted small">${esc(x.unit)}</span></li>`).join('')}</ul></div>` : ''}
      ${!hits.length && !qHits.length ? '<div class="card"><p class="muted">見つかりませんでした。</p></div>' : ''}`;
  },

  open(word) {
    show('dict');
    $('#dict-q').value = word;
    this.render(word);
  },
};

$('#dict-q').addEventListener('input', () => dict.render());
$('#p-dict').addEventListener('click', (e) => {
  const t = e.target.closest('[data-term]');
  if (t) { $('#dict-q').value = t.dataset.term; return dict.render(t.dataset.term); }
  const t2 = e.target.closest('[data-topic2]');
  if (t2) return learn.openTopic(t2.dataset.topic2);
});
VIEWS.dict = () => dict.render();

// 辞典の見出しはどのタブからも押せる
document.addEventListener('click', (e) => {
  const t = e.target.closest('#p-learn [data-term]');
  if (t) dict.open(t.dataset.term);
});

// =========================================================
// 📊 記録
// =========================================================
const statsView = {
  render() {
    const log = store.get('log', {});
    const d = stats.day();
    const totalSec = Object.values(log).reduce((a, x) => a + x.sec, 0);
    const allN = Object.values(log).reduce((a, x) => a + Object.values(x.n).reduce((b, v) => b + v, 0), 0);
    const goal = settings.goalMin * 60;
    const pct = Math.min(100, Math.round((d.sec / goal) * 100));

    // 14日の棒グラフ
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const dt = new Date(); dt.setDate(dt.getDate() - i);
      days.push({ key: dayKey(dt), label: `${dt.getMonth() + 1}/${dt.getDate()}`, sec: (log[dayKey(dt)] || {}).sec || 0 });
    }
    const max = Math.max(goal, ...days.map((x) => x.sec)) || 1;

    // 分野別の正答率
    const byField = FIELDS.map((f) => {
      let ok = 0, n = 0;
      f.units.forEach((u) => quizOf(u.id).forEach((q) => { ok += marks.ok[q.id] || 0; n += (marks.ok[q.id] || 0) + (marks.miss[q.id] || 0); }));
      return { name: f.emoji + ' ' + f.name, ok, n };
    }).filter((x) => x.n > 0);

    const weak = marks.weakIds().map((id) => QUIZ_BY_ID.get(id)).filter(Boolean)
      .sort((a, b) => (marks.miss[b.id] || 0) - (marks.miss[a.id] || 0)).slice(0, 10);

    const readN = Object.keys(marks.read).length;

    $('#stats-body').innerHTML = `
      <div class="card">
        <h2>📊 記録</h2>
        <div class="stat-tiles">
          <div class="stat-tile"><div class="v">${stats.streak()}</div><div class="k">連続日数</div></div>
          <div class="stat-tile"><div class="v">${fmtMin(d.sec)}</div><div class="k">今日</div></div>
          <div class="stat-tile"><div class="v">${fmtMin(totalSec)}</div><div class="k">合計</div></div>
          <div class="stat-tile"><div class="v">${allN}</div><div class="k">のべ回数</div></div>
          <div class="stat-tile"><div class="v">${readN} / ${TOPICS.length}</div><div class="k">読了カード</div></div>
        </div>
        <h3>今日の目標（${settings.goalMin}分）</h3>
        <div class="goal-bar"><i style="width:${pct}%"></i></div>
        <p class="muted small">${pct}% 達成</p>
      </div>

      <div class="card">
        <h3>この2週間</h3>
        <div class="bars">
          ${days.map((x) => `<div class="${x.sec ? '' : 'zero'}" style="height:${Math.max(2, (x.sec / max) * 100)}%" data-tip="${x.label} ${fmtMin(x.sec)}"></div>`).join('')}
        </div>
        <div class="bar-x">${days.map((x, i) => `<span>${i % 2 === 0 ? x.label : ''}</span>`).join('')}</div>
      </div>

      ${byField.length ? `<div class="card"><h3>分野別の正答率</h3><ul class="list">
        ${byField.map((x) => `<li><span class="lk">${esc(x.name)}</span>
          <span>${Math.round((x.ok / x.n) * 100)}% <span class="muted small">(${x.ok}/${x.n})</span></span></li>`).join('')}
      </ul></div>` : ''}

      ${weak.length ? `<div class="card"><h3>苦手な問題</h3><ul class="list">
        ${weak.map((q) => `<li><span class="lk">${esc(q.q)}</span>
          <span class="muted small">✕${marks.miss[q.id] || 0}</span></li>`).join('')}
      </ul></div>` : ''}

      <div class="card">
        <h3>内訳</h3>
        <ul class="list">
          ${Object.entries(KINDS).map(([k, name]) => {
            let n = 0, ok = 0;
            Object.values(log).forEach((x) => { n += x.n[k] || 0; ok += x.ok[k] || 0; });
            return `<li><span class="lk">${name}</span><span>${n}回${k === 'read' ? '' : ` <span class="muted small">正解${ok}</span>`}</span></li>`;
          }).join('')}
        </ul>
      </div>`;
  },
};
VIEWS.stats = () => statsView.render();

// =========================================================
// ⭐ 保存
// =========================================================
VIEWS.saved = () => {
  const ts = marks.saved.t.map((id) => TOPIC_BY_ID.get(id)).filter(Boolean);
  const qs = marks.saved.q.map((id) => QUIZ_BY_ID.get(id)).filter(Boolean);
  $('#saved-body').innerHTML = (ts.length || qs.length) ? `
    ${ts.length ? `<div class="card"><h2>⭐ カード</h2><div class="grid">
      ${ts.map((t) => `<button class="tile" data-topic3="${esc(t.id)}">
        <span class="t-name">${esc(t.title)}</span><span class="t-sub">${unitLabel(t.unit)}</span></button>`).join('')}
    </div></div>` : ''}
    ${qs.length ? `<div class="card"><h2>⭐ 問題</h2><ul class="list">
      ${qs.map((q) => `<li><span class="lk">${esc(q.q)}<br><span class="muted small">${esc(q.exp || '')}</span></span></li>`).join('')}
    </ul></div>` : ''}`
    : '<div class="card"><p class="muted">⭐を付けたカードと問題がここに並びます。</p></div>';
};
$('#p-saved').addEventListener('click', (e) => {
  const t = e.target.closest('[data-topic3]');
  if (t) learn.openTopic(t.dataset.topic3);
});

// =========================================================
// 設定・ツールチップ・スマホのキーボード
// =========================================================
$('#btn-set').addEventListener('click', () => {
  $('#set-goal').value = settings.goalMin;
  $('#set-shuffle').checked = settings.shuffle;
  $('#dlg-set').showModal();
});
$('#dlg-set').addEventListener('close', () => {
  settings.goalMin = Math.min(600, Math.max(1, Number($('#set-goal').value) || 15));
  settings.shuffle = $('#set-shuffle').checked;
  saveSettings();
  if (VIEWS[store.get('tab', 'today')]) VIEWS[store.get('tab', 'today')]();
});
$('#btn-reset').addEventListener('click', () => {
  if (!confirm('学習記録（学習時間・正誤・連続日数）を消します。読了と⭐は残ります。よろしいですか？')) return;
  store.set('log', {});
  store.set('daily', {});
  marks.ok = {}; marks.miss = {};
  store.set('ok', {}); store.set('miss', {});
  renderStreak();
  toast('学習記録を消しました');
  $('#dlg-set').close();
});

// ツールチップ（棒グラフなど）
let tipEl = $('#tooltip');
const showTip = (el) => {
  const t = el.dataset.tip;
  if (!t) return;
  tipEl.textContent = t;
  tipEl.hidden = false;
  const r = el.getBoundingClientRect();
  tipEl.style.left = Math.min(window.innerWidth - 270, Math.max(8, r.left)) + 'px';
  tipEl.style.top = Math.max(8, r.top - tipEl.offsetHeight - 8) + 'px';
};
document.addEventListener('pointerover', (e) => {
  const el = e.target.closest('[data-tip]');
  if (el) showTip(el); else tipEl.hidden = true;
});
document.addEventListener('pointerdown', (e) => {
  const el = e.target.closest('[data-tip]');
  if (el) showTip(el);
});

// スマホで入力中はタブバーを隠す
document.addEventListener('focusin', (e) => {
  if (e.target.matches('input, select, textarea')) document.body.classList.add('kb-open');
});
document.addEventListener('focusout', () => document.body.classList.remove('kb-open'));

// =========================================================
// 起動
// =========================================================
renderStreak();
show(store.get('tab', 'today'));

if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* 失敗しても動く */ }));
}
