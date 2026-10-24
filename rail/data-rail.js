'use strict';
/* 都市の路線図。
   駅は座標を持ち、路線は「通る駅の並び」だけを持つ。線は app.js が駅をつないで描く。
   こうすると線の座標を二重に持たずに済み、駅を動かせば線もついてくる。

   **実際の地図ではなく、骨格をつかむための図である。**
   主要な路線と乗換駅だけを残し、駅の間隔も位置関係も簡略化している。
   並走する区間は1本の線にまとめ、支線や分岐も省いた。
   正確な路線図は各鉄道会社のものを見てほしい。

   color は各社が使っている色に寄せてある（丸ノ内線は赤、銀座線はオレンジ…）。
   色そのものが覚える手がかりになるため。
*/

window.MAP_RAIL = {
  source: 'このアプリのための書き下ろし。実際の位置関係は簡略化してある。',
  cities: [
    // =========================================================
    {
      id: 'tokyo', name: '東京', emoji: '🗼',
      lead: '**山手線の環**を頭に入れるのが先。環のどこに何があるかが分かると、ほかの路線は「環のどこに刺さるか」で覚えられる。',
      view: [380, 400],
      stations: {
        ikebukuro: { name: '池袋', x: 148, y: 62 },
        ueno: { name: '上野', x: 262, y: 96 },
        akihabara: { name: '秋葉原', x: 276, y: 152 },
        tokyo: { name: '東京', x: 286, y: 206 },
        shimbashi: { name: '新橋', x: 272, y: 264 },
        shinagawa: { name: '品川', x: 238, y: 332 },
        shibuya: { name: '渋谷', x: 132, y: 318 },
        shinjuku: { name: '新宿', x: 114, y: 214 },
        yotsuya: { name: '四ツ谷', x: 174, y: 210 },
        ochanomizu: { name: '御茶ノ水', x: 240, y: 178 },
        korakuen: { name: '後楽園', x: 206, y: 120 },
        ginza: { name: '銀座', x: 308, y: 240 },
        nihombashi: { name: '日本橋', x: 322, y: 204 },
        asakusa: { name: '浅草', x: 322, y: 60 },
        omotesando: { name: '表参道', x: 162, y: 300 },
        akasaka: { name: '赤坂見附', x: 206, y: 272 },
        kasumigaseki: { name: '霞ケ関', x: 254, y: 268 },
      },
      lines: [
        { id: 'yamanote', name: 'JR山手線', color: '#9acd32', loop: true,
          via: ['ikebukuro', 'ueno', 'akihabara', 'tokyo', 'shimbashi', 'shinagawa', 'shibuya', 'shinjuku'],
          note: '**環状運転をする**。1周約34.5km、約1時間。東京の主要なターミナルをつないでいて、ほかの路線はたいていこの環のどこかに接続する。' },
        { id: 'chuo', name: 'JR中央線（快速）', color: '#f15a22',
          via: ['shinjuku', 'yotsuya', 'ochanomizu', 'tokyo'],
          note: '環を**東西に横切る**。新宿と東京を最短で結ぶので、山手線で遠回りするより速いことが多い。' },
        { id: 'ginza', name: '地下鉄 銀座線', color: '#ff9500',
          via: ['shibuya', 'omotesando', 'akasaka', 'shimbashi', 'ginza', 'nihombashi', 'ueno', 'asakusa'],
          note: '**日本初の地下鉄**（1927年、上野—浅草）。渋谷から浅草まで、環の内側を南西から北東へ斜めに貫く。' },
        { id: 'marunouchi', name: '地下鉄 丸ノ内線', color: '#e60012',
          via: ['ikebukuro', 'korakuen', 'tokyo', 'ginza', 'kasumigaseki', 'akasaka', 'yotsuya', 'shinjuku'],
          note: '池袋から東京・銀座を通って新宿へ戻る**U字**。環の内側を大きく回るので、地図で見ると遠回りに見える。' },
      ],
      quizPool: ['yamanote', 'chuo', 'ginza', 'marunouchi'],
      facts: '山手線の環の中に、政治（霞ケ関）・経済（丸の内）・商業（銀座・新宿・渋谷）が収まっている。'
        + '環の西側（新宿・渋谷・池袋）は私鉄のターミナル、東側（東京・上野）はJRの長距離列車の起点という違いがある。',
    },

    // =========================================================
    {
      id: 'osaka', name: '大阪', emoji: '🏯',
      lead: '**大阪環状線の環**と、南北に貫く**御堂筋線**の2本をまず覚える。梅田（キタ）と難波（ミナミ）を結ぶのが御堂筋線。',
      view: [360, 380],
      stations: {
        osaka: { name: '大阪・梅田', x: 150, y: 76 },
        kyobashi: { name: '京橋', x: 258, y: 112 },
        tsuruhashi: { name: '鶴橋', x: 268, y: 238 },
        tennoji: { name: '天王寺', x: 212, y: 316 },
        shinimamiya: { name: '新今宮', x: 160, y: 320 },
        bentencho: { name: '弁天町', x: 92, y: 236 },
        nishikujo: { name: '西九条', x: 96, y: 152 },
        shinosaka: { name: '新大阪', x: 150, y: 24 },
        yodoyabashi: { name: '淀屋橋', x: 168, y: 140 },
        hommachi: { name: '本町', x: 170, y: 186 },
        shinsaibashi: { name: '心斎橋', x: 172, y: 226 },
        namba: { name: '難波', x: 174, y: 266 },
        tanimachi4: { name: '谷町四丁目', x: 228, y: 186 },
        morinomiya: { name: '森ノ宮', x: 270, y: 186 },
      },
      lines: [
        { id: 'loop', name: 'JR大阪環状線', color: '#f8b500', loop: true,
          via: ['osaka', 'kyobashi', 'tsuruhashi', 'tennoji', 'shinimamiya', 'bentencho', 'nishikujo'],
          note: '**環状運転をする**。1周約21.7km、約40分。山手線より小さい。環の中に大阪の中心部が収まっている。' },
        { id: 'midosuji', name: '地下鉄 御堂筋線', color: '#e5171f',
          via: ['shinosaka', 'osaka', 'yodoyabashi', 'hommachi', 'shinsaibashi', 'namba', 'tennoji'],
          note: '大阪の**大動脈**。新大阪・梅田（キタ）・心斎橋・難波（ミナミ）・天王寺を一直線に結ぶ。迷ったらこの線。' },
        { id: 'chuo', name: '地下鉄 中央線', color: '#019a66',
          via: ['bentencho', 'hommachi', 'tanimachi4', 'morinomiya'],
          note: '環の中を**東西に横切る**。御堂筋線とは本町で交わる。' },
      ],
      quizPool: ['loop', 'midosuji', 'chuo'],
      facts: '大阪では北の梅田を「キタ」、南の難波を「ミナミ」と呼ぶ。この2つを結ぶのが御堂筋線で、'
        + '地上の御堂筋（道路）もほぼ同じところを通る。JR大阪駅と地下鉄梅田駅は同じ場所にあるが名前が違う。',
    },

    // =========================================================
    {
      id: 'nagoya', name: '名古屋', emoji: '🏭',
      lead: '**東山線**が東西の背骨。名古屋駅と栄をつなぐ。**名城線**は地下鉄では日本で唯一の環状運転をする路線。',
      view: [360, 320],
      stations: {
        nagoya: { name: '名古屋', x: 76, y: 176 },
        fushimi: { name: '伏見', x: 150, y: 176 },
        sakae: { name: '栄', x: 206, y: 176 },
        chikusa: { name: '千種', x: 268, y: 168 },
        hongo: { name: '本山', x: 300, y: 146 },
        hisayaodori: { name: '久屋大通', x: 206, y: 140 },
        shiyakusho: { name: '市役所', x: 198, y: 104 },
        ozone: { name: '大曽根', x: 252, y: 92 },
        yagoto: { name: '八事', x: 286, y: 226 },
        kanayama: { name: '金山', x: 196, y: 262 },
        higashibetsuin: { name: '東別院', x: 170, y: 224 },
        marunouchi: { name: '丸の内', x: 150, y: 140 },
        imaike: { name: '今池', x: 256, y: 140 },
      },
      lines: [
        { id: 'higashiyama', name: '地下鉄 東山線', color: '#ffb100',
          via: ['nagoya', 'fushimi', 'sakae', 'chikusa', 'hongo'],
          note: '名古屋駅と栄を結ぶ**いちばん使う線**。名古屋で最初にできた地下鉄（1957年）。' },
        { id: 'meijo', name: '地下鉄 名城線', color: '#9100a0', loop: true,
          via: ['sakae', 'hisayaodori', 'shiyakusho', 'ozone', 'hongo', 'yagoto', 'kanayama', 'higashibetsuin'],
          note: '**地下鉄では日本で唯一の環状運転**。右回りと左回りがあり、「右回り」「左回り」で案内される。' },
        { id: 'sakuradori', name: '地下鉄 桜通線', color: '#c80063',
          via: ['nagoya', 'marunouchi', 'hisayaodori', 'imaike'],
          note: '東山線の混雑を分ける目的で作られた。名古屋駅から東山線と並んで東へ向かう。' },
      ],
      quizPool: ['higashiyama', 'meijo', 'sakuradori'],
      facts: '名城線は**地下鉄で唯一の環状運転**をする路線で、山手線や大阪環状線と同じように回り続ける。'
        + '名古屋駅と栄が街の二つの核で、その間を東山線と桜通線が結んでいる。',
    },
  ],
};
