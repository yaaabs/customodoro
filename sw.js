const CACHE_NAME = "customodoro-static-v7.4.14"; // Bump to v7.4.14
const ASSETS_CACHE = "customodoro-assets-v6.2.2"; // Bump to v6.2.2
const swLogger = (() => {
  const nativeError = console.error.bind(console);
  const emittedErrors = new Set();
  return Object.freeze({
    error(code) {
      if (
        /^[A-Z][A-Z0-9_]{2,63}$/.test(code) &&
        !emittedErrors.has(code)
      ) {
        emittedErrors.add(code);
        nativeError(`[Customodoro SW] ${code}`);
      }
    },
  });
})();
const urlsToCache = [
  // ═══════════════════════════════════════════════════════════════════
  // HTML Pages
  // ═══════════════════════════════════════════════════════════════════
  "/",
  "/index.html",
  "/reverse.html",
  "/pomodoro.html",
  "/feedback.html",

  // ═══════════════════════════════════════════════════════════════════
  // Favicons & Manifests
  // ═══════════════════════════════════════════════════════════════════
  "/favicon/favicon.ico",
  "/favicon/favicon-32x32.png",
  "/favicon/favicon-16x16.png",
  "/favicon/apple-touch-icon.png",
  "/favicon/android-chrome-192x192.png",
  "/favicon/android-chrome-512x512.png",
  "/images/customodoro_card.png",
  "/manifest.json",

  // ═══════════════════════════════════════════════════════════════════
  // CSS Files (All stylesheets for offline use)
  // ═══════════════════════════════════════════════════════════════════
  "/css/style.css",
  "/css/burnup-tracker.css",
  "/css/features.css",
  "/css/media-players.css",
  "/css/theme-uploader.css",
  "/css/utilities.css",

  // ═══════════════════════════════════════════════════════════════════
  // JavaScript Files (All core functionality)
  // ═══════════════════════════════════════════════════════════════════
  "/js/app-logger.js",
  "/js/script.js",
  "/js/reversePomodoro.js",
  "/js/offline-sync.js",
  "/js/offline-fallback-ui.js",
  "/js/about-modal.js",
  "/js/auth-service.js",
  "/js/bgm-player.js",
  "/js/copyright-year.js",
  "/js/database-achievements.js",
  "/js/database-leaderboard.js",
  "/js/focus-mode.js",
  "/js/fullscreen.js",
  "/js/header-profile.js",
  "/js/leaderboard-integration.js",
  "/js/locked-in-info-modal.js",
  "/js/lockedin-mode.js",
  "/js/midnight-splitter.js",
  "/js/mini-music-player.js",
  "/js/most-used-pomodoro.js",
  "/js/radial-menu.js",
  "/js/settings.js",
  "/js/sync-manager.js",
  "/js/sync-ui.js",
  "/js/task-retention.js",
  "/js/theme-manager.js",
  "/js/timezone-manager.js",
  "/js/user-stats.js",

  // ═══════════════════════════════════════════════════════════════════
  // Audio Files (Critical alert sounds)
  // ═══════════════════════════════════════════════════════════════════
  "/audio/Alert Sounds/alarm.mp3",
  "/audio/Alert Sounds/bell.mp3",
  "/audio/Alert Sounds/level_up.mp3",
  "/audio/Alert Sounds/message_alert.mp3",
];

let isFirstInstall = false;

// Install: cache only the HTML essentials
self.addEventListener("install", (event) => {

  // Check if this is a first install
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        isFirstInstall = cacheNames.length === 0;
        return caches.open(CACHE_NAME);
      })
      .then(async (cache) => {
        try {
          await cache.addAll(urlsToCache);
        } catch (err) {
          swLogger.error("SW_FAILED_TO_CACHE_CORE_HTML");
        }
      })
      .then(() => {
        // Force skip waiting to activate immediately - AGGRESSIVE UPDATE
        return self.skipWaiting();
      }),
  );
});

// Activate: clean up old caches and notify clients
self.addEventListener("activate", (event) => {

  event.waitUntil(
    // Clean up old caches
    caches
      .keys()
      .then((keys) => {
        const oldCaches = keys.filter(
          (key) => key !== CACHE_NAME && key !== ASSETS_CACHE,
        );


        return Promise.all(
          oldCaches.map((key) => {
            return caches.delete(key);
          }),
        );
      })
      .then(() => {

        // Always notify about updates (removed isFirstInstall check for aggressive updates)
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: "NEW_VERSION_AVAILABLE",
              message: "A new version is available",
              forceUpdate: true, // Add flag for immediate updates
            });
          });
        });
      })
      .then(() => {
        // Force claim all clients immediately
        return self.clients.claim();
      }),
  );
});

// Handle messages from main thread
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "HARD_REFRESH") {

    // Clear all caches for hard refresh
    event.waitUntil(
      caches
        .keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              return caches.delete(cacheName);
            }),
          );
        })
        .then(() => {
          // Force refresh all clients
          return self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({
                type: "FORCE_RELOAD",
                message: "Hard refresh initiated",
              });
            });
          });
        }),
    );
  }

  // 📱 MOBILE FIX: Handle user cache clearing for logout
  if (event.data && event.data.type === "CLEAR_USER_CACHE") {

    // Clear caches that might contain user-specific data
    event.waitUntil(
      caches
        .keys()
        .then((cacheNames) => {
          // Clear assets cache but keep static HTML cache
          const userCaches = cacheNames.filter(
            (name) =>
              name.includes("assets") ||
              name.includes("user") ||
              name.includes("data"),
          );


          return Promise.all(
            userCaches.map((cacheName) => {
              return caches.delete(cacheName);
            }),
          );
        })
        .then(() => {
          // Notify clients that user cache is cleared
          return self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({
                type: "USER_CACHE_CLEARED",
                message: "User-specific cache cleared for logout",
              });
            });
          });
        }),
    );
  }

  // Handle skip waiting message
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Combined fetch handler
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Handle navigation requests (HTML pages)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(() => caches.match(request)),
    );
    return;
  }

  // Handle images and audio with caching
  if (request.destination === "image" || request.destination === "audio") {
    event.respondWith(
      caches.open(ASSETS_CACHE).then((cache) =>
        cache.match(request).then((response) => {
          if (response) {
            return response;
          }

          return fetch(request)
            .then((networkResponse) => {
              // Only cache successful responses
              if (networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => {
              // Return a fallback if needed
              return new Response("Asset not available", { status: 404 });
            });
        }),
      ),
    );
    return;
  }

  // Let other requests pass through normally
});
