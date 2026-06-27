// Authentication Service
class AuthService {
  constructor() {
    this.baseURL = "https://customodoro-backend.onrender.com";
    this.currentUser = null;
    this.listeners = new Set();


    // Initialize from localStorage
    this.loadStoredAuth();

    // Add error handler for browser extension conflicts
    this.addErrorHandlers();

  }

  // Add error handlers for browser extension conflicts
  addErrorHandlers() {
    window.addEventListener("error", (event) => {
      if (event.message && event.message.includes("message channel closed")) {
        event.preventDefault();
        return false;
      }
    });

    window.addEventListener("unhandledrejection", (event) => {
      if (
        event.reason &&
        event.reason.message &&
        event.reason.message.includes("message channel closed")
      ) {
        event.preventDefault();
        return false;
      }
    });
  }

  // Load stored authentication data
  loadStoredAuth() {
    try {
      const storedAuth = localStorage.getItem("customodoro-auth");
      if (storedAuth) {
        this.currentUser = JSON.parse(storedAuth);

        // Validate stored auth data
        if (!this.currentUser.userId || !this.currentUser.email) {
          window.customodoroLogger.error("AUTH_SERVICE_AUTHSERVICE_INVALID_STORED_AUTH_DATA_CLEAR");
          this.clearAuth();
          return;
        }

        // Trigger event to notify other components that user is logged in
        // Use setTimeout to ensure other components are initialized
        setTimeout(() => {
          this.notifyListeners("restore", this.currentUser);
        }, 100);
      }
    } catch (error) {
      window.customodoroLogger.error("AUTH_SERVICE_FAILED_TO_LOAD_STORED_AUTH");
      localStorage.removeItem("customodoro-auth");
      this.currentUser = null;
    }
  }

  // Save authentication data
  saveAuth(userData) {
    // Add login timestamp for contamination detection
    const userDataWithTimestamp = {
      ...userData,
      loginTime: new Date().toISOString(),
    };

    this.currentUser = userDataWithTimestamp;
    localStorage.setItem(
      "customodoro-auth",
      JSON.stringify(userDataWithTimestamp),
    );
    this.notifyListeners("login", userDataWithTimestamp);
  }

  // Clear authentication data
  clearAuth() {
    const wasLoggedIn = this.currentUser !== null;
    this.currentUser = null;
    localStorage.removeItem("customodoro-auth");

    if (wasLoggedIn) {
      this.clearUserSessionData();
      this.notifyListeners("logout", null);
    }
  }

  // Clear user-specific session data on logout to prevent cross-account data bleeding
  clearUserSessionData() {

    // 🚨 COMPREHENSIVE LIST: All keys that contain user-specific data (NOT settings/preferences)
    const sessionDataKeys = [
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
        !sessionDataKeys.includes(key) &&
        key !== "customodoro-auth", // Don't clear auth here (handled separately)
    );

    // Combine explicit keys with pattern matches
    const allKeysToRemove = [...sessionDataKeys, ...patternMatches];


    // Clear all identified session data
    allKeysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        window.customodoroLogger.error("AUTH_SERVICE_FAILED_TO_CLEAR_KEY");
      }
    });

    // 📱 MOBILE FIX: Also clear sessionStorage for mobile browsers
    try {
      sessionStorage.clear();
    } catch (error) {
      window.customodoroLogger.error("AUTH_SERVICE_FAILED_TO_CLEAR_SESSIONSTORAGE");
    }

    // 📱 MOBILE FIX: Request service worker cache clearing for mobile
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      try {
        navigator.serviceWorker.controller.postMessage({
          type: "CLEAR_USER_CACHE",
          reason: "User logout - prevent cross-account contamination",
        });
      } catch (error) {
        window.customodoroLogger.error("AUTH_SERVICE_FAILED_TO_REQUEST_SERVICE_WORKER_CACHE_CLE");
      }
    }

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
  async register(email, username = "", userData = null) {
    try {
      let dataToSend = userData;
      if (!dataToSend && window.syncManager) {
        dataToSend = window.syncManager.getCurrentLocalData();
      }

      const requestBody = {
        email: email.trim().toLowerCase(),
        username: username.trim() || email.split("@")[0],
        data: dataToSend || this.getLocalStorageData(),
        requireVerification: true, // Request email verification
      };


      const response = await fetch(`${this.baseURL}/api/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });


      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Registration failed" }));
        window.customodoroLogger.error("AUTH_SERVICE_REGISTRATION_FAILED");
        throw new Error(
          errorData.error || `Registration failed: ${response.status}`,
        );
      }

      const responseData = await response.json();

      // If verification is required, return verification info
      if (responseData.requiresVerification) {
        return {
          ...responseData,
          needsVerification: true,
          email: requestBody.email,
          message: "Please check your email for a verification code",
        };
      }

      // Save authentication data if no verification needed
      this.saveAuth({
        userId: responseData.userId,
        email: requestBody.email,
        username: responseData.user?.username || requestBody.username,
        createdAt:
          responseData.user?.createdAt ||
          responseData.createdAt ||
          new Date().toISOString(),
      });

      return responseData;
    } catch (error) {
      window.customodoroLogger.error("AUTH_SERVICE_REGISTRATION");
      throw error;
    }
  }

  // Verify email with code
  async verifyEmail(email, code) {
    try {
      const response = await fetch(`${this.baseURL}/api/verify-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Verification failed" }));
        throw new Error(errorData.error || "Invalid verification code");
      }

      const responseData = await response.json();

      // Save authentication data after successful verification
      this.saveAuth({
        userId: responseData.userId,
        email: email.trim().toLowerCase(),
        username: responseData.user?.username || responseData.username,
        createdAt: responseData.user?.createdAt || responseData.createdAt,
        verified: true,
      });

      return responseData;
    } catch (error) {
      window.customodoroLogger.error("AUTH_SERVICE_EMAIL_VERIFICATION");
      throw error;
    }
  } // Login existing user
  async login(email) {
    try {
      const requestBody = {
        email: email.trim().toLowerCase(),
      };


      const response = await fetch(`${this.baseURL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });


      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Login failed" }));
        window.customodoroLogger.error("AUTH_SERVICE_LOGIN_FAILED");
        throw new Error(errorData.error || `Login failed: ${response.status}`);
      }

      const responseData = await response.json();

      // Save authentication data - Fix to use proper server response structure
      this.saveAuth({
        userId: responseData.userId,
        email: requestBody.email,
        username: responseData.user?.username || responseData.username,
        createdAt: responseData.user?.createdAt || responseData.createdAt,
      });

      return responseData;
    } catch (error) {
      window.customodoroLogger.error("AUTH_SERVICE_LOGIN");
      throw error;
    }
  }

  // Logout user
  logout() {
    this.clearAuth();

    // 📱 MOBILE FIX: Force page reload on mobile browsers after logout
    // Mobile browsers are more aggressive with caching and need a hard reset
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );
    if (isMobile) {
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
      if (key && key.startsWith("customodoro-")) {
        try {
          const value = localStorage.getItem(key);
          // Try to parse as JSON, fallback to string
          try {
            data[key] = JSON.parse(value);
          } catch {
            data[key] = value;
          }
        } catch (error) {
          window.customodoroLogger.error("AUTH_SERVICE_FAILED_TO_READ_LOCALSTORAGE_KEY_KEY");
        }
      }
    }

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
    this.listeners.forEach((callback) => {
      try {
        callback(event, data);
      } catch (error) {
        window.customodoroLogger.error("AUTH_SERVICE_AUTH_LISTENER");
      }
    });
  }
}

// Create global instance
window.authService = new AuthService();
