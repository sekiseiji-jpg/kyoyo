// オフライン対応: アプリのファイルはネット優先で取得し、つながらないときはキャッシュを使う
// 公開ファイルを更新したら CACHE の番号と、index.html の ?v= の番号を一緒に上げる
// （?v= で index.html と同じ版の CSS/JS を読むので、更新の途中で新旧が混ざらない）
const CACHE = 'kyoyo-v10';
const FILES = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'data-units.js',
  'data-jinbun.js',
  'data-shakai.js',
  'data-shizen.js',
  'data-eigo.js',
  'data-kurashi.js',
  'index-term.js',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  // GitHub Pages は max-age=600 なので、HTTPキャッシュを通さずに取得する
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      // 消すのは自分の古い版だけにする。キャッシュはドメイン全体で共有なので、
      // 名前で絞らないと同じドメインに置いた別のアプリ（読書コーナーの本棚など）まで消してしまう
      .then((keys) => Promise.all(keys
        .filter((k) => k.startsWith('kyoyo-') && k !== CACHE)
        .map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// 読書コーナーの本棚。それぞれが自分の Service Worker とキャッシュを持っているので、
// こちらは手を出さない（本文は量が多く、開いた巻だけを本棚側が保存する作りになっている）
const SHELVES = ['/koten/', '/kingendai/', '/eibei/'];

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (SHELVES.some((s) => url.pathname.includes(s))) return;
  // 毎回サーバーに更新を確認する。ページ遷移にはオプションを付けられないので URL で取り直す
  const fresh = req.mode === 'navigate' ? fetch(req.url, { cache: 'no-cache' }) : fetch(req, { cache: 'no-cache' });
  e.respondWith(
    fresh
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))),
  );
});
