const CACHE_NAME = "customodoro-static-v4"; // 4
const ASSETS_CACHE = "customodoro-assets-v1";
const urlsToCache = [
  "/", "/index.html", "/reverse.html"
];

let isFirstInstall = false;

// Install: cache only the HTML essentials
self.addEventListener("install", (event) => {
  console.log('🔧 Service Worker installing...');
  
  // Check if this is a first install
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      isFirstInstall = cacheNames.length === 0;
      return caches.open(CACHE_NAME);
    }).then(async (cache) => {
      try {
        await cache.addAll(urlsToCache);
        console.log("✅ HTML cached successfully.");
      } catch (err) {
        console.warn("⚠️ Failed to cache core HTML", err);
      }
    }).then(() => {
      // Skip waiting to activate immediately
      return self.skipWaiting();
    })
  );
});

// Activate: clean up old caches and notify clients
self.addEventListener("activate", (event) => {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    // Clean up old caches
    caches.keys().then((keys) => {
      const oldCaches = keys.filter((key) => 
        key !== CACHE_NAME && key !== ASSETS_CACHE
      );
      
      return Promise.all(
        oldCaches.map((key) => {
          console.log('🗑️ Deleting old cache:', key);
          return caches.delete(key);
        })
      );
    }).then(() => {
      console.log("✅ Activated and old caches cleared");
      
      // Only notify about updates if this isn't the first install
      if (!isFirstInstall) {
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'NEW_VERSION_AVAILABLE',
              message: 'A new version is available'
            });
          });
          console.log('📢 Notified clients about update');
        });
      } else {
        console.log('👋 First install - no update notification needed');
      }
    }).then(() => {
      return self.clients.claim();
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
});

// Combined fetch handler
self.addEventListener("fetch", (event) => {
  const { request } = event;
  
  // Handle navigation requests (HTML pages) - Network first for updates
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Always try to get fresh HTML for updates
          return response;
        })
        .catch(() => {
          // Fallback to cache if offline
          console.log('📱 Offline - serving cached HTML');
          return caches.match(request);
        })
    );
    return;
  }
  
  // Handle images and audio with caching
  if (request.destination === 'image' || request.destination === 'audio') {
    event.respondWith(
      caches.open(ASSETS_CACHE).then(cache =>
        cache.match(request).then(response => {
          if (response) {
            // Serve from cache immediately
            return response;
          }
          
          // Fetch and cache if not found
          return fetch(request).then(networkResponse => {
            // Only cache successful responses
            if (networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Return a simple fallback
            console.warn('❌ Failed to load asset:', request.url);
            return new Response('Asset not available', { 
              status: 404,
              statusText: 'Not Found'
            });
          });
        })
      )
    );
    return;
  }
  
  // Let other requests (CSS, JS, API calls) pass through normally
  // This ensures they always get fresh content
});