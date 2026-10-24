'use strict';
/* マナーコーナーのデータ。
   図は手描きの SVG で、色は style.css の class（fig-l / fig-f / fig-a / fig-t …）に任せる。
   こうしておくとライト/ダークの両方で読める。

   figs  … 図と解説。parts を持つ図は、押すとその部分の説明が出る
   quiz  … img（絵を選ぶ）/ mc（言葉を選ぶ）/ spot（図の正しい場所を押す）の3種類

   出典のある作法ではなく、日本で広く行われている形を書いている。
   地域・家・宗派・店によって違うことがあるので、迷ったら周りに合わせるのが基本。
*/

// ---------- 図の部品（よく使う形をまとめておく） ----------
const F = {
  // フォーク（x は中心、y は上端）
  fork: (x, y, h) => `<rect x="${x - 3.5}" y="${y + 10}" width="7" height="${h - 10}" rx="3" class="fig-f"/>
    <path d="M${x - 5} ${y + 12} L${x - 5} ${y} M${x} ${y + 12} L${x} ${y} M${x + 5} ${y + 12} L${x + 5} ${y}" class="fig-l"/>`,
  // ナイフ（刃は右向き）
  knife: (x, y, h) => `<rect x="${x - 3.5}" y="${y + h * 0.45}" width="7" height="${h * 0.55}" rx="3" class="fig-f"/>
    <path d="M${x - 4} ${y + h * 0.47} L${x - 4} ${y + 6} Q${x - 4} ${y} ${x + 2} ${y + 3} L${x + 4} ${y + h * 0.3} L${x + 4} ${y + h * 0.47} Z" class="fig-f"/>`,
  // スプーン
  spoon: (x, y, h) => `<rect x="${x - 3}" y="${y + 16}" width="6" height="${h - 16}" rx="3" class="fig-f"/>
    <ellipse cx="${x}" cy="${y + 9}" rx="6.5" ry="10" class="fig-f"/>`,
  // グラス（脚つき）
  glass: (x, y, w, h) => `<path d="M${x - w / 2} ${y} L${x - w / 2 + 2} ${y + h * 0.55} Q${x} ${y + h * 0.72} ${x + w / 2 - 2} ${y + h * 0.55} L${x + w / 2} ${y} Z" class="fig-f"/>
    <path d="M${x} ${y + h * 0.68} L${x} ${y + h * 0.92} M${x - 7} ${y + h * 0.95} L${x + 7} ${y + h * 0.95}" class="fig-l"/>`,
  // 皿
  plate: (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" class="fig-f"/><circle cx="${x}" cy="${y}" r="${r - 7}" class="fig-l"/>`,
  // 椀（横から見た形）
  bowl: (x, y, w, h) => `<path d="M${x - w / 2} ${y} Q${x} ${y + h * 1.5} ${x + w / 2} ${y} Z" class="fig-f"/>
    <path d="M${x - w / 2 - 3} ${y} L${x + w / 2 + 3} ${y}" class="fig-l"/>`,
  t: (x, y, s, cls) => `<text x="${x}" y="${y}" class="${cls || 'fig-t'}">${s}</text>`,
};

// =========================================================
// 洋食
// =========================================================
const YOSHOKU_FIGS = [
  {
    id: 'setting',
    title: 'テーブルセッティング',
    lead: '並んでいる道具の位置には意味がある。覚えるのは「外から内へ」「パンは左、グラスは右」の2つ。',
    svg: `<svg viewBox="0 0 400 250" role="img" aria-label="洋食のテーブルセッティング">
      ${F.plate(200, 150, 48)}
      <g class="hot" data-part="fork"><rect x="112" y="92" width="48" height="118" class="hit"/>
        ${F.fork(122, 100, 100)}${F.fork(140, 100, 100)}${F.fork(158, 100, 100)}</g>
      <g class="hot" data-part="knife"><rect x="238" y="92" width="36" height="118" class="hit"/>
        ${F.knife(246, 100, 100)}${F.knife(264, 100, 100)}</g>
      <g class="hot" data-part="spoon"><rect x="274" y="92" width="24" height="118" class="hit"/>
        ${F.spoon(284, 100, 100)}</g>
      <g class="hot" data-part="dessert"><rect x="160" y="58" width="80" height="28" class="hit"/>
        ${F.spoon(185, 62, 22)}${F.fork(215, 62, 22)}</g>
      <g class="hot" data-part="bread"><rect x="56" y="48" width="76" height="60" class="hit"/>
        ${F.plate(94, 78, 26)}
        <rect x="80" y="74" width="28" height="5" rx="2.5" class="fig-a"/></g>
      <g class="hot" data-part="glass"><rect x="268" y="40" width="92" height="66" class="hit"/>
        ${F.glass(288, 52, 22, 48)}${F.glass(316, 56, 19, 42)}${F.glass(342, 60, 17, 38)}</g>
      ${F.t(94, 120, 'パン皿', 'fig-tm')}
      ${F.t(316, 32, 'グラス', 'fig-tm')}
      ${F.t(200, 232, '外側から内側へ使う', 'fig-tm')}
    </svg>`,
    parts: [
      { id: 'fork', label: 'フォーク（左）', text: '左に並ぶ。いちばん外が前菜用、内側へ向かって魚用・肉用と細かくなる。迷ったら外側から取れば合う。' },
      { id: 'knife', label: 'ナイフ（右）', text: '右に並ぶ。刃は内側（皿の側）を向ける。外向きは「あなたに刃を向ける」意味になるので置かない。' },
      { id: 'spoon', label: 'スプーン（右の外）', text: 'スープ用。右端にあることが多い。スープは手前から奥へすくう（イギリス式）。フランス式は奥から手前だが、どちらでもよい。' },
      { id: 'dessert', label: 'デザート用（奥）', text: '皿の奥に横向きに置かれる。デザートのときに手前へおろして使う。最初から手をつけない。' },
      { id: 'bread', label: 'パン皿（左奥）', text: '左が自分のパン皿。右隣の人のものと間違えやすい。**「左がパン、右が飲み物」**で覚える。' },
      { id: 'glass', label: 'グラス（右奥）', text: '右奥に大きい順に並ぶ。大きいものが水、次が赤ワイン、小さいものが白ワイン。' },
    ],
    note: '席についたら道具を数えると、コースが何皿あるかが分かる。',
  },
  {
    id: 'order',
    title: '使う順番',
    lead: '外側から内側へ。料理が出るたびに外側の1組を使う。',
    svg: `<svg viewBox="0 0 400 220" role="img" aria-label="カトラリーを使う順番">
      ${F.plate(200, 132, 44)}
      ${F.fork(122, 86, 96)}${F.fork(140, 86, 96)}${F.fork(158, 86, 96)}
      ${F.knife(246, 86, 96)}${F.knife(264, 86, 96)}${F.spoon(284, 86, 96)}
      <g class="fig-num"><circle cx="122" cy="196" r="12"/><circle cx="140" cy="196" r="12"/><circle cx="158" cy="196" r="12"/>
        <circle cx="246" cy="196" r="12"/><circle cx="264" cy="196" r="12"/><circle cx="284" cy="196" r="12"/></g>
      ${F.t(122, 200, '3', 'fig-n')}${F.t(140, 200, '2', 'fig-n')}${F.t(158, 200, '1', 'fig-n')}
      ${F.t(246, 200, '3', 'fig-n')}${F.t(264, 200, '2', 'fig-n')}${F.t(284, 200, '1', 'fig-n')}
      <path d="M100 66 L180 66" class="fig-arrow" marker-end="url(#ar)"/>
      <path d="M300 66 L220 66" class="fig-arrow" marker-end="url(#ar)"/>
      ${F.t(200, 62, '内側へ', 'fig-tm')}
      <defs><marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0 0 L10 5 L0 10 Z" class="fig-a"/></marker></defs>
    </svg>`,
    note: '落としたり間違えたりしても、自分で拾わず給仕の人を呼べばよい。黙って新しいものを持ってきてくれる。',
  },
  {
    id: 'signal',
    title: 'ナイフとフォークの合図',
    lead: '置き方で「まだ食べている」「もう下げてよい」を伝える。言葉はいらない。',
    svg: `<svg viewBox="0 0 400 220" role="img" aria-label="食事中と食べ終わりの合図">
      <g class="hot" data-part="eating"><rect x="14" y="30" width="176" height="176" class="hit"/>
        ${F.plate(102, 120, 52)}
        <g transform="rotate(-35 102 120)">${F.fork(78, 92, 78)}</g>
        <g transform="rotate(35 102 120)">${F.knife(126, 92, 78)}</g>
        ${F.t(102, 200, '食事中（ハの字）', 'fig-tm')}</g>
      <g class="hot" data-part="done"><rect x="210" y="30" width="176" height="176" class="hit"/>
        ${F.plate(298, 120, 52)}
        <g transform="rotate(25 298 120)">${F.fork(290, 84, 78)}${F.knife(306, 84, 78)}</g>
        ${F.t(298, 200, '食べ終わり（そろえる）', 'fig-tm')}</g>
      <path d="M200 46 L200 194" class="fig-sep"/>
    </svg>`,
    parts: [
      { id: 'eating', label: '食事中', text: '皿の上で**ハの字**に置く。フォークは背を上に、ナイフは刃を内側に。中座するときもこの形にする。' },
      { id: 'done', label: '食べ終わり', text: '皿の右斜め下（時計の4時20分の向き）に**そろえて**置く。フォークは背を下に返す。これで下げてよい合図になる。' },
    ],
    note: '皿を押しやる、重ねる、縁に立てかけるのはどれも違う。置き方だけで伝わる。',
  },
  {
    id: 'napkin',
    title: 'ナプキン',
    lead: '二つ折りにして、折り目（輪）を手前にして膝に置く。',
    svg: `<svg viewBox="0 0 400 200" role="img" aria-label="ナプキンの扱い">
      <g class="hot" data-part="lap"><rect x="16" y="26" width="112" height="150" class="hit"/>
        <path d="M34 70 L110 70 L110 128 L34 128 Z" class="fig-f"/>
        <path d="M34 128 L110 128" class="fig-a3"/>
        ${F.t(72, 150, '膝の上・輪が手前', 'fig-tm')}</g>
      <g class="hot" data-part="away"><rect x="144" y="26" width="112" height="150" class="hit"/>
        <path d="M162 76 L238 76 L238 122 L162 122 Z" class="fig-f"/>
        <rect x="170" y="128" width="60" height="30" rx="4" class="fig-l"/>
        ${F.t(200, 172, '中座は椅子の上', 'fig-tm')}</g>
      <g class="hot" data-part="end"><rect x="272" y="26" width="112" height="150" class="hit"/>
        <path d="M290 72 L366 72 L366 126 L290 126 Z" class="fig-f"/>
        <path d="M300 86 L356 86 M300 104 L356 104" class="fig-l"/>
        ${F.t(328, 150, '退席は軽くたたんで卓上', 'fig-tm')}</g>
    </svg>`,
    parts: [
      { id: 'lap', label: '膝に置く', text: '二つ折りにして輪（折り目）を手前に。口を拭くときは**内側**で拭くと汚れが見えない。乾杯のあと、または主賓が取ってから取る。' },
      { id: 'away', label: '中座するとき', text: '椅子の座面に置く。テーブルに置くと「食事は終わり」の合図になってしまう。' },
      { id: 'end', label: '帰るとき', text: '**きちんとたたまない。** 軽くたたんでテーブルの左に置く。きれいにたたむと「料理が不満だった」という意味にとられることがある。' },
    ],
    note: '胸元に挟むのは子どもや、汁の跳ねる料理のときだけ。ハンカチで口を拭くのは、ナプキンが足りないという意思表示になる。',
  },
  {
    id: 'glasses',
    title: 'グラスの見分け',
    lead: '大きいほど香りを溜める。赤ワインがいちばん大きい。',
    svg: `<svg viewBox="0 0 400 200" role="img" aria-label="グラスの種類">
      <g class="hot" data-part="water">${F.glass(80, 44, 44, 110)}${F.t(80, 182, '水（ゴブレット）', 'fig-tm')}</g>
      <g class="hot" data-part="red">${F.glass(190, 48, 50, 104)}${F.t(190, 182, '赤ワイン', 'fig-tm')}</g>
      <g class="hot" data-part="white">${F.glass(290, 56, 36, 94)}${F.t(290, 182, '白ワイン', 'fig-tm')}</g>
      <g class="hot" data-part="flute">${F.glass(360, 44, 20, 108)}${F.t(360, 182, 'シャンパン', 'fig-tm')}</g>
    </svg>`,
    parts: [
      { id: 'water', label: '水（ゴブレット）', text: '脚が短く口が広い。右奥のいちばん大きいもの。水やソフトドリンクに使う。' },
      { id: 'red', label: '赤ワイン', text: 'ふくらみが大きい。香りを溜めるため。注ぐのはふくらみのいちばん広いところまで。' },
      { id: 'white', label: '白ワイン', text: '赤より小ぶり。冷やして飲むので、温まらないよう**脚を持つ**。' },
      { id: 'flute', label: 'シャンパン（フルート）', text: '細長い。泡が長く立ちのぼるようにこの形になっている。' },
    ],
    note: '注いでもらうときグラスを持ち上げない。置いたままにするのが洋食の作法で、日本の酌とは逆である。',
  },
];

const YOSHOKU_QUIZ = [
  { type: 'spot', fig: 'setting', q: '自分のパン皿はどれか。', a: 'bread',
    exp: 'パン皿は左奥。「左がパン、右が飲み物」で覚える。右隣の人のパン皿を取ってしまうのがいちばん多い間違い。' },
  { type: 'spot', fig: 'setting', q: 'スープに使う道具はどれか。', a: 'spoon',
    exp: '右端のスプーン。外側から使う決まりのとおり、スープは最初に出ることが多いので外側にある。' },
  { type: 'mc', q: 'カトラリーを使う順番はどちらか。', c: ['外側から内側へ', '内側から外側へ', '右から左へ', '大きいものから'], a: 0,
    exp: '料理が出るたびに外側の1組を使う。並べる側が「出る順に外から」置いているので、順に取れば必ず合う。' },
  { type: 'img', q: '「食べ終わり」の合図はどちらか。',
    c: [
      { label: 'A', svg: `<svg viewBox="0 0 160 150">${F.plate(80, 72, 46)}<g transform="rotate(25 80 72)">${F.fork(72, 38, 68)}${F.knife(88, 38, 68)}</g></svg>` },
      { label: 'B', svg: `<svg viewBox="0 0 160 150">${F.plate(80, 72, 46)}<g transform="rotate(-35 80 72)">${F.fork(58, 44, 68)}</g><g transform="rotate(35 80 72)">${F.knife(102, 44, 68)}</g></svg>` },
    ], a: 0,
    exp: 'そろえて斜めに置くのが食べ終わり。B のハの字は「まだ食べている」の意味なので、皿を下げてもらえない。' },
  { type: 'mc', q: '食事の途中で席を立つとき、ナプキンはどこに置くか。', c: ['椅子の座面', 'テーブルの上', '皿の上', '背もたれに掛ける'], a: 0,
    exp: '椅子の上に置く。テーブルに置くと「食事は終わり」の合図になり、皿を下げられてしまう。' },
  { type: 'mc', q: '帰るときのナプキンの置き方として正しいものはどれか。', c: ['軽くたたんでテーブルの左に置く', 'きちんとたたんで皿の上に置く', '椅子の上に置く', '元の形に戻して立てる'], a: 0,
    exp: '**きちんとたたまない**のが作法。整えすぎると「料理が不満だった」という意味にとられることがある。' },
  { type: 'img', q: '赤ワインのグラスはどちらか。',
    c: [
      { label: 'A', svg: `<svg viewBox="0 0 120 150">${F.glass(60, 24, 50, 104)}</svg>` },
      { label: 'B', svg: `<svg viewBox="0 0 120 150">${F.glass(60, 32, 32, 94)}</svg>` },
    ], a: 0,
    exp: 'ふくらみの大きいほうが赤。香りを溜めるために大きい。小ぶりなほうが白で、冷たさを保つため脚を持つ。' },
  { type: 'mc', q: 'ワインを注いでもらうとき、洋食ではどうするか。', c: ['グラスは置いたままにする', 'グラスを持ち上げる', '両手で支える', '少し傾ける'], a: 0,
    exp: '置いたままが作法。持ち上げるのは日本の酌の作法で、洋食では逆になる。' },
];

// =========================================================
// 和食
// =========================================================
const WASHOKU_FIGS = [
  {
    id: 'haizen',
    title: '一汁三菜の配膳',
    lead: 'ご飯が左手前、汁が右手前。これが和食の土台で、ほかの器はこの2つから決まる。',
    svg: `<svg viewBox="0 0 400 250" role="img" aria-label="一汁三菜の配膳">
      <rect x="44" y="40" width="312" height="172" rx="8" class="fig-tray"/>
      <g class="hot" data-part="gohan"><circle cx="118" cy="168" r="34" class="fig-f"/><circle cx="118" cy="168" r="26" class="fig-l"/>${F.t(118, 173, 'ご飯', 'fig-in')}</g>
      <g class="hot" data-part="shiru"><circle cx="282" cy="168" r="32" class="fig-f"/><circle cx="282" cy="168" r="24" class="fig-l"/>${F.t(282, 173, '汁', 'fig-in')}</g>
      <g class="hot" data-part="shusai"><circle cx="278" cy="84" r="36" class="fig-f"/>${F.t(278, 89, '主菜', 'fig-in')}</g>
      <g class="hot" data-part="fukusai"><circle cx="122" cy="84" r="28" class="fig-f"/>${F.t(122, 89, '副菜', 'fig-in')}</g>
      <g class="hot" data-part="kounomono"><circle cx="200" cy="120" r="22" class="fig-f"/>${F.t(200, 125, '香の物', 'fig-in2')}</g>
      <g class="hot" data-part="hashi"><rect x="92" y="212" width="216" height="24" class="hit"/>
        <rect x="100" y="219" width="200" height="6" rx="3" class="fig-a"/>
        <rect x="92" y="214" width="18" height="16" rx="4" class="fig-l"/></g>
      ${F.t(200, 246, '箸は手前・先は左', 'fig-tm')}
    </svg>`,
    parts: [
      { id: 'gohan', label: 'ご飯（左手前）', text: '左手前が定位置。右利きが左手で持ち上げ、右手の箸で食べるための配置である。' },
      { id: 'shiru', label: '汁（右手前）', text: '右手前。**ご飯と汁が逆の配膳は「陰膳」**といって、仏前に供える形になる。間違えやすいので気をつける。' },
      { id: 'shusai', label: '主菜（右奥）', text: '焼き魚や肉などの主役。魚は頭を左、腹を手前に置く。' },
      { id: 'fukusai', label: '副菜（左奥）', text: '煮物やお浸しなど。左奥に置く。' },
      { id: 'kounomono', label: '香の物（中央）', text: '漬物は中央に小さく。三菜には数えないことが多い。' },
      { id: 'hashi', label: '箸（手前）', text: '手前に横向きで、**先を左**に向ける。箸置きがあれば箸先だけを乗せる。' },
    ],
    note: '「一汁三菜」は汁1つとおかず3つ。主菜1・副菜2が基本で、香の物は数に入れない。',
  },
  {
    id: 'mochikata',
    title: '箸の持ち方',
    lead: '上の1本は鉛筆と同じ持ち方。下の1本は動かさない。動くのは上だけ。',
    svg: `<svg viewBox="0 0 400 210" role="img" aria-label="箸の持ち方">
      <g class="hot" data-part="upper">
        <rect x="60" y="56" width="250" height="7" rx="3.5" class="fig-a"/>
        <circle cx="150" cy="48" r="13" class="fig-l"/><circle cx="178" cy="44" r="13" class="fig-l"/>
        ${F.t(118, 36, '上の箸＝鉛筆持ち・動かす', 'fig-tm')}
      </g>
      <g class="hot" data-part="lower">
        <rect x="60" y="112" width="250" height="7" rx="3.5" class="fig-f"/>
        <path d="M196 108 Q206 120 196 132" class="fig-l"/>
        <circle cx="214" cy="120" r="13" class="fig-l"/>
        ${F.t(130, 152, '下の箸＝薬指で支える・動かさない', 'fig-tm')}
      </g>
      <path d="M330 58 Q348 88 330 116" class="fig-arrow" marker-end="url(#ar2)"/>
      ${F.t(362, 92, '開閉', 'fig-tm')}
      <defs><marker id="ar2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0 0 L10 5 L0 10 Z" class="fig-a"/></marker></defs>
    </svg>`,
    parts: [
      { id: 'upper', label: '上の箸', text: '親指・人差し指・中指で鉛筆のように持つ。**動かすのはこの1本だけ。**' },
      { id: 'lower', label: '下の箸', text: '親指の付け根と薬指で支え、固定する。ここが動くと食べ物をつかめない。' },
    ],
    note: '持ち上げるときは、右手で取って左手で下から受け、右手を持ち替える「三手」が正式。',
  },
  {
    id: 'kiraibashi',
    title: '嫌い箸（やってはいけない使い方）',
    lead: '名前がついているものは、それだけ目につくということ。代表的な6つ。',
    svg: `<svg viewBox="0 0 400 260" role="img" aria-label="嫌い箸の例">
      <g class="hot" data-part="mayoi"><rect x="10" y="14" width="120" height="110" class="hit"/>
        <circle cx="48" cy="52" r="16" class="fig-f"/><circle cx="92" cy="52" r="16" class="fig-f"/>
        <path d="M70 100 L50 66 M70 100 L90 66" class="fig-a3"/>
        ${F.t(70, 118, '迷い箸', 'fig-tm')}</g>
      <g class="hot" data-part="sashi"><rect x="140" y="14" width="120" height="110" class="hit"/>
        <circle cx="200" cy="66" r="22" class="fig-f"/>
        <path d="M200 26 L200 72" class="fig-a3"/>
        ${F.t(200, 118, '刺し箸', 'fig-tm')}</g>
      <g class="hot" data-part="yose"><rect x="270" y="14" width="120" height="110" class="hit"/>
        <circle cx="318" cy="60" r="20" class="fig-f"/>
        <path d="M296 90 L372 90" class="fig-a3"/><path d="M356 60 L372 90" class="fig-a3"/>
        ${F.t(330, 118, '寄せ箸', 'fig-tm')}</g>
      <g class="hot" data-part="watashi"><rect x="10" y="134" width="120" height="110" class="hit"/>
        <circle cx="70" cy="190" r="26" class="fig-f"/>
        <path d="M34 182 L106 182" class="fig-a3"/>
        ${F.t(70, 238, '渡し箸', 'fig-tm')}</g>
      <g class="hot" data-part="neburi"><rect x="140" y="134" width="120" height="110" class="hit"/>
        <path d="M176 196 L232 196" class="fig-a3"/>
        <circle cx="172" cy="196" r="12" class="fig-l"/>
        ${F.t(200, 238, 'ねぶり箸', 'fig-tm')}</g>
      <g class="hot" data-part="namida"><rect x="270" y="134" width="120" height="110" class="hit"/>
        <path d="M300 170 L352 170" class="fig-a3"/>
        <circle cx="326" cy="192" r="4" class="fig-a"/><circle cx="326" cy="208" r="3" class="fig-a"/>
        ${F.t(330, 238, '涙箸', 'fig-tm')}</g>
    </svg>`,
    parts: [
      { id: 'mayoi', label: '迷い箸', text: 'どれを取ろうか、料理の上で箸を動かすこと。「惑い箸」ともいう。' },
      { id: 'sashi', label: '刺し箸', text: '食べ物に箸を突き刺すこと。煮物などでやりがちだが、切り分けてから取る。' },
      { id: 'yose', label: '寄せ箸', text: '器を箸で手前に引き寄せること。器は手で持つ。' },
      { id: 'watashi', label: '渡し箸', text: '器の上に箸を渡して置くこと。「もういらない」の意味になる。箸置きか、無ければ懐紙を折って使う。' },
      { id: 'neburi', label: 'ねぶり箸', text: '箸先をなめること。見た目に出やすく、目立つ。' },
      { id: 'namida', label: '涙箸', text: '箸先から汁をぽたぽた落とすこと。器か懐紙を受けにする。' },
    ],
    note: 'ほかに、箸で人を指す「指し箸」、箸を持ったまま器を持つ「持ち箸」、料理を探る「探り箸」がある。'
      + 'ご飯に箸を立てる「立て箸」と、箸から箸へ渡す「拾い箸」は**葬儀の作法**なので、食卓では特に避ける。',
  },
  {
    id: 'utsuwa',
    title: '持ち上げてよい器・いけない器',
    lead: '手のひらに収まる大きさなら持ち上げる。平たい皿や大きな器は置いたまま。',
    svg: `<svg viewBox="0 0 400 210" role="img" aria-label="持ち上げてよい器">
      <g class="hot" data-part="ok"><rect x="14" y="24" width="180" height="160" class="hit"/>
        ${F.bowl(64, 70, 54, 26)}${F.bowl(134, 70, 48, 24)}
        ${F.bowl(100, 134, 44, 22)}
        <circle cx="104" cy="10" r="0"/>
        ${F.t(104, 180, '持ち上げる（飯椀・汁椀・小鉢）', 'fig-tm')}</g>
      <g class="hot" data-part="ng"><rect x="206" y="24" width="180" height="160" class="hit"/>
        <ellipse cx="258" cy="76" rx="42" ry="12" class="fig-f"/>
        <ellipse cx="344" cy="76" rx="34" ry="10" class="fig-f"/>
        <ellipse cx="300" cy="134" rx="52" ry="14" class="fig-f"/>
        ${F.t(296, 180, '置いたまま（平皿・大鉢・焼物皿）', 'fig-tm')}</g>
      <path d="M200 40 L200 170" class="fig-sep"/>
    </svg>`,
    parts: [
      { id: 'ok', label: '持ち上げてよい', text: '飯椀・汁椀・小鉢・小皿など、**手のひらに乗る大きさ**のもの。持ち上げて口へ運ぶのが和食の作法で、顔を器に近づける「犬食い」を避けるためでもある。' },
      { id: 'ng', label: '置いたまま', text: '平皿・大鉢・焼物の皿など。持ち上げず、箸で取って口へ運ぶ。手を皿のように添える「手皿」も、実は作法ではない。受けるなら懐紙を使う。' },
    ],
    note: '蓋つきの椀は、蓋を開けたら裏返して膳の外側に置く。食べ終わったら元に戻す。重ねない。',
  },
  {
    id: 'kaiseki',
    title: '会席料理の流れ',
    lead: '出る順に意味がある。温かいものは温かいうちに、が最優先。',
    svg: `<svg viewBox="0 0 400 200" role="img" aria-label="会席料理の順序">
      <path d="M30 100 L370 100" class="fig-l"/>
      ${[['先付', 40], ['椀物', 95], ['向付', 150], ['焼物', 205], ['煮物', 260], ['食事', 315], ['水菓子', 365]]
        .map(([t, x], i) => `<circle cx="${x}" cy="100" r="13" class="fig-step"/>${F.t(x, 105, String(i + 1), 'fig-n')}${F.t(x, 134, t, 'fig-tm')}`).join('')}
      ${F.t(70, 72, '前菜', 'fig-tm')}${F.t(205, 72, '主役', 'fig-tm')}${F.t(340, 72, '締め', 'fig-tm')}
    </svg>`,
    note: '「食事」はご飯・汁・香の物のこと。これが出たら終わりが近い。日本酒はここで止めるのが通とされる。',
  },
];

const WASHOKU_QUIZ = [
  { type: 'spot', fig: 'haizen', q: 'ご飯の茶碗を置く場所はどこか。', a: 'gohan',
    exp: '左手前。左手で持ち上げて右手の箸で食べる、という動きから決まっている。' },
  { type: 'spot', fig: 'haizen', q: '汁椀を置く場所はどこか。', a: 'shiru',
    exp: '右手前。ご飯と汁が左右逆になった配膳は「陰膳」といって仏前に供える形になるので、間違えると目につく。' },
  { type: 'img', q: '正しい配膳はどちらか。',
    c: [
      { label: 'A', svg: `<svg viewBox="0 0 200 130"><rect x="14" y="14" width="172" height="102" rx="6" class="fig-tray"/><circle cx="62" cy="84" r="22" class="fig-f"/><text x="62" y="89" class="fig-in2">飯</text><circle cx="140" cy="84" r="20" class="fig-f"/><text x="140" y="89" class="fig-in2">汁</text><circle cx="136" cy="44" r="20" class="fig-f"/></svg>` },
      { label: 'B', svg: `<svg viewBox="0 0 200 130"><rect x="14" y="14" width="172" height="102" rx="6" class="fig-tray"/><circle cx="62" cy="84" r="20" class="fig-f"/><text x="62" y="89" class="fig-in2">汁</text><circle cx="140" cy="84" r="22" class="fig-f"/><text x="140" y="89" class="fig-in2">飯</text><circle cx="66" cy="44" r="20" class="fig-f"/></svg>` },
    ], a: 0,
    exp: 'ご飯が左、汁が右。B は左右が逆で、仏前に供える「陰膳」の形になってしまう。' },
  { type: 'mc', q: '箸を持ったとき、動かすのはどちらか。', c: ['上の1本だけ', '下の1本だけ', '2本とも', '持ち方による'], a: 0,
    exp: '下の箸は親指の付け根と薬指で固定し、上の箸だけを鉛筆のように動かす。下が動くとつかめない。' },
  { type: 'spot', fig: 'kiraibashi', q: '器の上に箸を渡して置くのは何というか。', a: 'watashi',
    exp: '渡し箸。「もういらない」の合図になってしまう。箸置きが無ければ懐紙を折って箸置きにする。' },
  { type: 'spot', fig: 'kiraibashi', q: '食べ物に箸を突き刺すのは何というか。', a: 'sashi',
    exp: '刺し箸。煮物などでやりがちだが、大きいものは箸で切り分けてから取る。' },
  { type: 'mc', q: 'ご飯に箸を立てるのを避けるのはなぜか。', c: ['葬儀で死者に供える形だから', '箸が倒れて危ないから', 'ご飯が崩れるから', '箸が汚れるから'], a: 0,
    exp: '「立て箸」は枕飯といって、死者の枕元に供える形である。同じ理由で、箸から箸へ食べ物を渡す「拾い箸」も避ける。' },
  { type: 'img', q: '持ち上げてよい器はどちらか。',
    c: [
      { label: 'A', svg: `<svg viewBox="0 0 160 110">${F.bowl(80, 44, 60, 30)}</svg>` },
      { label: 'B', svg: `<svg viewBox="0 0 160 110"><ellipse cx="80" cy="60" rx="56" ry="16" class="fig-f"/></svg>` },
    ], a: 0,
    exp: '手のひらに乗る椀や小鉢は持ち上げる。平皿は置いたまま箸で口へ運ぶ。手を添える「手皿」も作法ではない。' },
  { type: 'mc', q: '椀の蓋を取ったあと、どうするのが正しいか。', c: ['裏返して膳の外側に置く', '椀に重ねて置く', '表のまま膳の中に置く', '隣の人の膳に置く'], a: 0,
    exp: '裏返して膳の外に置く。食べ終わったら元どおりかぶせる。重ねると器が傷むので重ねない。' },
];

// =========================================================
// 席次
// =========================================================
const SEKIJI_FIGS = [
  {
    id: 'ousetsu',
    title: '応接室',
    lead: '入口から遠いほど上座。そして長椅子（ソファ）が一人掛けより上。',
    svg: `<svg viewBox="0 0 400 240" role="img" aria-label="応接室の席次">
      <rect x="30" y="24" width="340" height="186" rx="6" class="fig-room"/>
      <rect x="150" y="204" width="100" height="14" class="fig-door"/>
      ${F.t(200, 234, '入口', 'fig-tm')}
      <rect x="110" y="56" width="180" height="34" rx="6" class="fig-sofa"/>
      <g class="hot" data-part="s1"><circle cx="155" cy="73" r="17" class="fig-seat"/>${F.t(155, 79, '1', 'fig-n')}</g>
      <g class="hot" data-part="s2"><circle cx="200" cy="73" r="17" class="fig-seat"/>${F.t(200, 79, '2', 'fig-n')}</g>
      <g class="hot" data-part="s3"><circle cx="245" cy="73" r="17" class="fig-seat"/>${F.t(245, 79, '3', 'fig-n')}</g>
      <rect x="140" y="110" width="120" height="40" rx="5" class="fig-table"/>${F.t(200, 135, 'テーブル', 'fig-in2')}
      <g class="hot" data-part="s4"><rect x="138" y="162" width="36" height="32" rx="6" class="fig-chair"/><circle cx="156" cy="178" r="15" class="fig-seat2"/>${F.t(156, 184, '4', 'fig-n')}</g>
      <g class="hot" data-part="s5"><rect x="226" y="162" width="36" height="32" rx="6" class="fig-chair"/><circle cx="244" cy="178" r="15" class="fig-seat2"/>${F.t(244, 184, '5', 'fig-n')}</g>
    </svg>`,
    parts: [
      { id: 's1', label: '1 最上座', text: '入口からいちばん遠い長椅子の奥。お客さまや目上の人に座ってもらう。' },
      { id: 's2', label: '2', text: '長椅子の中。3人掛けなら真ん中が2番目になる。' },
      { id: 's3', label: '3', text: '長椅子の入口側。' },
      { id: 's4', label: '4', text: '一人掛けの椅子の奥側。**長椅子より格が下**なので、人数が少なくても迎える側が座る。' },
      { id: 's5', label: '5 末席', text: '入口にいちばん近い一人掛け。お茶を出したり取り次いだりする人が座る。' },
    ],
    note: '迷ったら「入口から遠いほど上」。これだけで応接室・会議室・和室・乗り物のほとんどが説明できる。',
  },
  {
    id: 'kaigi',
    title: '会議室',
    lead: '議長がいれば議長席がある。入口から遠い側が上座なのは同じ。',
    svg: `<svg viewBox="0 0 400 240" role="img" aria-label="会議室の席次">
      <rect x="24" y="20" width="352" height="194" rx="6" class="fig-room"/>
      <rect x="300" y="208" width="76" height="12" class="fig-door"/>${F.t(338, 234, '入口', 'fig-tm')}
      <rect x="120" y="86" width="160" height="66" rx="6" class="fig-table"/>
      <g class="hot" data-part="g"><rect x="46" y="98" width="42" height="42" rx="6" class="fig-chair"/><circle cx="67" cy="119" r="17" class="fig-seat"/>${F.t(67, 125, '議', 'fig-n')}</g>
      <g class="hot" data-part="a1"><circle cx="152" cy="64" r="17" class="fig-seat"/>${F.t(152, 70, '1', 'fig-n')}</g>
      <g class="hot" data-part="a2"><circle cx="200" cy="64" r="17" class="fig-seat"/>${F.t(200, 70, '3', 'fig-n')}</g>
      <g class="hot" data-part="a3"><circle cx="248" cy="64" r="17" class="fig-seat"/>${F.t(248, 70, '5', 'fig-n')}</g>
      <g class="hot" data-part="b1"><circle cx="152" cy="174" r="17" class="fig-seat2"/>${F.t(152, 180, '2', 'fig-n')}</g>
      <g class="hot" data-part="b2"><circle cx="200" cy="174" r="17" class="fig-seat2"/>${F.t(200, 180, '4', 'fig-n')}</g>
      <g class="hot" data-part="b3"><circle cx="248" cy="174" r="17" class="fig-seat2"/>${F.t(248, 180, '6', 'fig-n')}</g>
    </svg>`,
    parts: [
      { id: 'g', label: '議長席', text: '議長・進行役の席。出入口から遠い短い辺に置くことが多い。' },
      { id: 'a1', label: '1（議長から見て右）', text: '議長に近いほど上。同じ近さなら**右が左より上**になる。' },
      { id: 'a2', label: '3', text: '議長から2番目に近い、右側の席。' },
      { id: 'a3', label: '5', text: '入口に近づくほど下がる。' },
      { id: 'b1', label: '2（議長から見て左）', text: '右の次が左。右・左・右・左と交互に下がっていく。' },
      { id: 'b2', label: '4', text: '左側の2番目。' },
      { id: 'b3', label: '6 末席', text: '入口にいちばん近い席。記録や呼び込みをする人が座る。' },
    ],
    note: '議長がいない打ち合わせでは、単に入口から遠い側が上座になる。',
  },
  {
    id: 'washitsu',
    title: '和室',
    lead: '床の間の前が上座。入口から遠い、ではなく**床の間が基準**になる。',
    svg: `<svg viewBox="0 0 400 230" role="img" aria-label="和室の席次">
      <rect x="30" y="22" width="340" height="180" rx="4" class="fig-room"/>
      <rect x="44" y="30" width="110" height="26" class="fig-toko"/>${F.t(99, 48, '床の間', 'fig-in2')}
      <rect x="276" y="196" width="80" height="12" class="fig-door"/>${F.t(316, 224, '入口（襖）', 'fig-tm')}
      <rect x="140" y="92" width="130" height="50" rx="4" class="fig-table"/>
      <g class="hot" data-part="k1"><circle cx="100" cy="92" r="18" class="fig-seat"/>${F.t(100, 98, '1', 'fig-n')}</g>
      <g class="hot" data-part="k2"><circle cx="100" cy="146" r="18" class="fig-seat"/>${F.t(100, 152, '2', 'fig-n')}</g>
      <g class="hot" data-part="k3"><circle cx="310" cy="92" r="18" class="fig-seat2"/>${F.t(310, 98, '3', 'fig-n')}</g>
      <g class="hot" data-part="k4"><circle cx="310" cy="146" r="18" class="fig-seat2"/>${F.t(310, 152, '4', 'fig-n')}</g>
    </svg>`,
    parts: [
      { id: 'k1', label: '1 床の間の前', text: '床の間をいちばんよく見られる席が上座。背にするのではなく、**床の間を背にして座る**のが上座である（客が床の間の掛軸を背負う形）。' },
      { id: 'k2', label: '2', text: '床の間に近い側の2番目。' },
      { id: 'k3', label: '3', text: '入口に近い側の上。' },
      { id: 'k4', label: '4 末席', text: '入口にいちばん近い。襖の開け閉めをする人の席。' },
    ],
    note: '床の間が無い和室では、入口から遠い側が上座になる。座布団は勧められてから座り、踏まずに後ろからにじって乗る。',
  },
  {
    id: 'kuruma',
    title: '車',
    lead: '**運転するのが誰か**で上座が入れ替わる。ここが引っかかりやすい。',
    svg: `<svg viewBox="0 0 400 250" role="img" aria-label="車の席次">
      <g class="hot" data-part="pro">
        <rect x="24" y="30" width="150" height="170" rx="16" class="fig-room"/>
        <rect x="40" y="46" width="52" height="42" rx="6" class="fig-chair"/>${F.t(66, 72, '運転', 'fig-in2')}
        <circle cx="140" cy="67" r="16" class="fig-seat2"/>${F.t(140, 73, '4', 'fig-n')}
        <circle cx="54" cy="150" r="16" class="fig-seat2"/>${F.t(54, 156, '3', 'fig-n')}
        <circle cx="99" cy="150" r="16" class="fig-seat2"/>${F.t(99, 156, '2', 'fig-n')}
        <circle cx="144" cy="150" r="16" class="fig-seat"/>${F.t(144, 156, '1', 'fig-n')}
        ${F.t(99, 220, '運転手がいるとき', 'fig-tm')}
      </g>
      <g class="hot" data-part="owner">
        <rect x="226" y="30" width="150" height="170" rx="16" class="fig-room"/>
        <rect x="242" y="46" width="52" height="42" rx="6" class="fig-chair"/>${F.t(268, 72, '本人', 'fig-in2')}
        <circle cx="342" cy="67" r="16" class="fig-seat"/>${F.t(342, 73, '1', 'fig-n')}
        <circle cx="256" cy="150" r="16" class="fig-seat2"/>${F.t(256, 156, '4', 'fig-n')}
        <circle cx="301" cy="150" r="16" class="fig-seat2"/>${F.t(301, 156, '3', 'fig-n')}
        <circle cx="346" cy="150" r="16" class="fig-seat2"/>${F.t(346, 156, '2', 'fig-n')}
        ${F.t(301, 220, '相手が運転するとき', 'fig-tm')}
      </g>
    </svg>`,
    parts: [
      { id: 'pro', label: '運転手がいるとき', text: 'タクシーや社用車。**後部座席の右（運転席の後ろ）が最上座**、次が左、次が真ん中。助手席が末席で、支払いや道案内をする人が座る。' },
      { id: 'owner', label: '相手が運転するとき', text: '上司や知人が自分で運転する車では逆になる。**助手席が上座。** 後ろに座ると運転手扱いになってしまう。' },
    ],
    note: '後部座席の真ん中は乗り降りしにくいので3番目。2人なら右と左に分かれて座り、真ん中は空ける。',
  },
  {
    id: 'elevator',
    title: 'エレベーター',
    lead: '操作盤の前が末席。先に乗って「開」を押さえる人がいちばん下になる。',
    svg: `<svg viewBox="0 0 400 220" role="img" aria-label="エレベーターの席次">
      <rect x="90" y="24" width="220" height="150" rx="6" class="fig-room"/>
      <path d="M90 174 L310 174" class="fig-door2"/>${F.t(200, 198, '扉', 'fig-tm')}
      <rect x="296" y="120" width="16" height="44" rx="3" class="fig-panel"/>${F.t(286, 112, '操作盤', 'fig-tm')}
      <g class="hot" data-part="e1"><circle cx="140" cy="62" r="18" class="fig-seat"/>${F.t(140, 68, '1', 'fig-n')}</g>
      <g class="hot" data-part="e2"><circle cx="200" cy="62" r="18" class="fig-seat"/>${F.t(200, 68, '2', 'fig-n')}</g>
      <g class="hot" data-part="e3"><circle cx="260" cy="62" r="18" class="fig-seat2"/>${F.t(260, 68, '3', 'fig-n')}</g>
      <g class="hot" data-part="e4"><circle cx="140" cy="130" r="18" class="fig-seat2"/>${F.t(140, 136, '4', 'fig-n')}</g>
      <g class="hot" data-part="e5"><circle cx="262" cy="130" r="18" class="fig-seat3"/>${F.t(262, 136, '5', 'fig-n')}</g>
    </svg>`,
    parts: [
      { id: 'e1', label: '1 奥の左', text: '扉から遠い奥がいちばん上。操作盤から見て反対側の奥になる。' },
      { id: 'e2', label: '2 奥の中', text: '奥の列の中ほど。' },
      { id: 'e3', label: '3 奥の右', text: '奥でも操作盤に近い側は少し下がる。' },
      { id: 'e4', label: '4 手前', text: '扉に近い側。' },
      { id: 'e5', label: '5 操作盤の前', text: '**いちばん下の席。** 「開」を押さえ、階を押し、先に降りて扉を押さえる役である。案内する側はここに立つ。' },
    ],
    note: '乗るときは案内する側が先に入って扉を押さえ、降りるときはお客さまが先。「お先に失礼します」と言って先に乗るのが正しい。',
  },
];

const SEKIJI_QUIZ = [
  { type: 'spot', fig: 'ousetsu', q: '応接室で、お客さまに座ってもらう席はどこか。', a: 's1',
    exp: '入口からいちばん遠い長椅子の奥。入口に近いほど下座という原則と、長椅子は一人掛けより上という決まりの両方が効いている。' },
  { type: 'mc', q: '応接室で、長椅子と一人掛けの椅子ではどちらが上座か。', c: ['長椅子', '一人掛け', '同じ', '向きによる'], a: 0,
    exp: '長椅子（ソファ）のほうが格上。お客さまが一人でも長椅子に座ってもらい、迎える側が一人掛けに座る。' },
  { type: 'spot', fig: 'kuruma', q: 'タクシーで最上座はどこか。', a: 'pro',
    exp: '運転手がいる車では、後部座席の右（運転席の後ろ）が最上座。助手席は支払いや道案内をする末席になる。' },
  { type: 'img', q: '上司が自分で運転する車で、上司の次に目上の人が座るのはどこか。',
    c: [
      { label: 'A 助手席', svg: `<svg viewBox="0 0 160 160"><rect x="20" y="16" width="120" height="128" rx="14" class="fig-room"/><rect x="32" y="28" width="40" height="34" rx="5" class="fig-chair"/><circle cx="112" cy="45" r="15" class="fig-seat"/><circle cx="44" cy="112" r="13" class="fig-seat2"/><circle cx="112" cy="112" r="13" class="fig-seat2"/></svg>` },
      { label: 'B 後ろの右', svg: `<svg viewBox="0 0 160 160"><rect x="20" y="16" width="120" height="128" rx="14" class="fig-room"/><rect x="32" y="28" width="40" height="34" rx="5" class="fig-chair"/><circle cx="112" cy="45" r="13" class="fig-seat2"/><circle cx="44" cy="112" r="13" class="fig-seat2"/><circle cx="112" cy="112" r="15" class="fig-seat"/></svg>` },
    ], a: 0,
    exp: '相手が運転するときは**助手席が上座**。後ろに座ると運転手扱いになってしまう。タクシーとは逆になるので間違えやすい。' },
  { type: 'spot', fig: 'elevator', q: 'エレベーターで案内する側が立つのはどこか。', a: 'e5',
    exp: '操作盤の前が末席で、案内する側の位置。「開」を押さえ、階を押し、先に降りて扉を押さえる。' },
  { type: 'mc', q: 'エレベーターに乗り降りする順として正しいものはどれか。', c: ['乗るときは案内する側が先、降りるときはお客さまが先', '乗るときも降りるときもお客さまが先', '乗るときも降りるときも案内する側が先', '乗るときはお客さまが先、降りるときは案内する側が先'], a: 0,
    exp: '乗るときは「お先に失礼します」と言って先に入り、扉を押さえる。降りるときはお客さまを先に通す。' },
  { type: 'spot', fig: 'washitsu', q: '和室で上座はどこか。', a: 'k1',
    exp: '床の間の前。和室だけは「入口から遠い」ではなく**床の間が基準**になる。床の間が無ければ入口から遠い側が上座。' },
  { type: 'mc', q: '席次の原則をひとことで言うとどれか。', c: ['入口から遠いほど上座', '窓に近いほど上座', '右が左より常に上座', '広い席ほど上座'], a: 0,
    exp: '入口から遠いほど上座。応接室・会議室・乗り物はこれで説明できる。例外は和室（床の間が基準）と、相手が運転する車（助手席が上座）。' },
];

// =========================================================
window.MANNER = {
  source: 'このアプリのための書き下ろし。図も手描きである。',
  units: [
    {
      id: 'yoshoku', name: '洋食のマナー', short: '洋食', emoji: '🍽',
      lead: 'コースの席で迷わないために。道具の位置と、置き方で伝える合図を押さえる。',
      figs: YOSHOKU_FIGS, quiz: YOSHOKU_QUIZ,
    },
    {
      id: 'washoku', name: '和食のマナー', short: '和食', emoji: '🍚',
      lead: '配膳の位置と箸の扱い。知らずにやっていることが、名前のついた作法違反になっていることがある。',
      figs: WASHOKU_FIGS, quiz: WASHOKU_QUIZ,
    },
    {
      id: 'sekiji', name: '席次と立ち居ふるまい', short: '席次', emoji: '💺',
      lead: '原則は「入口から遠いほど上座」。例外は和室と、相手が運転する車の2つだけ。',
      figs: SEKIJI_FIGS, quiz: SEKIJI_QUIZ,
    },
  ],
};
