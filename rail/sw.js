// オフライン対応。路線図はデータ1本なので、まとめて先に保存する。
// ファイルを更新したら CACHE の番号と、index.html の ?v= の番号を一緒に上げる。
const CACHE = 'rail-v3';
const FILES = [
  './',
  'index.html',
  'style.css?v=3',
  'app.js?v=3',
  'data-rail.js?v=3',
];

self.addEventListener('install', (e) => {
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
      // 名前で絞らないと同じドメインに置いた別のアプリまで消してしまう（知見.md 3.4）
      .then((keys) => Promise.all(keys
        .filter((k) => k.startsWith('rail-') && k !== CACHE)
        .map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
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
