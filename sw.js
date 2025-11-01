const CACHE_NAME = "customodoro-static-v7.4.0"; // Cache-First navigation for instant offline loading
const ASSETS_CACHE = "customodoro-assets-v6.1.14"; // Keep same version for soft update
const RUNTIME_CACHE = "customodoro-runtime-v7.4.0"; // UPDATED: Match main version

// Track network connectivity state for optimization
let isOnline = true;

// Performance metrics tracking
const performanceMetrics = {
  cacheHits: 0,
  cacheMisses: 0,
  networkRequests: 0,
  networkFailures: 0,
  averageLoadTime: []
};
const urlsToCache = [
  // ═══════════════════════════════════════════════════════════════════
  // HTML Pages
  // ═══════════════════════════════════════════════════════════════════
  "/", 
  "/index.html", 
  "/reverse.html",
  "/pomodoro.html",

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
  "/js/script.js",
  "/js/reversePomodoro.js",
  "/js/offline-sync.js",
  "/js/offline-fallback-ui.js",
  "/js/about-modal.js",
  "/js/auth-service.js",
  "/js/bgm-player.js",
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
  "/audio/Alert Sounds/message_alert.mp3"
];

let isFirstInstall = false;

// Update online status listeners
self.addEventListener('online', () => {
  isOnline = true;
  console.log('🌐 Network connection restored');
});

self.addEventListener('offline', () => {
  isOnline = false;
  console.log('📵 Network connection lost');
});

// Install: cache only the HTML essentials
self.addEventListener("install", (event) => {
  console.log('🔧 Service Worker v7.4.0 installing...');
  
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
  console.log('🚀 Service Worker v7.4.0 activating...');
  
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
  
  // Handle cache warming request
  if (event.data && event.data.type === 'WARM_CACHE') {
    console.log('🔥 Cache warming requested');
    
    const criticalPages = [
      '/',
      '/index.html',
      '/reverse.html',
      '/pomodoro.html'
    ];
    
    event.waitUntil(
      caches.open(CACHE_NAME).then(cache => {
        return Promise.all(
          criticalPages.map(url => {
            return fetch(url)
              .then(response => {
                if (response.ok) {
                  cache.put(url, response);
                  console.log('🔥 Warmed cache for:', url);
                }
              })
              .catch(error => {
                console.warn('⚠️ Failed to warm cache for:', url, error);
              });
          })
        );
      }).then(() => {
        console.log('✅ Cache warming complete');
        
        // Notify client
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'CACHE_WARMED',
              message: 'Critical pages cached for offline use'
            });
          });
        });
      })
    );
  }
  
  // Handle performance metrics request
  if (event.data && event.data.type === 'GET_METRICS') {
    const avgLoadTime = performanceMetrics.averageLoadTime.length > 0
      ? performanceMetrics.averageLoadTime.reduce((a, b) => a + b, 0) / performanceMetrics.averageLoadTime.length
      : 0;
    
    event.ports[0].postMessage({
      type: 'METRICS_RESPONSE',
      data: {
        ...performanceMetrics,
        avgLoadTime: avgLoadTime.toFixed(2)
      }
    });
  }
});

// Helper function: Robust cache matching with URL variations
async function findInCache(cache, request) {
  const url = new URL(request.url);
  
  // Try exact match first
  let response = await cache.match(request);
  if (response) return response;
  
  // Try without query params
  const urlWithoutQuery = url.origin + url.pathname;
  response = await cache.match(urlWithoutQuery);
  if (response) return response;
  
  // Try with/without trailing slash
  const withSlash = url.pathname.endsWith('/') ? url.pathname : url.pathname + '/';
  const withoutSlash = url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname;
  
  response = await cache.match(url.origin + withSlash);
  if (response) return response;
  
  response = await cache.match(url.origin + withoutSlash);
  if (response) return response;
  
  return null;
}

// Helper function: Try alternative URL formats
async function tryAlternativeUrls(request, cache) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Try URL variations in order
  const urlVariations = [
    request.url.replace(/\/$/, ''),           // Without trailing slash
    pathname + '.html',                        // With .html extension
    pathname.replace(/\/$/, '') + '.html',    // Both combined
    '/index.html',                             // Home fallback
    '/'                                        // Root
  ];
  
  console.log('🔍 Trying URL variations:', urlVariations);
  
  for (const urlVariation of urlVariations) {
    const fallbackResponse = await cache.match(urlVariation);
    if (fallbackResponse) {
      console.log('✅ Found fallback:', urlVariation);
      return fallbackResponse;
    }
  }
  
  // Ultimate fallback: branded offline page
  console.warn('⚠️ All URL variations failed, serving offline page');
  return createBrandedOfflinePage();
}

// Helper function to create branded offline page response
function createBrandedOfflinePage() {
  console.warn('⚠️ All caches failed, serving branded offline page');
  return new Response(getBrandedOfflinePage(), {
    status: 503,
    headers: { 'Content-Type': 'text/html' }
  });
}

// Helper function: Get branded offline page HTML
function getBrandedOfflinePage() {
  return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Offline - Customodoro</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #1a1a1a 0%, #2d1b2e 100%);
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
          }
          
          .offline-container {
            text-align: center;
            max-width: 500px;
            animation: fadeIn 0.5s ease-out;
          }
          
          .logo-container {
            margin-bottom: 32px;
          }
          
          .logo {
            width: 120px;
            height: 120px;
            background: linear-gradient(135deg, #e53935 0%, #c62828 100%);
            border-radius: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px;
            font-size: 64px;
            box-shadow: 0 8px 32px rgba(229, 57, 53, 0.3);
            animation: pulse 2s ease-in-out infinite;
          }
          
          .brand-name {
            font-size: 32px;
            font-weight: 700;
            color: #fff;
            margin-bottom: 8px;
          }
          
          .offline-icon {
            font-size: 64px;
            margin-bottom: 24px;
            opacity: 0.9;
            animation: float 3s ease-in-out infinite;
          }
          
          h1 {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #fff;
          }
          
          p {
            font-size: 16px;
            line-height: 1.6;
            color: #ccc;
            margin-bottom: 12px;
          }
          
          .highlight {
            color: #e53935;
            font-weight: 500;
          }
          
          .actions {
            margin-top: 32px;
            display: flex;
            gap: 12px;
            justify-content: center;
            flex-wrap: wrap;
          }
          
          button {
            background: #e53935;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          
          button:hover {
            background: #ff5252;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(229, 57, 53, 0.4);
          }
          
          .secondary-btn {
            background: transparent;
            border: 2px solid #e53935;
            color: #e53935;
          }
          
          .secondary-btn:hover {
            background: rgba(229, 57, 53, 0.1);
            transform: translateY(-2px);
          }
          
          .status {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            background: rgba(255, 59, 48, 0.15);
            border: 1px solid rgba(255, 59, 48, 0.3);
            border-radius: 20px;
            font-size: 14px;
            color: #ff3b30;
            margin-top: 24px;
          }
          
          .status-dot {
            width: 8px;
            height: 8px;
            background: #ff3b30;
            border-radius: 50%;
            animation: blink 2s ease-in-out infinite;
          }
          
          .connection-status {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-top: 16px;
            font-size: 14px;
            color: #888;
          }
          
          .checking {
            animation: spin 1s linear infinite;
          }
          
          .cached-pages {
            margin-top: 24px;
            padding: 16px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            text-align: left;
            max-width: 400px;
            margin-left: auto;
            margin-right: auto;
          }
          
          .cached-pages h3 {
            font-size: 14px;
            margin-bottom: 12px;
            color: #fff;
            text-align: center;
          }
          
          .cached-pages ul {
            list-style: none;
            padding: 0;
          }
          
          .cached-pages li {
            padding: 8px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }
          
          .cached-pages li:last-child {
            border-bottom: none;
          }
          
          .cached-pages a {
            color: #e53935;
            text-decoration: none;
            transition: color 0.2s;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .cached-pages a:hover {
            color: #ff5252;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.05);
            }
          }
          
          @keyframes float {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-10px);
            }
          }
          
          @keyframes blink {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.3;
            }
          }
        </style>
      </head>
      <body>
        <div class="offline-container">
          <div class="logo-container">
            <div class="logo">🍅</div>
            <div class="brand-name">Customodoro</div>
          </div>
          
          <div class="offline-icon">📵</div>
          
          <h1>You're Offline</h1>
          
          <p>
            This page isn't cached yet. Don't worry, your timer and productivity data 
            are <span class="highlight">safely saved locally</span>.
          </p>
          
          <p>
            Connect to the internet to access all features and sync your progress.
          </p>
          
          <div class="status">
            <span class="status-dot"></span>
            <span>Offline Mode</span>
          </div>
          
          <!-- Available offline pages -->
          <div class="cached-pages">
            <h3>📦 Available Offline Pages</h3>
            <ul>
              <li><a href="/"><span>🏠</span> <span>Home / Timer</span></a></li>
              <li><a href="/reverse.html"><span>🔄</span> <span>Reverse Pomodoro</span></a></li>
              <li><a href="/pomodoro.html"><span>⏱️</span> <span>Standard Pomodoro</span></a></li>
            </ul>
          </div>
          
          <!-- Connection checker -->
          <div class="connection-status">
            <span class="checking">🔄</span>
            <span id="connection-text">Checking connection...</span>
          </div>
          
          <div class="actions">
            <button onclick="checkConnectionAndReload()">Try Again</button>
            <button class="secondary-btn" onclick="location.href='/'">Go to Home</button>
          </div>
        </div>
        
        <script>
          // Auto-reload when connection restored
          window.addEventListener('online', () => {
            console.log('Connection restored, reloading...');
            location.reload();
          });
          
          // Check connection and reload if available
          function checkConnectionAndReload() {
            const statusText = document.getElementById('connection-text');
            statusText.textContent = 'Checking...';
            
            fetch('/manifest.json', { method: 'HEAD', cache: 'no-cache' })
              .then(() => {
                statusText.textContent = 'Connected! Reloading...';
                setTimeout(() => location.reload(), 500);
              })
              .catch(() => {
                statusText.textContent = 'Still offline. Try again in a moment.';
              });
          }
          
          // Check connection on load
          setTimeout(checkConnectionAndReload, 1000);
          
          // Re-check every 5 seconds
          setInterval(() => {
            if (!navigator.onLine) {
              checkConnectionAndReload();
            }
          }, 5000);
        </script>
      </body>
      </html>
    `;
}

// ═══════════════════════════════════════════════════════════════════
// FETCH EVENT LISTENER - Cache-First for instant offline loading
// ═══════════════════════════════════════════════════════════════════
// Combined fetch handler - CACHE-FIRST for instant offline loading (Phase 2)
// Uses Stale-While-Revalidate pattern for fresh content
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // ═══════════════════════════════════════════════════════════════════
  // IMPROVED: Cache-First navigation for instant offline loading
  // Uses Stale-While-Revalidate pattern to keep content fresh
  // ═══════════════════════════════════════════════════════════════════
  if (request.mode === "navigate") {
    const startTime = performance.now();
    
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return findInCache(cache, request).then(cachedResponse => {
          
          // 1️⃣ If cached, serve immediately (instant for offline users)
          if (cachedResponse) {
            performanceMetrics.cacheHits++;
            const loadTime = performance.now() - startTime;
            performanceMetrics.averageLoadTime.push(loadTime);
            console.log(`⚡ Instant cache hit in ${loadTime.toFixed(2)}ms:`, request.url);
            
            // If we KNOW we're offline, skip network attempt entirely
            if (!isOnline) {
              console.log('� Offline mode detected, serving cache immediately');
              return cachedResponse;
            }
            
            // Background update (Stale-While-Revalidate pattern)
            fetch(request).then(networkResponse => {
              if (networkResponse && networkResponse.ok) {
                cache.put(request, networkResponse.clone());
                console.log('� Background cache update:', request.url);
                performanceMetrics.networkRequests++;
              }
            }).catch(() => {
              // Silent fail - user already has cached version
              console.log('📡 Network unavailable, serving cached version');
              performanceMetrics.networkFailures++;
            });
            
            return cachedResponse;
          }
          
          // 2️⃣ Not in cache - try network
          performanceMetrics.cacheMisses++;
          console.log('❌ Cache miss, fetching from network:', request.url);
          
          return fetch(request).then(networkResponse => {
            if (networkResponse && networkResponse.ok) {
              // Cache new page for future offline use
              cache.put(request, networkResponse.clone());
              console.log('📥 Cached new page:', request.url);
              performanceMetrics.networkRequests++;
              
              const loadTime = performance.now() - startTime;
              performanceMetrics.averageLoadTime.push(loadTime);
              console.log(`📡 Network fetch in ${loadTime.toFixed(2)}ms`);
            }
            return networkResponse;
          }).catch(error => {
            console.warn('❌ Network failed, trying fallbacks:', error);
            performanceMetrics.networkFailures++;
            
            // 3️⃣ Network failed - try alternative URL formats
            return tryAlternativeUrls(request, cache);
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