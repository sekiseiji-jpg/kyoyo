// オフライン対応：骨組みは先に保存し、本文は読んだ巻だけをあとから保存する。
// 全巻をまとめて保存する操作は設定シートにあり、ページ側から同じキャッシュに入れる（app.js）。
// ファイルを更新したときは CACHE の番号を上げる（index.html の ?v= と同じ番号にする）。
const CACHE = 'eibeibungaku-v20';          // 骨組み（版を上げると入れ替わる）
const TEXTS = 'eibeibungaku-text';     // 本文（版を上げても残す）
const SHELL = [
  './',
  'index.html',
  'style.css?v=20',
  'data-works.js?v=20',
  'data-notes.js?v=20',
  'data-authors.js?v=20',
  'app.js?v=20',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'authors/alcott.jpg',
  'authors/barrie.jpg',
  'authors/baum.jpg',
  'authors/carroll.jpg',
  'authors/dickens.jpg',
  'authors/doyle.jpg',
  'authors/london.jpg',
  'authors/ohenry.jpg',
  'authors/twain.jpg',
  'authors/wilde.jpg',
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
