// User Stats Card - GitHub-like productivity statistics
// This module handles calculating and displaying user productivity stats

class UserStatsManager {
  constructor() {
    this.debugMode = localStorage.getItem('userStatsDebug') === 'true';
    
    this.initializeElements();
    
    // Setup event listeners first
    this.setupEventListeners();
    
    // Initial update with delay to ensure other services are loaded
    setTimeout(() => {
      this.updateStats();
    }, 500);
  }

  initializeElements() {
    this.elements = {
      title: document.getElementById('user-stats-title'),
      totalFocusTime: document.getElementById('user-total-focus-time'),
      totalSessions: document.getElementById('user-total-sessions'),
      mostProductiveDay: document.getElementById('user-most-productive-day'),
      classicPomodoros: document.getElementById('user-classic-pomodoros'),
      reversePomodoros: document.getElementById('user-reverse-pomodoros')
    };
  }

  setupEventListeners() {
    // Listen for timer completions and other relevant events
    document.addEventListener('pomodoroComplete', () => this.updateStats());
    document.addEventListener('reverseComplete', () => this.updateStats());
    document.addEventListener('sessionComplete', () => this.updateStats());
    
    // Listen for custom events from existing scripts
    document.addEventListener('statsUpdated', () => this.updateStats());
    document.addEventListener('contributionUpdated', () => this.updateStats());
    
    // Listen for auth state changes to update username
    document.addEventListener('authStateChanged', (event) => {
      if (this.debugMode) console.log('User Stats: Auth state changed:', event.detail);
      setTimeout(() => {
        this.updateUserTitle();
        this.updateStats(); // Full stats refresh on auth change
      }, 200); // Small delay to ensure DOM is updated
    });

    // Listen for sync status changes (user might log in/out)
    document.addEventListener('syncStatusChanged', () => {
      setTimeout(() => this.updateUserTitle(), 100);
    });
    
    // Update on page load and focus
    document.addEventListener('DOMContentLoaded', () => this.updateStats());
    window.addEventListener('focus', () => this.updateStats());
    
    // Update periodically to catch any missed updates
    setInterval(() => {
      this.updateUserTitle(); // Check for username changes
      this.updateStats();
    }, 30000); // Every 30 seconds
  }

  getUserName() {
    // Check if user is logged in and get their actual name
    const isLoggedIn = window.authService && window.authService.isLoggedIn();
    if (this.debugMode) console.log('User Stats: Checking auth state - isLoggedIn:', isLoggedIn);
    
    if (isLoggedIn) {
      const headerUserName = document.getElementById('header-user-name');
      const userNameText = headerUserName ? headerUserName.textContent.trim() : '';
      if (this.debugMode) console.log('User Stats: Header user name:', userNameText);
      
      if (headerUserName && userNameText && userNameText !== 'User') {
        return userNameText;
      }
    }
    
    // Fallback to "User" if not logged in or no name available
    if (this.debugMode) console.log('User Stats: Using fallback name "User"');
    return 'User';
  }

  updateUserTitle() {
    const userName = this.getUserName();
    const isLoggedIn = window.authService && window.authService.isLoggedIn();
    
    if (this.elements.title) {
      // Show personalized title when logged in and we have a real username
      if (isLoggedIn && userName && userName !== 'User') {
        // Apply possessive grammar: names ending with 's' use Name' (e.g., Torres')
        const endsWithS = /s$/i.test(userName);
        const possessive = endsWithS ? `${userName}'` : `${userName}'s`;
        const newTitle = `📊 ${possessive} Stats`;
        this.elements.title.textContent = newTitle;
        if (this.debugMode) console.log('User Stats: Updated title to personalized:', newTitle);
      } else {
        const newTitle = `User's Stats`;
        this.elements.title.textContent = newTitle;
        if (this.debugMode) console.log('User Stats: Updated title to generic:', newTitle);
      }
    } else {
      console.warn('User Stats: Title element not found');
    }
  }

  // Get all productivity data from localStorage using existing data structure
  getAllProductivityData() {
    try {
      const statsData = localStorage.getItem('customodoroStatsByDay');
      if (statsData) {
        return JSON.parse(statsData);
      }
    } catch (e) {
      console.warn('Failed to parse customodoroStatsByDay:', e);
    }
    
    return {};
  }

  // Calculate total focus time across all days
  calculateTotalFocusTime() {
    const allData = this.getAllProductivityData();
    let totalMinutes = 0;
    
    Object.values(allData).forEach(dayData => {
      if (dayData.total_minutes) {
        totalMinutes += dayData.total_minutes;
      }
    });
    
    return totalMinutes;
  }

  // Calculate total sessions (classic + reverse)
  calculateTotalSessions() {
    const allData = this.getAllProductivityData();
    let totalSessions = 0;
    
    Object.values(allData).forEach(dayData => {
      if (dayData.classic) totalSessions += dayData.classic;
      if (dayData.reverse) totalSessions += dayData.reverse;
    });
    
    return totalSessions;
  }

  // Calculate total classic pomodoros
  calculateClassicPomodoros() {
    const allData = this.getAllProductivityData();
    let total = 0;
    
    Object.values(allData).forEach(dayData => {
      if (dayData.classic) total += dayData.classic;
    });
    
    return total;
  }

  // Calculate total reverse pomodoros
  calculateReversePomodoros() {
    const allData = this.getAllProductivityData();
    let total = 0;
    
    Object.values(allData).forEach(dayData => {
      if (dayData.reverse) total += dayData.reverse;
    });
    
    return total;
  }

  // Find most productive day
  findMostProductiveDay() {
    const allData = this.getAllProductivityData();
    let maxFocusTime = 0;
    let maxDate = null;
    
    Object.entries(allData).forEach(([date, dayData]) => {
      if (dayData.total_minutes && dayData.total_minutes > maxFocusTime) {
        maxFocusTime = dayData.total_minutes;
        maxDate = date;
      }
    });
    
    if (maxDate && maxFocusTime > 0) {
      // Convert minutes into hours and minutes
      const hours = Math.floor(maxFocusTime / 60);
      const minutes = maxFocusTime % 60;

      // Format date as "Month Day" (e.g., July 29)
      const formattedDate = this.formatDateShort(maxDate);

      // Build time string per rules:
      // - >=1h with minutes: "Xh Ym"
      // - >=1h without minutes: "Xh"
      // - <1h: "Ym"
      let timeStr;
      if (hours >= 1) {
        if (minutes > 0) timeStr = `${hours}h ${minutes}m`;
        else timeStr = `${hours}h`;
      } else {
        timeStr = `${minutes}m`;
      }

      return `${timeStr} (${formattedDate})`;
    }

    // Friendly fallback when there's no data
    return 'No data yet';
  }

  // Format a date string as "Month Day" without ordinals (e.g., "July 29")
  formatDateShort(dateString) {
    try {
      const date = new Date(dateString + 'T00:00:00');
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    } catch (e) {
      return dateString;
    }
  }

  // Format date for display (e.g., "August 18th")
  formatDateForDisplay(dateString) {
    try {
      const date = new Date(dateString + 'T00:00:00');
      const month = date.toLocaleDateString('en-US', { month: 'long' });
      const day = date.getDate();
      const suffix = this.getOrdinalSuffix(day);
      return `${month} ${day}${suffix}`;
    } catch (e) {
      return dateString;
    }
  }

  // Get ordinal suffix for day (1st, 2nd, 3rd, etc.)
  getOrdinalSuffix(day) {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  // Format focus time as "X mins (Y hrs)" with intelligent breaking
  formatFocusTime(minutes) {
    // Ensure numeric
    const minsTotal = Number(minutes) || 0;

    // Zero case
    if (minsTotal === 0) return '0m';

    // 1 day = 1440 minutes
    if (minsTotal >= 1440) {
      const days = Math.floor(minsTotal / 1440);
      const hours = Math.floor((minsTotal % 1440) / 60);
      return `${days}d ${hours}h`;
    }

    const hours = Math.floor(minsTotal / 60);
    const minutesOnly = minsTotal % 60;

    if (hours === 0) {
      return `${minutesOnly}m`;
    }

    return `${hours}h ${minutesOnly}m`;
  }

  // Update all stats in the UI
  updateStats() {
    try {
      // Update username in title
      this.updateUserTitle();

      // Calculate all stats
      const totalFocusMinutes = this.calculateTotalFocusTime();
      const totalSessions = this.calculateTotalSessions();
      const classicPomodoros = this.calculateClassicPomodoros();
      const reversePomodoros = this.calculateReversePomodoros();
      const mostProductiveDay = this.findMostProductiveDay();

      // Update UI elements
      if (this.elements.totalFocusTime) {
        this.elements.totalFocusTime.textContent = this.formatFocusTime(totalFocusMinutes);
      }

      if (this.elements.totalSessions) {
        this.elements.totalSessions.textContent = totalSessions.toString();
      }

      if (this.elements.mostProductiveDay) {
        this.elements.mostProductiveDay.textContent = mostProductiveDay;
      }

      if (this.elements.classicPomodoros) {
        this.elements.classicPomodoros.textContent = classicPomodoros.toString();
      }

      if (this.elements.reversePomodoros) {
        this.elements.reversePomodoros.textContent = reversePomodoros.toString();
      }

      console.log('User stats updated:', {
        userName: this.getUserName(),
        isLoggedIn: window.authService && window.authService.isLoggedIn(),
        totalFocusMinutes,
        totalSessions,
        classicPomodoros,
        reversePomodoros,
        mostProductiveDay
      });

    } catch (error) {
      console.error('Error updating user stats:', error);
    }
  }

  // Method to manually trigger stats update (can be called from other scripts)
  refresh() {
    this.updateStats();
  }
}

// Initialize User Stats Manager when DOM is loaded
let userStatsManager;

document.addEventListener('DOMContentLoaded', function() {
  userStatsManager = new UserStatsManager();
});

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.UserStatsManager = UserStatsManager;
  window.userStatsManager = userStatsManager;
}

// Utility function to update user stats from other scripts
function updateUserStats() {
  if (window.userStatsManager) {
    window.userStatsManager.refresh();
  }
}

// Expose utility function globally
if (typeof window !== 'undefined') {
  window.updateUserStats = updateUserStats;
  
  // Debug function to test authentication state
  window.debugUserStats = function() {
    console.log('=== USER STATS DEBUG ===');
    console.log('Auth Service exists:', !!window.authService);
    console.log('Is Logged In:', window.authService && window.authService.isLoggedIn());
    
    const headerUserName = document.getElementById('header-user-name');
    console.log('Header element exists:', !!headerUserName);
    console.log('Header user name:', headerUserName ? headerUserName.textContent.trim() : 'N/A');
    
    if (window.userStatsManager) {
      console.log('Current user name from getUserName():', window.userStatsManager.getUserName());
      window.userStatsManager.updateUserTitle();
    }
    console.log('=========================');
  };
  
  // Test function to simulate user login
  window.simulateUserLogin = function(username = 'John Doe') {
    console.log('=== SIMULATING USER LOGIN ===');
    
    // Update the header user name element
    const headerUserName = document.getElementById('header-user-name');
    if (headerUserName) {
      headerUserName.textContent = username;
      console.log('Updated header user name to:', username);
    }
    
    // Dispatch auth state changed event
    document.dispatchEvent(new CustomEvent('authStateChanged', {
      detail: {
        isLoggedIn: true,
        user: {
          username: username,
          email: username.toLowerCase().replace(' ', '.') + '@example.com'
        }
      }
    }));
    
    console.log('Dispatched authStateChanged event');
    console.log('===============================');
  };
  
  // Test function to simulate user logout
  window.simulateUserLogout = function() {
    console.log('=== SIMULATING USER LOGOUT ===');
    
    // Reset the header user name element
    const headerUserName = document.getElementById('header-user-name');
    if (headerUserName) {
      headerUserName.textContent = 'User';
      console.log('Reset header user name to: User');
    }
    
    // Dispatch auth state changed event
    document.dispatchEvent(new CustomEvent('authStateChanged', {
      detail: {
        isLoggedIn: false,
        user: null
      }
    }));
    
    console.log('Dispatched authStateChanged event');
    console.log('================================');
  };
  
  // Enable/disable debug mode
  window.toggleUserStatsDebug = function(enable = true) {
    localStorage.setItem('userStatsDebug', enable.toString());
    if (window.userStatsManager) {
      window.userStatsManager.debugMode = enable;
    }
    console.log('User Stats Debug Mode:', enable ? 'ENABLED' : 'DISABLED');
  };
}