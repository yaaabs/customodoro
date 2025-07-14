const CACHE_NAME = "customodoro-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/css/style.css",
  "/css/settings.css",
  "/js/script.js",
  "/js/settings.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
