// Database-Connected Leaderboard
// Connects directly to Supabase for real leaderboard data

class DatabaseLeaderboard {
  constructor() {
    this.supabase = null;
    this.currentUser = null;
    this.init();
  }

  init() {
    // Initialize Supabase client
    const SUPABASE_URL = 'https://tmsmykzvwuyankvlzsif.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtc215a3p2d3V5YW5rdmx6c2lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MzY2MzUsImV4cCI6MjA3MDQxMjYzNX0.-PTqdJ3jsx7E2lghELJPo5Yo7zgjLzb0Mbaa5tLrUPg';
    
    if (SUPABASE_URL === 'YOUR_SUPABASE_PROJECT_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
      console.warn('🔧 Please configure your Supabase credentials in database-leaderboard.js');
      return;
    }

    this.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('🔗 Supabase client initialized successfully');
    this.getCurrentUser();
  }

  getCurrentUser() {
    if (window.authService && window.authService.isLoggedIn()) {
      this.currentUser = window.authService.getCurrentUser();
    }
  }

  // Calculate user stats from existing database data
  async calculateUserStats(userId, period = 'all_time') {
    if (!this.supabase) return null;

    try {
      // Fetch user data from your existing users table
      const { data: userData, error: userError } = await this.supabase
        .from('users')
        .select('username, data')
        .eq('user_id', userId)
        .single();

      if (userError) throw userError;
      if (!userData) return null;

      // Parse the JSONB data field - based on your sync manager structure
      const data = userData.data || {};
      
      // Check multiple possible data structures based on your codebase
      let productivityStats = {};
      
      // Option 1: data.streaks.productivityStatsByDay (your actual structure from sync-manager.js)
      if (data.streaks && data.streaks.productivityStatsByDay) {
        productivityStats = data.streaks.productivityStatsByDay;
        console.log(`📊 Found productivity stats in streaks for ${userData.username}: ${Object.keys(productivityStats).length} days`);
      }
      // Option 2: data.productivityStatsByDay (direct structure - backup)
      else if (data.productivityStatsByDay) {
        productivityStats = data.productivityStatsByDay;
        console.log(`📊 Found direct productivity stats for ${userData.username}: ${Object.keys(productivityStats).length} days`);
      }
      // Option 3: Check if data contains date keys directly (fallback)
      else if (typeof data === 'object' && Object.keys(data).some(key => key.match(/^\d{4}-\d{2}-\d{2}$/))) {
        productivityStats = data;
        console.log(`📊 Found date keys directly in data for ${userData.username}: ${Object.keys(productivityStats).length} days`);
      }

      // If no productivity data found, log the actual structure
      if (Object.keys(productivityStats).length === 0) {
        console.log(`❌ No productivity stats found for ${userData.username}. Data structure:`, {
          hasData: !!data,
          dataKeys: data ? Object.keys(data) : [],
          hasStreaks: !!(data.streaks),
          streakKeys: data.streaks ? Object.keys(data.streaks) : [],
          fullData: data
        });
      }

      // Filter dates based on period BEFORE calculating totals
      const filteredProductivityStats = this.filterStatsByPeriod(productivityStats, period);

      // Calculate totals from filtered data
      let totalMinutes = 0;
      let totalSessions = 0;
      const dates = Object.keys(filteredProductivityStats).sort();

      dates.forEach(date => {
        const dayData = filteredProductivityStats[date];
        if (dayData) {
          // Total minutes from the data
          totalMinutes += dayData.total_minutes || 0;
          // Total sessions = classic + reverse (as specified)
          totalSessions += (dayData.classic || 0) + (dayData.reverse || 0);
        }
      });

      // Calculate streaks based on consecutive dates with activity (use original data for streaks, not filtered)
      const streaks = this.calculateStreaks(productivityStats);

      return {
        id: userId,
        username: userData.username,
        full_name: userData.username,
        // Total focus time = total_minutes / 5 (Focus Points calculation: 5 minutes = 1 FP)
        total_focus_minutes: Math.floor(totalMinutes / 5),
        total_sessions: totalSessions,
        current_streak: streaks.current,
        longest_streak: streaks.longest,
        is_current_user: userId === this.currentUser?.userId,
        period_filtered: period !== 'all_time' // Track if this was period-filtered
      };
    } catch (error) {
      console.error('Error calculating user stats:', error);
      return null;
    }
  }

  // NEW METHOD: Filter productivity stats by time period
  filterStatsByPeriod(productivityStats, period) {
    if (period === 'all_time') {
      return productivityStats;
    }

    const now = new Date();
    const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Today at 00:00:00
    
    let startDate;
    
    if (period === 'month') {
      // This Month: From the 1st day of current month to today
      startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      console.log(`📅 Filtering for THIS MONTH: ${startDate.toISOString().split('T')[0]} to ${currentDate.toISOString().split('T')[0]}`);
    } else if (period === 'week') {
      // This Week: Calendar week (Sunday to Saturday)
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      startDate = new Date(currentDate);
      startDate.setDate(currentDate.getDate() - dayOfWeek); // Go back to Sunday
      console.log(`📅 Filtering for THIS WEEK (Sunday to Saturday): ${startDate.toISOString().split('T')[0]} to ${currentDate.toISOString().split('T')[0]}`);
    }

    // Filter the productivity stats
    const filtered = {};
    Object.keys(productivityStats).forEach(dateStr => {
      const statDate = new Date(dateStr + 'T00:00:00'); // Ensure we're comparing dates at 00:00:00
      
      if (statDate >= startDate && statDate <= currentDate) {
        filtered[dateStr] = productivityStats[dateStr];
        console.log(`✅ Including ${dateStr}: ${productivityStats[dateStr].total_minutes}min, ${(productivityStats[dateStr].classic || 0) + (productivityStats[dateStr].reverse || 0)} sessions`);
      } else {
        console.log(`❌ Excluding ${dateStr}: outside ${period} range`);
      }
    });

    console.log(`📊 Period ${period}: ${Object.keys(filtered).length} days out of ${Object.keys(productivityStats).length} total days`);
    return filtered;
  }

  // Calculate streaks from productivity data (same logic as before)
  calculateStreaks(productivityStats) {
    const dates = Object.keys(productivityStats)
      .filter(date => {
        const dayData = productivityStats[date];
        return dayData && dayData.total_minutes > 0;
      })
      .sort();

    if (dates.length === 0) return { current: 0, longest: 0 };

    let longestStreak = 0;
    let tempStreak = 1;

    // Calculate longest streak
    for (let i = 0; i < dates.length; i++) {
      if (i > 0) {
        const prevDate = new Date(dates[i - 1]);
        const currentDate = new Date(dates[i]);
        const dayDiff = (currentDate - prevDate) / (1000 * 60 * 60 * 24);
        
        if (dayDiff === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    // Calculate current streak
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let currentStreakLength = 0;
    if (productivityStats[todayStr]?.total_minutes > 0) {
      currentStreakLength = 1;
      let checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - 1);
      
      while (checkDate >= new Date('2020-01-01')) {
        const checkDateStr = checkDate.toISOString().split('T')[0];
        if (productivityStats[checkDateStr]?.total_minutes > 0) {
          currentStreakLength++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    } else if (productivityStats[yesterdayStr]?.total_minutes > 0) {
      currentStreakLength = 1;
      let checkDate = new Date(yesterday);
      checkDate.setDate(checkDate.getDate() - 1);
      
      while (checkDate >= new Date('2020-01-01')) {
        const checkDateStr = checkDate.toISOString().split('T')[0];
        if (productivityStats[checkDateStr]?.total_minutes > 0) {
          currentStreakLength++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    return {
      current: currentStreakLength,
      longest: longestStreak
    };
  }

  // Get real leaderboard data from database
  async getLeaderboard(category, period = 'all_time', maxUsers = 20) {
    if (!this.supabase) {
      console.error('Supabase not initialized');
      return { rankings: [], highlightedUser: null, totalCount: 0 };
    }

    try {
      console.log('🔍 Attempting to fetch users from database...');
      
      // First, try to get all users to see what's there
      const { data: allUsers, error: allError } = await this.supabase
        .from('users')
        .select('user_id, username, data');

      if (allError) {
        console.error('❌ Error fetching all users:', allError);
        throw allError;
      }

      console.log(`📋 Total users in database: ${allUsers ? allUsers.length : 0}`);
      
      if (allUsers && allUsers.length > 0) {
        const sampleUser = allUsers[0];
        console.log('👤 Sample user structure:', {
          user_id: sampleUser.user_id,
          username: sampleUser.username,
          hasData: !!sampleUser.data,
          dataKeys: sampleUser.data ? Object.keys(sampleUser.data) : 'No data',
          fullDataStructure: sampleUser.data
        });
      }

      // Filter users that have productivity data (more flexible approach)
      const users = allUsers?.filter(user => {
        if (!user.data) return false;
        
        // Check multiple possible locations for productivity data
        const hasProductivityData = 
          (user.data.streaks?.productivityStatsByDay && Object.keys(user.data.streaks.productivityStatsByDay).length > 0) ||
          (user.data.productivityStatsByDay && Object.keys(user.data.productivityStatsByDay).length > 0) ||
          (typeof user.data === 'object' && Object.keys(user.data).some(key => key.match(/^\d{4}-\d{2}-\d{2}$/)));
        
        if (hasProductivityData) {
          console.log(`✅ User ${user.username} has productivity data`);
        } else {
          console.log(`❌ User ${user.username} missing productivity data`);
        }
        
        return hasProductivityData;
      }) || [];

      console.log(`👥 Found ${users.length} users with productivity data out of ${allUsers?.length || 0} total users`);
      
      if (users.length === 0) {
        console.log('❌ No users found with productivity data');
        return { rankings: [], highlightedUser: null, totalCount: 0 };
      }

      // Calculate stats for all users with the specified period
      const userStatsPromises = users.map(user => 
        this.calculateUserStats(user.user_id, period)
      );
      
      const allUserStats = await Promise.all(userStatsPromises);
      const validStats = allUserStats.filter(stat => stat !== null);
      
      console.log(`📈 Calculated stats for ${allUserStats.length} users, ${validStats.length} valid for period: ${period}`);
      validStats.forEach(stat => {
        console.log(`👤 ${stat.username} (${period}): ${stat.total_focus_minutes}FP, ${stat.total_sessions}sessions, streak:${stat.current_streak}`);
      });

      // No need for additional time period filters - already handled in calculateUserStats
      let filteredStats = validStats;

      // Sort by category
      const sortField = category === 'total_focus' ? 'total_focus_minutes' : 
                       category === 'total_sessions' ? 'total_sessions' :
                       category === 'current_streak' ? 'current_streak' : 'longest_streak';

      filteredStats.sort((a, b) => b[sortField] - a[sortField]);

      // Add rank positions and scores
      filteredStats.forEach((user, index) => {
        user.rank_position = index + 1;
        user.score = user[sortField];
      });

      // Find current user's position
      const currentUserInList = filteredStats.find(user => user.is_current_user);
      const highlightedUser = currentUserInList && currentUserInList.rank_position > 10 ? currentUserInList : null;

      return {
        category,
        period,
        rankings: filteredStats.slice(0, maxUsers), // Use configurable number
        highlightedUser,
        totalCount: filteredStats.length,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return { rankings: [], highlightedUser: null, totalCount: 0 };
    }
  }
}

// Database-connected leaderboard modal
class DatabaseLeaderboardModal {
  constructor() {
    this.leaderboard = new DatabaseLeaderboard();
    this.currentCategory = 'total_focus';
    this.currentPeriod = 'all_time';
    this.isVisible = false;
    
    // 🎯 CONFIGURATION: Change this number to adjust how many users are shown in leaderboard
    this.MAX_LEADERBOARD_USERS = 20; // Change this to 10, 50, 100, etc.
    
    // User badges configuration
    this.userBadges = {
      // 🎖️ STATIC BADGES - Manually assigned special recognitions
      'Clari': [
        { type: 'vip', icon: '⚡', label: 'VIP' }
      ],
      'Yabs': [
        { type: 'founder', icon: '🚀', label: 'Founder' }
      ],
      
      // 🏆 DYNAMIC BADGES - Automatically awarded based on leaderboard performance
      // These will be calculated dynamically and override any manual assignments
      // Format: Will be populated by calculateDynamicBadges() method
    };
    
    this.init();
  }

  // 🏆 Calculate and assign dynamic badges based on current leaderboard standings
  async calculateDynamicBadges() {
    try {
      // Get leaderboard data for all categories
      const focusData = await this.leaderboard.getLeaderboard('total_focus', 'all_time', 100);
      const sessionsData = await this.leaderboard.getLeaderboard('total_sessions', 'all_time', 100);
      const currentStreakData = await this.leaderboard.getLeaderboard('current_streak', 'all_time', 100);
      const longestStreakData = await this.leaderboard.getLeaderboard('longest_streak', 'all_time', 100);

      const dynamicBadges = {};

      // 🎯 CATEGORY AWARDS - #1 in each category
      if (focusData.rankings.length > 0) {
        const focusKing = focusData.rankings[0].username;
        if (!dynamicBadges[focusKing]) dynamicBadges[focusKing] = [];
        dynamicBadges[focusKing].push({ type: 'monthly-focus-champion', icon: '🎯', label: 'Focus King' });
      }

      if (currentStreakData.rankings.length > 0) {
        const hotStreakUser = currentStreakData.rankings[0].username;
        if (!dynamicBadges[hotStreakUser]) dynamicBadges[hotStreakUser] = [];
        dynamicBadges[hotStreakUser].push({ type: 'monthly-current-streak-champion', icon: '🌟', label: 'Hot Streak' });
      }

      if (longestStreakData.rankings.length > 0) {
        const streakLegend = longestStreakData.rankings[0].username;
        if (!dynamicBadges[streakLegend]) dynamicBadges[streakLegend] = [];
        dynamicBadges[streakLegend].push({ type: 'monthly-streak-champion', icon: '🔥', label: 'Streak Legend' });
      }

      // 🏆 MAJOR AWARD - Champion (Best Average Ranking)
      // Calculate average ranking across all categories for users who appear in all leaderboards
      const allUsers = new Set([
        ...focusData.rankings.map(u => u.username),
        ...sessionsData.rankings.map(u => u.username),
        ...currentStreakData.rankings.map(u => u.username),
        ...longestStreakData.rankings.map(u => u.username)
      ]);

      let bestAverageRanking = Infinity;
      let championUser = null;

      allUsers.forEach(username => {
        const focusRank = focusData.rankings.find(u => u.username === username)?.rank_position || 999;
        const sessionsRank = sessionsData.rankings.find(u => u.username === username)?.rank_position || 999;
        const currentStreakRank = currentStreakData.rankings.find(u => u.username === username)?.rank_position || 999;
        const longestStreakRank = longestStreakData.rankings.find(u => u.username === username)?.rank_position || 999;

        // Only consider users who have data in at least 3 categories
        const validRanks = [focusRank, sessionsRank, currentStreakRank, longestStreakRank].filter(rank => rank < 999);
        
        if (validRanks.length >= 3) {
          const averageRank = validRanks.reduce((sum, rank) => sum + rank, 0) / validRanks.length;
          
          if (averageRank < bestAverageRanking) {
            bestAverageRanking = averageRank;
            championUser = username;
          }
        }
      });

      if (championUser) {
        if (!dynamicBadges[championUser]) dynamicBadges[championUser] = [];
        dynamicBadges[championUser].push({ type: 'champion', icon: '🏆', label: 'Champion' });
      }

      // 🎖️ Merge static badges with dynamic badges
      Object.keys(this.userBadges).forEach(username => {
        const staticBadges = this.userBadges[username] || [];
        const dynamicUserBadges = dynamicBadges[username] || [];
        
        // Combine static and dynamic badges, with dynamic badges taking priority
        dynamicBadges[username] = [...staticBadges, ...dynamicUserBadges];
      });

      // Add any new dynamic users not in static list
      return dynamicBadges;

    } catch (error) {
      console.error('Error calculating dynamic badges:', error);
      return this.userBadges; // Fallback to static badges
    }
  }

  init() {
    this.createModal();
    this.bindEvents();
  }

  createModal() {
    const modalHTML = `
      <div class="leaderboard-modal-overlay" id="leaderboard-modal-overlay">
        <div class="leaderboard-modal">
          <div class="leaderboard-modal-header">
            <h2 class="leaderboard-modal-title"><br><br>
              <span class="trophy-icon">🏆</span>
              Global Leaderboard
              <span class="leaderboard-badge">LIVE</span>
            </h2>
            <button class="leaderboard-modal-close" id="leaderboard-modal-close">&times;</button>
          </div>
          
          <div class="leaderboard-tabs">
            <button class="leaderboard-tab active" data-category="total_focus">
              <span>⏱️</span> <span class="tab-text">Focus Points</span>
            </button>
            <button class="leaderboard-tab" data-category="total_sessions">
              <span>📊</span> <span class="tab-text">Sessions</span>
            </button>
            <button class="leaderboard-tab" data-category="current_streak">
              <span>🔥</span> <span class="tab-text">Current Streak</span>
            </button>
            <button class="leaderboard-tab" data-category="longest_streak">
              <span>⚡</span> <span class="tab-text">Longest Streak</span>
            </button>
          </div>
          
          <div class="leaderboard-period-filter">
            <button class="period-btn" data-period="week">This Week</button>
            <button class="period-btn" data-period="month">This Month</button>
            <button class="period-btn active" data-period="all_time">All Time</button>
          </div>
          
          <!-- Leaderboard Info Section -->
          <div class="leaderboard-info">
            <div class="leaderboard-info-content">
              <span class="info-icon">💡</span>
              <span class="info-text">
                Only the top <strong>${this.MAX_LEADERBOARD_USERS}</strong> users are displayed on the global leaderboard. 
                Rankings update in real-time based on your productivity data!
              </span>
            </div>
          </div>
          
          <div class="leaderboard-content">
            <div class="leaderboard-loading">
              <div class="loading-spinner"></div>
              <p>Loading leaderboard data...</p>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  bindEvents() {
    const overlay = document.getElementById('leaderboard-modal-overlay');
    const closeBtn = document.getElementById('leaderboard-modal-close');
    
    // Close modal events
    closeBtn.addEventListener('click', () => this.hide());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.hide();
    });
    
    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });

    // Tab switching
    const tabs = document.querySelectorAll('.leaderboard-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentCategory = tab.dataset.category;
        this.updatePeriodButtons();
        this.loadLeaderboard();
      });
    });

    // Period switching
    const periodBtns = document.querySelectorAll('.period-btn');
    periodBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        periodBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentPeriod = btn.dataset.period;
        this.loadLeaderboard();
      });
    });
  }

  updatePeriodButtons() {
    const periodBtns = document.querySelectorAll('.period-btn');
    
    // Streaks are not time-period specific
    if (['current_streak', 'longest_streak'].includes(this.currentCategory)) {
      periodBtns.forEach(btn => {
        if (btn.dataset.period !== 'all_time') {
          btn.style.opacity = '0.5';
          btn.style.cursor = 'not-allowed';
          btn.disabled = true;
        } else {
          btn.style.opacity = '1';
          btn.style.cursor = 'pointer';
          btn.disabled = false;
          btn.classList.add('active');
        }
      });
      this.currentPeriod = 'all_time';
      periodBtns.forEach(b => b.classList.remove('active'));
      document.querySelector('[data-period="all_time"]').classList.add('active');
    } else {
      periodBtns.forEach(btn => {
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        btn.disabled = false;
      });
    }
  }

  show() {
    this.isVisible = true;
    const overlay = document.getElementById('leaderboard-modal-overlay');
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    this.loadLeaderboard();
  }

  hide() {
    this.isVisible = false;
    const overlay = document.getElementById('leaderboard-modal-overlay');
    overlay.classList.remove('show');
    document.body.style.overflow = '';
  }

  loadLeaderboard() {
    const content = document.querySelector('.leaderboard-content');
    
    // Show loading briefly for better UX
    content.innerHTML = `
      <div class="leaderboard-loading">
        <div class="loading-spinner"></div>
        <p>Loading leaderboard data...</p>
      </div>
    `;

    // Load real data and calculate dynamic badges
    Promise.all([
      this.leaderboard.getLeaderboard(this.currentCategory, this.currentPeriod, this.MAX_LEADERBOARD_USERS),
      this.calculateDynamicBadges()
    ]).then(([data, dynamicBadges]) => {
        // Update badges with dynamic calculations
        this.dynamicBadges = dynamicBadges;
        this.renderLeaderboard(data);
      })
      .catch(error => {
        console.error('Error loading leaderboard:', error);
        content.innerHTML = `
          <div class="leaderboard-error">
            <h3>Connection Error</h3>
            <p>Unable to load leaderboard data. Please check your connection and try again.</p>
          </div>
        `;
      });
  }

  renderLeaderboard(data) {
    const content = document.querySelector('.leaderboard-content');
    
    if (!data.rankings || data.rankings.length === 0) {
      content.innerHTML = `
        <div class="leaderboard-empty">
          <h3>No Data Available</h3>
          <p>Start your focus sessions to join the leaderboard!</p>
        </div>
      `;
      return;
    }

    const categoryLabels = {
      'total_focus': { unit: 'points', icon: '⏱️' },
      'total_sessions': { unit: 'sessions', icon: '📊' },
      'current_streak': { unit: 'days', icon: '🔥' },
      'longest_streak': { unit: 'days', icon: '⚡' }
    };

    const category = categoryLabels[this.currentCategory];
    const currentUserId = this.leaderboard.currentUser?.userId;

    let html = '<ul class="leaderboard-list">';
    
    data.rankings.forEach((user, index) => {
      const isCurrentUser = user.is_current_user === true;
      const rank = user.rank_position;
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
      const rankClass = rank <= 3 ? `rank-${rank} top-three` : '';
      
      // Get user initials for avatar
      const initials = this.getUserInitials(user.full_name || user.username);
      
      // Format score
      const formattedScore = this.formatScore(user.score, this.currentCategory);
      
      // Determine rank highlight class
      const rankHighlightClass = rank === 1 ? 'rank-gold' : rank === 2 ? 'rank-silver' : rank === 3 ? 'rank-bronze' : '';
      
      html += `
        <li class="leaderboard-item ${isCurrentUser ? 'current-user' : ''} ${rankHighlightClass}">
          <div class="leaderboard-rank ${rankClass}">
            ${medal || rank}
          </div>
          <div class="leaderboard-avatar ${isCurrentUser ? 'current-user' : ''}">
            ${initials}
          </div>
          <div class="leaderboard-user-info">
            <div class="leaderboard-username">
              <span class="username-text">${this.escapeHtml(user.full_name || user.username)}</span>
              ${this.getUserBadge(user.username)}
            </div>
            ${isCurrentUser ? '<div class="leaderboard-user-subtitle">You</div>' : ''}
          </div>
          <div class="leaderboard-score">
            ${formattedScore}
            <span class="leaderboard-score-unit">${category.unit}</span>
          </div>
        </li>
      `;
    });

    html += '</ul>';

    // Add highlighted user section if user is not in top results
    if (data.highlightedUser) {
      const highlightedUser = data.highlightedUser;
      const initials = this.getUserInitials(highlightedUser.full_name || highlightedUser.username);
      const formattedScore = this.formatScore(highlightedUser.score, this.currentCategory);
      
      html += `
        <div class="highlighted-user-section">
          <div class="highlighted-user-title">Your Position</div>
          <div class="leaderboard-item current-user">
            <div class="leaderboard-rank">${highlightedUser.rank_position}</div>
            <div class="leaderboard-avatar current-user">
              ${initials}
            </div>
            <div class="leaderboard-user-info">
              <div class="leaderboard-username">
                <span class="username-text">${this.escapeHtml(highlightedUser.full_name || highlightedUser.username)}</span>
                ${this.getUserBadge(highlightedUser.username)}
              </div>
              <div class="leaderboard-user-subtitle">You</div>
            </div>
            <div class="leaderboard-score">
              ${formattedScore}
              <span class="leaderboard-score-unit">${category.unit}</span>
            </div>
          </div>
        </div>
      `;
    }

    content.innerHTML = html;
  }

  formatScore(score, category) {
    return score.toLocaleString();
  }

  getUserInitials(name) {
    if (!name) return '?';
    
    const words = name.trim().split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Generate badge HTML for a user (supports multiple badges with dynamic calculation)
  getUserBadge(username) {
    // Use dynamic badges if available, fallback to static badges
    const badgeSource = this.dynamicBadges || this.userBadges;
    const badges = badgeSource[username];
    
    if (!badges || !Array.isArray(badges) || badges.length === 0) return '';
    
    // Generate HTML for all badges
    return badges.map(badge => 
      `<span class="user-badge ${badge.type}">
        <span class="badge-icon">${badge.icon}</span>
        <span class="badge-text">${badge.label}</span>
      </span>`
    ).join(' ');
  }
}

// Create global instance
window.databaseLeaderboardModal = new DatabaseLeaderboardModal();

// Utility function to show leaderboard
window.showLeaderboard = function(category = 'total_focus', period = 'all_time') {
  if (window.databaseLeaderboardModal) {
    window.databaseLeaderboardModal.currentCategory = category;
    window.databaseLeaderboardModal.currentPeriod = period;
    
    // Update active tab and period
    document.querySelectorAll('.leaderboard-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.category === category);
    });
    
    document.querySelectorAll('.period-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.period === period);
    });
    
    window.databaseLeaderboardModal.show();
  }
};

// Initialization function for integration script
window.initDatabaseLeaderboard = function() {
  // Database leaderboard is already initialized when this script loads
  // This function exists for compatibility with the integration script
  console.log('🔗 Database leaderboard initialization confirmed');
  return window.databaseLeaderboardModal;
};

console.log('🏆 Database Leaderboard loaded successfully');
