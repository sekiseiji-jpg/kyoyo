// オフライン対応：骨組みは先に保存し、本文は読んだ章だけをあとから保存する。
// 全章をまとめて保存する操作は設定シートにあり、ページ側から同じキャッシュに入れる（app.js）。
// ファイルを更新したときは CACHE の番号を上げる（index.html の ?v= と同じ番号にする）。
const CACHE = 'kingendai-v7';          // 骨組み（版を上げると入れ替わる）
const TEXTS = 'kingendai-text';     // 本文（版を上げても残す）
const SHELL = [
  './',
  'index.html',
  'style.css?v=7',
  'data-works.js?v=7',
  'data-authors.js?v=7',
  'app.js?v=7',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  // 文豪の肖像（26枚で約390KB）。通信がなくても紹介を開けるように先に入れておく。
  'authors/akutagawa.jpg',
  'authors/ango.jpg',
  'authors/arishima.jpg',
  'authors/dazai.jpg',
  'authors/doppo.jpg',
  'authors/futabatei.jpg',
  'authors/hori.jpg',
  'authors/ichiyo.jpg',
  'authors/kajii.jpg',
  'authors/kan.jpg',
  'authors/katai.jpg',
  'authors/kenji.jpg',
  'authors/kyoka.jpg',
  'authors/kyusaku.jpg',
  'authors/nakajima.jpg',
  'authors/nankichi.jpg',
  'authors/ogai.jpg',
  'authors/rampo.jpg',
  'authors/sakutaro.jpg',
  'authors/shiki.jpg',
  'authors/soseki.jpg',
  'authors/takiji.jpg',
  'authors/takuboku.jpg',
  'authors/tanizaki.jpg',
  'authors/torahiko.jpg',
  'authors/toson.jpg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks
        .filter((k) => k !== CACHE && k !== TEXTS)
        .map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  // 本文は量が多いので、先読みせず、読んだものだけを保存する
  // ?v= は更新の目印なので、クエリを無視してよいのはページ本体を開くときだけ。
  // ここを無視すると、版を上げても古い app.js などが返りつづける。
  const loose = e.request.mode === 'navigate';
  e.respondWith(
    caches.match(e.request, { ignoreSearch: loose }).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          const store = url.pathname.indexOf('/text/') >= 0 ? TEXTS : CACHE;
          caches.open(store).then((c) => c.put(e.request, copy));
        }
        return res;
      });
    }),
  );
});
