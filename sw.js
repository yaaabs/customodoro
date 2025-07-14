const CACHE_NAME = "customodoro-cache-v2.2.3";
const urlsToCache = [
  "/",
  "/index.html",
  "/css/style.css",
  "/css/settings.css",
  "/js/script.js",
  "/js/settings.js",
  "/js/theme-manager.js",
  "/css/theme-uploader.css",
  "/images/Theme/ManInRain.gif"
];

// Install: cache only safe existing files
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch((err) => {
        console.warn("Some files failed to cache:", err);
      });
    })
  );
});

// Activate: remove old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Fetch: serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => {
        if (event.request.mode === "navigate") {
          return caches.match("/index.html");
        }
      });
    })
  );
});
