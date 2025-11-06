// Sync Manager
class SyncManager {
  constructor() {
    this.baseURL = 'https://customodoro-backend.onrender.com';
    this.isOnline = navigator.onLine;
    this.syncQueue = [];
    this.lastSyncTime = null;
    this.syncInProgress = false;
    this.listeners = new Set();
    this.autoSyncInterval = null;
    
    // Initialize
    this.loadLastSyncTime();
    this.setupEventListeners();
    
    // Auto-sync when user logs in (setup listener when auth service is ready)
    this.setupAuthListener();
    
    // Enhanced auto-sync: Start background sync when user is logged in
    this.setupAutoSync();
  }

  // Setup auth service listener with retry logic
  setupAuthListener() {
    if (window.authService) {
      window.authService.addEventListener((event, data) => {
        if (event === 'login') {
          this.performInitialSync();
          this.startAutoSync(); // Start background auto-sync
        } else if (event === 'logout') {
          this.stopAutoSync(); // Stop background auto-sync
        } else if (event === 'restore' && data) {
          // User restored session on page load - perform auto-sync
          this.performAutoSyncOnLoad();
          this.startAutoSync(); // Start background auto-sync
        }
      });
    } else {
      // Retry after short delay
      setTimeout(() => this.setupAuthListener(), 100);
    }
  }

  // Enhanced auto-sync setup
  setupAutoSync() {
    // Auto-sync on page load if user is already logged in
    setTimeout(() => {
      if (window.authService?.isLoggedIn()) {
        this.performAutoSyncOnLoad();
        this.startAutoSync();
      }
    }, 1000); // Give time for auth service to initialize
  }

  // Perform auto-sync on page load (gentler than initial sync)
  async performAutoSyncOnLoad() {
    if (!window.authService?.isLoggedIn() || this.syncInProgress) {
      return;
    }

    console.log('🔄 Performing auto-sync on page load...');
    try {
      // Only do a gentle sync - don't show loading states
      await this.pullDataFromServer();
      console.log('✅ Page load auto-sync completed');
    } catch (error) {
      console.warn('⚠️ Page load auto-sync failed (silent):', error);
      // Queue for later if failed
      this.queueSync(this.getCurrentLocalData());
    }
  }

  // Start background auto-sync every 5 minutes
  startAutoSync() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
    }

    this.autoSyncInterval = setInterval(async () => {
      if (window.authService?.isLoggedIn() && this.isOnline && !this.syncInProgress) {
        console.log('🔄 Background auto-sync triggered...');
        try {
          await this.pullDataFromServer();
          await this.pushDataToServer();
          console.log('✅ Background auto-sync completed');
        } catch (error) {
          console.warn('⚠️ Background auto-sync failed:', error);
          // Queue for later if failed
          this.queueSync(this.getCurrentLocalData());
        }
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    console.log('🚀 Background auto-sync started (every 5 minutes)');
  }

  // Stop background auto-sync
  stopAutoSync() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
      console.log('⏹️ Background auto-sync stopped');
    }
  }
  
  // Setup event listeners
  setupEventListeners() {
    // Online/offline detection
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners('connection', true);
      this.processSyncQueue();
      
      // Auto-sync when coming back online
      if (window.authService?.isLoggedIn()) {
        console.log('🌐 Device back online - triggering auto-sync...');
        setTimeout(async () => {
          try {
            await this.manualSync();
            console.log('✅ Online auto-sync completed');
          } catch (error) {
            console.warn('⚠️ Online auto-sync failed:', error);
          }
        }, 1000); // Small delay to ensure connection is stable
      }
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners('connection', false);
    });

    // Auto-sync when window regains focus (user returns to tab)
    window.addEventListener('focus', () => {
      if (window.authService?.isLoggedIn() && this.isOnline && !this.syncInProgress) {
        // Check if it's been more than 2 minutes since last sync
        const timeSinceLastSync = this.lastSyncTime ? 
          (Date.now() - new Date(this.lastSyncTime).getTime()) : Infinity;
        
        if (timeSinceLastSync > 2 * 60 * 1000) { // 2 minutes
          console.log('👀 Tab focused after 2+ minutes - triggering auto-sync...');
          setTimeout(async () => {
            try {
              await this.pullDataFromServer();
              console.log('✅ Focus auto-sync completed');
            } catch (error) {
              console.warn('⚠️ Focus auto-sync failed:', error);
            }
          }, 500);
        }
      }
    });
  }
  
  // Load last sync time
  loadLastSyncTime() {
    try {
      const stored = localStorage.getItem('customodoro-last-sync');
      if (stored) {
        this.lastSyncTime = new Date(stored);
      }
    } catch (error) {
      console.warn('Failed to load last sync time:', error);
    }
  }
  
  // Save last sync time
  saveLastSyncTime() {
    try {
      this.lastSyncTime = new Date();
      localStorage.setItem('customodoro-last-sync', this.lastSyncTime.toISOString());
    } catch (error) {
      console.warn('Failed to save last sync time:', error);
    }
  }
  
  // Get sync status
  getSyncStatus() {
    if (!window.authService || !window.authService.isLoggedIn()) {
      return { status: 'not-logged-in', message: 'Not logged in' };
    }
    
    if (!this.isOnline) {
      return { status: 'offline', message: 'Offline' };
    }
    
    if (this.syncInProgress) {
      return { status: 'syncing', message: 'Syncing...' };
    }
    
    if (this.syncQueue.length > 0) {
      return { status: 'pending', message: 'Sync pending' };
    }
    
    return { status: 'synced', message: 'Synced' };
  }
  
  // Perform initial sync after login
  async performInitialSync() {
    if (!window.authService || !window.authService.isLoggedIn()) {
      console.log('SyncManager: Cannot perform initial sync - user not logged in');
      return;
    }
    
    console.log('SyncManager: Starting initial sync...');
    console.log('✅ Including productivity stats in streaks field for backend compatibility');
    this.notifyListeners('sync-start', { type: 'initial' });
    
    try {

      const localData = this.getCurrentLocalData();
      const hasSignificantLocalData = this.hasSignificantLocalData(localData);
      
      if (hasSignificantLocalData) {
        console.log('🛡️ Significant local data detected - ensuring it gets preserved');
        
        // First, push local data to server to ensure it's backed up
        try {
          console.log('📤 Pushing local data to server first to prevent data loss...');
          await this.pushDataToServer();
          console.log('✅ Local data successfully backed up to server');
        } catch (pushError) {
          console.warn('⚠️ Failed to backup local data to server:', pushError);
          // Continue with pull, but be extra careful
        }
      }
      
      // Check if browser has any existing user data (could be from different user)
      const hasAnyLocalData = this.hasAnyLocalUserData();
      
      if (hasAnyLocalData) {
        console.log('🔍 Local user data detected - determining sync strategy...');
        // Check if this data belongs to current user or is contamination
        const isUserDataClean = await this.isLocalDataFromCurrentUser();
        
        if (!isUserDataClean) {
          console.log('🚨 Cross-user data contamination detected! Clearing before sync...');
          this.clearLocalUserData();
          
          // Mark that we cleared contaminated data
          console.log('✅ Contaminated data cleared - proceeding with clean sync');
        } else {
          console.log('✅ Local data belongs to current user - safe to proceed');
        }
      }
      
      // Now pull server data (but with protection against overwriting)
      console.log('📥 Pulling data from server...');
      await this.pullDataFromServer();
      console.log('SyncManager: Successfully pulled data from server');
      
      // Push any remaining local data that wasn't backed up yet
      if (hasSignificantLocalData) {
        try {
          console.log('📤 Final push to ensure all local data is synced...');
          await this.pushDataToServer();
          console.log('SyncManager: Successfully pushed final data to server');
        } catch (finalPushError) {
          console.warn('⚠️ Final push failed, but initial sync completed:', finalPushError);
        }
      }
      
      this.notifyListeners('sync-complete', { type: 'initial' });
      console.log('SyncManager: Initial sync completed successfully');
      console.log('📊 Productivity stats synced successfully via streaks field workaround');
    } catch (error) {
      console.error('Initial sync failed:', error);
      this.notifyListeners('sync-error', error);
      
      // If it's a network error or 400 error, queue for retry
      if (error.message.includes('Failed to fetch') || error.message.includes('400')) {
        console.log('SyncManager: Queueing failed sync for retry');
        this.queueSync(this.getCurrentLocalData());
      }
    }
  }
  
  // Pull data from server
  async pullDataFromServer() {
    const user = window.authService.getCurrentUser();
    if (!user) throw new Error('User not logged in');
    
    console.log('Pulling data from server for user: [REDACTED]');
    
    const response = await fetch(`${this.baseURL}/api/user/${user.userId}/data`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch user data: ${response.status}`);
    }
    
    const serverData = await response.json();
    

    if (serverData.data && this.hasSignificantServerData(serverData.data)) {
      console.log('📥 Server has significant data, merging with local data');
      this.mergeServerData(serverData.data);
    } else if (serverData.data) {
      console.log('⚠️ Server data exists but is empty/minimal - preserving local data');
      // Server has data structure but it's empty (new account)
      // Don't merge empty data over existing local data
      const localData = this.getCurrentLocalData();
      if (this.hasSignificantLocalData(localData)) {
        console.log('🛡️ CRITICAL: Protecting existing local data from being overwritten by empty server data');
        console.log('🛡️ Local data will be preserved and pushed to server instead');
        // Don't call mergeServerData to avoid wiping local data
        // Instead, push local data to server to populate the empty account
        try {
          await this.pushDataToServer();
          console.log('✅ Local data successfully uploaded to server account');
        } catch (pushError) {
          console.error('❌ Failed to backup local data to server:', pushError);
          throw new Error('Failed to preserve local data during sync');
        }
      } else {
        console.log('📭 Both server and local data are empty, safe to proceed');
        this.mergeServerData(serverData.data);
      }
    } else {
      console.log('📭 No server data found, keeping local data intact');
    }
    
    return serverData;
  }
  

  hasSignificantServerData(serverData) {
    if (!serverData || typeof serverData !== 'object') {
      return false;
    }
    
    // Check sessions
    if (serverData.sessions && Array.isArray(serverData.sessions) && serverData.sessions.length > 0) {
      console.log('✅ Server has sessions:', serverData.sessions.length);
      return true;
    }
    
    // Check tasks  
    if (serverData.tasks && Array.isArray(serverData.tasks) && serverData.tasks.length > 0) {
      console.log('✅ Server has tasks:', serverData.tasks.length);
      return true;
    }
    
    // Check productivity stats embedded in streaks
    if (serverData.streaks && serverData.streaks.productivityStatsByDay) {
      const productivityStats = serverData.streaks.productivityStatsByDay;
      if (productivityStats && typeof productivityStats === 'object') {
        const dayCount = Object.keys(productivityStats).length;
        if (dayCount > 0) {
          console.log('✅ Server has productivity stats for', dayCount, 'days');
          return true;
        }
      }
    }
    
    // Check for any non-empty streaks data (excluding productivityStatsByDay)
    if (serverData.streaks) {
      const streaksData = { ...serverData.streaks };
      delete streaksData.productivityStatsByDay; // Remove the embedded stats
      
      if (Object.keys(streaksData).length > 0) {
        // Check if any streak values are meaningful
        const hasRealStreakData = Object.values(streaksData).some(value => {
          if (typeof value === 'number' && value > 0) return true;
          if (typeof value === 'object' && value !== null && Object.keys(value).length > 0) return true;
          return false;
        });
        
        if (hasRealStreakData) {
          console.log('✅ Server has streak data');
          return true;
        }
      }
    }
    
    console.log('📭 Server data appears to be empty or insignificant');
    return false;
  }
  

  hasSignificantLocalData(localData) {
    if (!localData || typeof localData !== 'object') {
      console.log('📭 No local data structure');
      return false;
    }
    
    // Check sessions
    if (localData.sessions && Array.isArray(localData.sessions) && localData.sessions.length > 0) {
      console.log('✅ Local has sessions:', localData.sessions.length);
      return true;
    }
    
    // Check tasks
    if (localData.tasks && Array.isArray(localData.tasks) && localData.tasks.length > 0) {
      console.log('✅ Local has tasks:', localData.tasks.length);
      return true;
    }
    
    // Check productivity stats
    if (localData.productivityStats && typeof localData.productivityStats === 'object') {
      const dayCount = Object.keys(localData.productivityStats).length;
      if (dayCount > 0) {
        console.log('✅ Local has productivity stats for', dayCount, 'days');
        return true;
      }
    }
    
    // Check localStorage directly for productivity stats (backup check)
    try {
      const localProductivityStats = localStorage.getItem('customodoroStatsByDay');
      if (localProductivityStats) {
        const parsed = JSON.parse(localProductivityStats);
        if (parsed && Object.keys(parsed).length > 0) {
          console.log('✅ Local has productivity stats in localStorage');
          return true;
        }
      }
    } catch (error) {
      console.warn('Error checking localStorage productivity stats:', error);
    }
    
    // Check streaks
    if (localData.streaks && typeof localData.streaks === 'object') {
      const hasRealStreakData = Object.values(localData.streaks).some(value => {
        if (typeof value === 'number' && value > 0) return true;
        if (typeof value === 'object' && value !== null && Object.keys(value).length > 0) return true;
        return false;
      });
      
      if (hasRealStreakData) {
        console.log('✅ Local has streak data');
        return true;
      }
    }
    
    console.log('📭 Local data appears to be empty or insignificant');
    return false;
  }
  async pushDataToServer() {
    const user = window.authService.getCurrentUser();
    if (!user) throw new Error('User not logged in');
    
    const localData = this.getCurrentLocalData();
    
    // BACKEND COMPATIBILITY: Only send the 4 fields backend accepts
    // Backend schema ONLY accepts: sessions, tasks, settings, streaks
    const streaksData = {
      ...(localData.streaks || {}),

      productivityStatsByDay: localData.productivityStats || {}
    };
    
const cleanData = {
  sessions: localData.sessions || [],
  tasks: localData.tasks || [],
  // settings removed - keep local only
  streaks: streaksData
};
    
    console.log('Pushing data to server for user: [REDACTED]');
    console.log('✅ Sending only backend-accepted fields: sessions, tasks, settings, streaks');
    console.log('✅ Productivity stats embedded in streaks.productivityStatsByDay');
    
    const response = await fetch(`${this.baseURL}/api/user/${user.userId}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cleanData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Sync error response:', errorText);
      console.error('Request failed - data redacted for security');
      
      // Enhanced error analysis
      if (response.status === 400) {
        console.error('🚨 BACKEND SCHEMA ERROR: Backend still rejecting data');
        console.error('Current data keys:', Object.keys(cleanData));
        console.error('This may require backend schema update');
      }
      
      throw new Error(`Failed to sync data: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    this.saveLastSyncTime();
    
    return result;
  }
  
  // Get current local data (backend-safe version)
  getCurrentLocalData() {
    const data = {};
    
    // Sessions
    try {
      const sessions = localStorage.getItem('customodoro-sessions');
      if (sessions) {
        data.sessions = JSON.parse(sessions);
      }
    } catch (error) {
      console.warn('Failed to read sessions:', error);
    }
    
    // Tasks
    try {
      const tasks = localStorage.getItem('customodoro-tasks');
      if (tasks) {
        data.tasks = JSON.parse(tasks);
      }
    } catch (error) {
      console.warn('Failed to read tasks:', error);
    }
    

    
    // Streaks (include basic streak data)
    try {
      const streaks = localStorage.getItem('customodoro-streaks');
      if (streaks) {
        data.streaks = JSON.parse(streaks);
      }
    } catch (error) {
      console.warn('Failed to read streaks:', error);
    }

    // Store productivity stats separately for embedding in streaks
    try {
      const productivityStats = localStorage.getItem('customodoroStatsByDay');
      if (productivityStats) {
        data.productivityStats = JSON.parse(productivityStats);
      }
    } catch (error) {
      console.warn('Failed to read productivity stats:', error);
    }

    // NOTE: Deliberately NOT including 'stats' or other rejected fields
    // Backend only accepts: sessions, tasks, settings, streaks
    
    return data;
  }
  
  // Merge server data with local data
  mergeServerData(serverData) {
    console.log('Merging server data:', serverData);
    console.log('✅ Merging productivity stats from streaks field for full sync functionality');
    
    // 🛡️ SAFETY CHECK: Don't merge empty data over existing data
    const protectFromEmptyMerge = (localData, serverData, dataType) => {
      if (!serverData) {
        console.log(`🛡️ Server data is null/undefined for ${dataType} - protecting local data`);
        return false; // Don't merge
      }
      
      // Handle arrays (sessions, tasks)
      if (Array.isArray(serverData) && serverData.length === 0) {
        if (localData && Array.isArray(localData) && localData.length > 0) {
          console.log(`🛡️ Protecting local ${dataType} from being overwritten by empty server array`);
          return false; // Don't merge
        }
      }
      
      // Handle objects (stats, streaks, settings)
      if (typeof serverData === 'object' && !Array.isArray(serverData)) {
        const serverKeys = Object.keys(serverData);
        if (serverKeys.length === 0) {
          if (localData && typeof localData === 'object' && Object.keys(localData).length > 0) {
            console.log(`🛡️ Protecting local ${dataType} from being overwritten by empty server object`);
            return false; // Don't merge
          }
        }
      }
      
      return true; // Safe to merge
    };
    
    // Merge sessions (combine and deduplicate)
    if (serverData.sessions) {
      try {
        const localSessions = JSON.parse(localStorage.getItem('customodoro-sessions') || '[]');
        
        if (protectFromEmptyMerge(localSessions, serverData.sessions, 'sessions')) {
          const merged = this.mergeSessions(localSessions, serverData.sessions);
          localStorage.setItem('customodoro-sessions', JSON.stringify(merged));
          console.log('✅ Sessions merged successfully');
        }
      } catch (error) {
        console.warn('Failed to merge sessions:', error);
      }
    }
    
    // Merge tasks
    if (serverData.tasks) {
      try {
        const localTasks = JSON.parse(localStorage.getItem('customodoro-tasks') || '[]');
        
        if (protectFromEmptyMerge(localTasks, serverData.tasks, 'tasks')) {
          const merged = this.mergeTasks(localTasks, serverData.tasks);
          localStorage.setItem('customodoro-tasks', JSON.stringify(merged));
          console.log('✅ Tasks merged successfully');
        }
      } catch (error) {
        console.warn('Failed to merge tasks:', error);
      }
    }
    

    
    // Handle streaks and embedded productivity stats
    if (serverData.streaks) {
      try {
        // Extract embedded productivity stats if present
        if (serverData.streaks.productivityStatsByDay) {
          const serverProductivityStats = serverData.streaks.productivityStatsByDay;
          const localProductivityStats = JSON.parse(localStorage.getItem('customodoroStatsByDay') || '{}');
          

          if (serverProductivityStats && typeof serverProductivityStats === 'object') {
            const serverDayCount = Object.keys(serverProductivityStats).length;
            const localDayCount = Object.keys(localProductivityStats).length;
            

            if (serverDayCount > 0) {
              // Server has meaningful data - safe to merge
              const mergedProductivityStats = this.mergeProductivityStats(localProductivityStats, serverProductivityStats);
              localStorage.setItem('customodoroStatsByDay', JSON.stringify(mergedProductivityStats));
              console.log('✅ Successfully merged productivity stats from server');
            } else if (localDayCount === 0) {
              // Both are empty - safe to merge empty
              localStorage.setItem('customodoroStatsByDay', JSON.stringify(serverProductivityStats));
              console.log('✅ Initialized empty productivity stats from server');
            } else {
              // Server is empty but local has data - PROTECT LOCAL DATA
              console.log('🛡️ CRITICAL: Protecting local productivity stats from empty server data');
              console.log(`🛡️ Local has ${localDayCount} days of data, server has ${serverDayCount} days`);
            }
          } else {
            console.log('🛡️ Server productivity stats are invalid - protecting local data');
          }
          
          // Remove from streaks before storing clean streaks data
          delete serverData.streaks.productivityStatsByDay;
        }
        
        // Store clean streaks data (only if it has meaningful content)
        const cleanStreaksData = { ...serverData.streaks };
        const hasRealStreakData = Object.values(cleanStreaksData).some(value => {
          if (typeof value === 'number' && value > 0) return true;
          if (typeof value === 'object' && value !== null && Object.keys(value).length > 0) return true;
          return false;
        });
        
        if (hasRealStreakData || Object.keys(JSON.parse(localStorage.getItem('customodoro-streaks') || '{}')).length === 0) {
          localStorage.setItem('customodoro-streaks', JSON.stringify(cleanStreaksData));
          console.log('✅ Streaks merged successfully');
        } else {
          console.log('🛡️ Protecting local streaks from empty server data');
        }
        
        // Update UI to reflect new streak data (debounced to prevent blocking)
        if (typeof window.updateStreakStatsCard === 'function') {
          setTimeout(() => window.updateStreakStatsCard(), 50);
        }
        if (typeof window.renderStreakDisplay === 'function') {
          setTimeout(() => window.renderStreakDisplay(), 100);
        }
        if (typeof window.renderContributionGraph === 'function') {
          // Defer expensive contribution graph rendering to prevent blocking sync
          setTimeout(() => {
            requestIdleCallback(() => {
              window.renderContributionGraph();
            }, { timeout: 2000 });
          }, 150);
        }
        
      } catch (error) {
        console.warn('Failed to merge streaks:', error);
      }
    }
    
    // NOTE: Productivity stats now included in streaks field for backend compatibility
    console.log('✅ Merged data from server including productivity stats via streaks field');
  }  // Merge productivity stats intelligently (newer timestamps win)
  mergeProductivityStats(localStats, serverStats) {
    const merged = { ...localStats };
    
    // Merge day-by-day stats with proper conflict resolution
    Object.keys(serverStats).forEach(dateKey => {
      const serverDayStats = serverStats[dateKey];
      const localDayStats = merged[dateKey];
      
      if (!localDayStats) {
        // No local data for this date, use server data
        merged[dateKey] = serverDayStats;
      } else if (!serverDayStats) {
        // Keep local data as is
        return;
      } else {
        // Both exist - implement "newer timestamp wins" strategy
        const localTimestamp = new Date(localDayStats.lastUpdate || 0).getTime();
        const serverTimestamp = new Date(serverDayStats.lastUpdate || 0).getTime();
        
        if (serverTimestamp > localTimestamp) {
          // Server data is newer, use it
          console.log(`📊 Server data newer for ${dateKey}: using server data`);
          merged[dateKey] = serverDayStats;
        } else if (localTimestamp > serverTimestamp) {
          // Local data is newer, keep it
          console.log(`📊 Local data newer for ${dateKey}: keeping local data`);
          // merged[dateKey] already has local data
        } else {
          // Same timestamp or no timestamps - merge by taking higher values
          console.log(`📊 Same timestamp for ${dateKey}: merging by max values`);
          merged[dateKey] = {
            classic: Math.max(localDayStats.classic || 0, serverDayStats.classic || 0),
            reverse: Math.max(localDayStats.reverse || 0, serverDayStats.reverse || 0),
            break: Math.max(localDayStats.break || 0, serverDayStats.break || 0),
            total_minutes: Math.max(localDayStats.total_minutes || 0, serverDayStats.total_minutes || 0),
            // Take the most recent timestamp
            lastUpdate: new Date(Math.max(localTimestamp, serverTimestamp)).toISOString()
          };
        }
      }
    });
    
    console.log('✅ Productivity stats merged with conflict resolution');
    return merged;
  }
  mergeSessions(localSessions, serverSessions) {
    const merged = [...localSessions];
    
    serverSessions.forEach(serverSession => {
      // Check if session already exists (by date and duration)
      const exists = merged.some(localSession => 
        localSession.date === serverSession.date &&
        localSession.duration === serverSession.duration &&
        Math.abs(new Date(localSession.timestamp || 0) - new Date(serverSession.timestamp || 0)) < 60000 // within 1 minute
      );
      
      if (!exists) {
        merged.push(serverSession);
      }
    });
    
    // Sort by timestamp or date
    return merged.sort((a, b) => {
      const aTime = new Date(a.timestamp || a.date || 0);
      const bTime = new Date(b.timestamp || b.date || 0);
      return aTime - bTime;
    });
  }
  
  // Merge tasks intelligently
  mergeTasks(localTasks, serverTasks) {
    const merged = [...localTasks];
    
    serverTasks.forEach(serverTask => {
      if (typeof serverTask === 'string') {
        // Simple string task
        if (!merged.includes(serverTask)) {
          merged.push(serverTask);
        }
      } else if (serverTask && serverTask.id) {
        // Object task with ID
        const exists = merged.some(localTask => 
          localTask && localTask.id === serverTask.id
        );
        if (!exists) {
          merged.push(serverTask);
        }
      }
    });
    
    return merged;
  }
  
  // Manual sync
  async manualSync() {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }
    
    if (!window.authService || !window.authService.isLoggedIn()) {
      throw new Error('User not logged in');
    }
    
    if (!this.isOnline) {
      throw new Error('Device is offline');
    }
    
    this.syncInProgress = true;
    this.notifyListeners('sync-start', { type: 'manual' });
    
    try {
      await this.pullDataFromServer();
      await this.pushDataToServer();
      this.notifyListeners('sync-complete', { type: 'manual' });
    } catch (error) {
      this.notifyListeners('sync-error', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }
  
  // Queue data for sync (for when offline)
  queueSync(data) {
    this.syncQueue.push({
      timestamp: new Date().toISOString(),
      data: data
    });
    
    // Try to process queue if online
    if (this.isOnline) {
      this.processSyncQueue();
    }
  }
  
  // Process sync queue
  async processSyncQueue() {
    if (this.syncQueue.length === 0 || this.syncInProgress || !this.isOnline) {
      return;
    }
    
    try {
      await this.manualSync();
      this.syncQueue = []; // Clear queue on successful sync
    } catch (error) {
      console.error('Failed to process sync queue:', error);
    }
  }
  
  // Add event listener
  addEventListener(callback) {
    this.listeners.add(callback);
  }
  
  // Remove event listener
  removeEventListener(callback) {
    this.listeners.delete(callback);
  }
  
  // Notify listeners
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Sync listener error:', error);
      }
    });
  }
  
  // Get sync statistics
  getSyncStats() {
    const user = window.authService?.getCurrentUser();
    const localData = this.getCurrentLocalData();
    
    return {
      sessionsCount: (localData.sessions || []).length,
      tasksCount: (localData.tasks || []).length,
      lastSync: this.lastSyncTime ? this.lastSyncTime.toLocaleString() : 'Never',
      userEmail: user?.email || 'Unknown',
      userName: user?.username || 'Unknown',
      createdAt: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'
    };
  }

  // Get detailed sync statistics for UI
  getSyncStatsDetailed() {
    try {
      // Count total synced sessions from productivity stats
      const productivityStats = JSON.parse(localStorage.getItem('customodoroStatsByDay') || '{}');
      let totalSessions = 0;
      
      Object.values(productivityStats).forEach(dayData => {
        if (dayData && dayData.total_minutes) {
          totalSessions += (dayData.classic || 0) + (dayData.reverse || 0);
        }
      });

      // Also count sessions from customodoro-sessions if it exists
      const sessions = JSON.parse(localStorage.getItem('customodoro-sessions') || '[]');
      const sessionCount = Math.max(totalSessions, sessions.length);

      return {
        sessionsSynced: sessionCount,
        lastSync: this.lastSyncTime,
        isOnline: this.isOnline
      };
    } catch (error) {
      console.warn('Failed to get detailed sync stats:', error);
      return {
        sessionsSynced: 0,
        lastSync: this.lastSyncTime,
        isOnline: this.isOnline
      };
    }
  }

  // Export user data
  exportData() {
    const data = {
      user: window.authService?.getCurrentUser(),
      data: this.getCurrentLocalData(),
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `customodoro-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }
  
  // 🚨 SECURITY: Check if browser has any user-specific data
  hasAnyLocalUserData() {
    // 🚨 COMPREHENSIVE LIST: Check for ALL user-specific data
    const userDataKeys = [
      // Primary user data
      'customodoroStatsByDay',
      'customodoro-sessions', 
      'customodoro-tasks',
      'customodoro-streaks',
      
      // Additional user data that was causing contamination
      'customodoroStats',           // Legacy stats format
      'reverseTasks',               // Reverse mode tasks
      'customodoro-has-used-sync'   // Sync usage flag
    ];
    
    return userDataKeys.some(key => {
      const data = localStorage.getItem(key);
      if (!data) return false;
      
      try {
        const parsed = JSON.parse(data);
        // Check if data structure has content
        if (Array.isArray(parsed)) {
          return parsed.length > 0;
        } else if (typeof parsed === 'object') {
          return Object.keys(parsed).length > 0;
        }
        return false;
      } catch {
        return !!data; // Non-JSON data exists
      }
    });
  }
  
  // 🚨 SECURITY: Check if local data belongs to current user
  async isLocalDataFromCurrentUser() {
    const user = window.authService?.getCurrentUser();
    if (!user) return false;
    
    // Simple heuristic: if user just logged in and we have extensive local data,
    // it's likely contamination from previous user
    const currentTime = Date.now();
    const userLoginTime = new Date(user.loginTime || 0).getTime();
    const timeSinceLogin = currentTime - userLoginTime;
    
    // If user logged in less than 30 seconds ago and we have significant data,
    // it's likely contamination (user wouldn't have generated data that fast)
    if (timeSinceLogin < 30000) {
      const localData = this.getCurrentLocalData();
      const hasSignificantData = (
        (localData.sessions && localData.sessions.length > 0) ||
        (localData.productivityStats && Object.keys(localData.productivityStats).length > 0)
      );
      
      if (hasSignificantData) {
        console.log('🚨 Detected potential cross-user contamination: significant data exists within 30s of login');
        return false;
      }
    }
    
    return true; // Assume data is clean if checks pass
  }
  
  // 🚨 SECURITY: Clear local user data to prevent contamination
  clearLocalUserData() {
    console.log('🧹 Clearing potentially contaminated local user data...');
    
    // 🚨 COMPREHENSIVE LIST: Must match auth-service clearUserSessionData()
    const userDataKeys = [
      // Primary user data
      'customodoroStatsByDay',      // Productivity stats - USER SPECIFIC
      'customodoro-sessions',       // Session log - USER SPECIFIC  
      'customodoro-tasks',          // Tasks - USER SPECIFIC
      'customodoro-streaks',        // Streak data - USER SPECIFIC
      'customodoro-last-sync',      // Last sync time - USER SPECIFIC
      
      // Additional user data that was causing contamination
      'customodoroStats',           // Legacy stats format - USER SPECIFIC
      'reverseTasks',               // Reverse mode tasks - USER SPECIFIC
      'customodoro-has-used-sync',  // Sync usage flag - USER SPECIFIC
      
      // Modal state (could be user-specific)
      'seenModalVersion',           // Seen update modal version - USER SPECIFIC
      
      // Any other potential user data patterns
      'lastFocusSession',           // If exists - USER SPECIFIC
      'sessionData',                // If exists - USER SPECIFIC
      'userProgress'                // If exists - USER SPECIFIC
    ];
    
    // 📱 MOBILE FIX: More aggressive pattern matching for mobile browsers  
    const additionalPatterns = ['customodoro-', 'session-', 'user-', 'task-', 'streak-', 'pomo-', 'timer-'];
    
    // Get all localStorage keys and check for additional patterns
    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) allKeys.push(key);
    }
    
    // Find additional keys that match user-specific patterns
    const patternMatches = allKeys.filter(key => 
      additionalPatterns.some(pattern => key.startsWith(pattern)) &&
      !userDataKeys.includes(key) &&
      key !== 'customodoro-auth' // Don't clear auth here
    );
    
    // Combine explicit keys with pattern matches
    const allKeysToRemove = [...userDataKeys, ...patternMatches];
    
    console.log('🗑️ Keys to clear for contamination prevention:', allKeysToRemove);
    
    allKeysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
        console.log(`✅ Cleared: ${key}`);
      } catch (error) {
        console.warn(`⚠️ Failed to clear ${key}:`, error);
      }
    });
    
    // 📱 MOBILE FIX: Also clear sessionStorage 
    try {
      console.log('🧹 Clearing sessionStorage for mobile compatibility...');
      sessionStorage.clear();
      console.log('✅ SessionStorage cleared');
    } catch (error) {
      console.warn('⚠️ Failed to clear sessionStorage:', error);
    }
    
    console.log('🔒 Local user data cleared successfully');
  }
}

// Create global instance
window.syncManager = new SyncManager();

// 🧪 DEBUG: Global functions for testing cross-account contamination
window.debugSyncContamination = function() {
  console.log('\n=== 🔍 COMPREHENSIVE CONTAMINATION DEBUG ===');
  
  // Check auth state
  const currentUser = window.authService?.getCurrentUser();
  console.log('🔍 SYNC CONTAMINATION DEBUG:');
  console.log('Current User:', currentUser ? '[LOGGED IN]' : 'Not logged in');
  console.log('User ID:', currentUser?.userId ? '[REDACTED]' : 'N/A');
  console.log('Login Time:', currentUser?.loginTime ? '[REDACTED]' : 'N/A');
  
  // Check all potential contamination keys
  const allUserDataKeys = [
    'customodoroStatsByDay', 'customodoro-sessions', 'customodoro-tasks', 
    'customodoro-streaks', 'customodoro-last-sync', 'customodoroStats',
    'reverseTasks', 'customodoro-has-used-sync', 'seenModalVersion'
  ];
  
  console.log('\n📊 CURRENT LOCALSTORAGE USER DATA:');
  allUserDataKeys.forEach(key => {
    const data = localStorage.getItem(key);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        const count = Array.isArray(parsed) ? parsed.length : 
                     typeof parsed === 'object' ? Object.keys(parsed).length : 'non-object';
        console.log(`✅ ${key}: ${count} items`);
      } catch {
        console.log(`✅ ${key}: ${data.length} chars (non-JSON)`);
      }
    } else {
      console.log(`❌ ${key}: empty`);
    }
  });
  
  // Check pattern-based keys
  console.log('\n🔍 PATTERN-BASED KEY SCAN:');
  const patterns = ['customodoro-', 'session-', 'user-', 'task-', 'streak-'];
  const allKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) allKeys.push(key);
  }
  
  patterns.forEach(pattern => {
    const matches = allKeys.filter(key => key.startsWith(pattern));
    if (matches.length > 0) {
      console.log(`🎯 Keys starting with "${pattern}":`, matches);
    }
  });
  
  // Sync manager state
  const hasData = window.syncManager?.hasAnyLocalUserData();
  console.log('\n🧪 CONTAMINATION ANALYSIS:');
  console.log('Has Local Data:', hasData);
  console.log('Data Clean Check: Use "await window.syncManager.isLocalDataFromCurrentUser()" separately');
  
  console.log('\n💡 ACTIONS AVAILABLE:');
  console.log('- debugClearContamination() - Clear all user data');
  console.log('- debugTestContamination() - Simulate contamination');
  console.log('=== END DEBUG ===\n');
  
  return { hasData, currentUser, allKeys: allKeys.filter(k => patterns.some(p => k.startsWith(p))) };
};

window.debugClearContamination = function() {
  console.log('🧹 MANUAL CONTAMINATION CLEANUP...');
  window.syncManager?.clearLocalUserData();
  console.log('✅ Manual cleanup complete');
};

// New: Test contamination simulation  
window.debugTestContamination = function() {
  console.log('🧪 SIMULATING CONTAMINATION (for testing)...');
  
  // Add fake user data to simulate contamination
  localStorage.setItem('customodoroStats', JSON.stringify({fake: 'data'}));
  localStorage.setItem('reverseTasks', JSON.stringify([{title: 'Fake Task'}]));
  localStorage.setItem('customodoro-has-used-sync', 'true');
  
  console.log('✅ Fake contamination data added. Run debugSyncContamination() to see it.');
};

// 📱 MOBILE FIX: Extra aggressive clearing for mobile browsers
window.debugMobileClear = function() {
  console.log('📱 MOBILE-SPECIFIC CONTAMINATION CLEANUP...');
  
  // Clear localStorage
  window.syncManager?.clearLocalUserData();
  
  // Clear sessionStorage
  try {
    sessionStorage.clear();
    console.log('✅ SessionStorage cleared');
  } catch (e) {
    console.warn('⚠️ SessionStorage clear failed:', e);
  }
  
  // Request service worker cache clear
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CLEAR_USER_CACHE',
      reason: 'Mobile debug cleanup'
    });
    console.log('✅ Service worker cache clear requested');
  }
  
  // Force page reload for mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobile) {
    console.log('📱 Mobile detected - will reload page in 2 seconds...');
    setTimeout(() => {
      window.location.reload(true);
    }, 2000);
  }
  
  console.log('✅ Mobile cleanup complete');
};

// Create global instance
window.syncManager = new SyncManager();