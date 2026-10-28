'use strict';
// 単元のクイズを一覧する（形式の見直し用）。 node tools/list-quiz.js <単元id>
const fs=require('fs'),path=require('path');
global.window=global; global.TOPICS=[]; global.QUIZ=[];
const id=process.argv[2];
new Function(fs.readFileSync(path.resolve(__dirname,'..','data',id+'.js'),'utf8'))();
QUIZ.forEach(q=>{
  const ans = q.type==='tf' ? (q.a?'○':'✕') : q.type==='order' ? q.c.join('→') : q.c[q.a];
  console.log(`${q.id} [${q.type}] lv${q.lv}`);
  console.log(`   Q: ${q.q}`);
  if(q.type==='mc'||q.type==='cloze') console.log(`   選: ${q.c.join(' / ')}`);
  console.log(`   答: ${ans}`);
  console.log(`   解: ${q.exp}`);
});
