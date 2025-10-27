/**
 * MIDNIGHT SESSION SPLITTER
 * 
 * Handles accurate time recording when timer sessions cross midnight
 * 100% SAFE - Falls back to normal recording if any errors occur
 */

class MidnightSessionSplitter {
  constructor() {
    this.sessionStartTime = null;
    this.sessionStartDate = null;
    this.accumulatedSessions = [];
    this.enabled = localStorage.getItem('midnightSplitterEnabled') !== 'false'; // Default enabled
    
    console.log('🌙 MidnightSessionSplitter initialized (enabled:', this.enabled + ')');
  }

  /**
   * Start tracking a new session
   */
  startSession(mode) {
    if (!this.enabled) return;
    
    try {
      this.sessionStartTime = Date.now();
      this.sessionStartDate = window.timezoneManager?.getUserToday() || new Date();
      this.accumulatedSessions = [];
      
      console.log('▶️ Session started:', {
        mode,
        startTime: new Date(this.sessionStartTime).toISOString(),
        startDate: this.formatDateKeySafe(this.sessionStartDate)
      });
    } catch (error) {
      console.error('❌ Error starting session tracking:', error);
      this.resetSession(); // Reset on error
    }
  }

  /**
   * Safe date formatting with fallback
   */
  formatDateKeySafe(date) {
    try {
      if (window.timezoneManager && typeof window.timezoneManager.formatDateKey === 'function') {
        return window.timezoneManager.formatDateKey(date);
      }
    } catch (e) {
      console.warn('Timezone manager not available, using fallback');
    }
    
    // Fallback to basic formatting
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Check if we've crossed midnight
   */
  getMidnightCrossings() {
    if (!this.sessionStartTime || !this.enabled) return [];
    
    try {
      const now = Date.now();
      const currentDate = window.timezoneManager?.getUserToday() || new Date();
      const startDateKey = this.formatDateKeySafe(this.sessionStartDate);
      const currentDateKey = this.formatDateKeySafe(currentDate);
      
      if (startDateKey !== currentDateKey) {
        const crossings = [];
        let checkDate = new Date(this.sessionStartDate);
        
        while (this.formatDateKeySafe(checkDate) !== currentDateKey) {
          checkDate.setDate(checkDate.getDate() + 1);
          
          const midnight = new Date(checkDate);
          midnight.setHours(0, 0, 0, 0);
          const midnightTime = midnight.getTime();
          
          if (midnightTime > this.sessionStartTime && midnightTime <= now) {
            crossings.push({
              date: new Date(checkDate),
              timestamp: midnightTime
            });
          }
        }
        
        return crossings;
      }
    } catch (error) {
      console.error('❌ Error detecting midnight crossings:', error);
    }
    
    return [];
  }

  /**
   * Split session across midnight boundaries
   */
  splitSession(totalMinutes, mode) {
    // SAFETY: If not enabled or no start time, return single segment
    if (!this.enabled || !this.sessionStartTime) {
      console.log('⚠️ Splitter not active, using standard recording');
      return [{
        date: this.formatDateKeySafe(window.timezoneManager?.getUserToday() || new Date()),
        minutes: totalMinutes,
        mode,
        isSplit: false
      }];
    }
    
    try {
      // Calculate session end time based on total minutes
      const sessionEndTime = this.sessionStartTime + (totalMinutes * 60 * 1000);
      const crossings = this.getMidnightCrossings();
      
      // No midnight crossings - single session
      if (crossings.length === 0) {
        return [{
          date: this.formatDateKeySafe(this.sessionStartDate),
          minutes: totalMinutes,
          mode,
          isSplit: false
        }];
      }
      
      // Session crossed midnight - split it
      console.log('🌙 Midnight crossing detected! Splitting session...');
      
      const segments = [];
      let currentTimestamp = this.sessionStartTime;
      let currentDate = new Date(this.sessionStartDate);
      let remainingMinutes = totalMinutes;
      
      // For each midnight crossing, calculate the segment
      crossings.forEach((crossing, index) => {
        const segmentSeconds = Math.floor((crossing.timestamp - currentTimestamp) / 1000);
        const segmentMinutes = Math.floor(segmentSeconds / 60);
        
        if (segmentMinutes > 0) {
          segments.push({
            date: this.formatDateKeySafe(currentDate),
            minutes: segmentMinutes,
            mode,
            isSplit: true,
            segmentIndex: index
          });
          
          remainingMinutes -= segmentMinutes;
          console.log(`📅 Segment ${index + 1}: ${segmentMinutes} mins on ${this.formatDateKeySafe(currentDate)}`);
        }
        
        currentTimestamp = crossing.timestamp;
        currentDate = new Date(crossing.date);
      });
      
      // Final segment (remaining minutes after last midnight)
      if (remainingMinutes > 0) {
        segments.push({
          date: this.formatDateKeySafe(currentDate),
          minutes: remainingMinutes,
          mode,
          isSplit: true,
          segmentIndex: segments.length
        });
        
        console.log(`📅 Final segment: ${remainingMinutes} mins on ${this.formatDateKeySafe(currentDate)}`);
      }
      
      return segments.length > 0 ? segments : [{
        date: this.formatDateKeySafe(this.sessionStartDate),
        minutes: totalMinutes,
        mode,
        isSplit: false
      }];
      
    } catch (error) {
      console.error('❌ Error splitting session:', error);
      // SAFETY FALLBACK: Return single segment if error occurs
      return [{
        date: this.formatDateKeySafe(window.timezoneManager?.getUserToday() || new Date()),
        minutes: totalMinutes,
        mode,
        isSplit: false,
        error: error.message
      }];
    }
  }

  /**
   * Record session with automatic midnight splitting
   * SAFETY: Falls back to direct recording if anything fails
   */
  recordSession(mode, totalMinutes) {
    if (!this.enabled) {
      console.log('⚠️ Midnight splitter disabled, using standard recording');
      // Fallback to standard recording
      if (typeof window.addCustomodoroSession === 'function') {
        return window.addCustomodoroSession(mode, totalMinutes);
      }
      return { success: false, error: 'No recording function available' };
    }
    
    try {
      const segments = this.splitSession(totalMinutes, mode);
      
      console.log('💾 Recording session:', {
        mode,
        totalMinutes,
        segments: segments.length,
        split: segments.length > 1
      });
      
      // Record each segment
      segments.forEach((segment) => {
        try {
          const stats = JSON.parse(localStorage.getItem('customodoroStatsByDay') || '{}');
          const dateKey = segment.date;
          
          if (!stats[dateKey]) {
            stats[dateKey] = { classic: 0, reverse: 0, break: 0, total_minutes: 0 };
          }
          
          // Increment appropriate type
          if (mode === 'classic') stats[dateKey].classic++;
          if (mode === 'reverse') stats[dateKey].reverse++;
          if (mode === 'break') stats[dateKey].break++;
          
          stats[dateKey].total_minutes += segment.minutes;
          stats[dateKey].lastUpdate = new Date().toISOString();
          
          // Mark as split session
          if (segment.isSplit) {
            if (!stats[dateKey].splitSessions) {
              stats[dateKey].splitSessions = [];
            }
            stats[dateKey].splitSessions.push({
              mode,
              minutes: segment.minutes,
              segmentIndex: segment.segmentIndex,
              timestamp: new Date().toISOString()
            });
          }
          
          localStorage.setItem('customodoroStatsByDay', JSON.stringify(stats));
          console.log(`  ✅ Recorded ${segment.minutes} mins to ${segment.date}`);
        } catch (segmentError) {
          console.error('❌ Error recording segment:', segmentError);
        }
      });
      
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
      if (typeof window.updateUserStats === 'function') {
        window.updateUserStats();
      }
      
      // Trigger sync
      if (window.syncManager && window.authService?.isLoggedIn()) {
        try {
          window.syncManager.queueSync(window.syncManager.getCurrentLocalData());
          if (window.syncUI) window.syncUI.updateStats();
        } catch (syncError) {
          console.warn('⚠️ Auto-sync failed:', syncError);
        }
      }
      
      return {
        success: true,
        segments,
        totalMinutes,
        split: segments.length > 1
      };
      
    } catch (error) {
      console.error('❌ Fatal error in recordSession:', error);
      // CRITICAL SAFETY FALLBACK: Use old recording method
      console.log('🔄 Falling back to standard recording method');
      if (typeof window.addCustomodoroSession === 'function') {
        return window.addCustomodoroSession(mode, totalMinutes);
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Reset session tracking
   */
  resetSession() {
    this.sessionStartTime = null;
    this.sessionStartDate = null;
    this.accumulatedSessions = [];
  }

  /**
   * Get current session info
   */
  getSessionInfo() {
    if (!this.sessionStartTime) {
      return { active: false, enabled: this.enabled };
    }
    
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - this.sessionStartTime) / 1000);
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    const crossings = this.getMidnightCrossings();
    
    return {
      active: true,
      enabled: this.enabled,
      startTime: new Date(this.sessionStartTime).toISOString(),
      startDate: this.formatDateKeySafe(this.sessionStartDate),
      elapsedMinutes,
      crossedMidnight: crossings.length > 0,
      midnightsCrossed: crossings.length
    };
  }

  /**
   * Toggle feature on/off
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    localStorage.setItem('midnightSplitterEnabled', enabled.toString());
    console.log('🌙 Midnight splitter', enabled ? 'ENABLED' : 'DISABLED');
  }
}

// Initialize global instance
window.midnightSplitter = new MidnightSessionSplitter();

// Helper functions with safety checks
window.startMidnightTracking = function(mode) {
  if (window.midnightSplitter && typeof window.midnightSplitter.startSession === 'function') {
    window.midnightSplitter.startSession(mode);
  }
};

window.recordSessionWithMidnightSplit = function(mode, minutes) {
  if (window.midnightSplitter && typeof window.midnightSplitter.recordSession === 'function') {
    return window.midnightSplitter.recordSession(mode, minutes);
  }
  // SAFETY: Fallback to old method
  if (typeof window.addCustomodoroSession === 'function') {
    console.log('⚠️ Using fallback recording (splitter not available)');
    return window.addCustomodoroSession(mode, minutes);
  }
  return { success: false, error: 'No recording method available' };
};

window.resetMidnightTracking = function() {
  if (window.midnightSplitter && typeof window.midnightSplitter.resetSession === 'function') {
    window.midnightSplitter.resetSession();
  }
};

console.log('✅ MidnightSessionSplitter loaded successfully');
