const CACHE_NAME = 'techshed-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/project-one.html',
  '/project-two.html',
  '/manifest.json',
  '/favicon.ico',
  '/favicon-16.png',
  '/favicon-32.png',
  '/favicon-192.png',
  '/favicon-512.png',
  '/apple-touch-icon.png',
  '/thetechshed-round-600x600.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});
