const CACHE_NAME = "customodoro-static-v7.3.23"; // Keep same version for soft update
const ASSETS_CACHE = "customodoro-assets-v6.1.14"; // Keep same version for soft update
const RUNTIME_CACHE = "customodoro-runtime-v1.0.0"; // New: Runtime cache for dynamic resources (passive) 
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

  "/audio/Alert Sounds/alarm.mp3",
  "/audio/Alert Sounds/bell.mp3",
  "/audio/Alert Sounds/level_up.mp3",
  "/audio/Alert Sounds/message_alert.mp3"
];

let isFirstInstall = false;

// Install: cache only the HTML essentials
self.addEventListener("install", (event) => {
  console.log('🔧 Service Worker v7.3.23 installing...');
  
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
      // Force skip waiting to activate immediately - AGGRESSIVE UPDATE
      console.log('⚡ Force skipping waiting...');
      return self.skipWaiting();
    })
  );
});

// Activate: clean up old caches and notify clients
self.addEventListener("activate", (event) => {
  console.log('🚀 Service Worker v7.3.23 activating...');
  
  event.waitUntil(
    // Clean up old caches
    caches.keys().then((keys) => {
      const oldCaches = keys.filter((key) => 
        key !== CACHE_NAME && key !== ASSETS_CACHE && key !== RUNTIME_CACHE
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
      
      // Always notify about updates (removed isFirstInstall check for aggressive updates)
      return self.clients.matchAll().then((clients) => {
        console.log('👥 Found clients:', clients.length);
        clients.forEach((client) => {
          console.log('📤 Sending immediate update notification to client');
          client.postMessage({
            type: 'NEW_VERSION_AVAILABLE',
            message: 'A new version is available',
            forceUpdate: true // Add flag for immediate updates
          });
        });
        console.log('📢 Notified all clients about update');
      });
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

// Combined fetch handler with improved offline support
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // ═══════════════════════════════════════════════════════════════════
  // CRITICAL FIX: Handle navigation requests with CACHE-FIRST strategy
  // ═══════════════════════════════════════════════════════════════════
  if (request.mode === "navigate") {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        if (cachedResponse) {
          console.log('📄 Serving from cache:', request.url);
          return cachedResponse;
        }
        
        // Try network if not in cache
        return fetch(request).then(networkResponse => {
          // Cache successful HTML responses for future offline use
          if (networkResponse.ok) {
            return caches.open(CACHE_NAME).then(cache => {
              cache.put(request, networkResponse.clone());
              console.log('📥 Cached new page:', request.url);
              return networkResponse;
            });
          }
          return networkResponse;
        }).catch(() => {
          // Fallback: Try to serve index.html if specific page not cached
          console.warn('⚠️ Network failed, attempting fallback to index');
          return caches.match('/index.html').then(fallback => {
            if (fallback) {
              return fallback;
            }
            // Ultimate fallback: Return a basic offline page
            return new Response(
              '<html><body><h1>Offline</h1><p>You are offline and this page is not cached.</p></body></html>',
              { headers: { 'Content-Type': 'text/html' } }
            );
          });
        });
      })
    );
    return;
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // Handle CSS and JavaScript files (Cache-First with Network Fallback)
  // ═══════════════════════════════════════════════════════════════════
  if (request.destination === 'style' || request.destination === 'script') {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(cache =>
        cache.match(request).then(cachedResponse => {
          if (cachedResponse) {
            // Serve from cache, but update cache in background
            fetch(request).then(networkResponse => {
              if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
              }
            }).catch(() => {}); // Silent fail for background update
            
            return cachedResponse;
          }
          
          // Not in cache, fetch from network
          return fetch(request).then(networkResponse => {
            if (networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            return new Response('/* Offline - Resource unavailable */', { 
              status: 503,
              headers: { 'Content-Type': request.destination === 'style' ? 'text/css' : 'application/javascript' }
            });
          });
        })
      )
    );
    return;
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // Handle images and audio with caching (existing strategy improved)
  // ═══════════════════════════════════════════════════════════════════
  if (request.destination === 'image' || request.destination === 'audio') {
    event.respondWith(
      caches.open(ASSETS_CACHE).then(cache =>
        cache.match(request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(request).then(networkResponse => {
            // Only cache successful responses
            if (networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Return a fallback if needed
            console.warn('⚠️ Failed to load asset:', request.url);
            return new Response('Asset not available', { status: 404 });
          });
        })
      )
    );
    return;
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // Handle API requests (Network-First with Cache Fallback for GET)
  // ═══════════════════════════════════════════════════════════════════
  if (url.pathname.startsWith('/api/') && request.method === 'GET') {
    event.respondWith(
      fetch(request).then(networkResponse => {
        // Cache successful API responses
        if (networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(RUNTIME_CACHE).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Return cached response if network fails
        return caches.match(request).then(cachedResponse => {
          if (cachedResponse) {
            console.log('📦 Serving cached API response (offline)');
            return cachedResponse;
          }
          // Return offline indicator
          return new Response(JSON.stringify({ 
            error: 'Offline',
            message: 'You are offline and this data is not cached'
          }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        });
      })
    );
    return;
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // Let other requests (POST, PUT, DELETE) pass through normally
  // ═══════════════════════════════════════════════════════════════════
  event.respondWith(fetch(request));
});