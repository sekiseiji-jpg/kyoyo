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

    // =========================================================
    {
      id: 'fukuoka', name: '福岡', emoji: '🏮',
      lead: '**空港が街のすぐ隣にある。** 福岡空港から博多まで地下鉄で2駅、約5分。これだけ近い大都市は世界でもめずらしい。',
      view: [380, 300],
      stations: {
        airport: { name: '福岡空港', x: 334, y: 96 },
        hakata: { name: '博多', x: 246, y: 120 },
        gion: { name: '祇園', x: 214, y: 112 },
        nakasu: { name: '中洲川端', x: 170, y: 100 },
        tenjin: { name: '天神', x: 126, y: 100 },
        ohori: { name: '大濠公園', x: 78, y: 112 },
        meinohama: { name: '姪浜', x: 32, y: 128 },
        gofukumachi: { name: '呉服町', x: 184, y: 62 },
        kaizuka: { name: '貝塚', x: 212, y: 28 },
        kushida: { name: '櫛田神社前', x: 196, y: 162 },
        tenjinminami: { name: '天神南', x: 134, y: 160 },
        yakuin: { name: '薬院', x: 120, y: 200 },
        ropponmatsu: { name: '六本松', x: 72, y: 222 },
        hashimoto: { name: '橋本', x: 26, y: 250 },
      },
      lines: [
        { id: 'kuko', name: '地下鉄 空港線', color: '#f08300',
          via: ['airport', 'hakata', 'gion', 'nakasu', 'tenjin', 'ohori', 'meinohama'],
          note: '**福岡空港と博多・天神を結ぶ**。空港から博多まで約5分、天神まで約11分。'
            + '街の中心に空港が近いことが、福岡の大きな特徴になっている。' },
        { id: 'hakozaki', name: '地下鉄 箱崎線', color: '#0097d9',
          via: ['nakasu', 'gofukumachi', 'kaizuka'],
          note: '中洲川端から北東へ伸びる短い線。空港線と中洲川端で接続し、直通運転もしている。' },
        { id: 'nanakuma', name: '地下鉄 七隈線', color: '#00a73c',
          via: ['hakata', 'kushida', 'tenjinminami', 'yakuin', 'ropponmatsu', 'hashimoto'],
          note: '**2023年に博多まで延伸した**。それまでは天神南止まりで博多へ直接行けず、'
            + '乗り換えが要ることが不便とされていた。' },
      ],
      quizPool: ['kuko', 'hakozaki', 'nanakuma'],
      facts: '博多と天神が街の二つの核で、その間は地下鉄で2駅。**「博多」はJRの駅名、「天神」は繁華街の名**で、'
        + '同じ市内の別の場所である。天神と天神南は乗り換えに地下通路を歩く別の駅なので、間違えやすい。',
    },

    // =========================================================
    {
      id: 'sapporo', name: '札幌', emoji: '❄️',
      lead: '**3本の地下鉄がすべて大通で交わる。** 大通を中心に、南北・東西・東豊が放射状に伸びる分かりやすい形。',
      view: [380, 330],
      stations: {
        asabu: { name: '麻生', x: 180, y: 28 },
        sapporo: { name: 'さっぽろ', x: 186, y: 110 },
        odori: { name: '大通', x: 186, y: 160 },
        susukino: { name: 'すすきの', x: 168, y: 200 },
        makomanai: { name: '真駒内', x: 150, y: 300 },
        miyanosawa: { name: '宮の沢', x: 28, y: 160 },
        kotoni: { name: '琴似', x: 76, y: 160 },
        maruyama: { name: '円山公園', x: 126, y: 160 },
        buscenter: { name: 'バスセンター前', x: 252, y: 160 },
        shinsapporo: { name: '新さっぽろ', x: 350, y: 160 },
        sakaemachi: { name: '栄町', x: 250, y: 28 },
        hosui: { name: '豊水すすきの', x: 216, y: 200 },
        fukuzumi: { name: '福住', x: 268, y: 300 },
      },
      lines: [
        { id: 'namboku', name: '地下鉄 南北線', color: '#00a040',
          via: ['asabu', 'sapporo', 'odori', 'susukino', 'makomanai'],
          note: '**札幌で最初の地下鉄**（1971年、札幌オリンピックの前年）。'
            + 'ゴムタイヤで走る案内軌条式で、雪の多い土地に合わせた作りになっている。' },
        { id: 'tozai', name: '地下鉄 東西線', color: '#f39800',
          via: ['miyanosawa', 'kotoni', 'maruyama', 'odori', 'buscenter', 'shinsapporo'],
          note: '街を**東西に貫く**いちばん長い線。大通で南北線と東豊線に乗り換えられる。' },
        { id: 'toho', name: '地下鉄 東豊線', color: '#0092d2',
          via: ['sakaemachi', 'sapporo', 'odori', 'hosui', 'fukuzumi'],
          note: '3本のうち最も新しい（1988年）。南北線と並んで走る区間があり、'
            + 'さっぽろ・大通の2駅で接続する。' },
      ],
      quizPool: ['namboku', 'tozai', 'toho'],
      facts: '**「さっぽろ」（地下鉄）と「札幌」（JR）は表記が違う**が同じ場所にある。'
        + 'すすきのと豊水すすきのも別の駅で、歩いて移動する。'
        + '札幌の地下鉄は3本ともゴムタイヤ式で、鉄のレールの上を走らない。雪と寒さへの備えである。',
    },

    // =========================================================
    {
      id: 'kyoto', name: '京都', emoji: '⛩',
      lead: '**地下鉄は2本だけ**で、烏丸御池で十字に交わる。碁盤の目の街なので「南北＝烏丸線、東西＝東西線」で覚えられる。',
      view: [380, 300],
      stations: {
        kokusai: { name: '国際会館', x: 196, y: 24 },
        kitaoji: { name: '北大路', x: 190, y: 72 },
        imadegawa: { name: '今出川', x: 188, y: 110 },
        karasuma: { name: '烏丸御池', x: 186, y: 150 },
        shijo: { name: '四条', x: 184, y: 196 },
        kyoto: { name: '京都', x: 182, y: 240 },
        takeda: { name: '竹田', x: 180, y: 284 },
        uzumasa: { name: '太秦天神川', x: 34, y: 150 },
        nijo: { name: '二条', x: 110, y: 150 },
        sanjo: { name: '三条京阪', x: 250, y: 150 },
        yamashina: { name: '山科', x: 316, y: 164 },
        rokujizo: { name: '六地蔵', x: 348, y: 240 },
      },
      lines: [
        { id: 'karasuma', name: '地下鉄 烏丸線', color: '#009944',
          via: ['kokusai', 'kitaoji', 'imadegawa', 'karasuma', 'shijo', 'kyoto', 'takeda'],
          note: '**南北に貫く**線。京都駅と四条（繁華街）、今出川（大学の多い一帯）を結ぶ。'
            + '竹田から近鉄に乗り入れて奈良方面へ直通する。' },
        { id: 'tozai', name: '地下鉄 東西線', color: '#ea5532',
          via: ['uzumasa', 'nijo', 'karasuma', 'sanjo', 'yamashina', 'rokujizo'],
          note: '**東西に貫く**線。烏丸御池で烏丸線と交わり、三条京阪で京阪、山科でJRに接続する。' },
      ],
      quizPool: ['karasuma', 'tozai'],
      facts: '**京都の地下鉄は2本だけで、観光地の多くは駅から離れている。** 清水寺も金閣寺も最寄りの地下鉄駅がなく、'
        + '市バスが移動の主役になる。碁盤の目の街なので、通りの名前（烏丸・四条・御池）がそのまま駅名になっているものが多く、'
        + '地図と駅名が対応して覚えやすい。',
    },
  ],
};
