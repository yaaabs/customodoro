const CACHE_NAME = "customodoro-cache-v2.3.4";
const urlsToCache = [
  // HTML
  "/",
  "/index.html",
  "/reverse.html",
  "/feedback.html",

  // JS
  "/js/script.js",
  "/js/reversePomodoro.js",
  "/js/settings.js",
  "/js/theme-manager.js",
  "/js/cache-manager.js",
  "/js/fullscreen.js",
  "/js/lockedin-mode.js",
  "/js/locked-in-info-modal.js",
  "/js/focus-mode.js",
  "/js/radial-menu.js",
  "/js/bgm-player.js",
  "/js/mini-music-player.js",
  "/js/about-modal.js",
  "/js/update-modal.js",
  "/js/deferred-css-loader.js",

  // CSS
  "/css/style.css",
  "/css/mini-music-player.css",
  "/css/focus-mode.css",
  "/css/lockedin-mode.css",
  "/css/bgm-player.css",
  "/css/timer-sound.css",
  "/css/about-modal.css",
  "/css/radial-menu.css",
  "/css/settings.css",
  "/css/theme-uploader.css",
  "/css/burnup-tracker.css",

  // Audio
  "/audio/SFX/start.wav",
  "/audio/SFX/pause.wav",
  "/audio/Alert Sounds/alarm.mp3",
  "/audio/Alert Sounds/bell.mp3",
  "/audio/Alert Sounds/level_up.mp3",
  "/audio/Alert Sounds/message_alert.mp3",

  // Manifest & favicon
  "/manifest.json",
  "/favicon/favicon-32x32.png",
  "/favicon/favicon-16x16.png",
  "/favicon/apple-touch-icon.png",
  "/favicon/android-chrome-192x192.png",
  "/favicon/android-chrome-512x512.png",
  "/favicon/favicon.ico",

  // Images
  "/images/Theme/ManInRain.gif"
];

// Install: cache all files individually to avoid full rejection
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const failed = [];

      await Promise.all(
        urlsToCache.map(async (url) => {
          try {
            await cache.add(url);
          } catch (err) {
            console.warn("⚠️ Failed to cache:", url, err);
            failed.push(url);
          }
        })
      );

      if (failed.length > 0) {
        console.warn("⚠️ Some files failed to cache:", failed);
      } else {
        console.log("✅ All files cached successfully.");
      }
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
          .map((name) => {
            console.log("🧹 Deleting old cache:", name);
            return caches.delete(name);
          })
      )
    ).then(() => {
      console.log("✅ Cache cleanup complete");
      return self.clients.claim();
    })
  );
});

// Fetch: Network first for HTML, cache-first for everything else
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // HTML: use network-first strategy
  if (event.request.mode === "navigate" || url.pathname.endsWith(".html")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Other assets: use cache-first strategy
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then((cached) => {
        return cached || fetch(event.request).catch(() => {
          if (event.request.mode === "navigate") {
            return caches.match("/index.html");
          }
        });
      })
    );
  }
});

// Listen for runtime "CLEAR_CACHE" command
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            console.log("🧨 Clearing cache:", cacheName);
            return caches.delete(cacheName);
          })
        )
      ).then(() => {
        console.log("✅ All caches cleared by SW");
        event.ports[0]?.postMessage({ success: true });
      })
    );
  }
});
