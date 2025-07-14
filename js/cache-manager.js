/**
 * Cache Management Utilities for Customodoro PWA
 * Handles cache clearing, service worker updates, and version management
 */

class CacheManager {
  constructor() {
    this.isClearing = false;
    this.updateAvailable = false;
  }

  /**
   * Clear all caches and reload the page
   * @param {boolean} showNotification - Whether to show user notification
   */
  async clearCacheAndReload(showNotification = true) {
    if (this.isClearing) {
      console.log("Cache clearing already in progress...");
      return;
    }

    this.isClearing = true;
    
    try {
      if (showNotification) {
        this.showToast("🔄 Clearing cache and updating...", "info");
      }

      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => {
            console.log("Deleting cache:", cacheName);
            return caches.delete(cacheName);
          })
        );
      }

      // Clear service worker cache via message
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          if (event.data.success) {
            console.log("Service worker cache cleared");
          }
        };
        
        navigator.serviceWorker.controller.postMessage(
          { type: 'CLEAR_CACHE' },
          [messageChannel.port2]
        );
      }

      // Clear localStorage selectively (keep user settings)
      const keysToKeep = [
        'siteTheme', 'customThemeBackground', 'colorThemeColor',
        'pomodoroTime', 'shortBreakTime', 'longBreakTime',
        'maxWorkTime', 'breakTimes', 'volume', 'alarmSound',
        'autoBreak', 'autoPomodoro', 'lockedInMode', 'burnupTracker'
      ];
      
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !keysToKeep.includes(key)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));

      console.log("✅ Cache cleared successfully");
      
      // Force reload with timestamp to bypass any remaining cache
      const timestamp = Date.now();
      window.location.href = `${window.location.origin}${window.location.pathname}?v=${timestamp}`;
      
    } catch (error) {
      console.error("❌ Error clearing cache:", error);
      this.showToast("⚠️ Cache clearing failed. Please try a hard refresh (Ctrl+F5)", "error");
    } finally {
      this.isClearing = false;
    }
  }

  /**
   * Show toast notification
   */
  showToast(message, type = "info") {
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = message;
      toast.className = `toast ${type} show`;
      setTimeout(() => {
        toast.classList.remove('show');
      }, 3000);
    }
  }

  /**
   * Initialize cache management and service worker update detection
   */
  init() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then((reg) => {
          console.log("✅ Service Worker registered", reg);

          // Listen for updates
          reg.onupdatefound = () => {
            const newSW = reg.installing;
            newSW.onstatechange = () => {
              if (newSW.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // New version available
                  this.updateAvailable = true;
                  this.handleUpdateAvailable();
                } else {
                  console.log("🆕 Content is cached for offline use.");
                }
              }
            };
          };

          // Check for updates every 5 minutes
          setInterval(() => {
            reg.update();
          }, 5 * 60 * 1000);

        }).catch((err) => {
          console.error("⚠️ SW registration failed", err);
        });
      });
    }
  }

  /**
   * Handle when an update is available
   */
  handleUpdateAvailable() {
    console.log("🔄 New version detected");
    
    // Show update notification
    this.showUpdateNotification();
    
    // Auto-clear cache after 3 seconds if user doesn't interact
    setTimeout(() => {
      if (this.updateAvailable) {
        console.log("Auto-updating to new version...");
        this.clearCacheAndReload();
      }
    }, 3000);
  }

  /**
   * Show update notification with options
   */
  showUpdateNotification() {
    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
      <div class="update-content">
        <span class="update-icon">🔄</span>
        <div class="update-text">
          <strong>New version available!</strong>
          <small>Update will start automatically in 3 seconds...</small>
        </div>
        <button class="update-btn update-now" onclick="cacheManager.clearCacheAndReload()">
          Update Now
        </button>
        <button class="update-btn update-later" onclick="cacheManager.dismissUpdate()">
          Later
        </button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 10000);
  }

  /**
   * Dismiss update notification
   */
  dismissUpdate() {
    this.updateAvailable = false;
    const notification = document.querySelector('.update-notification');
    if (notification) {
      notification.remove();
    }
  }

  /**
   * Force check for updates
   */
  async checkForUpdates() {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        console.log("🔍 Checking for updates...");
        this.showToast("🔍 Checking for updates...", "info");
        await registration.update();
      }
    }
  }
}

// Initialize cache manager
const cacheManager = new CacheManager();
cacheManager.init();

// Expose globally for console/debugging
window.cacheManager = cacheManager;
window.clearCacheAndReload = () => cacheManager.clearCacheAndReload();
