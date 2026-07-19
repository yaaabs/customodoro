// Authentication Service
// Backed by Supabase Auth (passwordless email OTP). The Supabase session is
// the source of truth; the "customodoro-auth" localStorage blob is kept only
// as a fast-paint mirror in the same shape the rest of the app expects:
// { userId, email, username, createdAt, loginTime, authProvider }
class AuthService {
  constructor() {
    this.currentUser = null;
    this.listeners = new Set();
    this.legacyAuth = null; // pre-Supabase localStorage session, if any
    this.pendingUsername = null; // display name captured before OTP verify

    // Add error handler for browser extension conflicts
    this.addErrorHandlers();

    // Initialize from the Supabase session (async)
    this.initSession();
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

  // Restore the session from Supabase on page load
  async initSession() {
    if (!window.supabaseClient) {
      window.customodoroLogger.error("AUTH_SERVICE_SUPABASE_CLIENT_MISSING");
      return;
    }

    try {
      const {
        data: { session },
      } = await window.supabaseClient.auth.getSession();

      if (session) {
        await this.restoreFromSession(session);
      } else {
        this.detectLegacySession();
      }

      // Keep in sync with token refreshes and sign-outs from other tabs
      window.supabaseClient.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT" && this.currentUser) {
          this.clearAuth();
        }
      });
    } catch (error) {
      window.customodoroLogger.error("AUTH_SERVICE_FAILED_TO_LOAD_STORED_AUTH");
    }
  }

  async restoreFromSession(session) {
    try {
      const profile = await this.ensureProfile(session);
      this.currentUser = {
        userId: profile.user_id,
        email: profile.email,
        username: profile.username,
        createdAt: profile.created_at,
        authProvider: "supabase",
      };
      localStorage.setItem(
        "customodoro-auth",
        JSON.stringify(this.currentUser),
      );

      // Use setTimeout to ensure other components are initialized
      setTimeout(() => {
        this.notifyListeners("restore", this.currentUser);
      }, 100);
    } catch (error) {
      // Network hiccup: fall back to the mirror so the UI still paints,
      // Supabase session remains valid and sync will retry on its own.
      const mirror = this.readStoredMirror();
      if (mirror && mirror.authProvider === "supabase") {
        this.currentUser = mirror;
        setTimeout(() => {
          this.notifyListeners("restore", this.currentUser);
        }, 100);
      } else {
        window.customodoroLogger.error("AUTH_SERVICE_PROFILE_RESTORE_FAILED");
      }
    }
  }

  // A "legacy" session is the old backend's localStorage blob with no
  // Supabase session behind it. We keep it (and all local data) untouched
  // and let the UI prompt the user to verify their email once.
  detectLegacySession() {
    const mirror = this.readStoredMirror();
    if (mirror && mirror.authProvider !== "supabase") {
      this.legacyAuth = mirror;
    }
  }

  readStoredMirror() {
    try {
      const stored = localStorage.getItem("customodoro-auth");
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }

  hasLegacySession() {
    return this.legacyAuth !== null && this.currentUser === null;
  }

  getLegacyEmail() {
    return this.legacyAuth ? this.legacyAuth.email : null;
  }

  // Fetch this user's profile row (created/linked by the DB trigger).
  // Small retry in case the trigger commit races the first select.
  async ensureProfile(session) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await window.supabaseClient
        .from("users")
        .select("user_id, email, username, created_at")
        .eq("auth_id", session.user.id)
        .maybeSingle();

      if (data) return data;
      if (error) {
        window.customodoroLogger.error("AUTH_SERVICE_PROFILE_FETCH_FAILED");
        throw new Error("Could not load your account. Please try again.");
      }
      // Row not there yet — wait for the trigger and retry
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
    throw new Error("Account setup is taking longer than expected. Please try again.");
  }

  // Step 1 of sign-in: email the user a 6-digit code.
  // mode "existing": only send if the account exists (no silent signup);
  // mode "new": probe first — if the account exists, send a SIGN-IN code
  //             and report it, instead of pretending to register;
  // mode "auto": create-or-signin silently (legacy banner path).
  async requestOtp(email, username = "", mode = "auto") {
    const normalizedEmail = email.trim().toLowerCase();
    this.pendingUsername = username.trim() || null;

    const send = (shouldCreateUser, includeUsername) => {
      const options = { shouldCreateUser };
      if (includeUsername && this.pendingUsername) {
        // The DB trigger reads this for brand-new accounts
        options.data = { username: this.pendingUsername };
      }
      return window.supabaseClient.auth.signInWithOtp({
        email: normalizedEmail,
        options,
      });
    };

    if (mode === "existing") {
      const { error } = await send(false, false);
      if (error) {
        window.customodoroLogger.error("AUTH_SERVICE_OTP_REQUEST_FAILED");
        if (this.isNoAccountError(error)) {
          const err = new Error(
            'No account found with this email. Double-check it, or go back and choose "I\'m new here".',
          );
          err.code = "no_account";
          throw err;
        }
        throw new Error(this.friendlyAuthError(error));
      }
      return { email: normalizedEmail, needsVerification: true, existingAccount: true };
    }

    if (mode === "new") {
      // Probe without creating: success means the account already exists
      // (and the sign-in code is already on its way)
      const probe = await send(false, false);
      if (!probe.error) {
        return { email: normalizedEmail, needsVerification: true, existingAccount: true };
      }
      if (!this.isNoAccountError(probe.error)) {
        window.customodoroLogger.error("AUTH_SERVICE_OTP_REQUEST_FAILED");
        throw new Error(this.friendlyAuthError(probe.error));
      }
      // Genuinely new — create the account and send the code
      const { error } = await send(true, true);
      if (error) {
        window.customodoroLogger.error("AUTH_SERVICE_OTP_REQUEST_FAILED");
        throw new Error(this.friendlyAuthError(error));
      }
      return { email: normalizedEmail, needsVerification: true, existingAccount: false };
    }

    const { error } = await send(true, true);
    if (error) {
      window.customodoroLogger.error("AUTH_SERVICE_OTP_REQUEST_FAILED");
      throw new Error(this.friendlyAuthError(error));
    }
    return { email: normalizedEmail, needsVerification: true };
  }

  // Supabase's "refuse to send without signup" error — our only (and
  // deliberate) signal that no account exists for an email
  isNoAccountError(error) {
    const message = ((error && error.message) || "").toLowerCase();
    return (
      (error && error.code) === "otp_disabled" ||
      message.includes("signups not allowed") ||
      message.includes("user not found")
    );
  }

  // Step 2 of sign-in: exchange the emailed code for a session.
  async verifyOtp(email, code) {
    const normalizedEmail = email.trim().toLowerCase();

    const { data, error } = await window.supabaseClient.auth.verifyOtp({
      email: normalizedEmail,
      token: code.trim(),
      type: "email",
    });

    if (error || !data.session) {
      window.customodoroLogger.error("AUTH_SERVICE_EMAIL_VERIFICATION");
      throw new Error(this.friendlyAuthError(error));
    }

    const profile = await this.ensureProfile(data.session);
    this.legacyAuth = null;
    this.pendingUsername = null;

    this.saveAuth({
      userId: profile.user_id,
      email: profile.email,
      username: profile.username,
      createdAt: profile.created_at,
      authProvider: "supabase",
    });

    return profile;
  }

  // Kept as an alias: the verification modal calls verifyEmail(email, code)
  async verifyEmail(email, code) {
    return this.verifyOtp(email, code);
  }

  friendlyAuthError(error) {
    const message = (error && error.message) || "";
    const code = (error && error.code) || "";

    // Supabase intentionally returns the same error for wrong AND expired
    // codes (so attackers can't tell how close they are) — say both.
    if (
      code === "otp_expired" ||
      message.includes("expired") ||
      message.includes("invalid")
    ) {
      return "That code is invalid or has expired. Double-check the 6 digits, or tap Resend for a fresh one.";
    }
    if (code === "over_email_send_rate_limit" || message.includes("rate limit")) {
      return "Too many emails requested. Please wait a minute and try again.";
    }
    if (message.toLowerCase().includes("error sending")) {
      // SMTP delivery failure — Supabase accepted the request but the mail
      // provider refused to send
      let hint =
        "We couldn't send the email right now. Please try again in a moment.";
      if (window.supabaseEnv === "staging") {
        hint +=
          " (Staging note: Resend test mode only delivers to the email address you signed up to Resend with — other addresses are rejected until a domain is verified.)";
      }
      return hint;
    }
    if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
      return "No connection. Check your internet and try again.";
    }
    return message || "Sign-in failed. Please try again.";
  }

  // Save authentication data (mirror only — Supabase holds the real session)
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
        key !== "customodoro-auth" && // Don't clear auth here (handled separately)
        !key.startsWith("sb-"), // Supabase session storage (handled by signOut)
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

  // Logout user
  async logout() {
    try {
      if (window.supabaseClient) {
        await window.supabaseClient.auth.signOut();
      }
    } catch (error) {
      window.customodoroLogger.error("AUTH_SERVICE_SIGNOUT_FAILED");
    }

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
