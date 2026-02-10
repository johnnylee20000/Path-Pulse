/* Path-Pulse — minimal service worker for offline + map tiles */
const CACHE_NAME = 'path-pulse-v2';
const TILES_CACHE = 'path-pulse-tiles-v1';

const APP_ASSETS = [
  './',
  './index.html',
  './app.js',
  './styles.css',
  './manifest.json',
  './icon-512.png',
];

const TILE_ORIGINS = ['https://a.basemaps.cartocdn.com', 'https://b.basemaps.cartocdn.com', 'https://c.basemaps.cartocdn.com', 'https://d.basemaps.cartocdn.com', 'https://unpkg.com'];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_ASSETS).catch(function () {});
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME && k !== TILES_CACHE; }).map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

function isTileRequest(url) {
  try {
    var u = new URL(url);
    if (TILE_ORIGINS.some(function (o) { return url.indexOf(o) === 0; })) return true;
    if (u.pathname.indexOf('/leaflet') !== -1) return true;
    return false;
  } catch (e) { return false; }
}

self.addEventListener('fetch', function (event) {
  var url = event.request.url;
  if (event.request.method !== 'GET') return;

  if (isTileRequest(url)) {
    event.respondWith(
      caches.open(TILES_CACHE).then(function (cache) {
        return cache.match(event.request).then(function (cached) {
          if (cached) return cached;
          return fetch(event.request).then(function (res) {
            if (res.status === 200 && res.type === 'basic') {
              cache.put(event.request, res.clone());
            }
            return res;
          }).catch(function () {
            return new Response('', { status: 408, statusText: 'Offline' });
          });
        });
      })
    );
    return;
  }

  var urlObj = new URL(url);
  if (urlObj.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (res) {
        var clone = res.clone();
        if (res.status === 200 && res.type === 'basic') {
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, clone);
          });
        }
        return res;
      });
    })
  );
});
