const CACHE_NAME = "customodoro-cache-v2.2.2";
const urlsToCache = [
  "/",
  "/index.html",
  "/reverse.html",
  "/feedback.html",
  "/css/style.css",
  "/css/settings.css",
  "/js/script.js",
  "/js/settings.js",
  "/js/theme-manager.js",
  "/css/theme-uploader.css",
  "/images/Theme/ManInRain.gif",
  "/sw.js"
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
    caches.match(event.request, { ignoreSearch: true }).then((response) => {
      return response || fetch(event.request).catch(() => {
        // If navigation request fails (e.g., no internet), show fallback
        if (event.request.mode === 'navigate') {
          return caches.match("/index.html");
        }
      });
    })
  );
});
