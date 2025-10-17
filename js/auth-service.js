// Authentication Service
class AuthService {
  constructor() {
    console.log('AuthService constructor starting...');
    this.baseURL = 'https://customodoro-backend.onrender.com';
    this.currentUser = null;
    this.listeners = new Set();
    
    console.log('AuthService initialized with baseURL:', this.baseURL);
    
    // Initialize from localStorage
    this.loadStoredAuth();
    
    // Add error handler for browser extension conflicts
    this.addErrorHandlers();
    
    console.log('AuthService constructor completed');
  }
  
  // Add error handlers for browser extension conflicts
  addErrorHandlers() {
    window.addEventListener('error', (event) => {
      if (event.message && event.message.includes('message channel closed')) {
        console.warn('Browser extension conflict detected, continuing normally');
        event.preventDefault();
        return false;
      }
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && event.reason.message && event.reason.message.includes('message channel closed')) {
        console.warn('Browser extension promise rejection, continuing normally');
        event.preventDefault();
        return false;
      }
    });
  }
  
  // Load stored authentication data
  loadStoredAuth() {
    try {
      const storedAuth = localStorage.getItem('customodoro-auth');
      if (storedAuth) {
        this.currentUser = JSON.parse(storedAuth);
        console.log('AuthService: Loaded stored auth - User authenticated');
        
        // Validate stored auth data
        if (!this.currentUser.userId || !this.currentUser.email) {
          console.warn('AuthService: Invalid stored auth data, clearing');
          this.clearAuth();
          return;
        }
        
        // Trigger event to notify other components that user is logged in
        // Use setTimeout to ensure other components are initialized
        setTimeout(() => {
          this.notifyListeners('restore', this.currentUser);
          console.log('AuthService: Notified components of restored session');
        }, 100);
      }
    } catch (error) {
      console.warn('Failed to load stored auth:', error);
      localStorage.removeItem('customodoro-auth');
      this.currentUser = null;
    }
  }
  
  // Save authentication data
  saveAuth(userData) {
    // Add login timestamp for contamination detection
    const userDataWithTimestamp = {
      ...userData,
      loginTime: new Date().toISOString()
    };
    
    this.currentUser = userDataWithTimestamp;
    localStorage.setItem('customodoro-auth', JSON.stringify(userDataWithTimestamp));
    this.notifyListeners('login', userDataWithTimestamp);
  }
  
  // Clear authentication data
  clearAuth() {
    const wasLoggedIn = this.currentUser !== null;
    this.currentUser = null;
    localStorage.removeItem('customodoro-auth');
    

    if (wasLoggedIn) {
      this.clearUserSessionData();
      this.notifyListeners('logout', null);
    }
  }
  
  // Clear user-specific session data on logout to prevent cross-account data bleeding
  clearUserSessionData() {
    console.log('🧹 Clearing user session data to prevent cross-account contamination...');
    
    // 🚨 COMPREHENSIVE LIST: All keys that contain user-specific data (NOT settings/preferences)
    const sessionDataKeys = [
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
      !sessionDataKeys.includes(key) &&
      key !== 'customodoro-auth' // Don't clear auth here (handled separately)
    );
    
    // Combine explicit keys with pattern matches
    const allKeysToRemove = [...sessionDataKeys, ...patternMatches];
    
    console.log('🗑️ Keys to remove:', allKeysToRemove);
    
    // Clear all identified session data
    allKeysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
        console.log(`✅ Cleared session data: ${key}`);
      } catch (error) {
        console.warn(`⚠️ Failed to clear ${key}:`, error);
      }
    });
    
    // 📱 MOBILE FIX: Also clear sessionStorage for mobile browsers
    try {
      console.log('🧹 Clearing sessionStorage for mobile compatibility...');
      sessionStorage.clear();
      console.log('✅ SessionStorage cleared');
    } catch (error) {
      console.warn('⚠️ Failed to clear sessionStorage:', error);
    }
    
    // 📱 MOBILE FIX: Request service worker cache clearing for mobile
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        console.log('🧹 Requesting service worker cache clear for mobile...');
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAR_USER_CACHE',
          reason: 'User logout - prevent cross-account contamination'
        });
        console.log('✅ Service worker cache clear requested');
      } catch (error) {
        console.warn('⚠️ Failed to request service worker cache clear:', error);
      }
    }
    
    console.log('🔒 User session data cleared - ready for next user login');
  }
  
  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }
  
  // Check if user is logged in
  isLoggedIn() {
    return this.currentUser !== null;
  }
  
  // Register new user with email verification
  async register(email, username = '', userData = null) {
    console.log('AuthService.register called with:', { email, username, hasUserData: !!userData });
    try {

      let dataToSend = userData;
      if (!dataToSend && window.syncManager) {
        console.log('🛡️ Getting local data to prevent data loss during registration');
        dataToSend = window.syncManager.getCurrentLocalData();
        
        // Double-check if we have significant local data
        if (window.syncManager.hasSignificantLocalData(dataToSend)) {
          console.log('🛡️ CRITICAL: Significant local data detected - including in registration');
        }
      }
      
      const requestBody = {
        email: email.trim().toLowerCase(),
        username: username.trim() || email.split('@')[0],
        data: dataToSend || this.getLocalStorageData(),
        requireVerification: true // Request email verification
      };
      
      console.log('Registering user with email verification');
      console.log('Sending request to:', `${this.baseURL}/api/register`);
      
      const response = await fetch(`${this.baseURL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('Registration response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Registration failed' }));
        console.error('Registration failed:', errorData);
        throw new Error(errorData.error || `Registration failed: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('Registration successful - User created');
      
      // If verification is required, return verification info
      if (responseData.requiresVerification) {
        return {
          ...responseData,
          needsVerification: true,
          email: requestBody.email,
          message: 'Please check your email for a verification code'
        };
      }
      
      // Save authentication data if no verification needed
      this.saveAuth({
        userId: responseData.userId,
        email: requestBody.email,
        username: responseData.user?.username || requestBody.username,
        createdAt: responseData.user?.createdAt || responseData.createdAt || new Date().toISOString()
      });

      return responseData;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  // Verify email with code
  async verifyEmail(email, code) {
    console.log('AuthService.verifyEmail called with:', { email, code: '***' });
    try {
      const response = await fetch(`${this.baseURL}/api/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim()
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Verification failed' }));
        throw new Error(errorData.error || 'Invalid verification code');
      }

      const responseData = await response.json();
      console.log('Email verification successful');
      
      // Save authentication data after successful verification
      this.saveAuth({
        userId: responseData.userId,
        email: email.trim().toLowerCase(),
        username: responseData.user?.username || responseData.username,
        createdAt: responseData.user?.createdAt || responseData.createdAt,
        verified: true
      });

      return responseData;
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  }  // Login existing user
  async login(email) {
    console.log('AuthService.login called with:', { email });
    try {
      const requestBody = {
        email: email.trim().toLowerCase()
      };
      
      console.log('Logging in user...');
      console.log('Sending request to:', `${this.baseURL}/api/login`);
      
      const response = await fetch(`${this.baseURL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('Login response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Login failed' }));
        console.error('Login failed:', errorData);
        throw new Error(errorData.error || `Login failed: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('Login successful');
      
      // Save authentication data - Fix to use proper server response structure
      this.saveAuth({
        userId: responseData.userId,
        email: requestBody.email,
        username: responseData.user?.username || responseData.username,
        createdAt: responseData.user?.createdAt || responseData.createdAt
      });

      return responseData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }
  
  // Logout user
  logout() {
    this.clearAuth();
    
    // 📱 MOBILE FIX: Force page reload on mobile browsers after logout
    // Mobile browsers are more aggressive with caching and need a hard reset
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      console.log('📱 Mobile logout detected - forcing page reload for complete cleanup');
      setTimeout(() => {
        window.location.reload(true); // Force reload from server
      }, 500); // Small delay to ensure cleanup completes
    }
  }
  
  // Get current localStorage data for migration
  getLocalStorageData() {
    const data = {};
    
    // Collect all customodoro-related data from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('customodoro-')) {
        try {
          const value = localStorage.getItem(key);
          // Try to parse as JSON, fallback to string
          try {
            data[key] = JSON.parse(value);
          } catch {
            data[key] = value;
          }
        } catch (error) {
          console.warn(`Failed to read localStorage key: ${key}`, error);
        }
      }
    }
    
    console.log('Collected localStorage data:', Object.keys(data));
    return data;
  }
  
  // Add event listener
  addEventListener(callback) {
    this.listeners.add(callback);
  }
  
  // Remove event listener
  removeEventListener(callback) {
    this.listeners.delete(callback);
  }
  
  // Notify all listeners
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Auth listener error:', error);
      }
    });
  }
  

}

// Create global instance
console.log('Creating AuthService instance...');
window.authService = new AuthService();
console.log('AuthService created successfully:', window.authService);