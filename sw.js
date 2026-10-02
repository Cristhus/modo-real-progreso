/* Service worker: la app abre al instante y funciona sin conexión.
   Estrategia stale-while-revalidate: responde desde caché y actualiza en segundo plano.
   Al publicar una versión nueva, subir CACHE para limpiar la anterior. */
const CACHE = 'mrp-v2-2';
const CORE = [
  './', './index.html', './core.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !isFont) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const nav = req.mode === 'navigate';
    const cached = (await cache.match(req, { ignoreSearch: nav })) || (nav ? await cache.match('./index.html') : undefined);
    const network = fetch(req)
      .then(res => {
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      })
      .catch(() => null);
    if (cached) {
      e.waitUntil(network);
      return cached;
    }
    const res = await network;
    return res || new Response('Sin conexión', { status: 503, statusText: 'offline' });
  })());
});
