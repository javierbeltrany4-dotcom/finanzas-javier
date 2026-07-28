// Service worker — red primero, caché solo como red de seguridad.
//
// Antes era caché primero: rápido, pero te enseñaba la versión vieja aunque hubiera una nueva,
// y había que recargar dos veces para verla. Ahora, si hay internet, siempre ves lo último;
// la caché solo entra cuando no hay red o cuando tarda demasiado.
const CACHE = 'mis-finanzas-v9';
const SHELL = [
  './', './index.html', './style.css', './app.js', './calculos.js', './tradinverso.js',
  './patrimonio.js', './vista-patrimonio.js',
  './objetivo.js', './vista-objetivo.js',
  './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png',
];
const TIMEOUT_RED = 4000;

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

// Pide a la red con límite de tiempo y guarda lo que llegue. Si falla o tarda, tira de caché.
function redPrimero(req) {
  return new Promise((resolve) => {
    let resuelto = false;
    const desdeCache = () => caches.match(req).then((c) => c || Response.error());
    const timer = setTimeout(() => {
      if (!resuelto) { resuelto = true; desdeCache().then(resolve); }
    }, TIMEOUT_RED);

    fetch(req)
      .then((r) => {
        if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); }
        clearTimeout(timer);
        if (!resuelto) { resuelto = true; resolve(r); }
      })
      .catch(() => {
        clearTimeout(timer);
        if (!resuelto) { resuelto = true; desdeCache().then(resolve); }
      });
  });
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // La API de Tradingverso (JSONP) no se intercepta: si falla, la app usa su caché en localStorage.
  if (url.hostname.includes('script.google.com')) return;

  // Todo lo demás (app shell y datos.json): red primero, caché de reserva.
  e.respondWith(redPrimero(e.request));
});
