'use strict';
/*
  クイズを id 単位で差し替える。

    node tools/replace-quiz.js <単元id> <差し替え定義.json>

  差し替え定義は { "<クイズid>": "<新しいオブジェクトのソース>" } という形の JSON。
  ソースは `{ id: '...', ... }` の中身をそのまま書く（末尾のカンマは不要）。

  `data/<単元id>.js` の中から該当 id のオブジェクトを波括弧の対応で切り出し、
  新しいソースに置き換える。古い本文を引用する必要がないので、
  引用のずれによる失敗が起きない。

  形式の偏りを直す作業（四択に寄りすぎたものを○✕・穴埋めへ変える）で使う。
*/
const fs = require('fs');
const path = require('path');

const [unitId, defPath] = process.argv.slice(2);
if (!unitId || !defPath) {
  console.error('使い方: node tools/replace-quiz.js <単元id> <差し替え定義.json>');
  process.exit(2);
}

const file = path.resolve(__dirname, '..', 'data', unitId + '.js');
let src = fs.readFileSync(file, 'utf8');
const defs = JSON.parse(fs.readFileSync(defPath, 'utf8'));

/** id のオブジェクトの範囲 [開始, 終了) を波括弧の対応で求める */
function findObject(text, id) {
  const head = text.indexOf(`{ id: '${id}',`);
  if (head < 0) return null;
  let depth = 0;
  let inStr = false;
  let quote = '';
  for (let i = head; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (ch === '\\') { i++; continue; }
      if (ch === quote) inStr = false;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { inStr = true; quote = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return [head, i + 1];
    }
  }
  return null;
}

let done = 0;
const missing = [];
for (const [id, body] of Object.entries(defs)) {
  const range = findObject(src, id);
  if (!range) { missing.push(id); continue; }
  src = src.slice(0, range[0]) + body.trim() + src.slice(range[1]);
  done++;
}

if (missing.length) {
  console.error(`  ✕ 見つからない id: ${missing.join(', ')}`);
  process.exit(1);
}

// 置き換えた結果が JavaScript として読めるか確かめてから書く
try {
  const probe = Object.assign({}, global);
  void probe;
  global.window = global;
  global.TOPICS = []; global.QUIZ = [];
  // eslint-disable-next-line no-new-func
  new Function(src)();
} catch (e) {
  console.error(`  ✕ 置き換え後の ${unitId}.js が読めません — ${e.message}`);
  process.exit(1);
}

fs.writeFileSync(file, src, 'utf8');
console.log(`${unitId}: ${done} 問を差し替えました`);
