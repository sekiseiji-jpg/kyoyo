'use strict';
// 歴代人物一覧のデータを機械的に見直す（知見.md 3.5 の「機械的に作った集合は一度並べて人が眺める」）
const fs = require('fs');
const path = require('path');
const dir = process.argv[2] || 'rekidai';
global.window = {};
['data-tenno.js', 'data-buke.js', 'data-souri.js'].forEach((f) => {
  eval(fs.readFileSync(path.join(dir, f), 'utf8'));
});
const T = window.REK_TENNO, B = window.REK_BUKE, S = window.REK_SOURI;
const pid = (it) => it.same || it.name;
// A級戦犯・JR・PKO のような大文字だけの短い略語は日本語として普通なので見逃す
const foreign = (t) => /[\u0400-\u04FF]/.test(t) || /[A-Za-z]{4,}/.test(t) || /[a-z]{2,}/.test(t);
const bad = [];
const warn = [];
const yv = (v) => {
  if (v === null || v === undefined) return 2026.8;
  if (typeof v === 'number') return v;
  const m = /^(\d{4})-(\d{2})$/.exec(v);
  if (!m) { bad.push(`年の書き方が違う: ${v}`); return 0; }
  return Number(m[1]) + (Number(m[2]) - 1) / 12;
};

for (const L of [T, B, S]) {
  const eraIds = L.eras.map((e) => e.id);
  const names = [];
  L.items.forEach((it, i) => {
    const who = `${L.id} 第${it.n}代 ${it.name}`;
    if (!it.name || !it.yomi) bad.push(`${who}: 名前かよみが無い`);
    if (!/^[ぁ-ゖー]+$/.test(it.yomi)) bad.push(`${who}: よみがひらがなでない → ${it.yomi}`);
    if (!eraIds.includes(it.era)) bad.push(`${who}: 知らない時代 ${it.era}`);
    if (yv(it.to) < yv(it.from)) bad.push(`${who}: 終わりが始まりより前`);
    if (!names.includes(pid(it))) names.push(pid(it));
    if (it.same && !L.items.some((x) => x.name === it.same)) bad.push(`${who}: same の相手がいない`);
    ['name', 'note', 'yomi', 'party', 'seq'].forEach((k) => {
      if (it[k] && /[A-Za-zЀ-ӿÀ-ɏ]/.test(it[k])) warn.push(`${who}: ${k} に外国の文字 → ${it[k]}`);
    });
    if (it.n == null) bad.push(`${who}: 代が無い`);
    if (it.m) bad.push(`${who}: 使っていない項目 m がある`);
  });
  // 代の並び（時代ごとに 1 から振り直すものもある）
  const byEra = {};
  L.items.forEach((it) => { (byEra[it.era] = byEra[it.era] || []).push(it.n); });
  Object.entries(byEra).forEach(([e, ns]) => {
    const sorted = ns.slice().sort((a, b) => a - b);
    if (String(ns) !== String(sorted)) bad.push(`${L.id}/${e}: 代の順が前後している`);
  });
  // 時代の並びがデータの並びと一致しているか
  const order = [...new Set(L.items.map((i) => i.era))];
  if (String(order) !== String(eraIds)) bad.push(`${L.id}: 時代の並びが eras と違う → ${order}`);
  console.log(`[${L.id}] ${L.items.length}代 ／ ${names.length}人`);
  Object.entries(byEra).forEach(([e, ns]) => {
    const er = L.eras.find((x) => x.id === e);
    console.log(`    ${er.name}: ${ns.length}件（第${ns[0]}〜${ns[ns.length - 1]}代） ${er.sub}`);
  });
}

// ---- 天皇 ----
const tn = T.items.map((i) => i.n);
if (String(tn) !== String(tn.map((_, i) => i + 1))) bad.push('天皇: 代が 1..126 の連番でない');
if (T.items.length !== 126) bad.push(`天皇: ${T.items.length}代（126のはず）`);
const tPeople = [...new Set(T.items.map(pid))];
if (tPeople.length !== 124) bad.push(`天皇: ${tPeople.length}人（124のはず）`);
const women = T.items.filter((i) => (i.tags || []).includes('女性'));
const womenP = [...new Set(women.map(pid))];
console.log(`\n女性の天皇: ${womenP.length}人 ${women.length}代 → ${women.map((i) => `${i.n}${i.name}`).join(' ')}`);
if (womenP.length !== 8 || women.length !== 10) bad.push('天皇: 女性は8人10代のはず');
const jusso = T.items.filter((i) => (i.tags || []).includes('重祚'));
console.log(`重祚: ${jusso.map((i) => `${i.n}${i.name}`).join(' ')}`);
if (jusso.length !== 2) bad.push('天皇: 重祚は2代のはず');
// 在位が前の代より前に始まっていないか（重なりは注記つきのみ許す）
T.items.forEach((it, i) => {
  if (i === 0) return;
  const prev = T.items[i - 1];
  if (yv(it.from) < yv(prev.from) && !it.reignNote) bad.push(`天皇 第${it.n}代 ${it.name}: 前の代より前に始まっている（注記なし）`);
  if (yv(it.from) < yv(prev.to) && !it.reignNote) warn.push(`天皇 第${it.n}代 ${it.name}: 前の代と在位が重なる ${prev.to}→${it.from}`);
  const gap = yv(it.from) - yv(prev.to);
  if (gap > 3) warn.push(`天皇 第${it.n}代 ${it.name}: 前の代との間が${Math.round(gap)}年あいている`);
});

// ---- 武家 ----
const sho = B.items.filter((i) => i.era.endsWith('sho'));
const shik = B.items.filter((i) => i.era === 'kam-shi');
const shoP = [...new Set(sho.map(pid))];
console.log(`\n将軍: ${sho.length}代 ${shoP.length}人 ／ 執権: ${shik.length}代 ${new Set(shik.map(pid)).size}人`);
if (sho.length !== 39) bad.push(`将軍が${sho.length}代（39のはず）`);
if (shoP.length !== 38) bad.push(`将軍が${shoP.length}人（38のはず）`);
if (shik.length !== 16) bad.push(`執権が${shik.length}代（16のはず）`);
if (!shik.every((i) => i.name.startsWith('北条'))) bad.push('執権に北条氏でない人がいる');
['kam-sho', 'mur-sho', 'edo-sho'].forEach((e) => {
  const g = B.items.filter((i) => i.era === e);
  const want = { 'kam-sho': 9, 'mur-sho': 15, 'edo-sho': 15 }[e];
  if (g.length !== want) bad.push(`${e} が${g.length}代（${want}のはず）`);
});
if (!B.items.filter((i) => i.era === 'mur-sho').every((i) => i.name.startsWith('足利'))) bad.push('室町の将軍に足利氏でない人がいる');
if (!B.items.filter((i) => i.era === 'edo-sho').every((i) => i.name.startsWith('徳川'))) bad.push('江戸の将軍に徳川氏でない人がいる');

// ---- 総理 ----
const sn = S.items.map((i) => i.n);
if (String(sn) !== String(sn.map((_, i) => i + 1))) bad.push('総理: 代が 1..104 の連番でない');
if (S.items.length !== 104) bad.push(`総理: ${S.items.length}代（104のはず）`);
const sPeople = [];
S.items.forEach((i) => { if (!sPeople.includes(pid(i))) sPeople.push(pid(i)); });
console.log(`\n総理: ${S.items.length}代 ${sPeople.length}人`);
['安倍晋三', '岸田文雄', '石破茂', '高市早苗'].forEach((nm) => {
  console.log(`    ${nm} → ${sPeople.indexOf(nm) + 1}人目`);
});
// 代の始まりが前の代の終わりと合っているか
S.items.forEach((it, i) => {
  if (i === 0) return;
  const prev = S.items[i - 1];
  const d = Math.round((yv(it.from) - yv(prev.to)) * 12);
  if (d < 0) bad.push(`総理 第${it.n}代 ${it.name}: 前の内閣の終わりより前に始まっている`);
  if (d > 2) warn.push(`総理 第${it.n}代 ${it.name}: 前の内閣との間が${d}か月あいている`);
});
// 同じ人の連番に「第n次」が付いているか
const cnt = {};
S.items.forEach((i) => { cnt[i.name] = (cnt[i.name] || 0) + 1; });
S.items.forEach((i) => {
  if (cnt[i.name] > 1 && !i.seq) bad.push(`総理 第${i.n}代 ${i.name}: 何度も組んでいるのに「第n次」が無い`);
  if (cnt[i.name] === 1 && i.seq) bad.push(`総理 第${i.n}代 ${i.name}: 一度だけなのに「第n次」がある`);
});
S.items.forEach((i) => { if (!i.party) warn.push(`総理 第${i.n}代 ${i.name}: よりどころが空`); });
// 通算の長さ
const tot = sPeople.map((nm) => ({
  nm, mo: S.items.filter((i) => pid(i) === nm).reduce((a, i) => a + (yv(i.to) - yv(i.from)) * 12, 0),
})).sort((a, b) => b.mo - a.mo);
console.log('    通算が長い: ' + tot.slice(0, 5).map((t) => `${t.nm} ${Math.round(t.mo)}か月（約${(t.mo / 12).toFixed(1)}年）`).join(' / '));
console.log('    通算が短い: ' + tot.slice(-3).map((t) => `${t.nm} ${Math.round(t.mo)}か月`).join(' / '));
// 一代の長短
[['天皇', T.items.filter((i) => !(T.statsSkip || []).includes(i.era))], ['武家', B.items], ['総理', S.items]].forEach(([nm, arr]) => {
  const s = arr.slice().sort((a, b) => (yv(b.to) - yv(b.from)) - (yv(a.to) - yv(a.from)));
  const f = (i) => `${i.name}（${(yv(i.to) - yv(i.from)).toFixed(1)}年）`;
  console.log(`\n${nm} 一代で長い: ${s.slice(0, 3).map(f).join(' / ')}`);
  console.log(`${nm} 一代で短い: ${s.slice(-3).map(f).join(' / ')}`);
});

console.log('\n==== 直すべきこと ====');
console.log(bad.length ? bad.join('\n') : 'なし');
console.log('\n==== 目で見て確かめること ====');
console.log(warn.length ? warn.join('\n') : 'なし');
process.exit(bad.length ? 1 : 0);
