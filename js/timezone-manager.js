/**
 * TIMEZONE MIGRATION MANAGER
 * 
 * Safe migration from hardcoded GMT+8 to user's local timezone
 * Non-breaking changes - works with existing data structure
 * 
 * Flow:
 * 1. Detects user's timezone on first load
 * 2. Migrates existing GMT+8 data to user's timezone (one-time)
 * 3. Records new sessions in user's local timezone
 * 4. Displays heatmap using user's timezone
 */

class TimezoneManager {
  constructor() {
    this.userTimezone = this.detectTimezone();
    this.isMigrated = localStorage.getItem('customodoroTimezoneV2') === 'true';
    this.migrationLog = [];
    
    console.log('🌍 TimezoneManager initialized:', {
      userTimezone: this.userTimezone,
      isMigrated: this.isMigrated
    });
  }

  /**
   * Detect user's timezone using Intl API
   * Fallback to UTC if detection fails
   */
  detectTimezone() {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log('✅ Detected timezone:', timezone);
      return timezone;
    } catch (error) {
      console.warn('⚠️ Timezone detection failed, defaulting to UTC:', error);
      return 'UTC';
    }
  }

  /**
   * Get today's date in user's local timezone
   * This replaces getPHToday()
   */
  getUserToday() {
    const now = new Date();
    const userTime = new Date(
      now.toLocaleString('en-US', { timeZone: this.userTimezone })
    );
    return new Date(
      userTime.getFullYear(),
      userTime.getMonth(),
      userTime.getDate()
    );
  }

  /**
   * Convert any date to YYYY-MM-DD string
   * This replaces formatDateKey()
   */
  formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * MIGRATION: Convert GMT+8 dates to user's timezone
   * 
   * Example: Brazilian user with data from "2025-10-11" (GMT+8)
   * - This date exists because when it was Oct 12 in Manila, it was Oct 11 in Brazil
   * - Needs to be re-keyed to their actual local date
   * 
   * ONE-TIME operation, runs only once per user
   */
  migrateOldData() {
    if (this.isMigrated) {
      console.log('✅ Data already migrated, skipping...');
      return;
    }

    console.log('🔄 Starting timezone migration...');
    const stats = JSON.parse(localStorage.getItem('customodoroStatsByDay') || '{}');
    const oldStats = { ...stats };
    const newStats = {};
    
    // Process each old entry
    Object.entries(oldStats).forEach(([oldKey, data]) => {
      try {
        // Parse the old GMT+8 key
        const [year, month, day] = oldKey.split('-').map(Number);
        const oldDate = new Date(year, month - 1, day);
        
        // Convert from GMT+8 perspective to UTC, then to user's timezone
        // This is the critical fix!
        const gmtPlusEight = new Date(
          oldDate.getTime() + (8 * 60 * 60 * 1000) // Add 8 hours to get UTC
        );
        
        // Now convert UTC to user's timezone
        const userDate = new Date(
          gmtPlusEight.toLocaleString('en-US', { timeZone: this.userTimezone })
        );
        
        const newKey = this.formatDateKey(userDate);
        
        // Merge if date key already exists (edge case)
        if (newStats[newKey]) {
          newStats[newKey].classic += data.classic || 0;
          newStats[newKey].reverse += data.reverse || 0;
          newStats[newKey].break += data.break || 0;
          newStats[newKey].total_minutes += data.total_minutes || 0;
          // Keep the latest timestamp
          if (data.lastUpdate > newStats[newKey].lastUpdate) {
            newStats[newKey].lastUpdate = data.lastUpdate;
          }
        } else {
          newStats[newKey] = data;
        }
        
        // Log migration details
        this.migrationLog.push({
          oldKey,
          newKey,
          minutes: data.total_minutes || 0,
          classic: data.classic || 0,
          reverse: data.reverse || 0,
          status: 'success'
        });
        
        console.log(`📅 Migrated: ${oldKey} (GMT+8) → ${newKey} (${this.userTimezone})`);
      } catch (error) {
        this.migrationLog.push({
          oldKey,
          error: error.message,
          status: 'failed'
        });
        console.error(`❌ Failed to migrate ${oldKey}:`, error);
      }
    });
    
    // Save migrated data and mark as complete
    localStorage.setItem('customodoroStatsByDay', JSON.stringify(newStats));
    localStorage.setItem('customodoroTimezoneV2', 'true');
    localStorage.setItem('userTimezone', this.userTimezone);
    localStorage.setItem('migrationLog', JSON.stringify(this.migrationLog));
    
    this.isMigrated = true;
    
    console.log('✅ Migration complete!', {
      entriesMigrated: Object.keys(oldStats).length,
      newDataKeys: Object.keys(newStats).length,
      timezone: this.userTimezone
    });
    
    return {
      success: true,
      entriesMigrated: Object.keys(oldStats).length,
      timezone: this.userTimezone,
      log: this.migrationLog
    };
  }

  /**
   * Get migration report (for debugging)
   */
  getMigrationReport() {
    return {
      isMigrated: this.isMigrated,
      timezone: this.userTimezone,
      log: JSON.parse(localStorage.getItem('migrationLog') || '[]')
    };
  }

  /**
   * Get stats using new timezone system
   * This replaces getStats()
   */
  getStats() {
    return JSON.parse(localStorage.getItem('customodoroStatsByDay') || '{}');
  }

  /**
   * Add session using user's timezone
   * This replaces window.addCustomodoroSession
   */
  addCustomodoroSession(type, minutes) {
    const key = this.formatDateKey(this.getUserToday());
    console.log('📝 Adding session:', { type, minutes, dateKey: key, timezone: this.userTimezone });
    
    const stats = this.getStats();
    if (!stats[key]) {
      stats[key] = { classic: 0, reverse: 0, break: 0, total_minutes: 0 };
    }
    
    // Increment appropriate type
    if (type === 'classic') stats[key].classic++;
    if (type === 'reverse') stats[key].reverse++;
    if (type === 'break') stats[key].break++;
    
    stats[key].total_minutes += minutes;
    stats[key].lastUpdate = new Date().toISOString();
    
    localStorage.setItem('customodoroStatsByDay', JSON.stringify(stats));
    console.log('✅ Session added:', stats[key]);
    
    // Trigger UI updates
    if (typeof window.renderContributionGraph === 'function') {
      window.renderContributionGraph();
    }
    if (typeof window.updateStreakStatsCard === 'function') {
      window.updateStreakStatsCard();
    }
    if (typeof window.renderStreakDisplay === 'function') {
      window.renderStreakDisplay();
    }
    
    // Update User Stats Card
    if (typeof window.updateUserStats === 'function') {
      window.updateUserStats();
    }
    
    // Trigger automatic sync if user is logged in
    if (window.syncManager && window.authService?.isLoggedIn()) {
      console.log('🔄 Triggering automatic sync after session...');
      try {
        // Use queueSync with current data - this method exists and handles online/offline
        window.syncManager.queueSync(window.syncManager.getCurrentLocalData());
        console.log('✅ Auto-sync queued after session');
        
        // Update sync UI stats
        if (window.syncUI) {
          window.syncUI.updateStats();
        }
      } catch (error) {
        console.warn('⚠️ Auto-sync failed after session:', error);
      }
    }
    
    return { success: true, dateKey: key, stats: stats[key] };
  }
}

// ============================================
// INITIALIZATION & INTEGRATION
// ============================================

// Create global instance
window.timezoneManager = new TimezoneManager();

// Run migration on app load
document.addEventListener('DOMContentLoaded', function() {
  const result = window.timezoneManager.migrateOldData();
  if (result) {
    console.log('🎉 Timezone migration completed:', result);
  }
});

// ============================================
// REPLACEMENT FUNCTIONS FOR script.js
// ============================================

/**
 * REPLACE the old getPHToday() with this:
 */
function getPHToday() {
  return window.timezoneManager.getUserToday();
}

/**
 * REPLACE the old formatDateKey() with this:
 */
function formatDateKey(date) {
  return window.timezoneManager.formatDateKey(date);
}

/**
 * REPLACE the old getStats() with this:
 */
function getStats() {
  return window.timezoneManager.getStats();
}

/**
 * REPLACE the old window.addCustomodoroSession with this:
 */
window.addCustomodoroSession = function(type, minutes) {
  return window.timezoneManager.addCustomodoroSession(type, minutes);
};

// ============================================
// TESTING & DEBUGGING
// ============================================

window.testTimezoneManager = function() {
  console.group('🧪 Timezone Manager Test');
  console.log('Current timezone:', window.timezoneManager.userTimezone);
  console.log('Today:', window.timezoneManager.formatDateKey(window.timezoneManager.getUserToday()));
  console.log('Migration status:', window.timezoneManager.isMigrated);
  console.log('Migration report:', window.timezoneManager.getMigrationReport());
  console.groupEnd();
};

window.testTimezoneAddSession = function() {
  const result = window.timezoneManager.addCustomodoroSession('classic', 25);
  console.log('Test session result:', result);
};

console.log('✅ TimezoneManager loaded successfully');
