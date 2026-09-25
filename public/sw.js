/* Service Worker — Pocket Arcade */
const CACHE = 'pocket-arcade-v1';

const PRECACHE = [
  './',
  './arcade.html',
  './manifest.json',
  './icon.svg',
  './score.js',
  '/breakout.html',
  '/tetris.html',
  './Balloon-Ride.html',
  './Pancake-Tower.html',
  './Simon-Says.html',
  './Snake.html',
  './pong.html',
  './popo.html'
];

/* ── Install: precache all ── */
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (cache) {
        return Promise.allSettled(
          PRECACHE.map(function (url) {
            return cache.add(url).catch(function () { /* بی‌صدا */ });
          })
        );
      })
      .then(function () { return self.skipWaiting(); })
  );
});

/* ── Activate: cleanup old caches ── */
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (k) { return k !== CACHE; })
            .map(function (k) { return caches.delete(k); })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

/* ── Fetch ── */
self.addEventListener('fetch', function (e) {
  const req = e.request;
  const url = new URL(req.url);

  // فقط GET
  if (req.method !== 'GET') return;

  // API و WebSocket — مستقیم از شبکه، بدون cache
  if (url.pathname.indexOf('/api/') === 0 || url.pathname === '/ws') return;

  // Navigation requests — network first, cache fallback
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(function (res) {
          const clone = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, clone); });
          return res;
        })
        .catch(function () {
          return caches.match(req).then(function (c) {
            return c || caches.match('./arcade.html');
          });
        })
    );
    return;
  }

  // Static assets — cache first
  e.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        if (res.ok || res.type === 'opaque') {
          const clone = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, clone); });
        }
        return res;
      }).catch(function () {
        return new Response('آفلاین', { status: 503 });
      });
    })
  );
});
