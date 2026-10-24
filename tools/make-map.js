'use strict';
/*
  地図コーナー（map/）のデータを作る。

    node tools/make-map.js <admin1.geojson> <world.geojson> <places.geojson>

  入力は Natural Earth の GeoJSON 3本（パブリックダブリック・ドメイン。配布条件なし）。
    ne_10m_admin_1_states_provinces  都道府県の形
    ne_50m_admin_0_countries         国の形
    ne_50m_populated_places          首都の位置と名前

  出力  map/data-jp.js      47都道府県
        map/data-world.js   国と首都

  入力は大きい（admin-1 は約40MB）ので配らない。生成した2本だけを公開する。
  形を簡略化しているので、正確な国境を示すものではない。位置関係を覚えるための図である。
*/
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const [, , SRC_JP, SRC_WORLD, SRC_PLACES] = process.argv;
if (!SRC_JP || !SRC_WORLD || !SRC_PLACES) {
  console.error('使い方: node tools/make-map.js <admin1.geojson> <world.geojson> <places.geojson>');
  process.exit(1);
}

// ---------- 都道府県の読みと県庁所在地と地方区分（Natural Earth に無いので手で持つ） ----------
// 地方は学校で習う8区分。沖縄県は九州に含めている。
const JP_META = {
  'JP-01': ['ほっかいどう', '札幌市', '北海道'],
  'JP-02': ['あおもり', '青森市', '東北'],
  'JP-03': ['いわて', '盛岡市', '東北'],
  'JP-04': ['みやぎ', '仙台市', '東北'],
  'JP-05': ['あきた', '秋田市', '東北'],
  'JP-06': ['やまがた', '山形市', '東北'],
  'JP-07': ['ふくしま', '福島市', '東北'],
  'JP-08': ['いばらき', '水戸市', '関東'],
  'JP-09': ['とちぎ', '宇都宮市', '関東'],
  'JP-10': ['ぐんま', '前橋市', '関東'],
  'JP-11': ['さいたま', 'さいたま市', '関東'],
  'JP-12': ['ちば', '千葉市', '関東'],
  'JP-13': ['とうきょう', '東京（新宿区）', '関東'],
  'JP-14': ['かながわ', '横浜市', '関東'],
  'JP-15': ['にいがた', '新潟市', '中部'],
  'JP-16': ['とやま', '富山市', '中部'],
  'JP-17': ['いしかわ', '金沢市', '中部'],
  'JP-18': ['ふくい', '福井市', '中部'],
  'JP-19': ['やまなし', '甲府市', '中部'],
  'JP-20': ['ながの', '長野市', '中部'],
  'JP-21': ['ぎふ', '岐阜市', '中部'],
  'JP-22': ['しずおか', '静岡市', '中部'],
  'JP-23': ['あいち', '名古屋市', '中部'],
  'JP-24': ['みえ', '津市', '近畿'],
  'JP-25': ['しが', '大津市', '近畿'],
  'JP-26': ['きょうと', '京都市', '近畿'],
  'JP-27': ['おおさか', '大阪市', '近畿'],
  'JP-28': ['ひょうご', '神戸市', '近畿'],
  'JP-29': ['なら', '奈良市', '近畿'],
  'JP-30': ['わかやま', '和歌山市', '近畿'],
  'JP-31': ['とっとり', '鳥取市', '中国'],
  'JP-32': ['しまね', '松江市', '中国'],
  'JP-33': ['おかやま', '岡山市', '中国'],
  'JP-34': ['ひろしま', '広島市', '中国'],
  'JP-35': ['やまぐち', '山口市', '中国'],
  'JP-36': ['とくしま', '徳島市', '四国'],
  'JP-37': ['かがわ', '高松市', '四国'],
  'JP-38': ['えひめ', '松山市', '四国'],
  'JP-39': ['こうち', '高知市', '四国'],
  'JP-40': ['ふくおか', '福岡市', '九州'],
  'JP-41': ['さが', '佐賀市', '九州'],
  'JP-42': ['ながさき', '長崎市', '九州'],
  'JP-43': ['くまもと', '熊本市', '九州'],
  'JP-44': ['おおいた', '大分市', '九州'],
  'JP-45': ['みやざき', '宮崎市', '九州'],
  'JP-46': ['かごしま', '鹿児島市', '九州'],
  'JP-47': ['おきなわ', '那覇市', '九州'],
};

// ---------- 都道府県の人口・面積・郷土料理・名所（Natural Earth に無いので手で持つ） ----------
// 人口は2020年国勢調査の万人、面積は2023年全国都道府県市区町村別面積調の km2（どちらも概数）。
// 覚えてほしいのは桁と順位なので、細かい値より並びが分かることを優先している。
const JP_INFO = {
  'JP-01': [522.5, 83424, 'ジンギスカン・石狩鍋・ザンギ', '函館山の夜景・知床・富良野のラベンダー'],
  'JP-02': [123.8, 9646, 'せんべい汁・いちご煮・けの汁', 'ねぶた祭・奥入瀬渓流・三内丸山遺跡'],
  'JP-03': [121.1, 15275, 'わんこそば・盛岡冷麺・ひっつみ', '中尊寺金色堂・龍泉洞・浄土ヶ浜'],
  'JP-04': [230.2, 7282, '牛たん焼き・ずんだ餅・はらこ飯', '松島・仙台七夕まつり・瑞鳳殿'],
  'JP-05': [96.0, 11638, 'きりたんぽ鍋・稲庭うどん・しょっつる鍋', '竿燈まつり・角館の武家屋敷・田沢湖'],
  'JP-06': [106.8, 9323, '芋煮・どんがら汁・玉こんにゃく', '立石寺（山寺）・蔵王の樹氷・銀山温泉'],
  'JP-07': [183.3, 13784, 'こづゆ・いかにんじん・喜多方ラーメン', '鶴ヶ城・大内宿・五色沼'],
  'JP-08': [286.7, 6097, 'あんこう鍋・そぼろ納豆・けんちん汁', '偕楽園・筑波山・国営ひたち海浜公園'],
  'JP-09': [193.3, 6408, 'しもつかれ・宇都宮餃子・ちたけそば', '日光東照宮・華厳の滝・那須高原'],
  'JP-10': [193.9, 6362, 'おっきりこみ・焼きまんじゅう・こんにゃく料理', '富岡製糸場・草津温泉・尾瀬'],
  'JP-11': [734.5, 3798, '冷汁うどん・いが饅頭・みそポテト', '川越の蔵造りの町並み・秩父夜祭・長瀞'],
  'JP-12': [628.4, 5157, 'なめろう・太巻き祭りずし・はかりめ丼', '成田山新勝寺・鋸山・九十九里浜'],
  'JP-13': [1404.8, 2194, '深川めし・もんじゃ焼き・くさや', '浅草寺・東京スカイツリー・皇居'],
  'JP-14': [923.7, 2416, 'けんちん汁・シウマイ・へらへら団子', '鎌倉の大仏・箱根・横浜中華街'],
  'JP-15': [220.1, 12584, 'のっぺ・笹寿司・わっぱ飯', '佐渡島・弥彦神社・清津峡'],
  'JP-16': [103.5, 4248, 'ますのすし・ぶり大根・白えび', '立山黒部アルペンルート・五箇山の合掌造り・雨晴海岸'],
  'JP-17': [113.3, 4186, '治部煮・かぶら寿司・能登丼', '兼六園・ひがし茶屋街・白米千枚田'],
  'JP-18': [76.7, 4191, '越前おろしそば・ソースカツ丼・へしこ', '東尋坊・永平寺・一乗谷朝倉氏遺跡'],
  'JP-19': [81.0, 4465, 'ほうとう・鳥もつ煮・吉田のうどん', '富士五湖・昇仙峡・武田神社'],
  'JP-20': [204.8, 13562, '信州そば・おやき・五平餅', '善光寺・上高地・松本城'],
  'JP-21': [197.9, 10621, '朴葉味噌・鮎料理・鶏ちゃん', '白川郷・高山の古い町並み・下呂温泉'],
  'JP-22': [363.3, 7777, '桜えびのかき揚げ・静岡おでん・わさび漬け', '富士山・三保松原・熱海'],
  'JP-23': [754.2, 5173, 'ひつまぶし・味噌煮込みうどん・手羽先', '名古屋城・熱田神宮・犬山城'],
  'JP-24': [177.0, 5774, '伊勢うどん・てこね寿司・松阪牛', '伊勢神宮・熊野古道・鳥羽水族館'],
  'JP-25': [141.4, 4017, 'ふなずし・近江牛・鴨鍋', '琵琶湖・彦根城・比叡山延暦寺'],
  'JP-26': [257.8, 4612, '京漬物・湯豆腐・にしんそば', '清水寺・金閣寺・伏見稲荷大社'],
  'JP-27': [884.2, 1905, 'たこ焼き・お好み焼き・箱寿司', '大阪城・道頓堀・住吉大社'],
  'JP-28': [546.5, 8401, '明石焼き・ぼたん鍋・いかなごのくぎ煮', '姫路城・神戸北野異人館・城崎温泉'],
  'JP-29': [132.4, 3691, '柿の葉寿司・奈良漬・三輪そうめん', '東大寺・法隆寺・吉野山'],
  'JP-30': [92.3, 4725, 'めはりずし・和歌山ラーメン・鯨料理', '高野山・熊野三山・白浜'],
  'JP-31': [55.3, 3507, 'かに料理・大山おこわ・豆腐ちくわ', '鳥取砂丘・大山・水木しげるロード'],
  'JP-32': [67.1, 6708, '出雲そば・しじみ汁・ぼてぼて茶', '出雲大社・石見銀山・松江城'],
  'JP-33': [188.8, 7115, 'ばら寿司・ままかり・ぶっかけうどん', '倉敷美観地区・岡山後楽園・鷲羽山'],
  'JP-34': [280.0, 8479, 'お好み焼き・牡蠣料理・あなご飯', '厳島神社・原爆ドーム・尾道'],
  'JP-35': [134.2, 6113, 'ふぐ料理・瓦そば・岩国寿司', '錦帯橋・秋芳洞・元乃隅神社'],
  'JP-36': [72.0, 4147, '徳島ラーメン・そば米雑炊・鳴門鯛', '鳴門の渦潮・祖谷のかずら橋・阿波踊り'],
  'JP-37': [95.0, 1877, '讃岐うどん・あんもち雑煮・しょうゆ豆', '金刀比羅宮・栗林公園・小豆島'],
  'JP-38': [133.5, 5676, '鯛めし・じゃこ天・いもたき', '道後温泉・松山城・しまなみ海道'],
  'JP-39': [69.2, 7103, 'かつおのたたき・皿鉢料理・田舎寿司', '桂浜・四万十川・高知城'],
  'JP-40': [513.5, 4988, '水炊き・もつ鍋・明太子', '太宰府天満宮・博多祇園山笠・門司港レトロ'],
  'JP-41': [81.1, 2441, 'シシリアンライス・呼子のいか・須古寿司', '吉野ヶ里遺跡・有田の窯元・唐津くんち'],
  'JP-42': [131.2, 4131, 'ちゃんぽん・卓袱料理・カステラ', 'グラバー園・軍艦島・ハウステンボス'],
  'JP-43': [173.8, 7409, '馬刺し・からしれんこん・太平燕', '熊本城・阿蘇山・天草'],
  'JP-44': [112.4, 6341, 'とり天・だんご汁・関さば', '別府温泉・湯布院・宇佐神宮'],
  'JP-45': [107.0, 7734, 'チキン南蛮・冷や汁・地鶏の炭火焼', '高千穂峡・青島・日南海岸'],
  'JP-46': [158.8, 9186, '黒豚しゃぶしゃぶ・鶏飯・さつま揚げ', '桜島・屋久島・霧島神宮'],
  'JP-47': [146.7, 2282, 'ゴーヤーチャンプルー・沖縄そば・ラフテー', '首里城・美ら海水族館・竹富島'],
};

// ---------- 主要国の名所（Natural Earth に無いので手で持つ） ----------
// 出題する110か国すべてには付けず、名前を聞いて思い浮かぶものがある国だけにしている。
const WORLD_SPOTS = {
  JP: '富士山・京都の社寺・厳島神社', CN: '万里の長城・紫禁城・兵馬俑', KR: '景福宮・済州島',
  IN: 'タージ・マハル・ガンジス川', TH: 'アユタヤ遺跡・ワット・ポー', VN: 'ハロン湾・ホイアン',
  ID: 'ボロブドゥール遺跡・バリ島', PH: 'コルディリェーラの棚田', MY: 'ペトロナスツインタワー',
  SG: 'マーライオン・ガーデンズバイザベイ', MM: 'バガン遺跡', KH: 'アンコール・ワット',
  NP: 'エベレスト・カトマンズ盆地', LK: 'シーギリヤ', MN: 'ゴビ砂漠',
  TR: 'カッパドキア・アヤソフィア', IR: 'ペルセポリス', IQ: 'バビロンの遺跡',
  IL: 'エルサレム旧市街・死海', SA: 'メッカ・マディーナ', AE: 'ブルジュ・ハリファ',
  JO: 'ペトラ遺跡', UZ: 'サマルカンド', RU: '赤の広場・エルミタージュ美術館',
  FR: 'エッフェル塔・ルーヴル美術館・モン・サン＝ミシェル', DE: 'ノイシュヴァンシュタイン城・ブランデンブルク門',
  IT: 'コロッセオ・ヴェネツィア・ピサの斜塔', ES: 'サグラダ・ファミリア・アルハンブラ宮殿',
  GB: 'ビッグベン・ストーンヘンジ・大英博物館', NL: '風車・アムステルダムの運河',
  BE: 'グランプラス', CH: 'マッターホルン・ユングフラウ', AT: 'シェーンブルン宮殿',
  GR: 'パルテノン神殿・サントリーニ島', PT: 'ベレンの塔', NO: 'フィヨルド',
  SE: 'ストックホルム旧市街', FI: 'オーロラ・サンタクロース村', IS: '間欠泉・ブルーラグーン',
  PL: 'アウシュヴィッツ・クラクフ旧市街', CZ: 'プラハ城・カレル橋', HU: 'ブダペストの夜景',
  HR: 'ドゥブロヴニク', VA: 'サン・ピエトロ大聖堂', IE: 'モハーの断崖',
  EG: 'ピラミッド・スフィンクス・ルクソール', MA: 'マラケシュ・サハラ砂漠', ZA: 'テーブルマウンテン・喜望峰',
  KE: 'マサイマラ・キリマンジャロの眺め', TZ: 'キリマンジャロ・セレンゲティ', ET: 'ラリベラの岩窟教会',
  ZW: 'ヴィクトリアの滝', TN: 'カルタゴ遺跡', MG: 'バオバブ並木',
  US: 'グランドキャニオン・自由の女神・イエローストーン', CA: 'ナイアガラの滝・カナディアンロッキー',
  MX: 'チチェン・イッツァ・テオティワカン', CU: 'ハバナ旧市街', GT: 'ティカル遺跡',
  BR: 'イグアスの滝・コルコバードのキリスト像・アマゾン', AR: 'イグアスの滝・パタゴニア',
  PE: 'マチュ・ピチュ・ナスカの地上絵', CL: 'イースター島・アタカマ砂漠', BO: 'ウユニ塩湖',
  EC: 'ガラパゴス諸島', CO: 'カルタヘナ旧市街',
  AU: 'ウルル・グレートバリアリーフ・オペラハウス', NZ: 'ミルフォードサウンド・トンガリロ',
};

// ---------- 首都が一つに決まらない国（手で持つ） ----------
// Natural Earth は「事実上の中心」を首都としていることがあり、教科書の答えと食い違う。
// また南アフリカのように首都が3つある国もある。そういう国はここで上書きする。
const CAPITAL_FIX = {
  ZA: 'プレトリア（行政）・ケープタウン（立法）・ブルームフォンテーン（司法）',
  BO: 'スクレ（憲法上）／ラパス（事実上）',
  CI: 'ヤムスクロ（多くの機関はアビジャン）',
  TZ: 'ドドマ（経済の中心はダルエスサラーム）',
  BJ: 'ポルトノボ（政府の多くはコトヌー）',
  LK: 'スリジャヤワルダナプラコッテ（経済の中心はコロンボ）',
  MM: 'ネピドー（2006年にヤンゴンから移転）',
  NL: 'アムステルダム（政府と王室はハーグ）',
  MY: 'クアラルンプール（行政はプトラジャヤ）',
  SZ: 'ムババーネ（立法はロバンバ）',
  CL: 'サンティアゴ（国会はバルパライソ）',
  IL: 'エルサレム（国際的には認められておらず、多くの国の大使館はテルアビブ）',
  // 独立国ではないが、中心都市は出しておく（クイズには出さない）
  GL: 'ヌーク（デンマークの自治領）',
  TW: '台北（中華民国の政府所在地）',
};

// ---------- 国名の表記をそろえる ----------
// Natural Earth は正式名を持つものと略称を持つものが混ざっている。
// クイズで並ぶと不自然なので、日本でふつうに使う呼び方にそろえる。
const NAME_FIX = {
  MN: 'モンゴル', TH: 'タイ', ML: 'マリ', TW: '台湾',
};

// ---------- 独立国として出題しないもの ----------
// 自治領・係争地・承認が割れている地域。地図には出すが、
// 「国」を答えるクイズには出さない（断定を避けるため）。
const NOT_SOVEREIGN = new Set(['GL', 'EH', 'TW', 'XK', 'PS', 'HK', 'MO', 'PR', 'NC', 'FK', 'GF', 'SS_disputed']);

const CONT_JA = {
  Asia: 'アジア', Europe: 'ヨーロッパ', Africa: 'アフリカ',
  'North America': '北アメリカ', 'South America': '南アメリカ', Oceania: 'オセアニア',
};

// ---------- 形をかんたんにする（Douglas–Peucker） ----------
function simplify(points, tol) {
  if (points.length < 3) return points;
  const sq = tol * tol;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let far = -1, max = sq;
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const dx = bx - ax, dy = by - ay;
    const len = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      let d;
      if (len === 0) {
        d = (px - ax) ** 2 + (py - ay) ** 2;
      } else {
        let t = ((px - ax) * dx + (py - ay) * dy) / len;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        d = (px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2;
      }
      if (d > max) { max = d; far = i; }
    }
    if (far > 0) { keep[far] = 1; stack.push([a, far], [far, b]); }
  }
  return points.filter((_, i) => keep[i]);
}

/** GeoJSON の geometry から、外周リングの配列を取り出す */
function rings(geom) {
  if (!geom) return [];
  if (geom.type === 'Polygon') return [geom.coordinates[0]];
  if (geom.type === 'MultiPolygon') return geom.coordinates.map((p) => p[0]);
  return [];
}

const bboxOf = (ring) => ring.reduce((b, [x, y]) => [
  Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y),
], [Infinity, Infinity, -Infinity, -Infinity]);

/** リングのおおよその広さ（度の二乗）。小さすぎる島を落とすのに使う */
const areaOf = (ring) => {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return Math.abs(a / 2);
};

/**
 * 地物を SVG のパスにする。
 *   project(lon, lat) -> [x, y]
 *   minArea  これより小さいリングは描かない（度の二乗）
 *   tol      簡略化の強さ（出力座標での距離）
 */
function toPath(geom, project, { minArea, tol, keepRing }) {
  const out = [];
  let best = null, bestArea = -1;
  for (const ring of rings(geom)) {
    if (keepRing && !keepRing(ring)) continue;
    const a = areaOf(ring);
    if (a < minArea) continue;
    const pts = simplify(ring.map(([lon, lat]) => project(lon, lat)), tol);
    if (pts.length < 3) continue;
    out.push('M' + pts.map(([x, y]) => `${round(x)} ${round(y)}`).join('L') + 'Z');
    if (a > bestArea) { bestArea = a; best = pts; }
  }
  if (!out.length) return null;
  // ラベルの位置は、いちばん大きいリングの重心
  const cx = best.reduce((s, p) => s + p[0], 0) / best.length;
  const cy = best.reduce((s, p) => s + p[1], 0) / best.length;
  return { d: out.join(''), cx: round(cx), cy: round(cy) };
}

const round = (n) => Math.round(n * 10) / 10;

/** 球面でのおおよその面積（km2）。経緯度のリングから求める */
function areaKm2(geom) {
  const R = 6371;
  const rad = Math.PI / 180;
  let total = 0;
  for (const ring of rings(geom)) {
    let s = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [lon1, lat1] = ring[j];
      const [lon2, lat2] = ring[i];
      s += (lon2 - lon1) * rad * (2 + Math.sin(lat1 * rad) + Math.sin(lat2 * rad));
    }
    total += Math.abs(s * R * R / 2);
  }
  return Math.round(total);
}

// =========================================================
// 日本
// =========================================================
function buildJapan() {
  const g = JSON.parse(fs.readFileSync(SRC_JP, 'utf8'));
  const feats = g.features.filter((f) => f.properties.iso_a2 === 'JP');

  // 南鳥島・沖ノ鳥島のような遠い島は描かない。入れると本州が小さくなって押せなくなる
  const inView = (ring) => {
    const [x0, y0, x1, y1] = bboxOf(ring);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    return cx > 122 && cx < 146.5 && cy > 23.5 && cy < 46;
  };

  // 緯度35度での経度1度の長さに合わせる（正距円筒のままだと横に伸びる）
  const KX = Math.cos(35 * Math.PI / 180);
  const PAD = 10;
  const H = 1000;
  let bb = [Infinity, Infinity, -Infinity, -Infinity];
  feats.forEach((f) => rings(f.geometry).forEach((r) => {
    if (!inView(r) || areaOf(r) < 0.0015) return;
    const b = bboxOf(r);
    bb = [Math.min(bb[0], b[0]), Math.min(bb[1], b[1]), Math.max(bb[2], b[2]), Math.max(bb[3], b[3])];
  }));
  const s = H / (bb[3] - bb[1]);
  const W = round((bb[2] - bb[0]) * KX * s + PAD * 2);
  const project = (lon, lat) => [(lon - bb[0]) * KX * s + PAD, (bb[3] - lat) * s + PAD];

  const items = [];
  for (const f of feats) {
    const p = f.properties;
    const meta = JP_META[p.iso_3166_2];
    if (!meta) { console.error(`  ✕ ${p.iso_3166_2} (${p.name_ja}) の読み・県庁所在地が無い`); continue; }
    const shape = toPath(f.geometry, project, { minArea: 0.0015, tol: 0.7, keepRing: inView });
    if (!shape) { console.error(`  ✕ ${p.name_ja} の形が作れない`); continue; }
    const info = JP_INFO[p.iso_3166_2] || [];
    items.push({
      id: p.iso_3166_2, name: p.name_ja, yomi: meta[0], capital: meta[1], group: meta[2],
      pop: info[0] || 0, area: info[1] || 0, food: info[2] || '', spots: info[3] || '',
      d: shape.d, cx: shape.cx, cy: shape.cy,
    });
  }
  items.sort((a, b) => a.id.localeCompare(b.id));
  return { view: [W, round(H + PAD * 2)], items };
}

// =========================================================
// 世界
// =========================================================
function buildWorld() {
  const g = JSON.parse(fs.readFileSync(SRC_WORLD, 'utf8'));
  const places = JSON.parse(fs.readFileSync(SRC_PLACES, 'utf8'));

  // 首都。FEATURECLA は完全一致で見る。
  // 「Admin-0 capital alt」は旧都や別都（日本なら京都）なので拾ってはいけない。
  // 前はここが部分一致で、ファイルの並び順しだいで旧都が勝っていた。
  const capByIso = {};
  places.features
    .filter((f) => (f.properties.FEATURECLA || '').trim() === 'Admin-0 capital')
    .forEach((f) => {
      const p = f.properties;
      const iso = p.ISO_A2;
      if (!iso || iso === '-99') return;
      const cur = capByIso[iso];
      // 同じ国に複数あるときは人口の多いほうを採る（上書き表があればそちらが勝つ）
      if (!cur || (p.POP_MAX || 0) > cur.pop) capByIso[iso] = { name: p.NAME_JA || p.NAME, pop: p.POP_MAX || 0 };
    });
  Object.keys(capByIso).forEach((iso) => { capByIso[iso] = capByIso[iso].name; });
  Object.entries(CAPITAL_FIX).forEach(([iso, name]) => { capByIso[iso] = name; });

  // 正距円筒。南極は帯になるだけなので描かない（1-4 地理のカードのとおり、
  // メルカトルは高緯度がふくらむので使わない）
  const LAT_MIN = -58, LAT_MAX = 84;
  const PAD = 6;
  const SC = 1000 / 360;
  const W = round(1000 + PAD * 2);
  const H = round((LAT_MAX - LAT_MIN) * SC + PAD * 2);
  const project = (lon, lat) => [
    (lon + 180) * SC + PAD,
    (LAT_MAX - Math.max(LAT_MIN, Math.min(LAT_MAX, lat))) * SC + PAD,
  ];

  const items = [];
  for (const f of g.features) {
    const p = f.properties;
    const cont = CONT_JA[p.CONTINENT];
    if (!cont) continue;                               // 南極と公海は外す
    const iso = p.ISO_A2_EH && p.ISO_A2_EH !== '-99' ? p.ISO_A2_EH : p.ISO_A2;
    if (!iso || iso === '-99') continue;
    const shape = toPath(f.geometry, project, { minArea: 0.02, tol: 0.9 });
    if (!shape) continue;

    // 押せない大きさの国はクイズに出さない（答えようがないため）
    let w = 0, h = 0;
    rings(f.geometry).forEach((r) => {
      const b = bboxOf(r);
      const a = project(b[0], b[3]), c = project(b[2], b[1]);
      w = Math.max(w, c[0] - a[0]); h = Math.max(h, c[1] - a[1]);
    });

    const capital = capByIso[iso] || '';
    const pop = p.POP_EST ? Math.round(p.POP_EST / 10000) : 0;   // 万人
    // 出題の区分。
    //   1 … 地図を押して答えられる大きさがある（「地図で探す」にも出す）
    //   2 … 小さいが名前は知られている国（「名前を当てる」だけに出す。自動で寄るので答えられる）
    //   0 … 出題しない（自治領・係争地・首都が無いもの・小さくて無名のもの）
    let quiz = 0;
    if (capital && !NOT_SOVEREIGN.has(iso)) {
      if (w >= 9 && h >= 9) quiz = 1;
      else if (pop >= 500) quiz = 2;
    }
    items.push({
      id: iso, name: NAME_FIX[iso] || p.NAME_JA || p.NAME, capital,
      group: cont, pop,
      popYear: p.POP_YEAR || 0,
      area: areaKm2(f.geometry),
      spots: WORLD_SPOTS[iso] || '',
      d: shape.d, cx: shape.cx, cy: shape.cy,
      quiz,
    });
  }
  items.sort((a, b) => a.id.localeCompare(b.id));
  return { view: [W, H], items };
}

// =========================================================
// 書き出し
// =========================================================
const today = new Date().toISOString().slice(0, 10);
const SOURCE = 'Natural Earth（パブリック・ドメイン）';

function write(file, global, title, unit, data, note) {
  const body = data.items.map((it) => '  ' + JSON.stringify(it)).join(',\n');
  const out = `'use strict';
// tools/make-map.js が作ったファイル。手で直さない。
// 出どころ: ${SOURCE} ／ ${data.items.length}件 ／ 生成: ${today}
// ${note}
window.${global} = {
 title: ${JSON.stringify(title)},
 unit: ${JSON.stringify(unit)},
 source: ${JSON.stringify(SOURCE)},
 view: [${data.view[0]}, ${data.view[1]}],
 items: [
${body}
 ],
};
`;
  fs.writeFileSync(path.join(root, 'map', file), out, 'utf8');
  const kb = Math.round(out.length / 1024);
  console.log(`  ${file.padEnd(16)} ${String(data.items.length).padStart(3)}件 ${String(kb).padStart(4)}KB  viewBox ${data.view[0]}×${data.view[1]}`);
  return kb;
}

fs.mkdirSync(path.join(root, 'map'), { recursive: true });
console.log('地図データ:');
const jp = buildJapan();
const world = buildWorld();
write('data-jp.js', 'MAP_JP', '日本地図', '都道府県', jp,
  '形は簡略化してある。遠い島（南鳥島・沖ノ鳥島）は描いていない。'
  + '\n// 人口は2020年国勢調査の万人、面積は2023年面積調の km2（概数）。郷土料理と名所は書き下ろし。');
write('data-world.js', 'MAP_WORLD', '世界地図', '国', world,
  '正距円筒図法。南極大陸は描いていない。小さすぎて押せない国はクイズに出さない（quiz:0）。'
  + '\n// 人口は Natural Earth の推計（popYear は推計年）、面積は形から計算した概数。名所は主要国のみ。');

const quizN = world.items.filter((i) => i.quiz === 1).length;
const quizN2 = world.items.filter((i) => i.quiz === 2).length;
const noCap = world.items.filter((i) => i.quiz && !i.capital).map((i) => i.name);
const big = world.items.filter((i) => !i.quiz && i.pop >= 1000 && i.capital).map((i) => i.name);
if (big.length) console.log(`人口1000万人以上なのに出題しない: ${big.join('、')}`);
console.log(`\n都道府県 ${jp.items.length} / 国 ${world.items.length}`
  + `（地図で探す ${quizN} / 名前を当てるのみ ${quizN2}）`);
if (jp.items.length !== 47) { console.error('✕ 都道府県が47件でない'); process.exit(1); }
if (noCap.length) console.log(`首都が取れなかった国: ${noCap.join('、')}`);
console.log('\n検査: 問題なし');
