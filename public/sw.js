/* ═══════════════════════════════════════════════════
   Service Worker — Pocket Arcade
   Strategy: SWR (Stale-While-Revalidate) for assets
             Network-first for HTML navigations
   ═══════════════════════════════════════════════════ */

const CACHE = 'pocket-arcade-v2';

const PRECACHE = [
  '/',
  '/arcade.html',
  '/manifest.json',
  '/icon.svg',
  '/score.js',
  '/Balloon-Ride.html',
  '/Pancake-Tower.html',
  '/Simon-Says.html',
  '/Snake.html',
  '/pong.html',
  '/popo.html',
  '/breakout.html',
  '/tetris.html',
  '/2048.html',
  '/memory-match.html',
  '/pinkie-adventure.html'
];

/* ── Install: precache all, then activate immediately ── */
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (cache) {
        // allSettled = اگه یه فایل نبود، بقیه ادامه پیدا کنن
        return Promise.allSettled(
          PRECACHE.map(function (url) {
            return cache.add(url).catch(function () { /* بی‌صدا */ });
          })
        );
      })
      .then(function () {
        // فوراً فعال شو، منتظر بسته شدن tabها نمون
        return self.skipWaiting();
      })
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
            .map(function (k) {
              console.log('[SW] Deleting old cache:', k);
              return caches.delete(k);
            })
        );
      })
      .then(function () {
        // کنترل فوری همه‌ی tabها
        return self.clients.claim();
      })
  );
});

/* ── Fetch ── */
self.addEventListener('fetch', function (e) {
  const req = e.request;
  const url = new URL(req.url);

  // فقط GET
  if (req.method !== 'GET') return;

  // ─── API و WebSocket → Network-only ───
  if (url.pathname.startsWith('/api/') || url.pathname === '/ws') {
    return;
  }

  // ─── Cross-origin (CDN: Tailwind, Google Fonts) ───
  if (url.origin !== self.location.origin) {
    // Cache-first برای منابع CDN (تغییر نمی‌کنن)
    e.respondWith(
      caches.match(req).then(function (cached) {
        if (cached) return cached;
        return fetch(req).then(function (res) {
          if (res && (res.ok || res.type === 'opaque')) {
            const clone = res.clone();
            caches.open(CACHE).then(function (c) { c.put(req, clone); });
          }
          return res;
        }).catch(function () {
          // اگه CDN در دسترس نبود، بی‌صدا رد شو (صفحه بدون Tailwind/Font لود میشه)
          return new Response('', { status: 503, statusText: 'Offline CDN' });
        });
      })
    );
    return;
  }

  // ─── Navigation (HTML) → Network-first, cache fallback ───
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(function (res) {
          // فقط اگه موفق بود cache کن
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(function (c) { c.put(req, clone); });
          }
          return res;
        })
        .catch(function () {
          // آفلاین: اول خود فایل، بعد arcade.html، بعد صفحه‌ی آفلاین
          return caches.match(req).then(function (cached) {
            if (cached) return cached;
            return caches.match('/arcade.html').then(function (home) {
              if (home) return home;
              return offlinePage();
            });
          });
        })
    );
    return;
  }

  // ─── Static Assets (JS, CSS, SVG, PNG, HTML غیر-navigation) ───
  // Stale-While-Revalidate
  e.respondWith(
    caches.match(req).then(function (cached) {
      const networkFetch = fetch(req)
        .then(function (res) {
          // فقط پاسخ‌های موفق یا opaque رو cache کن
          if (res && (res.ok || res.type === 'opaque')) {
            const clone = res.clone();
            caches.open(CACHE).then(function (c) { c.put(req, clone); });
          }
          return res;
        })
        .catch(function () {
          // اگه شبکه در دسترس نبود و cache هم نداریم، یه پاسخ ساده بده
          if (cached) return cached;
          return new Response('', { status: 503, statusText: 'Offline' });
        });

      // اگه cache داریم، فوری نشون بده و در پس‌زمینه آپدیت کن
      // اگه cache نداریم، منتظر شبکه بمون
      return cached || networkFetch;
    })
  );
});

/* ── صفحه‌ی آفلاین ── */
function offlinePage() {
  const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>آفلاین — پاکت آرکید</title>
<style>
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #06080F;
    color: #E2E8F0;
    font-family: system-ui, -apple-system, sans-serif;
    padding: 1rem;
    text-align: center;
  }
  .box { max-width: 320px; }
  .icon { font-size: 4rem; margin-bottom: 1rem; }
  h1 { color: #00F0FF; font-size: 1.1rem; margin: 0 0 0.5rem; }
  p { color: #94A3B8; font-size: 0.85rem; line-height: 1.7; margin: 0 0 1.25rem; }
  button {
    padding: 0.7rem 1.5rem;
    border-radius: 0.75rem;
    background: linear-gradient(180deg, #00F0FF 0%, #00A0D0 100%);
    color: #06080F;
    border: none;
    font-weight: 800;
    font-size: 0.85rem;
    cursor: pointer;
    box-shadow: 0 4px 0 0 #005070;
    font-family: inherit;
  }
  button:active { transform: translateY(2px); box-shadow: 0 2px 0 0 #005070; }
</style>
</head>
<body>
  <div class="box">
    <div class="icon">📡</div>
    <h1>اتصال قطع شده</h1>
    <p>این صفحه هنوز ذخیره نشده.<br>اتصالت رو چک کن و دوباره امتحان کن.</p>
    <button onclick="location.href='/'">برگشت به خانه</button>
  </div>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}
