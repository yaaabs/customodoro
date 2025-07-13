const CACHE_NAME = "customodoro-cache-v2.1.1";
const urlsToCache = [
  "/",
  "/index.html",
  "/css/style.css",
  "/css/settings.css",
  "/js/script.js",
  "/js/settings.js",
];

self.addEventListener("install", (event) => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name)) 
      );
    })
  );
  self.clients.claim(); 
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
