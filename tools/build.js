'use strict';
/*
  データの結合・索引の生成・検査をまとめて行う。

    node tools/build.js

  入力  data/<単元id>.js         単元ごとの原本（1単元1ファイル。公開しない）
  出力  data-<分野>.js           分野ごとに結合したもの（公開する。index.html が読む）
        index-term.js            辞典の索引（公開する）

  単元を足したら data/ にファイルを置いてこれを走らせるだけでよい。
  検査に失敗すると終了コード 1 を返し、出力は書き換えない。
*/
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'data');

// 単元id の先頭の数字 → 分野のファイル名
const FIELD_FILE = { 1: 'jinbun', 2: 'shakai', 3: 'shizen', 4: 'eigo', 5: 'kurashi' };
const FIELD_NAME = { 1: '人文科学', 2: '社会科学', 3: '自然科学', 4: '英語', 5: '暮らしと常識' };

// ---------- 読み込み ----------
global.window = global;
require(path.join(root, 'data-units.js'));
const FIELDS = global.FIELDS;
const PRI_PLAN = global.PRI_PLAN;
const UNIT = new Map();
FIELDS.forEach((f) => f.units.forEach((u) => UNIT.set(u.id, u)));

const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.js'))
  .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

const sources = new Map(); // 単元id → ソース
files.forEach((f) => {
  const id = f.replace(/\.js$/, '');
  if (!UNIT.has(id)) { console.error(`  ✕ data/${f}: data-units.js に無い単元です`); process.exitCode = 1; return; }
  sources.set(id, fs.readFileSync(path.join(dataDir, f), 'utf8'));
});

// 評価して TOPICS / QUIZ を集める
global.TOPICS = []; global.QUIZ = [];
for (const [id, src] of sources) {
  try {
    // eslint-disable-next-line no-new-func
    new Function(src)();
  } catch (e) {
    console.error(`  ✕ data/${id}.js: 読み込めません — ${e.message}`);
    process.exit(1);
  }
}
const TOPICS = global.TOPICS;
const QUIZ = global.QUIZ;

// ---------- 検査 ----------
let bad = 0;
const err = (who, msg) => { console.error(`  ✕ ${who}: ${msg}`); bad++; };

const tIds = new Set();
TOPICS.forEach((t) => {
  if (tIds.has(t.id)) err(t.id, 'id が重複');
  tIds.add(t.id);
  if (!t.unit || !UNIT.has(t.unit)) err(t.id, `unit が不正: ${t.unit}`);
  if (!t.title) err(t.id, 'title が無い');
  if (!t.body || t.body.length < 150) err(t.id, `body が短すぎる (${(t.body || '').length}字)`);
  if (!Array.isArray(t.keys) || !t.keys.length) err(t.id, 'keys が無い');
  if (t.asof && !/^\d{4}-\d{2}-\d{2}$/.test(t.asof)) err(t.id, 'asof の書式が不正');
  if (t.id.slice(0, 3) !== t.unit) err(t.id, 'id の接頭辞が unit と合わない');
});

const qIds = new Set();
QUIZ.forEach((q) => {
  if (qIds.has(q.id)) err(q.id, 'id が重複');
  qIds.add(q.id);
  if (!q.unit || !UNIT.has(q.unit)) err(q.id, `unit が不正: ${q.unit}`);
  if (!q.exp) err(q.id, 'exp（解説）が無い');
  if (!q.q) err(q.id, 'q（問題文）が無い');
  if (q.topic && !tIds.has(q.topic)) err(q.id, `topic が存在しない: ${q.topic}`);
  if (q.type === 'mc' || q.type === 'cloze') {
    if (!Array.isArray(q.c) || q.c.length !== 4) err(q.id, '選択肢が4つでない');
    else if (new Set(q.c).size !== 4) err(q.id, '選択肢に重複がある');
    if (typeof q.a !== 'number' || q.a < 0 || q.a >= (q.c || []).length) err(q.id, 'a が選択肢の範囲外');
    if (q.type === 'cloze' && !q.q.includes('＿')) err(q.id, '穴埋めなのに＿が無い');
  } else if (q.type === 'tf') {
    if (typeof q.a !== 'boolean') err(q.id, 'a が真偽値でない');
    if (q.c) err(q.id, '○✕に選択肢は要らない');
  } else if (q.type === 'order') {
    if (!Array.isArray(q.c) || q.c.length < 3) err(q.id, '並べ替えの項目が3つ未満');
    else if (new Set(q.c).size !== q.c.length) err(q.id, '並べ替えの項目に重複がある');
  } else {
    err(q.id, `type が不正: ${q.type}`);
  }
});

// 単元ごとの分量が計画どおりか
let warnMix = 0;
const summary = [];
for (const [id, u] of UNIT) {
  // 読書コーナーの単元は本棚アプリ（koten/ など）を開くだけで、カードもクイズも持たない
  if (u.href) continue;
  const ts = TOPICS.filter((t) => t.unit === id);
  const qs = QUIZ.filter((q) => q.unit === id);
  if (!ts.length && !qs.length) { summary.push({ id, name: u.name, pri: u.pri, c: 0, q: 0, state: '準備中' }); continue; }
  const plan = PRI_PLAN[u.pri];
  if (ts.length !== plan.cards) err(id, `カードが ${ts.length} 枚（優先度${u.pri} の計画は ${plan.cards} 枚）`);
  if (qs.length !== plan.quiz) err(id, `クイズが ${qs.length} 問（優先度${u.pri} の計画は ${plan.quiz} 問）`);
  // 形式の配分（再現プロンプト.md の目安）。作りやすい四択に寄りがちなので数えて警告する
  const mix = { mc: 0, tf: 0, cloze: 0, order: 0 };
  qs.forEach((q) => { if (mix[q.type] !== undefined) mix[q.type]++; });
  const RANGE = { mc: [12, 16], tf: [7, 11], cloze: [5, 9], order: [0, 3] };
  const off = Object.entries(RANGE)
    .filter(([k, [lo, hi]]) => mix[k] < lo || mix[k] > hi)
    .map(([k, [lo, hi]]) => `${k} ${mix[k]}（目安 ${lo}〜${hi}）`);
  if (off.length) { console.error(`  ⚠ ${id}: 形式が偏っています → ${off.join(' / ')}`); warnMix++; }
  summary.push({ id, name: u.name, pri: u.pri, c: ts.length, q: qs.length, state: '公開' });
}

// 日本語の中に紛れ込んだ英単語を警告する（書き手の打ち間違いを拾うための簡易検査）
// 日本語の文字のすぐ隣に小文字のラテン文字が3字以上続くものを疑わしいとみなす。
// 仮名と漢字だけを隣接の判定に使う（括弧・読点・中黒の隣の英語は正当なので見ない）
const JA = '\\u3040-\\u30fa\\u30fc-\\u30ff\\u4e00-\\u9fff';
const SUSPECT = new RegExp(`(?:[${JA}][a-z]{3,}|[a-z]{3,}[${JA}])`, 'g');
const ALLOW = /^(?:claim|stagnation|naive|the|and|of|in)$/i;
let warn = 0;
const scan = (id, field, text) => {
  const hits = String(text).match(SUSPECT);
  if (!hits) return;
  hits.forEach((h) => {
    const word = h.replace(new RegExp(`[${JA}]`, 'g'), '');
    if (ALLOW.test(word)) return;
    console.error(`  ⚠ ${id} (${field}): 日本語に英単語が紛れている可能性 → "${h}"`);
    warn++;
  });
};
TOPICS.forEach((t) => { scan(t.id, 'title', t.title); scan(t.id, 'body', t.body); });
QUIZ.forEach((q) => {
  scan(q.id, 'q', q.q); scan(q.id, 'exp', q.exp);
  (q.c || []).forEach((c, i) => scan(q.id, `c[${i}]`, c));
});
if (warn) console.error(`  （上記 ${warn} 件は警告です。意図したものなら無視してよい）\n`);

if (bad) { console.error(`\n検査: ${bad} 件の問題。出力は書き換えませんでした。`); process.exit(1); }

// ---------- 分野ごとに結合して書き出す ----------
const today = new Date().toISOString().slice(0, 10);
const written = [];
// index.html と sw.js が5分野ぶんを固定で読むので、単元が0でも必ずファイルを出す
// （1つでも 404 になると Service Worker のキャッシュ登録がまるごと失敗する）
Object.entries(FIELD_FILE).forEach(([n, file]) => {
  const ids = [...sources.keys()].filter((id) => id.startsWith(n + '-'));
  const head = `'use strict';
// tools/build.js が data/ から結合したファイル。手で直さず data/<単元id>.js を直すこと。
// 分野: ${FIELD_NAME[n]} ／ 単元: ${ids.join(', ')} ／ 生成: ${today}
window.TOPICS = window.TOPICS || [];
window.QUIZ = window.QUIZ || [];
`;
  const body = ids.map((id) => sources.get(id)
    .replace(/^'use strict';\n/, '')
    .replace(/^window\.TOPICS = window\.TOPICS \|\| \[\];\n/m, '')
    .replace(/^window\.QUIZ = window\.QUIZ \|\| \[\];\n/m, '')
    .trim()).join('\n\n');
  const out = `data-${file}.js`;
  fs.writeFileSync(path.join(root, out), head + '\n' + body + '\n', 'utf8');
  written.push({ out, ids: ids.length, kb: Math.round((head + body).length / 1024) });
});

// ---------- 辞典の索引 ----------
const terms = {};
TOPICS.forEach((t) => (t.keys || []).forEach((k) => {
  const key = String(k).trim();
  if (!key) return;
  terms[key] = terms[key] || { t: [], q: [] };
  if (!terms[key].t.includes(t.id)) terms[key].t.push(t.id);
}));
Object.keys(terms).forEach((k) => QUIZ.forEach((q) => {
  if ((q.q && q.q.includes(k)) || (q.exp && q.exp.includes(k))) {
    if (!terms[k].q.includes(q.id)) terms[k].q.push(q.id);
  }
}));
const sorted = {};
Object.keys(terms).sort((a, b) => a.localeCompare(b, 'ja')).forEach((k) => { sorted[k] = terms[k]; });
fs.writeFileSync(path.join(root, 'index-term.js'), `'use strict';
// tools/build.js が作ったファイル。手で直さない。
// 見出し ${Object.keys(sorted).length} 語 ／ カード ${TOPICS.length} 枚 ／ クイズ ${QUIZ.length} 問 ／ 生成: ${today}
window.TERMS = ${JSON.stringify(sorted, null, 1)};
`, 'utf8');

// ---------- 結果 ----------
const ready = summary.filter((s) => s.state === '公開');
console.log('分野ファイル:');
written.forEach((w) => console.log(`  ${w.out.padEnd(18)} ${String(w.ids).padStart(2)}単元 ${String(w.kb).padStart(4)}KB`));
const planned = [...UNIT.values()].filter((u) => !u.href).length;
console.log(`\n単元 ${ready.length} / ${planned} ／ カード ${TOPICS.length} 枚 ／ クイズ ${QUIZ.length} 問 ／ 見出し ${Object.keys(sorted).length} 語`);
const byPri = { A: [0, 0, 0], B: [0, 0, 0], C: [0, 0, 0] };
ready.forEach((s) => { byPri[s.pri][0]++; byPri[s.pri][1] += s.c; byPri[s.pri][2] += s.q; });
Object.entries(byPri).forEach(([p, v]) => console.log(`  優先度${p}: ${v[0]}単元 カード${v[1]}枚 クイズ${v[2]}問`));
const left = summary.filter((s) => s.state === '準備中');
if (left.length) console.log(`\n準備中 ${left.length} 単元: ${left.map((s) => s.id).join(' ')}`);
const mixAll = { mc: 0, tf: 0, cloze: 0, order: 0 };
QUIZ.forEach((q) => { if (mixAll[q.type] !== undefined) mixAll[q.type]++; });
console.log(`\n形式: 四択${mixAll.mc} ／ ○✕${mixAll.tf} ／ 穴埋め${mixAll.cloze} ／ 並べ替え${mixAll.order}`);
if (warnMix) console.log(`  形式が目安から外れている単元: ${warnMix}`);

console.log('\n検査: 問題なし');
