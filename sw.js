const CACHE_NAME = "customodoro-static-v7.3.16"; // Bump to v7.3.16  
const ASSETS_CACHE = "customodoro-assets-v6.1.11"; // Bump to v6.1.11 
const urlsToCache = [
  "/", 
  "/index.html", 
  "/reverse.html",
  "/favicon/favicon.ico",
  "/favicon/favicon-32x32.png",
  "/favicon/favicon-16x16.png",
  "/favicon/apple-touch-icon.png",
  "/favicon/android-chrome-192x192.png",
  "/favicon/android-chrome-512x512.png",
  "/images/customodoro_card.png",
  "/manifest.json",
  "/css/style.css",
  "/js/script.js",
  "/js/reversePomodoro.js",
  // Add critical audio files to main cache for version control
  "/audio/Alert Sounds/alarm.mp3",
  "/audio/Alert Sounds/bell.mp3",
  "/audio/Alert Sounds/level_up.mp3",
  "/audio/Alert Sounds/message_alert.mp3"
];

let isFirstInstall = false;

// Install: cache only the HTML essentials
self.addEventListener("install", (event) => {
  console.log('🔧 Service Worker v7.3.16 installing...');
  
  // Check if this is a first install
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      isFirstInstall = cacheNames.length === 0;
      console.log('📦 Existing caches:', cacheNames);
      return caches.open(CACHE_NAME);
    }).then(async (cache) => {
      try {
        await cache.addAll(urlsToCache);
        console.log("✅ HTML cached successfully in", CACHE_NAME);
      } catch (err) {
        console.warn("⚠️ Failed to cache core HTML", err);
      }
    }).then(() => {
      // Only skip waiting if there were previous caches (i.e., this is an upgrade)
      if (!isFirstInstall) {
        console.log('⚡ Previous caches detected — skipping waiting to allow upgrade');
        return self.skipWaiting();
      }
      console.log('ℹ️ First install detected — not skipping waiting to avoid forced reload');
      return Promise.resolve();
    })
  );
});

// Activate: clean up old caches and notify clients
self.addEventListener("activate", (event) => {
  console.log('🚀 Service Worker v7.3.16 activating...');
  
  event.waitUntil(
    // Clean up old caches
    caches.keys().then((keys) => {
      const oldCaches = keys.filter((key) => 
        key !== CACHE_NAME && key !== ASSETS_CACHE
      );
      
      console.log('🗑️ Old caches to delete:', oldCaches);
      
      return Promise.all(
        oldCaches.map((key) => {
          console.log('🗑️ Deleting old cache:', key);
          return caches.delete(key);
        })
      );
    }).then((deletedResults) => {
      console.log("✅ Activated and old caches cleared");

      // If we deleted any old caches, this is an upgrade — notify clients politely
      const hadOldCaches = Array.isArray(deletedResults) && deletedResults.length > 0;
      if (hadOldCaches) {
        return self.clients.matchAll().then((clients) => {
          console.log('👥 Found clients:', clients.length);
          clients.forEach((client) => {
            console.log('📤 Sending update-available notification to client');
            client.postMessage({
              type: 'NEW_VERSION_AVAILABLE',
              message: 'A new version is available',
              forceUpdate: false // suggest a soft update; allow client to decide
            });
          });
          console.log('ℹ️ Notified clients about available update');
        });
      }

      // No old caches found — likely first install. Do not claim clients or force reloads.
      console.log('ℹ️ No previous caches found — first install, skipping client notification and claim');
      return Promise.resolve();
    })
  );
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'HARD_REFRESH') {
    console.log('💥 Hard refresh requested');
    
    // Clear all caches for hard refresh
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('🗑️ Deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        // Force refresh all clients
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'FORCE_RELOAD',
              message: 'Hard refresh initiated'
            });
          });
        });
      })
    );
  }
  
  // 📱 MOBILE FIX: Handle user cache clearing for logout
  if (event.data && event.data.type === 'CLEAR_USER_CACHE') {
    console.log('🧹 User cache clear requested (mobile logout)');
    
    // Clear caches that might contain user-specific data
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        // Clear assets cache but keep static HTML cache
        const userCaches = cacheNames.filter(name => 
          name.includes('assets') || name.includes('user') || name.includes('data')
        );
        
        console.log('🗑️ Clearing user-specific caches:', userCaches);
        
        return Promise.all(
          userCaches.map((cacheName) => {
            console.log('🗑️ Deleting user cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        // Notify clients that user cache is cleared
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'USER_CACHE_CLEARED',
              message: 'User-specific cache cleared for logout'
            });
          });
        });
      })
    );
  }
  
  // Handle skip waiting message
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('⚡ Skip waiting requested');
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
        .then(response => response)
        .catch(() => caches.match(request))
    );
    return;
  }
  
  // Handle images and audio with caching
  if (request.destination === 'image' || request.destination === 'audio') {
    event.respondWith(
      caches.open(ASSETS_CACHE).then(cache =>
        cache.match(request).then(response => {
          if (response) {
            return response;
          }
          
          return fetch(request).then(networkResponse => {
            // Only cache successful responses
            if (networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Return a fallback if needed
            return new Response('Asset not available', { status: 404 });
          });
        })
      )
    );
    return;
  }
  
  // Let other requests pass through normally
});