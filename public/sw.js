// Lumen service worker — app shell caching for installable PWA.
// Strategy:
//   - precache the static shell (HTML, CSS, JS chunks, icons, manifest)
//   - for navigation: network-first, fall back to cached shell when offline
//   - for static assets: stale-while-revalidate
//   - for /api/*: never cache, always go to network
//   - skip Bearer/authenticated requests entirely

const VERSION = 'lumen-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const SHELL_URLS = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-192.png',
  '/icons/maskable-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Best-effort — if some fail, the SW still installs.
      await Promise.allSettled(SHELL_URLS.map((u) => cache.add(u)));
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop caches from previous versions
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never intercept API calls, socket.io, or Next.js dev HMR
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/socket.io/')) return;
  if (url.pathname.startsWith('/_next/webpack-hmr')) return;

  // Navigation requests → network-first, fall back to cached shell
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(SHELL_CACHE);
          cache.put('/', fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          const cached = await cache.match('/');
          if (cached) return cached;
          return new Response('Offline — please reconnect to use Lumen.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          });
        }
      })()
    );
    return;
  }

  // Same-origin static assets → stale-while-revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSET_CACHE);
        const cached = await cache.match(req);
        const fetchPromise = fetch(req)
          .then((res) => {
            if (res && res.status === 200 && res.type === 'basic') {
              cache.put(req, res.clone()).catch(() => {});
            }
            return res;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })()
    );
  }
});
