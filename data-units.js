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

  // ここから下の分野は作りが違う。カードとクイズを持たず、単元が別アプリへの入口になる。
  // 単元が href を持つことが目印で、app.js も tools/build.js もそれを見て扱いを変える。
  // meta は分野カードに出す一行、sub は単元の一行。
  {
    key: 'dokusho', name: '読書コーナー', emoji: '📚',
    color: '#7a3b6a',
    kind: 'read',
    desc: '原文と現代語訳を並べて、名作を通しで読めます。巻ごとに要約と読み上げつき。',
    meta: '3つの本棚 ／ 全45作品',
    units: [
      { id: '6-1', name: '日本古典文学', href: 'koten/',
        sub: '5作品 ／ 竹取物語・土佐日記・枕草子・平家物語・源氏物語（全五十四帖）' },
      { id: '6-2', name: '日本近現代文学', href: 'kingendai/',
        sub: '30作品 ／ 漱石・鴎外・芥川・太宰・賢治ほか。作家の紹介つき' },
      { id: '6-3', name: '英米文学', href: 'eibei/',
        sub: '10作品 ／ アリス・ホームズ・オズ・若草物語ほか。原文と訳の対照つき' },
    ],
  },

  // 地図は map/ の1アプリで、日本と世界をハッシュで切り替える。
  // 形は Natural Earth（パブリック・ドメイン）から tools/make-map.js が作る。
  {
    key: 'chizu', name: '地図', emoji: '🗺',
    color: '#3f7f6a',
    kind: 'map',
    desc: '白地図を触って位置を覚えます。押すと人口・面積・郷土料理・名所が出て、人口順や面積順にも並べられます。',
    meta: '2つの地図と路線図 ／ 47都道府県・世界186か国・3都市',
    units: [
      { id: '7-1', name: '日本地図', href: 'map/#jp',
        sub: '47都道府県 ／ 県庁所在地・人口・面積・郷土料理・名所' },
      { id: '7-2', name: '世界地図', href: 'map/#world',
        sub: '186か国 ／ 首都・人口・面積・名所。出題は押せる大きさの110か国' },
      { id: '7-3', name: '都市の路線図', href: 'rail/#tokyo',
        sub: '東京・大阪・名古屋 ／ 主要路線と乗換駅の骨格。駅を押すと乗り入れる路線が出る' },
    ],
  },

  // マナーは manner/ の1アプリで、単元をハッシュで切り替える。
  // 図は手描きの SVG で、押すとその部分の説明が出る。
  {
    key: 'manner', name: 'マナー', emoji: '🍽',
    color: '#b5725a',
    kind: 'manner',
    desc: '食事と席次の作法を図で覚えます。図の中を押すと説明が出て、その図のままクイズになります。',
    meta: '4つの単元 ／ 図25枚・クイズ50問',
    units: [
      { id: '8-1', name: '洋食のマナー', href: 'manner/#yoshoku',
        sub: '図5枚 ／ テーブルセッティング・使う順・ナイフとフォークの合図・ナプキン・グラス' },
      { id: '8-2', name: '和食のマナー', href: 'manner/#washoku',
        sub: '図5枚 ／ 一汁三菜の配膳・箸の持ち方・嫌い箸・器の扱い・会席の流れ' },
      { id: '8-3', name: '席次と立ち居ふるまい', href: 'manner/#sekiji',
        sub: '図5枚 ／ 応接室・会議室・和室・車・エレベーター' },
      { id: '8-4', name: '慶弔ののし袋', href: 'manner/#keicho',
        sub: '図10枚 ／ 水引・袱紗・香典の書き方と金額・家族葬・宗教別の表書き・和式と洋式の拝礼' },
    ],
  },
];

// 解説カードから開く図。カードid → [[リンク先, 表示名], …]
// マナーコーナーの図は manner/#<単元>&f=<図id> で名指しできる。
// 文章で説明しているものに図があるときだけ結ぶ。無理に全カードへ付けない。
window.CARD_LINKS = {
  '5-1-01': [['manner/#sekiji&f=ousetsu', '席次の図']],
  '5-1-05': [['manner/#sekiji&f=ousetsu', '応接室'], ['manner/#sekiji&f=kaigi', '会議室'],
    ['manner/#sekiji&f=kuruma', '車'], ['manner/#sekiji&f=elevator', 'エレベーター']],
  '5-2-01': [['manner/#keicho&f=shuha', '宗教で変わる表書き'], ['manner/#keicho&f=hairei', '和式と洋式の拝礼'],
    ['manner/#keicho&f=kazokusou', '家族葬のとき']],
  '5-2-02': [['manner/#keicho&f=mizuhiki', '水引の結び方'], ['manner/#keicho&f=orikaeshi', '袋の折り返し'],
    ['manner/#keicho&f=fukusa', '袱紗の包み方']],
  '5-2-03': [['manner/#keicho&f=kouden', '香典袋の書き方'], ['manner/#keicho&f=kingaku', '金額の目安'],
    ['manner/#keicho&f=kazokusou', '家族葬のとき'], ['manner/#keicho&f=shuha', '宗教で変わる表書き'],
    ['manner/#keicho&f=shoukou', '焼香の手順']],
  '5-2-04': [['manner/#keicho&f=shuha', '宗教で変わる表書き'], ['manner/#keicho&f=hairei', '和式と洋式の拝礼'],
    ['manner/#keicho&f=omotegaki', '表書きと墨の濃さ']],
  '5-2-05': [['manner/#keicho&f=mizuhiki', '水引の結び方'], ['manner/#keicho&f=omotegaki', '表書きと墨の濃さ']],
  '5-2-10': [['manner/#keicho&f=mizuhiki', '水引の結び方'], ['manner/#keicho&f=orikaeshi', '袋の折り返し']],
};

// 単元あたりの目標量。読書コーナーを除く全単元で共通（カード10枚・クイズ30問 = 400枚・1200問）
window.UNIT_PLAN = { cards: 10, quiz: 30 };
window.PRI_PLAN = { A: window.UNIT_PLAN, B: window.UNIT_PLAN, C: window.UNIT_PLAN };
