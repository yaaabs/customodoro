// Database-Connected Leaderboard
// Connects directly to Supabase for real leaderboard data

class DatabaseLeaderboard {
  constructor() {
    this.supabase = null;
    this.currentUser = null;
    this.cache = {};
    this.periodStatsCache = {};
    this.monthlyHistoryCache = null;
    this.monthlyHistoryCacheTime = 0;
    this.usersCache = null;
    this.usersCacheTime = 0;
    this.usersCachePromise = null;
    this.cacheTtlMs = 60000;
    this.usersCacheTtlMs = 120000;
    this.debugEnabled = false;
    this.init();
  }

  debugLog(...args) {
    if (this.debugEnabled) {
      console.log(...args);
    }
  }

  init() {
    const SUPABASE_URL = 'https://tmsmykzvwuyankvlzsif.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtc215a3p2d3V5YW5rdmx6c2lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MzY2MzUsImV4cCI6MjA3MDQxMjYzNX0.-PTqdJ3jsx7E2lghELJPo5Yo7zgjLzb0Mbaa5tLrUPg';
    
    if (SUPABASE_URL === 'YOUR_SUPABASE_PROJECT_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
      console.warn('🔧 Please configure your Supabase credentials in database-leaderboard.js');
      return;
    }

    this.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    this.debugLog('🔗 Supabase client initialized successfully');
    this.getCurrentUser();
  }

  getCurrentUser() {
    if (window.authService && window.authService.isLoggedIn()) {
      this.currentUser = window.authService.getCurrentUser();
    }
  }

  getTimezoneManager() {
    if (window.timezoneManager && typeof window.timezoneManager.getUserToday === 'function') {
      return window.timezoneManager;
    }
    return null;
  }

  getUserTodayDate() {
    const tzManager = this.getTimezoneManager();
    if (tzManager && typeof tzManager.getUserToday === 'function') {
      return tzManager.getUserToday();
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  formatDateKey(date) {
    const tzManager = this.getTimezoneManager();
    if (tzManager && typeof tzManager.formatDateKey === 'function') {
      return tzManager.formatDateKey(date);
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  parseDateKey(dateKey) {
    const [year, month, day] = dateKey.split('-').map(Number);
    return { year, month, day };
  }

  dateKeyToUtcMs(dateKey) {
    const { year, month, day } = this.parseDateKey(dateKey);
    return Date.UTC(year, month - 1, day);
  }

  diffDateKeysInDays(fromKey, toKey) {
    return (this.dateKeyToUtcMs(toKey) - this.dateKeyToUtcMs(fromKey)) / (1000 * 60 * 60 * 24);
  }

  shiftDateKey(dateKey, deltaDays) {
    const { year, month, day } = this.parseDateKey(dateKey);
    const shifted = new Date(year, month - 1, day + deltaDays);
    return this.formatDateKey(shifted);
  }

  getPeriodRange(period, options = {}) {
    const referenceDate = options.referenceDate || this.getUserTodayDate();
    const fullPeriod = options.fullPeriod === true;

    if (period === 'month') {
      const rangeYear = Number.isInteger(options.year) ? options.year : referenceDate.getFullYear();
      const rangeMonth = Number.isInteger(options.month) ? options.month : referenceDate.getMonth();
      const startDate = new Date(rangeYear, rangeMonth, 1);
      const endDate = fullPeriod
        ? new Date(rangeYear, rangeMonth + 1, 0)
        : referenceDate;

      return {
        startDate,
        endDate,
        startKey: this.formatDateKey(startDate),
        endKey: this.formatDateKey(endDate),
        year: rangeYear,
        month: rangeMonth
      };
    }

    if (period === 'week') {
      const startDate = new Date(referenceDate);
      startDate.setDate(referenceDate.getDate() - referenceDate.getDay());
      const endDate = fullPeriod
        ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 6)
        : referenceDate;

      return {
        startDate,
        endDate,
        startKey: this.formatDateKey(startDate),
        endKey: this.formatDateKey(endDate)
      };
    }

    return null;
  }

  // Get real leaderboard data from database with optimized approach
  async getLeaderboard(category, period = 'all_time', maxUsers = 20) {
    if (!this.supabase) {
      console.error('Supabase not initialized');
      return { rankings: [], highlightedUser: null, totalCount: 0 };
    }

    // Check cache first to avoid repeated processing
    const cacheKey = `${category}_${period}_${maxUsers}`;
    if (this.cache[cacheKey] && 
        (Date.now() - this.cache[cacheKey].timestamp) < this.cacheTtlMs) {
      this.debugLog(`📋 Using cached leaderboard data for ${cacheKey}`);
      return this.cache[cacheKey].data;
    }

    try {
      this.debugLog(`📊 Fetching leaderboard: ${category}/${period} (top ${maxUsers})`);
      
      // Use client-side processing (server-side RPC optimization disabled)
      // Note: You can create 'get_leaderboard_optimized' RPC function in Supabase for better performance
      const useOptimizedRPC = false; // Set to true if you create the RPC function
      
      if (useOptimizedRPC) {
        try {
          const { data: optimizedData, error: optimizedError } = await this.supabase.rpc(
            'get_leaderboard_optimized',
            {
              p_category: category,
              p_period: period,
              p_limit: maxUsers,
              p_user_id: this.currentUser?.userId || null
            }
          );

          if (!optimizedError && optimizedData) {
            this.debugLog(`✅ Successfully fetched optimized leaderboard: ${optimizedData.length} users`);
            
            // Format the data to match our expected structure
            const formattedData = {
              category,
              period,
              rankings: optimizedData,
              highlightedUser: optimizedData.find(u => u.is_current_user && u.rank_position > maxUsers) || null,
              totalCount: optimizedData.length,
              generatedAt: new Date().toISOString()
            };
            
            // Cache the results
            this.cache[cacheKey] = {
              data: formattedData,
              timestamp: Date.now()
            };
            
            return formattedData;
          }
        } catch (rpcError) {
          this.debugLog('📋 RPC not available, falling back to client-side processing');
        }
      }

      // Fallback: Process leaderboard data on client side
      return await this.getFallbackLeaderboard(category, period, maxUsers);
      
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return { rankings: [], highlightedUser: null, totalCount: 0 };
    }
  }

  // Client-side fallback when the optimized RPC is not available
  async getFallbackLeaderboard(category, period, maxUsers) {
    try {
      const allUserStats = await this.getLeaderboardStatsForPeriod(period);
      if (allUserStats.length === 0) {
        return { rankings: [], highlightedUser: null, totalCount: 0 };
      }
      
      // Sort by category
      const sortField = category === 'total_focus' ? 'total_focus_minutes' : 
                        category === 'total_sessions' ? 'total_sessions' :
                        category === 'current_streak' ? 'current_streak' : 'longest_streak';

      const rankedUsers = [...allUserStats].sort((a, b) => {
        if (b[sortField] !== a[sortField]) return b[sortField] - a[sortField];
        return (a.username || '').localeCompare(b.username || '');
      });

      // Add rank positions and scores
      rankedUsers.forEach((user, index) => {
        user.rank_position = index + 1;
        user.score = user[sortField];
      });

      // Find current user's position
      const currentUserInList = rankedUsers.find(user => user.is_current_user);
      const highlightedUser = currentUserInList && currentUserInList.rank_position > maxUsers ? currentUserInList : null;

      const result = {
        category,
        period,
        rankings: rankedUsers.slice(0, maxUsers),
        highlightedUser,
        totalCount: rankedUsers.length,
        generatedAt: new Date().toISOString()
      };
      
      // Cache the results to avoid reprocessing
      const cacheKey = `${category}_${period}_${maxUsers}`;
      this.cache[cacheKey] = {
        data: result,
        timestamp: Date.now()
      };
      
      return result;
    } catch (error) {
      console.error('Error in fallback leaderboard calculation:', error);
      return { rankings: [], highlightedUser: null, totalCount: 0 };
    }
  }

  buildUserStatsFromRecord(user, period = 'all_time') {
    if (!user || !user.data) return null;

    const productivityStats = this.extractProductivityStats(user.data);
    if (Object.keys(productivityStats).length === 0) {
      return null;
    }

    const filteredProductivityStats = this.filterStatsByPeriod(productivityStats, period);
    let totalMinutes = 0;
    let totalSessions = 0;

    Object.keys(filteredProductivityStats).forEach((date) => {
      const dayData = filteredProductivityStats[date];
      if (!dayData) return;
      totalMinutes += dayData.total_minutes || 0;
      totalSessions += (dayData.classic || 0) + (dayData.reverse || 0);
    });

    const streaks = period === 'all_time'
      ? this.calculateStreaks(productivityStats)
      : this.calculateStreaksForPeriod(productivityStats, period);

    if (totalMinutes <= 0 && totalSessions <= 0 && streaks.current <= 0 && streaks.longest <= 0) {
      return null;
    }

    return {
      id: user.user_id,
      username: user.username,
      full_name: user.username,
      total_focus_minutes: Math.floor(totalMinutes / 5),
      total_sessions: totalSessions,
      current_streak: streaks.current,
      longest_streak: streaks.longest,
      is_current_user: user.user_id === this.currentUser?.userId,
      period_filtered: period !== 'all_time'
    };
  }

  async getLeaderboardStatsForPeriod(period = 'all_time') {
    const cacheKey = `${period}`;
    const cached = this.periodStatsCache[cacheKey];
    if (cached && (Date.now() - cached.timestamp) < this.cacheTtlMs) {
      return cached.data.map((entry) => ({ ...entry }));
    }

    const allUsers = await this.getAllLeaderboardUsers();
    const usersWithStats = allUsers
      .map((user) => this.buildUserStatsFromRecord(user, period))
      .filter(Boolean);

    this.periodStatsCache[cacheKey] = {
      data: usersWithStats,
      timestamp: Date.now(),
    };

    return usersWithStats.map((entry) => ({ ...entry }));
  }

  async calculateUserStats(userId, period = 'all_time') {
    try {
      const users = await this.getAllLeaderboardUsers();
      const user = users.find((entry) => entry.user_id === userId);
      return user ? this.buildUserStatsFromRecord(user, period) : null;
    } catch (error) {
      console.error('Error calculating user stats:', error);
      return null;
    }
  }

  extractProductivityStats(userData) {
    if (!userData || typeof userData !== 'object') return {};

    if (userData.streaks && userData.streaks.productivityStatsByDay) {
      return userData.streaks.productivityStatsByDay;
    }

    if (userData.productivityStatsByDay) {
      return userData.productivityStatsByDay;
    }

    if (Object.keys(userData).some(key => key.match(/^\d{4}-\d{2}-\d{2}$/))) {
      return userData;
    }

    return {};
  }

  async getAllLeaderboardUsers(limit = 500, options = {}) {
    if (!this.supabase) return [];
    const forceRefresh = options.forceRefresh === true;
    const cacheAge = Date.now() - this.usersCacheTime;

    if (!forceRefresh && this.usersCache && cacheAge < this.usersCacheTtlMs) {
      return this.usersCache.slice(0, limit);
    }

    if (!forceRefresh && this.usersCachePromise) {
      const users = await this.usersCachePromise;
      return users.slice(0, limit);
    }

    this.usersCachePromise = (async () => {
      const batchSize = 100;
      let allUsers = [];
      let startIndex = 0;
      let hasMoreUsers = true;

      while (hasMoreUsers) {
        const { data: userBatch, error } = await this.supabase
          .from('users')
          .select('user_id, username, data')
          .range(startIndex, startIndex + batchSize - 1);

        if (error) {
          throw error;
        }

        if (!userBatch || userBatch.length === 0) {
          hasMoreUsers = false;
        } else {
          allUsers = [...allUsers, ...userBatch];
          startIndex += batchSize;

          if (allUsers.length >= limit) {
            this.debugLog(`📋 Limiting to ${limit} users for performance`);
            hasMoreUsers = false;
          }
        }
      }

      this.usersCache = allUsers;
      this.usersCacheTime = Date.now();
      return allUsers;
    })();

    try {
      const users = await this.usersCachePromise;
      return users.slice(0, limit);
    } finally {
      this.usersCachePromise = null;
    }
  }

  async getMonthlyHistoryOverview() {
    const cacheAge = Date.now() - this.monthlyHistoryCacheTime;
    if (this.monthlyHistoryCache && cacheAge < 10 * 60 * 1000) {
      return this.monthlyHistoryCache;
    }

    if (!this.supabase) {
      console.error('❌ Supabase not initialized');
      return {
        years: [],
        participantCounts: {},
        earliestMonthKey: null,
        latestMonthKey: null,
      };
    }

    try {
      const users = await this.getAllLeaderboardUsers();
      const participantCounts = new Map();

      users.forEach((user) => {
        const productivityStats = this.extractProductivityStats(user.data);
        const activeMonthsForUser = new Set();

        Object.entries(productivityStats).forEach(([dateKey, dayData]) => {
          if (!dayData || (dayData.total_minutes || 0) <= 0) return;
          activeMonthsForUser.add(dateKey.slice(0, 7));
        });

        activeMonthsForUser.forEach((monthKey) => {
          participantCounts.set(monthKey, (participantCounts.get(monthKey) || 0) + 1);
        });
      });

      const sortedMonthKeys = [...participantCounts.keys()].sort();
      const today = this.getUserTodayDate();
      const currentYear = today.getFullYear();
      const currentMonthIndex = today.getMonth();
      const earliestMonthKey = sortedMonthKeys[0] || `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;
      const latestMonthKey = sortedMonthKeys[sortedMonthKeys.length - 1] || earliestMonthKey;
      const earliestYear = Number(earliestMonthKey.slice(0, 4));
      const years = [];

      for (let year = currentYear; year >= earliestYear; year -= 1) {
        years.push(year);
      }

      const overview = {
        years,
        participantCounts: Object.fromEntries(participantCounts),
        earliestMonthKey,
        latestMonthKey,
      };

      this.monthlyHistoryCache = overview;
      this.monthlyHistoryCacheTime = Date.now();
      return overview;
    } catch (error) {
      console.error('❌ Error building monthly history overview:', error);
      return {
        years: [],
        participantCounts: {},
        earliestMonthKey: null,
        latestMonthKey: null,
      };
    }
  }

  // NEW METHOD: Filter productivity stats by time period
  filterStatsByPeriod(productivityStats, period) {
    if (period === 'all_time') {
      return productivityStats;
    }

    const range = this.getPeriodRange(period);
    if (!range) {
      return productivityStats;
    }

    const { startKey, endKey } = range;

    // Filter the productivity stats
    const filtered = {};
    Object.keys(productivityStats).forEach(dateStr => {
      if (dateStr >= startKey && dateStr <= endKey) {
        filtered[dateStr] = productivityStats[dateStr];
      }
    });
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
        const dayDiff = this.diffDateKeysInDays(dates[i - 1], dates[i]);
        
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
    const todayKey = this.formatDateKey(this.getUserTodayDate());
    const yesterdayKey = this.shiftDateKey(todayKey, -1);

    let currentStreakLength = 0;
    if (productivityStats[todayKey]?.total_minutes > 0) {
      currentStreakLength = 1;
      let checkKey = this.shiftDateKey(todayKey, -1);
      
      while (checkKey >= '2020-01-01') {
        if (productivityStats[checkKey]?.total_minutes > 0) {
          currentStreakLength++;
          checkKey = this.shiftDateKey(checkKey, -1);
        } else {
          break;
        }
      }
    } else if (productivityStats[yesterdayKey]?.total_minutes > 0) {
      currentStreakLength = 1;
      let checkKey = this.shiftDateKey(yesterdayKey, -1);
      
      while (checkKey >= '2020-01-01') {
        if (productivityStats[checkKey]?.total_minutes > 0) {
          currentStreakLength++;
          checkKey = this.shiftDateKey(checkKey, -1);
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

  calculateStreaksForPeriod(productivityStats, period, year, month) {
    if (period === 'all_time') {
      return this.calculateStreaks(productivityStats);
    }

    const fullPeriod = Number.isInteger(year) && Number.isInteger(month);
    const range = this.getPeriodRange(period, { year, month, fullPeriod });
    if (!range) {
      return this.calculateStreaks(productivityStats);
    }

    const { startKey, endKey } = range;
    const dates = Object.keys(productivityStats)
      .filter(date => {
        const dayData = productivityStats[date];
        return dayData && dayData.total_minutes > 0 && date >= startKey && date <= endKey;
      })
      .sort();

    if (dates.length === 0) {
      return { current: 0, longest: 0, longestStreakDates: { start: null, end: null } };
    }

    let longestStreak = 0;
    let tempStreak = 1;
    let longestStart = dates[0];
    let longestEnd = dates[0];
    let tempStart = dates[0];

    for (let i = 0; i < dates.length; i++) {
      if (i > 0) {
        const dayDiff = this.diffDateKeysInDays(dates[i - 1], dates[i]);

        if (dayDiff === 1) {
          tempStreak++;
        } else {
          if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
            longestStart = tempStart;
            longestEnd = dates[i - 1];
          }
          tempStreak = 1;
          tempStart = dates[i];
        }
      }
    }

    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
      longestStart = tempStart;
      longestEnd = dates[dates.length - 1];
    }

    const anchorKey = productivityStats[endKey]?.total_minutes > 0
      ? endKey
      : this.shiftDateKey(endKey, -1);

    let currentStreakLength = 0;
    if (anchorKey >= startKey && productivityStats[anchorKey]?.total_minutes > 0) {
      currentStreakLength = 1;
      let checkKey = this.shiftDateKey(anchorKey, -1);
      while (checkKey >= startKey) {
        if (productivityStats[checkKey]?.total_minutes > 0) {
          currentStreakLength++;
          checkKey = this.shiftDateKey(checkKey, -1);
        } else {
          break;
        }
      }
    }

    return {
      current: currentStreakLength,
      longest: longestStreak,
      longestStreakDates: { start: longestStart, end: longestEnd }
    };
  }

  async getMonthlyWinners(year, month) {
    if (!this.supabase) {
      console.error('❌ Supabase not initialized');
      return null;
    }

    const range = this.getPeriodRange('month', { year, month, fullPeriod: true });
    if (!range) {
      return null;
    }

    try {
      this.debugLog(`🏆 Fetching monthly winners for ${range.startKey} to ${range.endKey}`);
      const allUsers = await this.getAllLeaderboardUsers();

      const monthStats = [];

      for (const user of allUsers) {
        if (!user.data) continue;

        const productivityStats = this.extractProductivityStats(user.data);
        if (Object.keys(productivityStats).length === 0) continue;

        let totalMinutes = 0;
        let totalSessions = 0;
        const filteredKeys = Object.keys(productivityStats)
          .filter(dateStr => dateStr >= range.startKey && dateStr <= range.endKey)
          .sort();

        if (filteredKeys.length === 0) continue;

        filteredKeys.forEach(dateStr => {
          const dayData = productivityStats[dateStr];
          if (dayData) {
            totalMinutes += dayData.total_minutes || 0;
            totalSessions += (dayData.classic || 0) + (dayData.reverse || 0);
          }
        });

        const streaks = this.calculateStreaksForPeriod(productivityStats, 'month', year, month);
        if (totalMinutes <= 0 && totalSessions <= 0 && streaks.longest <= 0) {
          continue;
        }

        monthStats.push({
          userId: user.user_id,
          username: user.username,
          totalFocusPoints: Math.floor(totalMinutes / 5),
          totalSessions,
          longestStreak: streaks.longest,
          streakDates: streaks.longestStreakDates
        });
      }

      const sortByScore = (stats, key) => {
        return [...stats].sort((a, b) => {
          if (b[key] !== a[key]) return b[key] - a[key];
          return a.username.localeCompare(b.username);
        });
      };

      const focusRanks = sortByScore(monthStats, 'totalFocusPoints');
      const sessionRanks = sortByScore(monthStats, 'totalSessions');
      const streakRanks = sortByScore(monthStats, 'longestStreak');

      const topFocus = focusRanks.slice(0, 3);
      const topSessions = sessionRanks.slice(0, 3);
      const topStreaks = streakRanks.slice(0, 3);

      const buildRankMap = (ranked) => {
        const map = new Map();
        ranked.forEach((entry, index) => {
          if (!map.has(entry.username)) {
            map.set(entry.username, index + 1);
          }
        });
        return map;
      };

      const focusRankMap = buildRankMap(focusRanks);
      const sessionRankMap = buildRankMap(sessionRanks);
      const streakRankMap = buildRankMap(streakRanks);

      let champion = null;
      monthStats.forEach(entry => {
        const focusRank = focusRankMap.get(entry.username);
        const sessionRank = sessionRankMap.get(entry.username);
        const streakRank = streakRankMap.get(entry.username);
        if (!focusRank || !sessionRank || !streakRank) return;

        const avgRank = (focusRank + sessionRank + streakRank) / 3;
        if (!champion) {
          champion = { ...entry, avgRank };
          return;
        }

        if (avgRank < champion.avgRank) {
          champion = { ...entry, avgRank };
        } else if (avgRank === champion.avgRank) {
          if (entry.username.localeCompare(champion.username) < 0) {
            champion = { ...entry, avgRank };
          }
        }
      });

      const topByCategory = {
        total_focus: topFocus.map(entry => ({
          username: entry.username,
          score: entry.totalFocusPoints,
          userId: entry.userId
        })),
        total_sessions: topSessions.map(entry => ({
          username: entry.username,
          score: entry.totalSessions,
          userId: entry.userId
        })),
        longest_streak: topStreaks.map(entry => ({
          username: entry.username,
          score: entry.longestStreak,
          userId: entry.userId,
          streakDates: entry.streakDates
        })),
        overall_champion: champion ? [{
          username: champion.username,
          score: Number(champion.avgRank.toFixed(2)),
          userId: champion.userId
        }] : []
      };

      const monthName = range.startDate.toLocaleDateString('en-US', { month: 'long' });
      const result = {
        month: monthName,
        year: range.year,
        monthNumber: range.month + 1,
        topByCategory,
        winners: {
          total_focus: topByCategory.total_focus[0] || null,
          total_sessions: topByCategory.total_sessions[0] || null,
          longest_streak: topByCategory.longest_streak[0] || null,
          overall_champion: topByCategory.overall_champion[0] || null
        },
        totalParticipants: monthStats.length,
        generatedAt: new Date().toISOString()
      };

      this.debugLog(`🏆 Monthly winners ready for ${result.month} ${result.year}`);
      return result;
    } catch (error) {
      console.error('❌ Error fetching monthly winners:', error);
      return null;
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

    // Founder-only tools (username-based)
    this.FOUNDER_USERNAME = 'Yabs';
    
    // User badges configuration
    this.userBadges = {
      // 🎖️ STATIC BADGES - Manually assigned special recognitions
      'Clari': [
        { type: 'rph', icon: '💊', label: 'RPh' },
        { type: 'vip', icon: '💎', label: 'VIP' },
      ],
      'Yabs': [
        { type: 'founder', icon: '🚀', label: 'Founder' }
      ],
      
      // 🏆 DYNAMIC BADGES - Automatically awarded based on leaderboard performance
      // These will be calculated dynamically and override any manual assignments
      // Format: Will be populated by calculateDynamicBadges() method
    };
    
    // Cache for dynamic badges
    this.dynamicBadgesCache = null;
    this.dynamicBadgesCacheTime = 0;
    this.historyMonthLabels = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    this.monthlyHistoryOverview = null;
    this.historyPreviewCache = {};
    this.selectedHistoryYear = null;
    this.selectedHistoryMonth = null;
    this.historyMonthsCollapsed = null;
    
    this.init();
  }

  // 🏆 Calculate and assign dynamic badges based on current leaderboard standings
  async calculateDynamicBadges() {
    // Cache badges for 5 minutes to avoid repeated calculations
    if (this.dynamicBadgesCache && 
        (Date.now() - this.dynamicBadgesCacheTime) < 300000) {
      return this.dynamicBadgesCache;
    }
    
    try {
      this.updateLoadingMessage('Calculating top performers...');

      const [focusData, sessionsData, currentStreakData, longestStreakData] = await Promise.all([
        this.leaderboard.getLeaderboard('total_focus', 'all_time', 3),
        this.leaderboard.getLeaderboard('total_sessions', 'all_time', 3),
        this.leaderboard.getLeaderboard('current_streak', 'all_time', 3),
        this.leaderboard.getLeaderboard('longest_streak', 'all_time', 3),
      ]);

      this.updateLoadingMessage('Finalizing badges...');

      const dynamicBadges = {};

      // 🎯 CATEGORY AWARDS - #1 in each category
      if (focusData.rankings.length > 0) {
        const focusKing = focusData.rankings[0].username;
        if (!dynamicBadges[focusKing]) dynamicBadges[focusKing] = [];
        dynamicBadges[focusKing].push({ type: 'monthly-focus-champion', icon: '🎯', label: 'Focus King' });
      }

      // 📝 SESSIONS AWARD - #1 by total sessions
      if (sessionsData && sessionsData.rankings && sessionsData.rankings.length > 0) {
        const sessionMaster = sessionsData.rankings[0].username;
        if (!dynamicBadges[sessionMaster]) dynamicBadges[sessionMaster] = [];
        // use the existing CSS class name 'monthly-sessions-champion' so styles match
        dynamicBadges[sessionMaster].push({ type: 'monthly-sessions-champion', icon: '📊', label: 'Session Master' });
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
      // Calculate average ranking across exactly 3 core categories: Focus Points, Sessions, Current Streak
      const allUsers = new Set([
        ...focusData.rankings.map(u => u.username),
        ...sessionsData.rankings.map(u => u.username),
        ...currentStreakData.rankings.map(u => u.username)
      ]);

      let bestAverageRanking = Infinity;
      let championUser = null;

      allUsers.forEach(username => {
        const focusRank = focusData.rankings.find(u => u.username === username)?.rank_position || 999;
        const sessionsRank = sessionsData.rankings.find(u => u.username === username)?.rank_position || 999;
        const currentStreakRank = currentStreakData.rankings.find(u => u.username === username)?.rank_position || 999;

        // Only consider users who have data in all 3 core categories (Focus, Sessions, Current Streak)
        const coreRanks = [focusRank, sessionsRank, currentStreakRank];
        const validCoreRanks = coreRanks.filter(rank => rank < 999);

        if (validCoreRanks.length === 3) {
          // Calculate average using exactly 3 categories
          const averageRank = validCoreRanks.reduce((sum, rank) => sum + rank, 0) / 3;

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

      // Cache the result
      this.dynamicBadgesCache = dynamicBadges;
      this.dynamicBadgesCacheTime = Date.now();
      
      return dynamicBadges;
    } catch (error) {
      console.error('Error calculating dynamic badges:', error);
      return this.userBadges; // Fallback to static badges
    }
  }

  // Helper method to update loading message
  updateLoadingMessage(message) {
    const loadingElement = document.querySelector('.leaderboard-loading');
    if (loadingElement) {
      const messageElement = loadingElement.querySelector('p');
      if (messageElement) {
        messageElement.textContent = message;
      }
    }
  }

  showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  updateAuxiliaryPanels() {
    const periodFilter = document.querySelector('.leaderboard-period-filter');
    const infoContent = document.querySelector('.leaderboard-info-content');
    const isHistoryTab = this.currentCategory === 'history';

    if (periodFilter) {
      periodFilter.style.display = isHistoryTab ? 'none' : '';
    }

    if (infoContent) {
      infoContent.innerHTML = isHistoryTab
        ? `
          <span class="info-icon">🗂️</span>
          <span class="info-text">
            Monthly Winners History only includes people with an account and synced productivity data. Guests and local-only users are not included in these snapshots.
          </span>
        `
        : `
          <span class="info-icon">💡</span>
          <span class="info-text">
            Only the top <strong>${this.MAX_LEADERBOARD_USERS}</strong> users are displayed on the global leaderboard.
            Rankings update in real-time based on synced account data.
          </span>
        `;
    }
  }

  isCompactHistoryPreferred() {
    return window.matchMedia('(max-width: 900px)').matches;
  }

  ensureHistoryMonthsState() {
    if (typeof this.historyMonthsCollapsed !== 'boolean') {
      this.historyMonthsCollapsed = this.isCompactHistoryPreferred();
    }
  }

  getMonthKey(year, month) {
    return `${year}-${String(month + 1).padStart(2, '0')}`;
  }

  compareMonthKeys(a, b) {
    if (a === b) return 0;
    return a < b ? -1 : 1;
  }

  getCurrentMonthKey() {
    const today = this.leaderboard.getUserTodayDate();
    return this.getMonthKey(today.getFullYear(), today.getMonth());
  }

  getHistoryMonthState(year, month) {
    const monthKey = this.getMonthKey(year, month);
    const currentMonthKey = this.getCurrentMonthKey();
    const participantCount = this.monthlyHistoryOverview?.participantCounts?.[monthKey] || 0;

    if (this.compareMonthKeys(monthKey, currentMonthKey) > 0) {
      return {
        key: monthKey,
        status: 'future',
        participantCount,
        label: 'Future',
        hint: 'This month has not started yet.',
        downloadable: false,
      };
    }

    if (monthKey === currentMonthKey) {
      return {
        key: monthKey,
        status: 'current',
        participantCount,
        label: 'In progress',
        hint: 'This month is still running and will unlock after it ends.',
        downloadable: false,
      };
    }

    if (participantCount > 0) {
      return {
        key: monthKey,
        status: 'available',
        participantCount,
        label: 'Ready',
        hint: `${participantCount} participant${participantCount === 1 ? '' : 's'} recorded activity in this month.`,
        downloadable: true,
      };
    }

    return {
      key: monthKey,
      status: 'empty',
      participantCount: 0,
      label: 'No history',
      hint: 'No completed winners snapshot is available for this month.',
      downloadable: false,
    };
  }

  getLatestAvailableHistoryMonth() {
    if (!this.monthlyHistoryOverview || !this.monthlyHistoryOverview.participantCounts) {
      return null;
    }

    const currentMonthKey = this.getCurrentMonthKey();
    const keys = Object.keys(this.monthlyHistoryOverview.participantCounts)
      .filter((key) => this.compareMonthKeys(key, currentMonthKey) < 0)
      .sort();

    if (keys.length === 0) return null;

    const latestKey = keys[keys.length - 1];
    return {
      year: Number(latestKey.slice(0, 4)),
      month: Number(latestKey.slice(5, 7)) - 1,
    };
  }

  syncSelectedHistoryMonth(selectedYear = this.selectedHistoryYear) {
    if (!Number.isInteger(selectedYear)) return;

    this.selectedHistoryYear = selectedYear;

    if (this.selectedHistoryMonth !== null) {
      const selectedState = this.getHistoryMonthState(selectedYear, this.selectedHistoryMonth);
      if (selectedState.downloadable) {
        return;
      }
    }

    for (let month = 11; month >= 0; month -= 1) {
      const state = this.getHistoryMonthState(selectedYear, month);
      if (state.downloadable) {
        this.selectedHistoryMonth = month;
        return;
      }
    }

    const today = this.leaderboard.getUserTodayDate();
    this.selectedHistoryMonth = selectedYear === today.getFullYear() ? today.getMonth() : 11;
  }

  getSelectedHistoryState() {
    if (this.selectedHistoryYear === null || this.selectedHistoryMonth === null) {
      return null;
    }
    return this.getHistoryMonthState(this.selectedHistoryYear, this.selectedHistoryMonth);
  }

  getHistoryActionLabel(state) {
    if (!state) return 'Choose a month';
    if (state.downloadable) {
      return `Download ${this.historyMonthLabels[this.selectedHistoryMonth]} CSV`;
    }
    if (state.status === 'current') return 'Current Month Still Running';
    if (state.status === 'future') return 'Future Month Locked';
    return 'No History Available';
  }

  getHistoryStatusNote(state) {
    if (!state) {
      return 'Pick a completed month to preview the winners snapshot.';
    }
    const monthLabel = `${this.historyMonthLabels[this.selectedHistoryMonth]} ${this.selectedHistoryYear}`;
    return state.downloadable
      ? `${monthLabel} is ready. ${state.hint}`
      : `${monthLabel} is unavailable. ${state.hint}`;
  }

  buildHistoryMonthGridMarkup(selectedYear) {
    this.selectedHistoryYear = selectedYear;
    this.syncSelectedHistoryMonth(selectedYear);

    return this.historyMonthLabels
      .map((label, month) => {
        const state = this.getHistoryMonthState(selectedYear, month);
        const isSelected = this.selectedHistoryMonth === month;
        const participantLabel = state.downloadable
          ? `${state.participantCount} participant${state.participantCount === 1 ? '' : 's'}`
          : state.status === 'current'
            ? 'Month still open'
            : state.status === 'future'
              ? 'Coming later'
              : 'No winners saved';

        return `
          <button
            type="button"
            class="leaderboard-history-card ${state.status} ${isSelected ? 'is-selected' : ''}"
            data-history-month="${month}"
            ${state.downloadable ? '' : 'disabled'}
            aria-pressed="${isSelected ? 'true' : 'false'}"
            title="${label} ${selectedYear}: ${state.hint}"
          >
            <span class="leaderboard-history-card-month">${label}</span>
            <span class="leaderboard-history-card-status">${state.label}</span>
            <span class="leaderboard-history-card-meta">${participantLabel}</span>
          </button>
        `;
      })
      .join('');
  }

  buildHistoryControlsMarkup() {
    this.ensureHistoryMonthsState();
    const availableYears = this.monthlyHistoryOverview?.years?.length
      ? this.monthlyHistoryOverview.years
      : [this.leaderboard.getUserTodayDate().getFullYear()];
    const selectedYear = this.selectedHistoryYear ?? availableYears[0];
    this.selectedHistoryYear = selectedYear;
    this.syncSelectedHistoryMonth(selectedYear);

    const selectedState = this.getSelectedHistoryState();
    const toggleLabel = this.historyMonthsCollapsed ? 'Show months' : 'Hide months';

    return `
      <section class="leaderboard-history-controls-shell">
        <div class="leaderboard-history-controls-top">
          <div class="leaderboard-history-controls-copy">
            <span class="leaderboard-history-kicker">Monthly Winners History</span>
            <p class="leaderboard-history-controls-text">Completed months unlock automatically. Current and future months stay grayed out until they are ready. Guest and local-only users are not included.</p>
          </div>
          <div class="leaderboard-history-toolbar">
            <select class="leaderboard-export-select" id="leaderboard-history-year" aria-label="Select history year">
              ${availableYears.map((year) => `<option value="${year}" ${year === selectedYear ? 'selected' : ''}>${year}</option>`).join('')}
            </select>
            <button class="leaderboard-export-btn" type="button" data-history-action="download" ${selectedState && selectedState.downloadable ? '' : 'disabled'}>
              ${this.getHistoryActionLabel(selectedState)}
            </button>
            <button class="leaderboard-history-toggle" type="button" data-history-action="toggle-months" aria-expanded="${this.historyMonthsCollapsed ? 'false' : 'true'}">
              ${toggleLabel}
            </button>
          </div>
        </div>
        <div class="leaderboard-history-legend" aria-hidden="true">
          <span class="leaderboard-history-pill available">Ready</span>
          <span class="leaderboard-history-pill current">In Progress</span>
          <span class="leaderboard-history-pill future">Future</span>
          <span class="leaderboard-history-pill empty">No History</span>
        </div>
        ${this.historyMonthsCollapsed ? '' : `<div class="leaderboard-history-grid">${this.buildHistoryMonthGridMarkup(selectedYear)}</div>`}
        <div class="leaderboard-history-note">${this.getHistoryStatusNote(selectedState)}</div>
      </section>
    `;
  }

  async initMonthlyWinnersExport() {
    try {
      this.monthlyHistoryOverview = await this.leaderboard.getMonthlyHistoryOverview();
      const latestAvailable = this.getLatestAvailableHistoryMonth();
      if (latestAvailable) {
        this.selectedHistoryYear = latestAvailable.year;
        this.selectedHistoryMonth = latestAvailable.month;
      } else {
        const today = this.leaderboard.getUserTodayDate();
        this.selectedHistoryYear = today.getFullYear();
        this.selectedHistoryMonth = today.getMonth();
      }
      this.ensureHistoryMonthsState();
    } catch (error) {
      console.error('❌ Failed to initialize monthly history:', error);
      this.showToast('❌ Failed to load monthly winners history');
    }
  }

  async getHistoryPreview(year, month) {
    const cacheKey = `${year}-${month}`;
    const cached = this.historyPreviewCache[cacheKey];
    if (cached && (Date.now() - cached.timestamp) < 10 * 60 * 1000) {
      return cached.data;
    }

    const data = await this.leaderboard.getMonthlyWinners(year, month);
    this.historyPreviewCache[cacheKey] = {
      data,
      timestamp: Date.now(),
    };
    return data;
  }

  renderHistoryEmptyState(title, description) {
    const content = document.querySelector('.leaderboard-content');
    if (!content) return;

    content.innerHTML = `
      <div class="leaderboard-history-panel">
        ${this.buildHistoryControlsMarkup()}
        <div class="leaderboard-history-hero">
          <h3>${this.escapeHtml(title)}</h3>
          <p>${this.escapeHtml(description)}</p>
        </div>
      </div>
    `;
  }

  renderHistoryPreview(winners) {
    const content = document.querySelector('.leaderboard-content');
    if (!content || !winners) return;

    const monthLabel = `${winners.month} ${winners.year}`;
    const categories = [
      { key: 'total_focus', label: 'Focus Points', icon: '⏱️' },
      { key: 'total_sessions', label: 'Sessions', icon: '📊' },
      { key: 'longest_streak', label: 'Longest Streak', icon: '⚡' },
      { key: 'overall_champion', label: 'Overall Champion', icon: '🏆' },
    ];

    const categoryMarkup = categories.map((category) => {
      const entries = winners.topByCategory?.[category.key] || [];
      const rows = entries.length > 0
        ? entries.map((entry, index) => {
            const rankClass = index === 0 ? 'rank-gold' : index === 1 ? 'rank-silver' : index === 2 ? 'rank-bronze' : '';

            return `
            <li class="leaderboard-history-result-row ${rankClass}">
              <span class="leaderboard-history-rank">#${index + 1}</span>
              <span class="leaderboard-history-user">${this.escapeHtml(entry.username)}</span>
              <span class="leaderboard-history-score">${this.formatScore(entry.score, category.key)}</span>
            </li>
          `;
          }).join('')
        : `
            <li class="leaderboard-history-result-row empty">
              <span class="leaderboard-history-user">No recorded winners</span>
            </li>
          `;

      return `
        <article class="leaderboard-history-result-card ${category.key === 'overall_champion' ? 'is-overall-champion' : ''}">
          <div class="leaderboard-history-result-head">
            <span class="leaderboard-history-result-icon">${category.icon}</span>
            <span>${category.label}</span>
          </div>
          <ul class="leaderboard-history-result-list">
            ${rows}
          </ul>
        </article>
      `;
    }).join('');

    content.innerHTML = `
      <div class="leaderboard-history-panel">
        ${this.buildHistoryControlsMarkup()}
        <div class="leaderboard-history-hero">
          <h3>${this.escapeHtml(monthLabel)} Snapshot</h3>
          <p>Only signed-in users with synced productivity data are included here. Guests and people using the app without an account will not appear in this history.</p>
        </div>
        <div class="leaderboard-history-stats">
          <div class="leaderboard-history-stat">
            <span class="leaderboard-history-stat-label">Participants</span>
            <strong>${this.escapeHtml(String(winners.totalParticipants || 0))}</strong>
          </div>
          <div class="leaderboard-history-stat">
            <span class="leaderboard-history-stat-label">Status</span>
            <strong>Finalized</strong>
          </div>
          <div class="leaderboard-history-stat">
            <span class="leaderboard-history-stat-label">Export</span>
            <strong>CSV Ready</strong>
          </div>
        </div>
        <div class="leaderboard-history-results">
          ${categoryMarkup}
        </div>
      </div>
    `;
  }

  async loadHistoryTab() {
    const content = document.querySelector('.leaderboard-content');
    if (!content) return;

    if (!this.monthlyHistoryOverview) {
      content.innerHTML = `
        <div class="leaderboard-loading">
          <div class="loading-spinner"></div>
          <p>Loading monthly winners history...</p>
        </div>
      `;
      await this.initMonthlyWinnersExport();
    }

    if (this.selectedHistoryYear === null || this.selectedHistoryMonth === null) {
      this.renderHistoryEmptyState('Choose a month', 'Select a completed month to preview the winners and download the CSV snapshot.');
      return;
    }

    const state = this.getHistoryMonthState(this.selectedHistoryYear, this.selectedHistoryMonth);
    if (!state.downloadable) {
      this.renderHistoryEmptyState(
        `${this.historyMonthLabels[this.selectedHistoryMonth]} ${this.selectedHistoryYear}`,
        state.hint,
      );
      return;
    }

    content.innerHTML = `
      <div class="leaderboard-loading">
        <div class="loading-spinner"></div>
        <p>Loading monthly winners history...</p>
      </div>
    `;

    try {
      const winners = await this.getHistoryPreview(this.selectedHistoryYear, this.selectedHistoryMonth);
      if (!winners || !winners.totalParticipants) {
        this.renderHistoryEmptyState('No saved winners', 'This month does not have a completed winners snapshot yet.');
        return;
      }
      this.renderHistoryPreview(winners);
    } catch (error) {
      console.error('Failed to load history preview:', error);
      this.renderHistoryEmptyState('History unavailable', 'We could not load the monthly winners preview right now.');
    }
  }

  sanitizeCSVValue(value) {
    const normalized = value === null || value === undefined ? '' : String(value);
    const guarded = /^[=+\-@]/.test(normalized) ? `'${normalized}` : normalized;
    return `"${guarded.replace(/"/g, '""')}"`;
  }

  generateMonthlyWinnersCSV(winners) {
    if (!winners) return '';

    const monthLabel = `${winners.month} ${winners.year}`;
    const rows = [
      [ 'Month', monthLabel ],
      [ 'Participants', winners.totalParticipants || 0 ],
      [ 'Category', 'Rank', 'Username', 'Score' ],
    ];

    const categories = [
      { key: 'total_focus', label: 'Focus Points' },
      { key: 'total_sessions', label: 'Sessions' },
      { key: 'longest_streak', label: 'Longest Streak' },
      { key: 'overall_champion', label: 'Overall Champion (Avg Rank)' }
    ];

    categories.forEach((category, index) => {
      const entries = (winners.topByCategory && winners.topByCategory[category.key])
        ? winners.topByCategory[category.key]
        : (winners.winners && winners.winners[category.key] ? [winners.winners[category.key]] : []);

      entries.forEach((entry, idx) => {
        if (!entry) return;
        rows.push([category.label, idx + 1, entry.username, entry.score]);
      });

      if (index < categories.length - 1) {
        rows.push([]);
      }
    });

    return rows
      .map((row) => row.map((cell) => this.sanitizeCSVValue(cell)).join(','))
      .join('\n');
  }

  async downloadMonthlyWinnersCSV(year, month) {
    const content = document.querySelector('.leaderboard-content');
    const originalContent = content ? content.innerHTML : '';

    try {
      const state = this.getHistoryMonthState(year, month);
      if (!state.downloadable) {
        this.showToast(`⚠️ ${state.hint}`);
        return;
      }

      if (content) {
        content.innerHTML = `
          <div class="leaderboard-loading">
            <div class="loading-spinner"></div>
            <p>Preparing monthly winners...</p>
          </div>
        `;
      }

      const winners = await this.leaderboard.getMonthlyWinners(year, month);
      if (!winners || !winners.totalParticipants) {
        throw new Error('No winners data found');
      }

      const csv = this.generateMonthlyWinnersCSV(winners);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      const monthLabel = String(month + 1).padStart(2, '0');
      link.href = url;
      link.download = `monthly-winners-${year}-${monthLabel}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (content) {
        content.innerHTML = originalContent;
      }

      this.showToast(`✅ Downloaded monthly-winners-${year}-${monthLabel}.csv`);
    } catch (error) {
      console.error('❌ Failed to download winners CSV:', error);
      if (content) {
        content.innerHTML = originalContent;
      }

      this.showToast('❌ Failed to download monthly winners');
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
            <button class="leaderboard-tab" data-category="history">
              <span>🗂️</span> <span class="tab-text">History</span>
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
                Rankings update in real-time based on synced account data.
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
    const content = document.querySelector('.leaderboard-content');
    
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
        this.updateAuxiliaryPanels();
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

    if (content) {
      content.addEventListener('click', (event) => {
        if (this.currentCategory !== 'history') return;

        const monthCard = event.target.closest('[data-history-month]');
        if (monthCard) {
          if (monthCard.disabled) return;
          const month = parseInt(monthCard.dataset.historyMonth, 10);
          if (Number.isNaN(month)) return;
          this.selectedHistoryMonth = month;
          if (this.isCompactHistoryPreferred()) {
            this.historyMonthsCollapsed = true;
          }
          this.loadHistoryTab();
          return;
        }

        const actionBtn = event.target.closest('[data-history-action]');
        if (!actionBtn) return;

        const action = actionBtn.dataset.historyAction;
        if (action === 'toggle-months') {
          this.historyMonthsCollapsed = !this.historyMonthsCollapsed;
          this.loadHistoryTab();
          return;
        }

        if (action === 'download') {
          if (this.selectedHistoryYear === null || this.selectedHistoryMonth === null) return;
          this.downloadMonthlyWinnersCSV(this.selectedHistoryYear, this.selectedHistoryMonth);
        }
      });

      content.addEventListener('change', (event) => {
        if (this.currentCategory !== 'history') return;
        if (event.target.id !== 'leaderboard-history-year') return;

        const year = parseInt(event.target.value, 10);
        if (Number.isNaN(year)) return;
        this.selectedHistoryYear = year;
        this.syncSelectedHistoryMonth(year);
        this.loadHistoryTab();
      });
    }
  }

  updatePeriodButtons() {
    const periodBtns = document.querySelectorAll('.period-btn');
    
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
      periodBtns.forEach(b => {
        if (b.dataset.period !== 'all_time') {
          b.classList.remove('active');
        }
      });
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

    this.updateAuxiliaryPanels();
    
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
    if (this.currentCategory === 'history') {
      this.loadHistoryTab();
      return;
    }
    
    // Show detailed loading status
    content.innerHTML = `
      <div class="leaderboard-loading">
        <div class="loading-spinner"></div>
        <p>Loading leaderboard data...</p>
      </div>
    `;

    // Load real data and calculate dynamic badges with better error handling
    Promise.all([
      this.leaderboard.getLeaderboard(this.currentCategory, this.currentPeriod, this.MAX_LEADERBOARD_USERS)
        .catch(error => {
          console.error('Leaderboard data fetch error:', error);
          return { rankings: [], highlightedUser: null, totalCount: 0, error: true };
        }),
      this.calculateDynamicBadges()
        .catch(error => {
          console.error('Badge calculation error:', error);
          return this.userBadges;
        })
    ])
    .then(([data, dynamicBadges]) => {
      // Handle potential errors in the data
      if (data.error) {
        content.innerHTML = `
          <div class="leaderboard-error">
            <h3>Connection Error</h3>
            <p>Unable to load leaderboard data. Please check your connection and try again.</p>
            <button class="leaderboard-retry-btn">Retry</button>
          </div>
        `;
        
        document.querySelector('.leaderboard-retry-btn')?.addEventListener('click', () => {
          this.loadLeaderboard();
        });
        return;
      }
      
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
          <button class="leaderboard-retry-btn">Retry</button>
        </div>
      `;
      
      document.querySelector('.leaderboard-retry-btn')?.addEventListener('click', () => {
        this.loadLeaderboard();
      });
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
  return window.databaseLeaderboardModal;
};
