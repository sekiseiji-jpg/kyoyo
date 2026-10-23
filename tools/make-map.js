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
    items.push({
      id: p.iso_3166_2, name: p.name_ja, yomi: meta[0], capital: meta[1], group: meta[2],
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

  const capByIso = {};
  places.features
    .filter((f) => /Admin-0 capital/.test(f.properties.FEATURECLA || ''))
    .forEach((f) => {
      const iso = f.properties.ISO_A2;
      if (iso && iso !== '-99' && !capByIso[iso]) capByIso[iso] = f.properties.NAME_JA || f.properties.NAME;
    });

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

    // 首都が無いものは独立国ではない（グリーンランドなど）ので、出題しない
    const capital = capByIso[iso] || '';
    items.push({
      id: iso, name: p.NAME_JA || p.NAME, capital,
      group: cont, d: shape.d, cx: shape.cx, cy: shape.cy,
      quiz: w >= 9 && h >= 9 && capital ? 1 : 0,
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
  '形は簡略化してある。遠い島（南鳥島・沖ノ鳥島）は描いていない。');
write('data-world.js', 'MAP_WORLD', '世界地図', '国', world,
  '正距円筒図法。南極大陸は描いていない。小さすぎて押せない国はクイズに出さない（quiz:0）。');

const quizN = world.items.filter((i) => i.quiz).length;
const noCap = world.items.filter((i) => i.quiz && !i.capital).map((i) => i.name);
console.log(`\n都道府県 ${jp.items.length} / 国 ${world.items.length}（うちクイズに出す ${quizN}）`);
if (jp.items.length !== 47) { console.error('✕ 都道府県が47件でない'); process.exit(1); }
if (noCap.length) console.log(`首都が取れなかった国: ${noCap.join('、')}`);
console.log('\n検査: 問題なし');
