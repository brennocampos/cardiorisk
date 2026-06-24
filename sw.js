// CardioRisk Service Worker — v10.5
// Estratégia:
//  - HTML/navegação (index.html): NETWORK-FIRST → sempre tenta a versão mais nova da rede;
//    usa o cache apenas como fallback offline. Isso garante que toda atualização publicada
//    no GitHub Pages apareça imediatamente, sem precisar reinstalar o PWA.
//  - Assets estáticos (ícones, manifest): CACHE-FIRST → carregam rápido; atualizados quando
//    o nome do CACHE muda (basta bumpar a versão abaixo a cada release).
const CACHE = 'cardiorisk-v10-5';
const SCOPE = '/cardiorisk/';
const FILES = [
  SCOPE,
  SCOPE + 'index.html',
  SCOPE + 'manifest.json',
  SCOPE + 'icon-192.png',
  SCOPE + 'icon-512.png'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(FILES);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

// Permite que a página force a ativação imediata do novo SW (ver script no index.html)
self.addEventListener('message', function(e) {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

function isHTMLRequest(req) {
  if (req.mode === 'navigate') return true;
  var accept = req.headers.get('accept') || '';
  return accept.indexOf('text/html') !== -1;
}

self.addEventListener('fetch', function(e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  // NETWORK-FIRST para HTML/navegação
  if (isHTMLRequest(req)) {
    e.respondWith(
      fetch(req).then(function(response) {
        var copy = response.clone();
        caches.open(CACHE).then(function(cache) { cache.put(SCOPE + 'index.html', copy); });
        return response;
      }).catch(function() {
        return caches.match(req).then(function(c) { return c || caches.match(SCOPE + 'index.html'); });
      })
    );
    return;
  }

  // CACHE-FIRST para os demais recursos (ícones, manifest, etc.)
  e.respondWith(
    caches.match(req).then(function(cached) {
      return cached || fetch(req).then(function(response) {
        var copy = response.clone();
        caches.open(CACHE).then(function(cache) { cache.put(req, copy); });
        return response;
      });
    })
  );
});
