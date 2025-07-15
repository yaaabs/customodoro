const CACHE_NAME = "customodoro-static-v1"; // Use a stable name to avoid re-downloading
const urlsToCache = [
  "/", "/index.html", "/reverse.html"
];

// Install: cache only the HTML essentials
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        await cache.addAll(urlsToCache);
        console.log("✅ HTML cached successfully.");
      } catch (err) {
        console.warn("⚠️ Failed to cache core HTML", err);
      }
    })
  );
});

// Activate: clean up old caches if needed
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => {
      console.log("✅ Activated and old caches cleared");
      return self.clients.claim();
    })
  );
});

// Fetch: network-first for HTML, else pass-through
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  }
});
