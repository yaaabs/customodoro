const CACHE_NAME = "customodoro-cache-v2.2.2"; // Update version to clear cache
const urlsToCache = [
  "/",
  "/index.html",
  "/reverse.html",
  "/feedback.html", // Add this if you have feedback page
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

// Enhanced fetch handler to handle both "/" and "/index.html"
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      
      // If requesting /index.html, try to serve from "/" cache
      if (event.request.url.endsWith('/index.html')) {
        const rootUrl = event.request.url.replace('/index.html', '/');
        return caches.match(rootUrl).then((rootResponse) => {
          return rootResponse || fetch(event.request);
        });
      }
      
      // If requesting "/", try to serve from "/index.html" cache
      if (event.request.url.endsWith('/')) {
        const indexUrl = event.request.url + 'index.html';
        return caches.match(indexUrl).then((indexResponse) => {
          return indexResponse || fetch(event.request);
        });
      }
      
      return fetch(event.request);
    })
  );
});