'use strict';
/* 都市の路線図（全駅）。

   stations … 駅。x と y を持つ駅が「節」で、線の形を決める。
              座標のない駅は、前後の節のあいだに均等に置かれる（app.js が計算する）。
   lines.all … その路線の**全駅を順に並べたもの**。線はこの並びのうち座標を持つ駅を結んで描く。

   こうしておくと、駅を足すときに座標を考えなくてよい。節は、終点・乗換駅・
   線の向きが変わるところにだけ置いてある。

   **実際の地図ではなく、骨格をつかむための図である。**
   載せているのは各都市の主要な路線だけで、私鉄やJRの他線は省いている。
   駅の間隔と位置関係は簡略化してあり、正確な路線図は各鉄道会社のものを見てほしい。

   min（路線の端から端まで）と times（主要区間）は乗車時間の目安で、
   乗り換えの歩きや待ち時間は含まない。times は [路線id, 出発駅id, 到着駅id, 分, 補足]。

   color は各社が使っている色に寄せてある。色そのものが覚える手がかりになるため。
*/

window.MAP_RAIL = {
  source: 'このアプリのための書き下ろし。載せているのは主要路線のみで、位置関係は簡略化してある。',
  cities: [
    // =========================================================
    {
      id: 'tokyo', name: '東京', emoji: '🗼',
      lead: '**山手線の環**を頭に入れるのが先。環のどこに何があるかが分かると、ほかの路線は「環のどこに刺さるか」で覚えられる。',
      view: [400, 430],
      stations: {
        // --- 節（座標を持つ駅）---
        tokyo: { name: '東京', x: 300, y: 222 },
        ueno: { name: '上野', x: 276, y: 104 },
        tabata: { name: '田端', x: 232, y: 72 },
        ikebukuro: { name: '池袋', x: 150, y: 62 },
        shinjuku: { name: '新宿', x: 108, y: 222 },
        shibuya: { name: '渋谷', x: 130, y: 330 },
        shinagawa: { name: '品川', x: 244, y: 348 },
        shimbashi: { name: '新橋', x: 288, y: 278 },
        akihabara: { name: '秋葉原', x: 294, y: 162 },
        ochanomizu: { name: '御茶ノ水', x: 234, y: 184 },
        yotsuya: { name: '四ツ谷', x: 170, y: 216 },
        asakusa: { name: '浅草', x: 356, y: 64 },
        nihombashi: { name: '日本橋', x: 338, y: 210 },
        ginza: { name: '銀座', x: 320, y: 250 },
        akasaka: { name: '赤坂見附', x: 204, y: 282 },
        omotesando: { name: '表参道', x: 160, y: 310 },
        korakuen: { name: '後楽園', x: 210, y: 126 },
        kasumigaseki: { name: '霞ケ関', x: 258, y: 278 },
        kanda: { name: '神田', x: 300, y: 192 },
        // --- 節でない駅（名前だけ）---
        okachimachi: { name: '御徒町' }, uguisudani: { name: '鶯谷' },
        nippori: { name: '日暮里' }, nishinippori: { name: '西日暮里' }, komagome: { name: '駒込' },
        sugamo: { name: '巣鴨' }, otsuka: { name: '大塚' }, mejiro: { name: '目白' },
        takadanobaba: { name: '高田馬場' }, shinokubo: { name: '新大久保' }, yoyogi: { name: '代々木' },
        harajuku: { name: '原宿' }, ebisu: { name: '恵比寿' }, meguro: { name: '目黒' },
        gotanda: { name: '五反田' }, osaki: { name: '大崎' }, takanawa: { name: '高輪ゲートウェイ' },
        tamachi: { name: '田町' }, hamamatsucho: { name: '浜松町' }, yurakucho: { name: '有楽町' },
        gaienmae: { name: '外苑前' }, aoyama1: { name: '青山一丁目' }, tameike: { name: '溜池山王' },
        toranomon: { name: '虎ノ門' }, kyobashi: { name: '京橋' }, mitsukoshimae: { name: '三越前' },
        suehirocho: { name: '末広町' }, uenohirokoji: { name: '上野広小路' },
        inaricho: { name: '稲荷町' }, tawaramachi: { name: '田原町' },
        shinotsuka: { name: '新大塚' }, myogadani: { name: '茗荷谷' }, hongo3: { name: '本郷三丁目' },
        awajicho: { name: '淡路町' }, otemachi: { name: '大手町' },
        kokkai: { name: '国会議事堂前' }, yotsuya3: { name: '四谷三丁目' },
        shinjukugyoen: { name: '新宿御苑前' }, shinjuku3: { name: '新宿三丁目' },
      },
      lines: [
        { id: 'yamanote', name: 'JR山手線', color: '#9acd32', loop: true, min: 60,
          all: ['tokyo', 'kanda', 'akihabara', 'okachimachi', 'ueno', 'uguisudani', 'nippori',
            'nishinippori', 'tabata', 'komagome', 'sugamo', 'otsuka', 'ikebukuro', 'mejiro',
            'takadanobaba', 'shinokubo', 'shinjuku', 'yoyogi', 'harajuku', 'shibuya', 'ebisu',
            'meguro', 'gotanda', 'osaki', 'shinagawa', 'takanawa', 'tamachi', 'hamamatsucho',
            'shimbashi', 'yurakucho'],
          note: '**環状運転をする**。1周34.5km・全30駅で約60分。東京の主要なターミナルをつないでいて、'
            + 'ほかの路線はたいていこの環のどこかに接続する。' },
        { id: 'chuo', name: 'JR中央線（快速）', color: '#f15a22', min: 14,
          all: ['shinjuku', 'yotsuya', 'ochanomizu', 'kanda', 'tokyo'],
          note: '環を**東西に横切る**。新宿と東京を最短で結ぶので、山手線で遠回りするより速い。'
            + '快速なので停まる駅が少ない（各駅停車は中野・三鷹方面へ別に走る）。' },
        { id: 'ginza', name: '地下鉄 銀座線', color: '#ff9500', min: 32,
          all: ['shibuya', 'omotesando', 'gaienmae', 'aoyama1', 'akasaka', 'tameike', 'toranomon',
            'shimbashi', 'ginza', 'kyobashi', 'nihombashi', 'mitsukoshimae', 'kanda', 'suehirocho',
            'uenohirokoji', 'ueno', 'inaricho', 'tawaramachi', 'asakusa'],
          note: '**日本初の地下鉄**（1927年、上野—浅草）。全19駅。渋谷から浅草まで、'
            + '環の内側を南西から北東へ斜めに貫く。' },
        { id: 'marunouchi', name: '地下鉄 丸ノ内線', color: '#e60012', min: 32,
          all: ['ikebukuro', 'shinotsuka', 'myogadani', 'korakuen', 'hongo3', 'ochanomizu',
            'awajicho', 'otemachi', 'tokyo', 'ginza', 'kasumigaseki', 'kokkai', 'akasaka',
            'yotsuya', 'yotsuya3', 'shinjukugyoen', 'shinjuku3', 'shinjuku'],
          note: '池袋から東京・銀座を通って新宿へ戻る**U字**。環の内側を大きく回るので、'
            + '地図で見ると遠回りに見える。ここでは池袋—新宿の区間を描いている（実際は荻窪まで）。' },
      ],
      times: [
        ['yamanote', 'ikebukuro', 'ikebukuro', 60, ''],
        ['chuo', 'shinjuku', 'tokyo', 14, '快速'],
        ['yamanote', 'shinjuku', 'shibuya', 7, ''],
        ['yamanote', 'tokyo', 'shinagawa', 12, ''],
        ['ginza', 'shibuya', 'asakusa', 32, '全線'],
        ['marunouchi', 'ikebukuro', 'tokyo', 17, ''],
      ],
      facts: '山手線の環の中に、政治（霞ケ関）・経済（丸の内）・商業（銀座・新宿・渋谷）が収まっている。'
        + '環の西側（新宿・渋谷・池袋）は私鉄のターミナル、東側（東京・上野）はJRの長距離列車の起点という違いがある。',
    },

    // =========================================================
    {
      id: 'osaka', name: '大阪', emoji: '🏯',
      lead: '**大阪環状線の環**と、南北に貫く**御堂筋線**の2本をまず覚える。梅田（キタ）と難波（ミナミ）を結ぶのが御堂筋線。',
      view: [380, 400],
      stations: {
        osaka: { name: '大阪・梅田', x: 148, y: 74 },
        kyobashi: { name: '京橋', x: 268, y: 116 },
        morinomiya: { name: '森ノ宮', x: 276, y: 196 },
        tsuruhashi: { name: '鶴橋', x: 272, y: 246 },
        tennoji: { name: '天王寺', x: 210, y: 330 },
        shinimamiya: { name: '新今宮', x: 158, y: 334 },
        bentencho: { name: '弁天町', x: 82, y: 244 },
        nishikujo: { name: '西九条', x: 88, y: 154 },
        shinosaka: { name: '新大阪', x: 148, y: 22 },
        yodoyabashi: { name: '淀屋橋', x: 164, y: 144 },
        hommachi: { name: '本町', x: 166, y: 196 },
        shinsaibashi: { name: '心斎橋', x: 168, y: 234 },
        namba: { name: '難波', x: 170, y: 274 },
        tanimachi4: { name: '谷町四丁目', x: 228, y: 196 },
        tenma: { name: '天満' }, sakuranomiya: { name: '桜ノ宮' }, osakajo: { name: '大阪城公園' },
        tamatsukuri: { name: '玉造' }, momodani: { name: '桃谷' }, teradacho: { name: '寺田町' },
        imamiya: { name: '今宮' }, ashiharabashi: { name: '芦原橋' }, taisho: { name: '大正' },
        noda: { name: '野田' }, fukushima: { name: '福島' },
        nishinakajima: { name: '西中島南方' }, nakatsu: { name: '中津' },
        daikokucho: { name: '大国町' }, dobutsuen: { name: '動物園前' },
        kujo: { name: '九条' }, awaza: { name: '阿波座' }, sakaisuji: { name: '堺筋本町' },
      },
      lines: [
        { id: 'loop', name: 'JR大阪環状線', color: '#f8b500', loop: true, min: 40,
          all: ['osaka', 'tenma', 'sakuranomiya', 'kyobashi', 'osakajo', 'morinomiya', 'tamatsukuri',
            'tsuruhashi', 'momodani', 'teradacho', 'tennoji', 'shinimamiya', 'imamiya',
            'ashiharabashi', 'taisho', 'bentencho', 'nishikujo', 'noda', 'fukushima'],
          note: '**環状運転をする**。1周21.7km・全19駅で約40分。山手線より小さく、'
            + '環の中に大阪の中心部が収まっている。' },
        { id: 'midosuji', name: '地下鉄 御堂筋線', color: '#e5171f', min: 20,
          all: ['shinosaka', 'nishinakajima', 'nakatsu', 'osaka', 'yodoyabashi', 'hommachi',
            'shinsaibashi', 'namba', 'daikokucho', 'dobutsuen', 'tennoji'],
          note: '大阪の**大動脈**。新大阪・梅田（キタ）・心斎橋・難波（ミナミ）・天王寺を一直線に結ぶ。'
            + '迷ったらこの線。ここでは新大阪—天王寺の区間を描いている（実際は江坂—なかもず）。' },
        { id: 'chuo', name: '地下鉄 中央線', color: '#019a66', min: 11,
          all: ['bentencho', 'kujo', 'awaza', 'hommachi', 'sakaisuji', 'tanimachi4', 'morinomiya'],
          note: '環の中を**東西に横切る**。御堂筋線とは本町で交わる。' },
      ],
      times: [
        ['loop', 'osaka', 'osaka', 40, ''],
        ['midosuji', 'osaka', 'namba', 8, ''],
        ['midosuji', 'shinosaka', 'osaka', 4, ''],
        ['midosuji', 'osaka', 'tennoji', 16, ''],
        ['chuo', 'bentencho', 'hommachi', 6, ''],
      ],
      facts: '大阪では北の梅田を「キタ」、南の難波を「ミナミ」と呼ぶ。この2つを結ぶのが御堂筋線で、'
        + '地上の御堂筋（道路）もほぼ同じところを通る。JR大阪駅と地下鉄梅田駅は同じ場所にあるが名前が違う。',
    },

    // =========================================================
    {
      id: 'nagoya', name: '名古屋', emoji: '🏭',
      lead: '**東山線**が東西の背骨。名古屋駅と栄をつなぐ。**名城線**は地下鉄では日本で唯一の環状運転をする路線。',
      view: [380, 340],
      stations: {
        nagoya: { name: '名古屋', x: 54, y: 186 },
        fushimi: { name: '伏見', x: 148, y: 186 },
        sakae: { name: '栄', x: 204, y: 186 },
        chikusa: { name: '千種', x: 270, y: 182 },
        imaike: { name: '今池', x: 292, y: 176 },
        hongo: { name: '本山', x: 334, y: 152 },
        hisayaodori: { name: '久屋大通', x: 204, y: 142 },
        shiyakusho: { name: '市役所', x: 196, y: 100 },
        ozone: { name: '大曽根', x: 250, y: 82 },
        yagoto: { name: '八事', x: 308, y: 236 },
        kanayama: { name: '金山', x: 194, y: 278 },
        higashibetsuin: { name: '東別院', x: 164, y: 236 },
        marunouchi: { name: '丸の内', x: 148, y: 142 },
        aratamabashi: { name: '新瑞橋', x: 266, y: 292 },
        nonami: { name: '野並', x: 300, y: 322 },
        kamejima: { name: '亀島' }, shinsakaemachi: { name: '新栄町' },
        ikeshita: { name: '池下' }, kakuozan: { name: '覚王山' },
        meijokoen: { name: '名城公園' }, heianondori: { name: '平安通' },
        nagoyadaigaku: { name: '名古屋大学' }, yagotonisseki: { name: '八事日赤' },
        mizuho: { name: '瑞穂運動場東' }, jingunishi: { name: '神宮西' }, demma: { name: '伝馬町' },
        kokusai: { name: '国際センター' }, takaoka: { name: '高岳' }, kurumamichi: { name: '車道' },
        fukiage: { name: '吹上' }, sakurayama: { name: '桜山' },
        mizuhokuyakusho: { name: '瑞穂区役所' }, myoon: { name: '妙音通' },
      },
      lines: [
        { id: 'higashiyama', name: '地下鉄 東山線', color: '#ffb100', min: 14,
          all: ['nagoya', 'kamejima', 'fushimi', 'sakae', 'shinsakaemachi', 'chikusa', 'imaike',
            'ikeshita', 'kakuozan', 'hongo'],
          note: '名古屋駅と栄を結ぶ**いちばん使う線**。名古屋で最初にできた地下鉄（1957年）。'
            + 'ここでは名古屋—本山の区間を描いている（実際は高畑—藤が丘）。' },
        { id: 'meijo', name: '地下鉄 名城線', color: '#9100a0', loop: true, min: 48,
          all: ['sakae', 'hisayaodori', 'shiyakusho', 'meijokoen', 'heianondori', 'ozone',
            'nagoyadaigaku', 'hongo', 'yagotonisseki', 'yagoto', 'mizuho', 'aratamabashi',
            'jingunishi', 'kanayama', 'demma', 'higashibetsuin'],
          note: '**地下鉄では日本で唯一の環状運転**。右回りと左回りがあり、'
            + '「右回り」「左回り」で案内される。1周約48分。' },
        { id: 'sakuradori', name: '地下鉄 桜通線', color: '#c80063', min: 11,
          all: ['nagoya', 'kokusai', 'marunouchi', 'hisayaodori', 'takaoka', 'kurumamichi',
            'imaike', 'fukiage', 'sakurayama', 'mizuhokuyakusho', 'myoon', 'aratamabashi', 'nonami'],
          note: '東山線の混雑を分ける目的で作られた。名古屋駅から東山線と並んで東へ向かい、'
            + '今池から南へ折れる。' },
      ],
      times: [
        ['higashiyama', 'nagoya', 'sakae', 5, ''],
        ['meijo', 'sakae', 'sakae', 48, ''],
        ['higashiyama', 'nagoya', 'chikusa', 9, ''],
        ['meijo', 'sakae', 'kanayama', 8, ''],
      ],
      facts: '名城線は**地下鉄で唯一の環状運転**をする路線で、山手線や大阪環状線と同じように回り続ける。'
        + '名古屋駅と栄が街の二つの核で、その間を東山線と桜通線が結んでいる。',
    },

    // =========================================================
    {
      id: 'fukuoka', name: '福岡', emoji: '🏮',
      lead: '**空港が街のすぐ隣にある。** 福岡空港から博多まで地下鉄で2駅、約5分。これだけ近い大都市は世界でもめずらしい。',
      view: [380, 310],
      stations: {
        airport: { name: '福岡空港', x: 344, y: 100 },
        hakata: { name: '博多', x: 248, y: 124 },
        nakasu: { name: '中洲川端', x: 164, y: 102 },
        tenjin: { name: '天神', x: 120, y: 102 },
        ohori: { name: '大濠公園', x: 72, y: 116 },
        meinohama: { name: '姪浜', x: 24, y: 136 },
        gofukumachi: { name: '呉服町', x: 178, y: 60 },
        kaizuka: { name: '貝塚', x: 210, y: 22 },
        kushida: { name: '櫛田神社前', x: 194, y: 170 },
        tenjinminami: { name: '天神南', x: 128, y: 168 },
        yakuin: { name: '薬院', x: 114, y: 208 },
        ropponmatsu: { name: '六本松', x: 66, y: 230 },
        hashimoto: { name: '橋本', x: 20, y: 264 },
        higashihie: { name: '東比恵' }, gion: { name: '祇園' }, akasaka: { name: '赤坂' },
        tojinmachi: { name: '唐人町' }, nishijin: { name: '西新' }, fujisaki: { name: '藤崎' },
        murosomi: { name: '室見' },
        chiyokencho: { name: '千代県庁口' }, maidashi: { name: '馬出九大病院前' },
        hakozakimiya: { name: '箱崎宮前' }, hakozakikyudai: { name: '箱崎九大前' },
        watanabe: { name: '渡辺通' }, yakuinodori: { name: '薬院大通' },
        sakurazaka: { name: '桜坂' }, befu: { name: '別府' }, chayama: { name: '茶山' },
        kanaguro: { name: '金山' }, nanakumaeki: { name: '七隈' }, fukudaimae: { name: '福大前' },
        umebayashi: { name: '梅林' }, noke: { name: '野芥' }, kamo: { name: '賀茂' },
        jiromaru: { name: '次郎丸' },
      },
      lines: [
        { id: 'kuko', name: '地下鉄 空港線', color: '#f08300', min: 23,
          all: ['airport', 'higashihie', 'hakata', 'gion', 'nakasu', 'tenjin', 'akasaka', 'ohori',
            'tojinmachi', 'nishijin', 'fujisaki', 'murosomi', 'meinohama'],
          note: '**福岡空港と博多・天神を結ぶ**。空港から博多まで約5分、天神まで約11分。'
            + '街の中心に空港が近いことが、福岡の大きな特徴になっている。' },
        { id: 'hakozaki', name: '地下鉄 箱崎線', color: '#0097d9', min: 8,
          all: ['nakasu', 'gofukumachi', 'chiyokencho', 'maidashi', 'hakozakimiya',
            'hakozakikyudai', 'kaizuka'],
          note: '中洲川端から北東へ伸びる短い線。空港線と中洲川端で接続し、直通運転もしている。' },
        { id: 'nanakuma', name: '地下鉄 七隈線', color: '#00a73c', min: 24,
          all: ['hakata', 'kushida', 'tenjinminami', 'watanabe', 'yakuin', 'yakuinodori',
            'sakurazaka', 'ropponmatsu', 'befu', 'chayama', 'kanaguro', 'nanakumaeki', 'fukudaimae',
            'umebayashi', 'noke', 'kamo', 'jiromaru', 'hashimoto'],
          note: '**2023年に博多まで延伸した**。それまでは天神南止まりで博多へ直接行けず、'
            + '乗り換えが要ることが不便とされていた。' },
      ],
      times: [
        ['kuko', 'airport', 'hakata', 5, ''],
        ['kuko', 'airport', 'tenjin', 11, ''],
        ['kuko', 'hakata', 'tenjin', 5, ''],
        ['nanakuma', 'hakata', 'tenjinminami', 4, '2023年の延伸でできた'],
      ],
      facts: '博多と天神が街の二つの核で、その間は地下鉄で2駅。**「博多」はJRの駅名、「天神」は繁華街の名**で、'
        + '同じ市内の別の場所である。天神と天神南は乗り換えに地下通路を歩く別の駅なので、間違えやすい。',
    },

    // =========================================================
    {
      id: 'sapporo', name: '札幌', emoji: '❄️',
      lead: '**3本の地下鉄がすべて大通で交わる。** 大通を中心に、南北・東西・東豊が放射状に伸びる分かりやすい形。',
      view: [380, 350],
      stations: {
        asabu: { name: '麻生', x: 174, y: 22 },
        sapporo: { name: 'さっぽろ', x: 182, y: 116 },
        odori: { name: '大通', x: 182, y: 166 },
        susukino: { name: 'すすきの', x: 164, y: 206 },
        makomanai: { name: '真駒内', x: 144, y: 322 },
        miyanosawa: { name: '宮の沢', x: 22, y: 166 },
        kotoni: { name: '琴似', x: 72, y: 166 },
        maruyama: { name: '円山公園', x: 124, y: 166 },
        buscenter: { name: 'バスセンター前', x: 246, y: 166 },
        shinsapporo: { name: '新さっぽろ', x: 358, y: 166 },
        sakaemachi: { name: '栄町', x: 248, y: 22 },
        hosui: { name: '豊水すすきの', x: 212, y: 206 },
        fukuzumi: { name: '福住', x: 268, y: 322 },
        kita34: { name: '北34条' }, kita24: { name: '北24条' }, kita18: { name: '北18条' },
        kita12: { name: '北12条' }, nakajima: { name: '中島公園' }, horohira: { name: '幌平橋' },
        nakanoshima: { name: '中の島' }, hiragishi: { name: '平岸' }, minamihiragishi: { name: '南平岸' },
        sumikawa: { name: '澄川' }, jieitai: { name: '自衛隊前' },
        hassamu: { name: '発寒南' }, nijuyonken: { name: '二十四軒' }, nishi28: { name: '西28丁目' },
        nishi18: { name: '西18丁目' }, nishi11: { name: '西11丁目' },
        kikusui: { name: '菊水' }, higashisapporo: { name: '東札幌' }, shiroishi: { name: '白石' },
        nango7: { name: '南郷7丁目' }, nango13: { name: '南郷13丁目' }, nango18: { name: '南郷18丁目' },
        oyachi: { name: '大谷地' }, hibarigaoka: { name: 'ひばりが丘' },
        shindoHigashi: { name: '新道東' }, motomachi: { name: '元町' }, kanjodori: { name: '環状通東' },
        higashikuyakusho: { name: '東区役所前' }, kita13: { name: '北13条東' },
        gakuenmae: { name: '学園前' }, toyohira: { name: '豊平公園' }, misono: { name: '美園' },
        tsukisamu: { name: '月寒中央' },
      },
      lines: [
        { id: 'namboku', name: '地下鉄 南北線', color: '#00a040', min: 28,
          all: ['asabu', 'kita34', 'kita24', 'kita18', 'kita12', 'sapporo', 'odori', 'susukino',
            'nakajima', 'horohira', 'nakanoshima', 'hiragishi', 'minamihiragishi', 'sumikawa',
            'jieitai', 'makomanai'],
          note: '**札幌で最初の地下鉄**（1971年、札幌オリンピックの前年）。全16駅。'
            + 'ゴムタイヤで走る案内軌条式で、雪の多い土地に合わせた作りになっている。' },
        { id: 'tozai', name: '地下鉄 東西線', color: '#f39800', min: 33,
          all: ['miyanosawa', 'hassamu', 'kotoni', 'nijuyonken', 'nishi28', 'maruyama', 'nishi18',
            'nishi11', 'odori', 'buscenter', 'kikusui', 'higashisapporo', 'shiroishi',
            'nango7', 'nango13', 'nango18', 'oyachi', 'hibarigaoka', 'shinsapporo'],
          note: '街を**東西に貫く**いちばん長い線。全19駅。大通で南北線と東豊線に乗り換えられる。' },
        { id: 'toho', name: '地下鉄 東豊線', color: '#0092d2', min: 31,
          all: ['sakaemachi', 'shindoHigashi', 'motomachi', 'kanjodori', 'higashikuyakusho',
            'kita13', 'sapporo', 'odori', 'hosui', 'gakuenmae', 'toyohira', 'misono',
            'tsukisamu', 'fukuzumi'],
          note: '3本のうち最も新しい（1988年）。南北線と並んで走る区間があり、'
            + 'さっぽろ・大通の2駅で接続する。' },
      ],
      times: [
        ['namboku', 'sapporo', 'odori', 1, '隣の駅'],
        ['namboku', 'odori', 'susukino', 1, '隣の駅'],
        ['namboku', 'sapporo', 'makomanai', 19, ''],
        ['tozai', 'odori', 'shinsapporo', 19, ''],
      ],
      facts: '**「さっぽろ」（地下鉄）と「札幌」（JR）は表記が違う**が同じ場所にある。'
        + 'すすきのと豊水すすきのも別の駅で、歩いて移動する。'
        + '札幌の地下鉄は3本ともゴムタイヤ式で、鉄のレールの上を走らない。雪と寒さへの備えである。',
    },

    // =========================================================
    {
      id: 'kyoto', name: '京都', emoji: '⛩',
      lead: '**地下鉄は2本だけ**で、烏丸御池で十字に交わる。碁盤の目の街なので「南北＝烏丸線、東西＝東西線」で覚えられる。',
      view: [380, 330],
      stations: {
        kokusai: { name: '国際会館', x: 190, y: 22 },
        kitaoji: { name: '北大路', x: 188, y: 82 },
        imadegawa: { name: '今出川', x: 186, y: 120 },
        karasuma: { name: '烏丸御池', x: 184, y: 162 },
        shijo: { name: '四条', x: 182, y: 208 },
        kyoto: { name: '京都', x: 180, y: 254 },
        takeda: { name: '竹田', x: 178, y: 306 },
        uzumasa: { name: '太秦天神川', x: 26, y: 162 },
        nijo: { name: '二条', x: 104, y: 162 },
        sanjo: { name: '三条京阪', x: 252, y: 162 },
        yamashina: { name: '山科', x: 324, y: 174 },
        rokujizo: { name: '六地蔵', x: 354, y: 254 },
        matsugasaki: { name: '松ケ崎' }, kuramaguchi: { name: '鞍馬口' },
        marutamachi: { name: '丸太町' }, gojo: { name: '五条' }, kujo: { name: '九条' },
        jujo: { name: '十条' }, kuinabashi: { name: 'くいな橋' },
        nishioji: { name: '西大路御池' }, nijojomae: { name: '二条城前' },
        shiyakusho: { name: '京都市役所前' }, higashiyama: { name: '東山' },
        keage: { name: '蹴上' }, misasagi: { name: '御陵' },
        higashino: { name: '東野' }, nagitsuji: { name: '椥辻' }, ono: { name: '小野' },
        daigo: { name: '醍醐' }, ishida: { name: '石田' },
      },
      lines: [
        { id: 'karasuma', name: '地下鉄 烏丸線', color: '#009944', min: 27,
          all: ['kokusai', 'matsugasaki', 'kitaoji', 'kuramaguchi', 'imadegawa', 'marutamachi',
            'karasuma', 'shijo', 'gojo', 'kyoto', 'kujo', 'jujo', 'kuinabashi', 'takeda'],
          note: '**南北に貫く**線。全15駅（北山を除く）。京都駅と四条（繁華街）、'
            + '今出川（大学の多い一帯）を結ぶ。竹田から近鉄に乗り入れて奈良方面へ直通する。' },
        { id: 'tozai', name: '地下鉄 東西線', color: '#ea5532', min: 29,
          all: ['uzumasa', 'nishioji', 'nijo', 'nijojomae', 'karasuma', 'shiyakusho', 'sanjo',
            'higashiyama', 'keage', 'misasagi', 'yamashina', 'higashino', 'nagitsuji', 'ono',
            'daigo', 'ishida', 'rokujizo'],
          note: '**東西に貫く**線。烏丸御池で烏丸線と交わり、三条京阪で京阪、山科でJRに接続する。' },
      ],
      times: [
        ['karasuma', 'kyoto', 'shijo', 2, '隣の駅'],
        ['karasuma', 'kyoto', 'karasuma', 4, ''],
        ['karasuma', 'kyoto', 'kokusai', 20, ''],
        ['tozai', 'karasuma', 'sanjo', 3, ''],
      ],
      facts: '**京都の地下鉄は2本だけで、観光地の多くは駅から離れている。** 清水寺も金閣寺も最寄りの地下鉄駅がなく、'
        + '市バスが移動の主役になる。碁盤の目の街なので、通りの名前（烏丸・四条・御池）がそのまま駅名になっているものが多く、'
        + '地図と駅名が対応して覚えやすい。',
    },
  ],
};
