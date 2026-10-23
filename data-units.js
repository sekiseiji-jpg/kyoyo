'use strict';
// 5分野40単元の骨格（単元一覧.md が元）。データが無い単元は「準備中」と表示する。
// pri は「作成順」を示すだけの記号（A → B → C の順に作る）。分量はどの単元も同じ。
// color と desc は「学ぶ」の入口に並ぶ分野カードで使う。
// color は帯と進捗バーの装飾にだけ使うので、ライト/ダークの両方で見える中明度にする。

window.FIELDS = [
  {
    key: 'jinbun', name: '人文科学', emoji: '🏛',
    color: '#a452c4',
    desc: '人が何を考え、どう暮らしてきたかをたどります。歴史と思想は時事の背景にもなります。',
    units: [
      { id: '1-1', name: '思想（西洋・東洋）', pri: 'C' },
      { id: '1-2', name: '日本史', pri: 'C' },
      { id: '1-3', name: '世界史', pri: 'C' },
      { id: '1-4', name: '地理', pri: 'B' },
      { id: '1-5', name: '文学', pri: 'C' },
      { id: '1-6', name: '美術・音楽', pri: 'B' },
      { id: '1-7', name: '宗教', pri: 'A' },
      { id: '1-8', name: '心理学', pri: 'A' },
    ],
  },
  {
    key: 'shakai', name: '社会科学', emoji: '⚖️',
    color: '#c9564a',
    desc: '制度のしくみを押さえます。報道の言葉が何を指しているかが分かるようになります。',
    units: [
      { id: '2-1', name: '政治・統治', pri: 'B' },
      { id: '2-2', name: '経済・金融', pri: 'B' },
      { id: '2-3', name: '法律の基礎', pri: 'A' },
      { id: '2-4', name: '社会学', pri: 'A' },
      { id: '2-5', name: '国際関係', pri: 'A' },
      { id: '2-6', name: '統計の読み方', pri: 'A' },
      { id: '2-7', name: '時事の下地①制度', pri: 'A' },
      { id: '2-8', name: '時事の下地②国際', pri: 'A' },
    ],
  },
  {
    key: 'shizen', name: '自然科学', emoji: '🔬',
    color: '#3a97d4',
    desc: 'しくみと桁を押さえます。細かい数値より、何がどう効くかを読み取れる形にしています。',
    units: [
      { id: '3-1', name: '物理', pri: 'C' },
      { id: '3-2', name: '化学', pri: 'C' },
      { id: '3-3', name: '生物', pri: 'C' },
      { id: '3-4', name: '地学・宇宙', pri: 'C' },
      { id: '3-5', name: '数学', pri: 'C' },
      { id: '3-6', name: '情報・AI', pri: 'A' },
      { id: '3-7', name: '医学・健康', pri: 'B' },
      { id: '3-8', name: '科学史', pri: 'B' },
    ],
  },
  {
    key: 'eigo', name: '英語', emoji: '🔤',
    color: '#2f90a8',
    desc: '解説はすべて日本語。語源から意味を推し、報道で使われる言い方を押さえます。',
    units: [
      { id: '4-1', name: '教養語彙', pri: 'C' },
      { id: '4-2', name: '語源・接頭辞', pri: 'B' },
      { id: '4-3', name: 'イディオム', pri: 'B' },
      { id: '4-4', name: '時事英語', pri: 'B' },
      { id: '4-5', name: '文法の要点', pri: 'C' },
      { id: '4-6', name: 'ことわざ', pri: 'B' },
      { id: '4-7', name: '読解', pri: 'C' },
      { id: '4-8', name: '略語', pri: 'A' },
    ],
  },
  {
    key: 'kurashi', name: '暮らしと常識', emoji: '🏠',
    color: '#c08a2e',
    desc: '迷いやすい場面の作法と、ことばの使い分けを確かめます。本アプリ固有の分野です。',
    units: [
      { id: '5-1', name: 'ビジネスマナー', pri: 'A' },
      { id: '5-2', name: '冠婚葬祭', pri: 'B' },
      { id: '5-3', name: 'ことばの使い分け', pri: 'A' },
      { id: '5-4', name: '四字熟語・故実', pri: 'A' },
      { id: '5-5', name: '暦・年中行事', pri: 'B' },
      { id: '5-6', name: '単位と数字', pri: 'A' },
      { id: '5-7', name: '地図記号・標識', pri: 'A' },
      { id: '5-8', name: '雑学', pri: 'B' },
    ],
  },

  // 読書コーナーだけは作りが違う。カードとクイズを持たず、単元が本棚アプリへの入口になる。
  // 本棚は koten/ kingendai/ eibei/ に丸ごと置いてあり、中身は学習アプリのものと同じ。
  {
    key: 'dokusho', name: '読書コーナー', emoji: '📚',
    color: '#7a3b6a',
    kind: 'read',
    desc: '原文と現代語訳を並べて、名作を通しで読めます。巻ごとに要約と読み上げつき。',
    units: [
      { id: '6-1', name: '日本古典文学', href: 'koten/', works: 5,
        note: '竹取物語・土佐日記・枕草子・平家物語・源氏物語（全五十四帖）' },
      { id: '6-2', name: '日本近現代文学', href: 'kingendai/', works: 30,
        note: '漱石・鴎外・芥川・太宰・賢治ほか。作家の紹介つき' },
      { id: '6-3', name: '英米文学', href: 'eibei/', works: 10,
        note: 'アリス・ホームズ・オズ・若草物語ほか。原文と訳の対照つき' },
    ],
  },
];

// 単元あたりの目標量。読書コーナーを除く全単元で共通（カード10枚・クイズ30問 = 400枚・1200問）
window.UNIT_PLAN = { cards: 10, quiz: 30 };
window.PRI_PLAN = { A: window.UNIT_PLAN, B: window.UNIT_PLAN, C: window.UNIT_PLAN };
