// Service worker — app shell offline + datos network-first.
const CACHE = 'mis-finanzas-v2';
const SHELL = [
  './', './index.html', './style.css', './app.js', './calculos.js', './tradinverso.js',
  './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // La API de Tradingverso (JSONP) no se intercepta: si falla, la app usa su caché en localStorage.
  if (url.hostname.includes('script.google.com')) return;

  // datos.json -> network-first (para coger cambios), con fallback a caché.
  if (url.pathname.endsWith('datos.json')) {
    e.respondWith(
      fetch(e.request)
        .then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); return r; })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // App shell -> cache-first.
  e.respondWith(caches.match(e.request).then((c) => c || fetch(e.request)));
});
