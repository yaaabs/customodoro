const CACHE_NAME = "customodoro-static-v5"; // Bump to v5 for this test
const ASSETS_CACHE = "customodoro-assets-v1";
const urlsToCache = [
  "/", "/index.html", "/reverse.html"
];

let isFirstInstall = false;

// Install: cache only the HTML essentials
self.addEventListener("install", (event) => {
  console.log('🔧 Service Worker v4 installing...');
  
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
      // Force skip waiting to activate immediately
      console.log('⚡ Force skipping waiting...');
      return self.skipWaiting();
    })
  );
});

// Activate: clean up old caches and notify clients
self.addEventListener("activate", (event) => {
  console.log('🚀 Service Worker v4 activating...');
  
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
    }).then(() => {
      console.log("✅ Activated and old caches cleared");
      
      // Only notify about updates if this isn't the first install
      if (!isFirstInstall) {
        return self.clients.matchAll().then((clients) => {
          console.log('👥 Found clients:', clients.length);
          clients.forEach((client) => {
            console.log('📤 Sending update notification to client');
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
      // Force claim all clients immediately
      console.log('🎯 Taking control of all clients');
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