// Offline Sync Manager - IndexedDB-based offline data persistence
// Handles queuing offline actions and syncing when back online

class OfflineSyncManager {
  constructor() {
    this.dbName = 'CustomodoroOfflineDB';
    this.dbVersion = 1;
    this.db = null;
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    
    // Initialize IndexedDB
    this.initDB();
    
    // Setup event listeners
    this.setupEventListeners();
  }

  // ═══════════════════════════════════════════════════════════════════
  // Initialize IndexedDB
  // ═══════════════════════════════════════════════════════════════════
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => {
        console.error('❌ IndexedDB failed to open:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB opened successfully');
        resolve(this.db);
        
        // Attempt to sync any pending data immediately
        this.syncPendingData();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('pendingSessions')) {
          const sessionStore = db.createObjectStore('pendingSessions', { 
            keyPath: 'sessionId',
            autoIncrement: true 
          });
          sessionStore.createIndex('timestamp', 'timestamp', { unique: false });
          sessionStore.createIndex('synced', 'synced', { unique: false });
          console.log('📦 Created pendingSessions object store');
        }
        
        if (!db.objectStoreNames.contains('pendingActions')) {
          const actionStore = db.createObjectStore('pendingActions', { 
            keyPath: 'actionId',
            autoIncrement: true 
          });
          actionStore.createIndex('timestamp', 'timestamp', { unique: false });
          actionStore.createIndex('actionType', 'actionType', { unique: false });
          console.log('📦 Created pendingActions object store');
        }
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // Setup event listeners for online/offline detection
  // ═══════════════════════════════════════════════════════════════════
  setupEventListeners() {
    window.addEventListener('online', () => {
      console.log('🌐 Device is back online');
      this.isOnline = true;
      this.showOnlineNotification();
      this.syncPendingData();
    });
    
    window.addEventListener('offline', () => {
      console.log('📴 Device is offline');
      this.isOnline = false;
      this.showOfflineNotification();
    });
    
    // Listen for pomodoro completion to save offline
    document.addEventListener('pomodoroComplete', (event) => {
      this.saveSessionOffline(event.detail);
    });
    
    document.addEventListener('reverseComplete', (event) => {
      this.saveSessionOffline(event.detail);
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // Save completed session offline
  // ═══════════════════════════════════════════════════════════════════
  async saveSessionOffline(sessionData = {}) {
    if (!this.db) {
      console.warn('⚠️ IndexedDB not initialized');
      return;
    }

    const session = {
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0],
      type: sessionData.type || 'pomodoro', // 'pomodoro', 'reverse', 'break'
      duration: sessionData.duration || 25,
      completed: true,
      synced: false,
      ...sessionData
    };

    try {
      const transaction = this.db.transaction(['pendingSessions'], 'readwrite');
      const store = transaction.objectStore('pendingSessions');
      const request = store.add(session);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          console.log('💾 Session saved offline:', session);
          this.updateOfflineIndicator(true);
          
          // If online, attempt sync immediately
          if (this.isOnline) {
            this.syncPendingData();
          }
          
          resolve(request.result);
        };

        request.onerror = () => {
          console.error('❌ Failed to save session offline:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('❌ Error saving session offline:', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // Queue generic action for offline sync
  // ═══════════════════════════════════════════════════════════════════
  async queueAction(actionType, actionData) {
    if (!this.db) {
      console.warn('⚠️ IndexedDB not initialized');
      return;
    }

    const action = {
      actionType, // 'update-settings', 'add-task', 'complete-task', etc.
      actionData,
      timestamp: Date.now(),
      synced: false
    };

    try {
      const transaction = this.db.transaction(['pendingActions'], 'readwrite');
      const store = transaction.objectStore('pendingActions');
      const request = store.add(action);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          console.log('📝 Action queued for sync:', actionType);
          this.updateOfflineIndicator(true);
          
          if (this.isOnline) {
            this.syncPendingData();
          }
          
          resolve(request.result);
        };

        request.onerror = () => {
          console.error('❌ Failed to queue action:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('❌ Error queuing action:', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // Sync all pending data to server
  // ═══════════════════════════════════════════════════════════════════
  async syncPendingData() {
    if (!this.isOnline || this.syncInProgress || !this.db) {
      return;
    }

    // Check if user is logged in
    if (!window.authService || !window.authService.isLoggedIn()) {
      console.log('⏭️ Skipping sync - user not logged in');
      return;
    }

    this.syncInProgress = true;
    console.log('🔄 Starting offline data sync...');

    try {
      // Sync pending sessions
      await this.syncPendingSessions();
      
      // Sync pending actions
      await this.syncPendingActions();
      
      console.log('✅ Offline data sync completed');
      this.updateOfflineIndicator(false);
      this.showSyncCompleteNotification();
      
    } catch (error) {
      console.error('❌ Sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // Sync pending sessions
  // ═══════════════════════════════════════════════════════════════════
  async syncPendingSessions() {
    const transaction = this.db.transaction(['pendingSessions'], 'readwrite');
    const store = transaction.objectStore('pendingSessions');
    const index = store.index('synced');
    const request = index.getAll(false); // Get all unsynced sessions

    return new Promise((resolve, reject) => {
      request.onsuccess = async () => {
        const pendingSessions = request.result;
        console.log(`📤 Syncing ${pendingSessions.length} pending sessions...`);

        if (pendingSessions.length === 0) {
          resolve();
          return;
        }

        // Sync each session
        for (const session of pendingSessions) {
          try {
            // Update localStorage with this session data
            this.updateLocalStorageWithSession(session);
            
            // If sync manager exists, trigger server sync
            if (window.syncManager) {
              await window.syncManager.pushDataToServer();
            }
            
            // Mark as synced
            session.synced = true;
            session.syncedAt = Date.now();
            store.put(session);
            
            console.log('✅ Session synced:', session.sessionId);
            
          } catch (error) {
            console.error('❌ Failed to sync session:', error);
          }
        }

        resolve();
      };

      request.onerror = () => {
        console.error('❌ Failed to get pending sessions:', request.error);
        reject(request.error);
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // Sync pending actions
  // ═══════════════════════════════════════════════════════════════════
  async syncPendingActions() {
    const transaction = this.db.transaction(['pendingActions'], 'readwrite');
    const store = transaction.objectStore('pendingActions');
    const index = store.index('synced');
    const request = index.getAll(false);

    return new Promise((resolve, reject) => {
      request.onsuccess = async () => {
        const pendingActions = request.result;
        console.log(`📤 Syncing ${pendingActions.length} pending actions...`);

        if (pendingActions.length === 0) {
          resolve();
          return;
        }

        for (const action of pendingActions) {
          try {
            // Execute the action based on type
            await this.executeAction(action);
            
            // Mark as synced
            action.synced = true;
            action.syncedAt = Date.now();
            store.put(action);
            
            console.log('✅ Action synced:', action.actionType);
            
          } catch (error) {
            console.error('❌ Failed to sync action:', error);
          }
        }

        resolve();
      };

      request.onerror = () => {
        console.error('❌ Failed to get pending actions:', request.error);
        reject(request.error);
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // Update localStorage with session data
  // ═══════════════════════════════════════════════════════════════════
  updateLocalStorageWithSession(session) {
    try {
      const statsKey = 'customodoroStatsByDay';
      const stats = JSON.parse(localStorage.getItem(statsKey) || '{}');
      
      if (!stats[session.date]) {
        stats[session.date] = {
          classic: 0,
          reverse: 0,
          total_minutes: 0
        };
      }
      
      // Update stats based on session type
      if (session.type === 'pomodoro' || session.type === 'classic') {
        stats[session.date].classic += 1;
        stats[session.date].total_minutes += session.duration;
      } else if (session.type === 'reverse') {
        stats[session.date].reverse += 1;
        stats[session.date].total_minutes += session.duration;
      }
      
      localStorage.setItem(statsKey, JSON.stringify(stats));
      
      // Trigger events to update UI
      document.dispatchEvent(new Event('statsUpdated'));
      document.dispatchEvent(new Event('contributionUpdated'));
      
    } catch (error) {
      console.error('❌ Failed to update localStorage:', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // Execute queued action
  // ═══════════════════════════════════════════════════════════════════
  async executeAction(action) {
    switch (action.actionType) {
      case 'update-settings':
        // Settings are already in localStorage, just trigger sync
        if (window.syncManager) {
          await window.syncManager.pushDataToServer();
        }
        break;
        
      case 'add-task':
        // Task operations would be handled here
        break;
        
      default:
        console.warn('⚠️ Unknown action type:', action.actionType);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // UI Notifications
  // ═══════════════════════════════════════════════════════════════════
  updateOfflineIndicator(hasPending) {
    // Update UI to show pending sync indicator
    const indicator = document.getElementById('offline-sync-indicator');
    if (indicator) {
      indicator.style.display = hasPending ? 'block' : 'none';
    }
  }

  showOfflineNotification() {
    this.showToast('📴 You are offline. Your data will be saved locally.', 3000);
  }

  showOnlineNotification() {
    this.showToast('🌐 Back online! Syncing data...', 2000);
  }

  showSyncCompleteNotification() {
    this.showToast('✅ Sync completed successfully', 2000);
  }

  showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'offline-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(79, 28, 81, 0.95);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideUp 0.3s ease-out;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideDown 0.3s ease-in';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ═══════════════════════════════════════════════════════════════════
  // Public API - Get pending sync count
  // ═══════════════════════════════════════════════════════════════════
  async getPendingSyncCount() {
    if (!this.db) return 0;

    try {
      const sessionTransaction = this.db.transaction(['pendingSessions'], 'readonly');
      const sessionStore = sessionTransaction.objectStore('pendingSessions');
      const sessionIndex = sessionStore.index('synced');
      const sessionRequest = sessionIndex.count(false);

      const actionTransaction = this.db.transaction(['pendingActions'], 'readonly');
      const actionStore = actionTransaction.objectStore('pendingActions');
      const actionIndex = actionStore.index('synced');
      const actionRequest = actionIndex.count(false);

      const [sessionCount, actionCount] = await Promise.all([
        new Promise((resolve) => {
          sessionRequest.onsuccess = () => resolve(sessionRequest.result);
        }),
        new Promise((resolve) => {
          actionRequest.onsuccess = () => resolve(actionRequest.result);
        })
      ]);

      return sessionCount + actionCount;
    } catch (error) {
      console.error('❌ Failed to get pending count:', error);
      return 0;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // Public API - Clear all synced data (cleanup)
  // ═══════════════════════════════════════════════════════════════════
  async clearSyncedData() {
    if (!this.db) return;

    try {
      // Clear synced sessions
      const sessionTransaction = this.db.transaction(['pendingSessions'], 'readwrite');
      const sessionStore = sessionTransaction.objectStore('pendingSessions');
      const sessionIndex = sessionStore.index('synced');
      const sessionRequest = sessionIndex.openCursor(true); // Get synced items

      sessionRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      // Clear synced actions
      const actionTransaction = this.db.transaction(['pendingActions'], 'readwrite');
      const actionStore = actionTransaction.objectStore('pendingActions');
      const actionIndex = actionStore.index('synced');
      const actionRequest = actionIndex.openCursor(true);

      actionRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      console.log('🗑️ Cleared synced offline data');
    } catch (error) {
      console.error('❌ Failed to clear synced data:', error);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// Initialize on page load
// ═══════════════════════════════════════════════════════════════════
if (typeof window !== 'undefined') {
  window.offlineSyncManager = new OfflineSyncManager();
  console.log('📦 Offline Sync Manager initialized');
}

// Add CSS for toast animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideUp {
    from {
      transform: translateX(-50%) translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
  }
  
  @keyframes slideDown {
    from {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
    to {
      transform: translateX(-50%) translateY(20px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
