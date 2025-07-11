const CACHE_NAME = "focuskaya-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/css/style.css",
  "/css/settings.css",
  "/js/script.js",
  "/js/settings.js",
  "/images/Pomodoro.png"
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
