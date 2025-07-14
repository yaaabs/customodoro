const CACHE_NAME = "customodoro-cache-v2.3.2";
const urlsToCache = [
  "/",
  "/index.html",
  "/js/script.js",

  "/reverse.html",
  "/js/reversePomodoro.js",

  "/feedback.html",

  "/css/style.css",

  "/css/settings.css",
  "/js/settings.js",

  "/css/theme-uploader.css",
  "/js/theme-manager.js",
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

// Activate: remove old caches more aggressively
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log("Deleting old cache:", name);
            return caches.delete(name);
          })
      )
    ).then(() => {
      console.log("Cache cleanup complete");
      // Force immediate control of all clients
      return self.clients.claim();
    })
  );
});

// Fetch: Network first for HTML, cache first for assets
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  
  // Network first strategy for HTML files to ensure updates
  if (event.request.mode === "navigate" || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the new version
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(event.request);
        })
    );
  } else {
    // Cache first strategy for assets
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
        return cachedResponse || fetch(event.request).catch(() => {
          if (event.request.mode === "navigate") {
            return caches.match("/index.html");
          }
        });
      })
    );
  }
});

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log("Clearing cache:", cacheName);
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        console.log("All caches cleared by SW");
        event.ports[0].postMessage({ success: true });
      })
    );
  }
});
