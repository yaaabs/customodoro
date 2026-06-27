// Sync Manager
class SyncManager {
  constructor() {
    this.baseURL = "https://customodoro-backend.onrender.com";
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
        if (event === "login") {
          this.performInitialSync();
          this.startAutoSync(); // Start background auto-sync
        } else if (event === "logout") {
          this.stopAutoSync(); // Stop background auto-sync
        } else if (event === "restore" && data) {
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

    try {
      // Only do a gentle sync - don't show loading states
      await this.pullDataFromServer();
    } catch (error) {
      window.customodoroLogger.error("SYNC_MANAGER_PAGE_LOAD_AUTO_SYNC_FAILED_SILENT");
      // Queue for later if failed
      this.queueSync(this.getCurrentLocalData());
    }
  }

  // Start background auto-sync every 5 minutes
  startAutoSync() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
    }

    this.autoSyncInterval = setInterval(
      async () => {
        if (
          window.authService?.isLoggedIn() &&
          this.isOnline &&
          !this.syncInProgress
        ) {
          try {
            await this.pullDataFromServer();
            await this.pushDataToServer();
          } catch (error) {
            window.customodoroLogger.error("SYNC_MANAGER_BACKGROUND_AUTO_SYNC_FAILED");
            // Queue for later if failed
            this.queueSync(this.getCurrentLocalData());
          }
        }
      },
      5 * 60 * 1000,
    ); // Every 5 minutes

  }

  // Stop background auto-sync
  stopAutoSync() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
    }
  }

  // Setup event listeners
  setupEventListeners() {
    // Online/offline detection
    window.addEventListener("online", () => {
      this.isOnline = true;
      this.notifyListeners("connection", true);
      this.processSyncQueue();

      // Auto-sync when coming back online
      if (window.authService?.isLoggedIn()) {
        setTimeout(async () => {
          try {
            await this.manualSync();
          } catch (error) {
            window.customodoroLogger.error("SYNC_MANAGER_ONLINE_AUTO_SYNC_FAILED");
          }
        }, 1000); // Small delay to ensure connection is stable
      }
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
      this.notifyListeners("connection", false);
    });

    // Auto-sync when window regains focus (user returns to tab)
    window.addEventListener("focus", () => {
      if (
        window.authService?.isLoggedIn() &&
        this.isOnline &&
        !this.syncInProgress
      ) {
        // Check if it's been more than 2 minutes since last sync
        const timeSinceLastSync = this.lastSyncTime
          ? Date.now() - new Date(this.lastSyncTime).getTime()
          : Infinity;

        if (timeSinceLastSync > 2 * 60 * 1000) {
          // 2 minutes
          setTimeout(async () => {
            try {
              await this.pullDataFromServer();
            } catch (error) {
              window.customodoroLogger.error("SYNC_MANAGER_FOCUS_AUTO_SYNC_FAILED");
            }
          }, 500);
        }
      }
    });
  }

  // Load last sync time
  loadLastSyncTime() {
    try {
      const stored = localStorage.getItem("customodoro-last-sync");
      if (stored) {
        this.lastSyncTime = new Date(stored);
      }
    } catch (error) {
      window.customodoroLogger.error("SYNC_MANAGER_FAILED_TO_LOAD_LAST_SYNC_TIME");
    }
  }

  // Save last sync time
  saveLastSyncTime() {
    try {
      this.lastSyncTime = new Date();
      localStorage.setItem(
        "customodoro-last-sync",
        this.lastSyncTime.toISOString(),
      );
    } catch (error) {
      window.customodoroLogger.error("SYNC_MANAGER_FAILED_TO_SAVE_LAST_SYNC_TIME");
    }
  }

  // Get sync status
  getSyncStatus() {
    if (!window.authService || !window.authService.isLoggedIn()) {
      return { status: "not-logged-in", message: "Not logged in" };
    }

    if (!this.isOnline) {
      return { status: "offline", message: "Offline" };
    }

    if (this.syncInProgress) {
      return { status: "syncing", message: "Syncing..." };
    }

    if (this.syncQueue.length > 0) {
      return { status: "pending", message: "Sync pending" };
    }

    return { status: "synced", message: "Synced" };
  }

  // Perform initial sync after login
  async performInitialSync() {
    if (!window.authService || !window.authService.isLoggedIn()) {
      return;
    }

    this.notifyListeners("sync-start", { type: "initial" });

    try {
      const localData = this.getCurrentLocalData();
      const hasSignificantLocalData = this.hasSignificantLocalData(localData);

      if (hasSignificantLocalData) {

        // First, push local data to server to ensure it's backed up
        try {
          await this.pushDataToServer();
        } catch (pushError) {
          window.customodoroLogger.error("SYNC_MANAGER_FAILED_TO_BACKUP_LOCAL_DATA_TO_SERVER");
          // Continue with pull, but be extra careful
        }
      }

      // Check if browser has any existing user data (could be from different user)
      const hasAnyLocalData = this.hasAnyLocalUserData();

      if (hasAnyLocalData) {
        // Check if this data belongs to current user or is contamination
        const isUserDataClean = await this.isLocalDataFromCurrentUser();

        if (!isUserDataClean) {
          this.clearLocalUserData();

          // Mark that we cleared contaminated data
        }
      }

      // Now pull server data (but with protection against overwriting)
      await this.pullDataFromServer();

      // Push any remaining local data that wasn't backed up yet
      if (hasSignificantLocalData) {
        try {
          await this.pushDataToServer();
        } catch (finalPushError) {
          window.customodoroLogger.error("SYNC_MANAGER_FINAL_PUSH_FAILED_BUT_INITIAL_SYNC_COMPLET");
        }
      }

      this.notifyListeners("sync-complete", { type: "initial" });
    } catch (error) {
      window.customodoroLogger.error("SYNC_MANAGER_INITIAL_SYNC_FAILED");
      this.notifyListeners("sync-error", error);

      // If it's a network error or 400 error, queue for retry
      if (
        error.message.includes("Failed to fetch") ||
        error.message.includes("400")
      ) {
        this.queueSync(this.getCurrentLocalData());
      }
    }
  }

  // Pull data from server
  async pullDataFromServer() {
    const user = window.authService.getCurrentUser();
    if (!user) throw new Error("User not logged in");


    const response = await fetch(
      `${this.baseURL}/api/user/${user.userId}/data`,
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch user data: ${response.status}`);
    }

    const serverData = await response.json();

    if (serverData.data && this.hasSignificantServerData(serverData.data)) {
      this.mergeServerData(serverData.data);
    } else if (serverData.data) {
      // Server has data structure but it's empty (new account)
      // Don't merge empty data over existing local data
      const localData = this.getCurrentLocalData();
      if (this.hasSignificantLocalData(localData)) {
        // Don't call mergeServerData to avoid wiping local data
        // Instead, push local data to server to populate the empty account
        try {
          await this.pushDataToServer();
        } catch (pushError) {
          window.customodoroLogger.error("SYNC_MANAGER_FAILED_TO_BACKUP_LOCAL_DATA_TO_SERVER");
          throw new Error("Failed to preserve local data during sync");
        }
      } else {
        this.mergeServerData(serverData.data);
      }
    }

    return serverData;
  }

  hasSignificantServerData(serverData) {
    if (!serverData || typeof serverData !== "object") {
      return false;
    }

    // Check sessions
    if (
      serverData.sessions &&
      Array.isArray(serverData.sessions) &&
      serverData.sessions.length > 0
    ) {
      return true;
    }

    // Check tasks
    if (
      serverData.tasks &&
      Array.isArray(serverData.tasks) &&
      serverData.tasks.length > 0
    ) {
      return true;
    }

    // Check productivity stats embedded in streaks
    if (serverData.streaks && serverData.streaks.productivityStatsByDay) {
      const productivityStats = serverData.streaks.productivityStatsByDay;
      if (productivityStats && typeof productivityStats === "object") {
        const dayCount = Object.keys(productivityStats).length;
        if (dayCount > 0) {
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
        const hasRealStreakData = Object.values(streaksData).some((value) => {
          if (typeof value === "number" && value > 0) return true;
          if (
            typeof value === "object" &&
            value !== null &&
            Object.keys(value).length > 0
          )
            return true;
          return false;
        });

        if (hasRealStreakData) {
          return true;
        }
      }
    }

    return false;
  }

  hasSignificantLocalData(localData) {
    if (!localData || typeof localData !== "object") {
      return false;
    }

    // Check sessions
    if (
      localData.sessions &&
      Array.isArray(localData.sessions) &&
      localData.sessions.length > 0
    ) {
      return true;
    }

    // Check tasks
    if (
      localData.tasks &&
      Array.isArray(localData.tasks) &&
      localData.tasks.length > 0
    ) {
      return true;
    }

    // Check productivity stats
    if (
      localData.productivityStats &&
      typeof localData.productivityStats === "object"
    ) {
      const dayCount = Object.keys(localData.productivityStats).length;
      if (dayCount > 0) {
        return true;
      }
    }

    // Check localStorage directly for productivity stats (backup check)
    try {
      const localProductivityStats = localStorage.getItem(
        "customodoroStatsByDay",
      );
      if (localProductivityStats) {
        const parsed = JSON.parse(localProductivityStats);
        if (parsed && Object.keys(parsed).length > 0) {
          return true;
        }
      }
    } catch (error) {
      window.customodoroLogger.error("SYNC_MANAGER_CHECKING_LOCALSTORAGE_PRODUCTIVITY_STATS");
    }

    // Check streaks
    if (localData.streaks && typeof localData.streaks === "object") {
      const hasRealStreakData = Object.values(localData.streaks).some(
        (value) => {
          if (typeof value === "number" && value > 0) return true;
          if (
            typeof value === "object" &&
            value !== null &&
            Object.keys(value).length > 0
          )
            return true;
          return false;
        },
      );

      if (hasRealStreakData) {
        return true;
      }
    }

    return false;
  }
  async pushDataToServer() {
    const user = window.authService.getCurrentUser();
    if (!user) throw new Error("User not logged in");

    const localData = this.getCurrentLocalData();

    // BACKEND COMPATIBILITY: Only send the 4 fields backend accepts
    // Backend schema ONLY accepts: sessions, tasks, settings, streaks
    const streaksData = {
      ...(localData.streaks || {}),

      productivityStatsByDay: localData.productivityStats || {},
    };

    const cleanData = {
      sessions: localData.sessions || [],
      tasks: localData.tasks || [],
      // settings removed - keep local only
      streaks: streaksData,
    };


    const response = await fetch(
      `${this.baseURL}/api/user/${user.userId}/sync`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cleanData),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      window.customodoroLogger.error("SYNC_MANAGER_SYNC_RESPONSE");
      window.customodoroLogger.error("SYNC_MANAGER_REQUEST_FAILED_DATA_REDACTED_FOR_SECURITY");

      // Enhanced error analysis
      if (response.status === 400) {
        window.customodoroLogger.error("SYNC_MANAGER_BACKEND_SCHEMA_BACKEND_STILL_REJECTING_DAT");
        window.customodoroLogger.error("SYNC_MANAGER_CURRENT_DATA_KEYS");
        window.customodoroLogger.error("SYNC_MANAGER_THIS_MAY_REQUIRE_BACKEND_SCHEMA_UPDATE");
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
      const sessions = localStorage.getItem("customodoro-sessions");
      if (sessions) {
        data.sessions = JSON.parse(sessions);
      }
    } catch (error) {
      window.customodoroLogger.error("SYNC_MANAGER_FAILED_TO_READ_SESSIONS");
    }

    // Tasks
    try {
      const tasks = localStorage.getItem("customodoro-tasks");
      if (tasks) {
        data.tasks = JSON.parse(tasks);
      }
    } catch (error) {
      window.customodoroLogger.error("SYNC_MANAGER_FAILED_TO_READ_TASKS");
    }

    // Streaks (include basic streak data)
    try {
      const streaks = localStorage.getItem("customodoro-streaks");
      if (streaks) {
        data.streaks = JSON.parse(streaks);
      }
    } catch (error) {
      window.customodoroLogger.error("SYNC_MANAGER_FAILED_TO_READ_STREAKS");
    }

    // Store productivity stats separately for embedding in streaks
    try {
      const productivityStats = localStorage.getItem("customodoroStatsByDay");
      if (productivityStats) {
        data.productivityStats = JSON.parse(productivityStats);
      }
    } catch (error) {
      window.customodoroLogger.error("SYNC_MANAGER_FAILED_TO_READ_PRODUCTIVITY_STATS");
    }

    // NOTE: Deliberately NOT including 'stats' or other rejected fields
    // Backend only accepts: sessions, tasks, settings, streaks

    return data;
  }

  // Merge server data with local data
  mergeServerData(serverData) {

    // 🛡️ SAFETY CHECK: Don't merge empty data over existing data
    const protectFromEmptyMerge = (localData, serverData, dataType) => {
      if (!serverData) {
        return false; // Don't merge
      }

      // Handle arrays (sessions, tasks)
      if (Array.isArray(serverData) && serverData.length === 0) {
        if (localData && Array.isArray(localData) && localData.length > 0) {
          return false; // Don't merge
        }
      }

      // Handle objects (stats, streaks, settings)
      if (typeof serverData === "object" && !Array.isArray(serverData)) {
        const serverKeys = Object.keys(serverData);
        if (serverKeys.length === 0) {
          if (
            localData &&
            typeof localData === "object" &&
            Object.keys(localData).length > 0
          ) {
            return false; // Don't merge
          }
        }
      }

      return true; // Safe to merge
    };

    // Merge sessions (combine and deduplicate)
    if (serverData.sessions) {
      try {
        const localSessions = JSON.parse(
          localStorage.getItem("customodoro-sessions") || "[]",
        );

        if (
          protectFromEmptyMerge(localSessions, serverData.sessions, "sessions")
        ) {
          const merged = this.mergeSessions(localSessions, serverData.sessions);
          localStorage.setItem("customodoro-sessions", JSON.stringify(merged));
        }
      } catch (error) {
        window.customodoroLogger.error("SYNC_MANAGER_FAILED_TO_MERGE_SESSIONS");
      }
    }

    // Merge tasks
    if (serverData.tasks) {
      try {
        const localTasks = JSON.parse(
          localStorage.getItem("customodoro-tasks") || "[]",
        );

        if (protectFromEmptyMerge(localTasks, serverData.tasks, "tasks")) {
          const merged = this.mergeTasks(localTasks, serverData.tasks);
          localStorage.setItem("customodoro-tasks", JSON.stringify(merged));
        }
      } catch (error) {
        window.customodoroLogger.error("SYNC_MANAGER_FAILED_TO_MERGE_TASKS");
      }
    }

    // Handle streaks and embedded productivity stats
    if (serverData.streaks) {
      try {
        // Extract embedded productivity stats if present
        if (serverData.streaks.productivityStatsByDay) {
          const serverProductivityStats =
            serverData.streaks.productivityStatsByDay;
          const localProductivityStats = JSON.parse(
            localStorage.getItem("customodoroStatsByDay") || "{}",
          );

          if (
            serverProductivityStats &&
            typeof serverProductivityStats === "object"
          ) {
            const serverDayCount = Object.keys(serverProductivityStats).length;
            const localDayCount = Object.keys(localProductivityStats).length;

            if (serverDayCount > 0) {
              // Server has meaningful data - safe to merge
              const mergedProductivityStats = this.mergeProductivityStats(
                localProductivityStats,
                serverProductivityStats,
              );
              localStorage.setItem(
                "customodoroStatsByDay",
                JSON.stringify(mergedProductivityStats),
              );
            } else if (localDayCount === 0) {
              // Both are empty - safe to merge empty
              localStorage.setItem(
                "customodoroStatsByDay",
                JSON.stringify(serverProductivityStats),
              );
            } else {
              // Server is empty but local has data - PROTECT LOCAL DATA
            }
          }

          // Remove from streaks before storing clean streaks data
          delete serverData.streaks.productivityStatsByDay;
        }

        // Store clean streaks data (only if it has meaningful content)
        const cleanStreaksData = { ...serverData.streaks };
        const hasRealStreakData = Object.values(cleanStreaksData).some(
          (value) => {
            if (typeof value === "number" && value > 0) return true;
            if (
              typeof value === "object" &&
              value !== null &&
              Object.keys(value).length > 0
            )
              return true;
            return false;
          },
        );

        if (
          hasRealStreakData ||
          Object.keys(
            JSON.parse(localStorage.getItem("customodoro-streaks") || "{}"),
          ).length === 0
        ) {
          localStorage.setItem(
            "customodoro-streaks",
            JSON.stringify(cleanStreaksData),
          );
        }

        // Update UI to reflect new streak data (debounced to prevent blocking)
        if (typeof window.updateStreakStatsCard === "function") {
          setTimeout(() => window.updateStreakStatsCard(), 50);
        }
        if (typeof window.renderStreakDisplay === "function") {
          setTimeout(() => window.renderStreakDisplay(), 100);
        }
        if (typeof window.renderContributionGraph === "function") {
          // Defer expensive contribution graph rendering to prevent blocking sync
          setTimeout(() => {
            requestIdleCallback(
              () => {
                window.renderContributionGraph();
              },
              { timeout: 2000 },
            );
          }, 150);
        }
      } catch (error) {
        window.customodoroLogger.error("SYNC_MANAGER_FAILED_TO_MERGE_STREAKS");
      }
    }

    // NOTE: Productivity stats now included in streaks field for backend compatibility
  } // Merge productivity stats intelligently (newer timestamps win)
  // Cap at 1440 minutes (24 hours) per day to prevent impossible values
  mergeProductivityStats(localStats, serverStats) {
    const MAX_DAILY_MINUTES = 1440;
    const merged = {};

    // Helper to cap a day's stats
    const capDayStats = (dayStats) => {
      if (!dayStats) return null;
      return {
        ...dayStats,
        total_minutes: Math.min(dayStats.total_minutes || 0, MAX_DAILY_MINUTES),
      };
    };

    // First, add all local stats (capped)
    Object.keys(localStats || {}).forEach((dateKey) => {
      merged[dateKey] = capDayStats(localStats[dateKey]);
    });

    // Then merge server stats with conflict resolution
    Object.keys(serverStats || {}).forEach((dateKey) => {
      const serverDayStats = serverStats[dateKey];
      const localDayStats = merged[dateKey];

      if (!localDayStats) {
        // No local data for this date, use server data (capped)
        merged[dateKey] = capDayStats(serverDayStats);
      } else {
        // Both exist - implement "newer timestamp wins" strategy
        const localTimestamp = new Date(
          localDayStats.lastUpdate || 0,
        ).getTime();
        const serverTimestamp = new Date(
          serverDayStats.lastUpdate || 0,
        ).getTime();

        if (serverTimestamp > localTimestamp) {
          // Server data is newer, use it (capped)
          merged[dateKey] = capDayStats(serverDayStats);
        } else if (localTimestamp > serverTimestamp) {
          // Local data is newer, keep it (already capped from first pass)
          // merged[dateKey] already has capped local data
        } else {
          // Same timestamp or no timestamps - merge by taking higher values (capped)
          merged[dateKey] = {
            classic: Math.max(
              localDayStats.classic || 0,
              serverDayStats.classic || 0,
            ),
            reverse: Math.max(
              localDayStats.reverse || 0,
              serverDayStats.reverse || 0,
            ),
            break: Math.max(
              localDayStats.break || 0,
              serverDayStats.break || 0,
            ),
            total_minutes: Math.min(
              Math.max(
                localDayStats.total_minutes || 0,
                serverDayStats.total_minutes || 0,
              ),
              MAX_DAILY_MINUTES,
            ),
            // Take the most recent timestamp
            lastUpdate: new Date(
              Math.max(localTimestamp, serverTimestamp),
            ).toISOString(),
          };
        }
      }
    });

    return merged;
  }
  mergeSessions(localSessions, serverSessions) {
    const merged = [...localSessions];

    serverSessions.forEach((serverSession) => {
      // Check if session already exists (by date and duration)
      const exists = merged.some(
        (localSession) =>
          localSession.date === serverSession.date &&
          localSession.duration === serverSession.duration &&
          Math.abs(
            new Date(localSession.timestamp || 0) -
              new Date(serverSession.timestamp || 0),
          ) < 60000, // within 1 minute
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

    serverTasks.forEach((serverTask) => {
      if (typeof serverTask === "string") {
        // Simple string task
        if (!merged.includes(serverTask)) {
          merged.push(serverTask);
        }
      } else if (serverTask && serverTask.id) {
        // Object task with ID
        const exists = merged.some(
          (localTask) => localTask && localTask.id === serverTask.id,
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
      throw new Error("Sync already in progress");
    }

    if (!window.authService || !window.authService.isLoggedIn()) {
      throw new Error("User not logged in");
    }

    if (!this.isOnline) {
      throw new Error("Device is offline");
    }

    this.syncInProgress = true;
    this.notifyListeners("sync-start", { type: "manual" });

    try {
      await this.pullDataFromServer();
      await this.pushDataToServer();
      this.notifyListeners("sync-complete", { type: "manual" });
    } catch (error) {
      this.notifyListeners("sync-error", error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  // Queue data for sync (for when offline)
  queueSync(data) {
    this.syncQueue.push({
      timestamp: new Date().toISOString(),
      data: data,
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
      window.customodoroLogger.error("SYNC_MANAGER_FAILED_TO_PROCESS_SYNC_QUEUE");
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
    this.listeners.forEach((callback) => {
      try {
        callback(event, data);
      } catch (error) {
        window.customodoroLogger.error("SYNC_MANAGER_SYNC_LISTENER");
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
      lastSync: this.lastSyncTime
        ? this.lastSyncTime.toLocaleString()
        : "Never",
      userEmail: user?.email || "Unknown",
      userName: user?.username || "Unknown",
      createdAt: user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString()
        : "Unknown",
    };
  }

  // Get detailed sync statistics for UI
  getSyncStatsDetailed() {
    try {
      // Count total synced sessions from productivity stats
      const productivityStats = JSON.parse(
        localStorage.getItem("customodoroStatsByDay") || "{}",
      );
      let totalSessions = 0;

      Object.values(productivityStats).forEach((dayData) => {
        if (dayData && dayData.total_minutes) {
          totalSessions += (dayData.classic || 0) + (dayData.reverse || 0);
        }
      });

      // Also count sessions from customodoro-sessions if it exists
      const sessions = JSON.parse(
        localStorage.getItem("customodoro-sessions") || "[]",
      );
      const sessionCount = Math.max(totalSessions, sessions.length);

      return {
        sessionsSynced: sessionCount,
        lastSync: this.lastSyncTime,
        isOnline: this.isOnline,
      };
    } catch (error) {
      window.customodoroLogger.error("SYNC_MANAGER_FAILED_TO_GET_DETAILED_SYNC_STATS");
      return {
        sessionsSynced: 0,
        lastSync: this.lastSyncTime,
        isOnline: this.isOnline,
      };
    }
  }

  // Export user data
  exportData() {
    const data = {
      user: window.authService?.getCurrentUser(),
      data: this.getCurrentLocalData(),
      exportDate: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `customodoro-data-${new Date().toISOString().split("T")[0]}.json`;
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
      "customodoroStatsByDay",
      "customodoro-sessions",
      "customodoro-tasks",
      "customodoro-streaks",

      // Additional user data that was causing contamination
      "customodoroStats", // Legacy stats format
      "reverseTasks", // Reverse mode tasks
      "customodoro-has-used-sync", // Sync usage flag
    ];

    return userDataKeys.some((key) => {
      const data = localStorage.getItem(key);
      if (!data) return false;

      try {
        const parsed = JSON.parse(data);
        // Check if data structure has content
        if (Array.isArray(parsed)) {
          return parsed.length > 0;
        } else if (typeof parsed === "object") {
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
      const hasSignificantData =
        (localData.sessions && localData.sessions.length > 0) ||
        (localData.productivityStats &&
          Object.keys(localData.productivityStats).length > 0);

      if (hasSignificantData) {
        return false;
      }
    }

    return true; // Assume data is clean if checks pass
  }

  // 🚨 SECURITY: Clear local user data to prevent contamination
  clearLocalUserData() {

    // 🚨 COMPREHENSIVE LIST: Must match auth-service clearUserSessionData()
    const userDataKeys = [
      // Primary user data
      "customodoroStatsByDay", // Productivity stats - USER SPECIFIC
      "customodoro-sessions", // Session log - USER SPECIFIC
      "customodoro-tasks", // Tasks - USER SPECIFIC
      "customodoro-streaks", // Streak data - USER SPECIFIC
      "customodoro-last-sync", // Last sync time - USER SPECIFIC

      // Additional user data that was causing contamination
      "customodoroStats", // Legacy stats format - USER SPECIFIC
      "reverseTasks", // Reverse mode tasks - USER SPECIFIC
      "customodoro-has-used-sync", // Sync usage flag - USER SPECIFIC

      // Modal state (could be user-specific)
      "seenModalVersion", // Seen update modal version - USER SPECIFIC

      // Any other potential user data patterns
      "lastFocusSession", // If exists - USER SPECIFIC
      "sessionData", // If exists - USER SPECIFIC
      "userProgress", // If exists - USER SPECIFIC
    ];

    // 📱 MOBILE FIX: More aggressive pattern matching for mobile browsers
    const additionalPatterns = [
      "customodoro-",
      "session-",
      "user-",
      "task-",
      "streak-",
      "pomo-",
      "timer-",
    ];

    // Get all localStorage keys and check for additional patterns
    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) allKeys.push(key);
    }

    // Find additional keys that match user-specific patterns
    const patternMatches = allKeys.filter(
      (key) =>
        additionalPatterns.some((pattern) => key.startsWith(pattern)) &&
        !userDataKeys.includes(key) &&
        key !== "customodoro-auth", // Don't clear auth here
    );

    // Combine explicit keys with pattern matches
    const allKeysToRemove = [...userDataKeys, ...patternMatches];


    allKeysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        window.customodoroLogger.error("SYNC_MANAGER_FAILED_TO_CLEAR_KEY");
      }
    });

    // 📱 MOBILE FIX: Also clear sessionStorage
    try {
      sessionStorage.clear();
    } catch (error) {
      window.customodoroLogger.error("SYNC_MANAGER_FAILED_TO_CLEAR_SESSIONSTORAGE");
    }

  }
}

// Create global instance
window.syncManager = new SyncManager();
