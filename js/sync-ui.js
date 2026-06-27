// Sync UI Manager
class SyncUI {
  constructor() {
    this.elements = {};
    this.isInitialized = false;

    // Initialize when DOM is ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.init());
    } else {
      this.init();
    }
  }

  // Initialize UI
  init() {
    if (this.isInitialized) return;

    this.cacheElements();
    this.setupEventListeners();
    this.updateUI();
    this.isInitialized = true;

  }

  // Cache DOM elements
  cacheElements() {
    this.elements = {
      // States
      notLoggedIn: document.getElementById("sync-not-logged-in"),
      loggedIn: document.getElementById("sync-logged-in"),
      error: document.getElementById("sync-error"),

      // Form elements
      emailInput: document.getElementById("sync-email-input"),
      usernameInput: document.getElementById("sync-username-input"),

      // Buttons
      registerBtn: document.getElementById("sync-register-btn"),
      loginBtn: document.getElementById("sync-login-btn"),
      manualSyncBtn: document.getElementById("sync-manual-btn"),
      exportBtn: document.getElementById("sync-export-btn"),
      logoutBtn: document.getElementById("sync-logout-btn"),
      retryBtn: document.getElementById("sync-retry-btn"),

      // User info
      userName: document.getElementById("sync-user-name"),
      userEmail: document.getElementById("sync-user-email"),
      syncStatus: document.getElementById("sync-status"),

      // Stats
      sessionsCount: document.getElementById("sync-sessions-count"),
      lastSync: document.getElementById("sync-last-sync"),
      createdDate: document.getElementById("sync-created-date"),

      // Error
      errorMessage: document.getElementById("sync-error-message"),
    };

  }

  // Setup event listeners
  setupEventListeners() {
    // Auth service events (with retry logic)
    if (window.authService) {
      window.authService.addEventListener((event, data) => {
        if (event === "login" || event === "logout" || event === "restore") {
          this.updateUI();

          // If restore event, ensure we stay in logged-in state
          if (event === "restore" && data) {
            this.showLoggedInState();
          }
        }
      });
    }

    // Sync manager events
    if (window.syncManager) {
      window.syncManager.addEventListener((event, data) => {
        this.handleSyncEvent(event, data);
      });
    }

    // Button events
    if (this.elements.registerBtn) {
      this.elements.registerBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleRegister();
      });
    } else {
      window.customodoroLogger.error("SYNC_UI_REGISTER_BUTTON_NOT_FOUND");
    }

    if (this.elements.loginBtn) {
      this.elements.loginBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleLogin();
      });
    } else {
      window.customodoroLogger.error("SYNC_UI_LOGIN_BUTTON_NOT_FOUND");
    }

    if (this.elements.manualSyncBtn) {
      this.elements.manualSyncBtn.addEventListener("click", () =>
        this.handleManualSync(),
      );
    }

    if (this.elements.exportBtn) {
      this.elements.exportBtn.addEventListener("click", () =>
        this.handleExport(),
      );
    }

    if (this.elements.logoutBtn) {
      this.elements.logoutBtn.addEventListener("click", () =>
        this.handleLogout(),
      );
    }

    if (this.elements.retryBtn) {
      this.elements.retryBtn.addEventListener("click", () =>
        this.handleRetry(),
      );
    }

    // Form submission
    if (this.elements.emailInput) {
      this.elements.emailInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.handleRegister();
        }
      });
    }

    if (this.elements.usernameInput) {
      this.elements.usernameInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.handleRegister();
        }
      });
    }
  }

  // Handle sync events
  handleSyncEvent(event, data) {
    switch (event) {
      case "sync-start":
        this.updateSyncStatus("syncing", "Syncing...");
        this.setButtonLoading(this.elements.manualSyncBtn, true);
        break;

      case "sync-complete":
        this.updateSyncStatus("synced", "Synced");
        this.setButtonLoading(this.elements.manualSyncBtn, false);
        this.updateStats();
        // Productivity stats now sync via streaks field workaround
        this.showToast("✅ All data synced successfully!", "success");
        break;

      case "sync-error":
        this.updateSyncStatus("error", "Sync failed");
        this.setButtonLoading(this.elements.manualSyncBtn, false);

        // Enhanced error messaging for backend issues
        let errorMessage = data.message;
        if (errorMessage.includes("Validation failed")) {
          errorMessage =
            "Backend schema limitation detected. Some data may remain local-only.";
        }

        this.showToast("❌ Sync failed: " + errorMessage, "error");
        break;

      case "connection":
        this.updateUI();
        break;
    }
  }

  // Update entire UI based on current state
  updateUI() {
    if (!this.isInitialized) return;

    // Check if auth service is available
    if (!window.authService) {
      setTimeout(() => this.updateUI(), 100);
      return;
    }

    const isLoggedIn = window.authService.isLoggedIn();
    const user = window.authService.getCurrentUser();


    // Emit auth state change event for header profile
    document.dispatchEvent(
      new CustomEvent("authStateChanged", {
        detail: {
          isLoggedIn,
          user,
        },
      }),
    );

    if (isLoggedIn) {
      this.showLoggedInState();
    } else {
      this.showNotLoggedInState();
    }

    this.hideErrorState();
  }

  // Show not logged in state
  showNotLoggedInState() {
    if (this.elements.notLoggedIn)
      this.elements.notLoggedIn.style.display = "block";
    if (this.elements.loggedIn) this.elements.loggedIn.style.display = "none";
  }

  // Show logged in state
  showLoggedInState() {
    if (this.elements.notLoggedIn)
      this.elements.notLoggedIn.style.display = "none";
    if (this.elements.loggedIn) this.elements.loggedIn.style.display = "block";

    this.updateUserInfo();
    this.updateStats();
    this.updateSyncStatusFromManager();
  }

  // Show error state
  showErrorState(message) {
    if (this.elements.error) {
      this.elements.error.style.display = "block";
      if (this.elements.errorMessage) {
        this.elements.errorMessage.textContent = message;
      }
    }
    if (this.elements.notLoggedIn)
      this.elements.notLoggedIn.style.display = "none";
    if (this.elements.loggedIn) this.elements.loggedIn.style.display = "none";
  }

  // Hide error state
  hideErrorState() {
    if (this.elements.error) {
      this.elements.error.style.display = "none";
    }
  }

  // Update user info
  updateUserInfo() {
    const user = window.authService?.getCurrentUser();
    if (!user) return;

    if (this.elements.userName) {
      // Show username if available, otherwise extract from email
      const displayName = user.username || user.email.split("@")[0];
      this.elements.userName.textContent = displayName;
    }

    if (this.elements.userEmail) {
      this.elements.userEmail.textContent = user.email || "";
    }
  }

  // Update sync status
  updateSyncStatus(status, message) {
    if (!this.elements.syncStatus) return;

    // Emit sync status change event for header profile
    document.dispatchEvent(
      new CustomEvent("syncStatusChanged", {
        detail: {
          status,
          message,
        },
      }),
    );

    // Remove all status classes
    this.elements.syncStatus.className = "sync-status";

    // Add current status class
    this.elements.syncStatus.classList.add(status);

    // Update icon and text
    const icon = this.elements.syncStatus.querySelector(".sync-status-icon");
    const text = this.elements.syncStatus.querySelector(".sync-status-text");

    if (icon && text) {
      switch (status) {
        case "synced":
          icon.textContent = "✅";
          break;
        case "syncing":
          icon.textContent = "🔄";
          break;
        case "error":
          icon.textContent = "❌";
          break;
        case "offline":
          icon.textContent = "📡";
          break;
        default:
          icon.textContent = "⏸️";
      }

      text.textContent = message;
    }
  }

  // Update sync status from manager
  updateSyncStatusFromManager() {
    if (!window.syncManager) return;

    const status = window.syncManager.getSyncStatus();
    this.updateSyncStatus(status.status, status.message);
  }

  // Update stats
  updateStats() {
    if (!window.syncManager) return;

    const stats = window.syncManager.getSyncStatsDetailed();
    const user = window.authService?.getCurrentUser();

    // Update sessions synced count
    if (this.elements.sessionsCount) {
      this.elements.sessionsCount.textContent = stats.sessionsSynced || 0;
    }

    // Update last sync time
    if (this.elements.lastSync) {
      if (stats.lastSync) {
        this.elements.lastSync.textContent = new Date(
          stats.lastSync,
        ).toLocaleDateString("en-US", {
          month: "numeric",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      } else {
        this.elements.lastSync.textContent = "Never";
      }
    }

    // Update account created date
    if (this.elements.createdDate) {
      if (user && user.createdAt) {
        this.elements.createdDate.textContent = new Date(
          user.createdAt,
        ).toLocaleDateString("en-US", {
          month: "numeric",
          day: "numeric",
          year: "numeric",
        });
      } else {
        this.elements.createdDate.textContent = "Unknown";
      }
    }
  }

  // Handle register
  async handleRegister() {
    if (!window.authService) {
      window.customodoroLogger.error("SYNC_UI_AUTHSERVICE_NOT_AVAILABLE");
      this.showToast(
        "Sync service not available. Please refresh the page.",
        "error",
      );
      return;
    }

    const email = this.elements.emailInput?.value.trim();
    const username = this.elements.usernameInput?.value.trim();


    if (!email) {
      this.showToast("Please enter your email address", "error");
      return;
    }

    if (!this.isValidEmail(email)) {
      this.showToast("Please enter a valid email address", "error");
      return;
    }

    try {
      // Check if user has local data - if so, show confirmation modal
      const hasLocalData = this.hasSignificantLocalData();
      if (hasLocalData) {
        // Show confirmation modal before registering
        this.showSyncConfirmModal(email, username, "register");
      } else {
        // No significant local data, ask for confirmation before registering
        const confirmed = confirm(
          "Are you sure you want to create an account and sync your data with this email?",
        );
        if (!confirmed) return;
        await this.doRegister(email, username);
      }
    } catch (error) {
      window.customodoroLogger.error("SYNC_UI_IN_REGISTRATION_FLOW");
      // Fallback: try register directly
      await this.doRegister(email, username);
    }
  }

  // Handle login
  async handleLogin() {
    if (!window.authService) {
      window.customodoroLogger.error("SYNC_UI_AUTHSERVICE_NOT_AVAILABLE");
      this.showToast(
        "Sync service not available. Please refresh the page.",
        "error",
      );
      return;
    }

    const email = this.elements.emailInput?.value.trim();


    if (!email) {
      this.showToast("Please enter your email address", "error");
      return;
    }

    if (!this.isValidEmail(email)) {
      this.showToast("Please enter a valid email address", "error");
      return;
    }

    try {
      // Check if user has local data - if so, show confirmation modal
      const hasLocalData = this.hasSignificantLocalData();

      if (hasLocalData) {
        this.showSyncConfirmModal(email, "", "login");
      } else {
        // No local data, proceed directly
        await this.doLogin(email);
      }
    } catch (error) {
      window.customodoroLogger.error("SYNC_UI_IN_LOGIN_FLOW");
      // Fallback: try login directly
      await this.doLogin(email);
    }
  }

  // Check if user has significant local data that might be overwritten
  hasSignificantLocalData() {
    try {
      // If user is already logged in, don't show confirmation modal
      // This prevents the modal from showing when switching between accounts
      if (window.authService?.isLoggedIn()) {
        return false;
      }

      // Check if this browser has been used with sync before
      const hasUsedSync =
        localStorage.getItem("customodoro-has-used-sync") === "true";
      if (hasUsedSync) {
        return false;
      }

      const stats = JSON.parse(
        localStorage.getItem("customodoroStatsByDay") || "{}",
      );
      const totalSessions = Object.values(stats).reduce((sum, day) => {
        return sum + (day.classic || 0) + (day.reverse || 0);
      }, 0);


      const hasSignificantData = totalSessions >= 1;
      return hasSignificantData;
    } catch (error) {
      window.customodoroLogger.error("SYNC_UI_CHECKING_LOCAL_DATA");
      return false;
    }
  } // Handle manual sync
  async handleManualSync() {
    if (!window.syncManager) return;

    try {
      await window.syncManager.manualSync();
    } catch (error) {
      window.customodoroLogger.error("SYNC_UI_MANUAL_SYNC");
      // Error handling is done in sync event listener
    }
  }

  // Handle export
  handleExport() {
    if (!window.syncManager) return;

    try {
      window.syncManager.exportData();
      this.showToast("📥 Data exported successfully!", "success");
    } catch (error) {
      window.customodoroLogger.error("SYNC_UI_EXPORT");
      this.showToast("❌ Failed to export data", "error");
    }
  }

  // Handle logout
  handleLogout() {
    if (!window.authService) return;

    if (
      confirm(
        "Are you sure you want to sign out? Your local data will remain on this device.",
      )
    ) {
      window.authService.logout();
      this.showToast("👋 Signed out successfully", "success");
    }
  }

  // Handle retry
  handleRetry() {
    this.hideErrorState();
    this.updateUI();
  }

  // Set button loading state
  setButtonLoading(button, loading) {
    if (!button) {
      return;
    }

    const textSpan = button.querySelector(".sync-btn-text");
    const spinnerSpan = button.querySelector(".sync-btn-spinner");


    if (loading) {
      button.disabled = true;
      if (textSpan) textSpan.style.display = "none";
      if (spinnerSpan) spinnerSpan.style.display = "inline-flex";
    } else {
      button.disabled = false;
      if (textSpan) textSpan.style.display = "inline";
      if (spinnerSpan) spinnerSpan.style.display = "none";
    }

  }

  // Clear form
  clearForm() {
    if (this.elements.emailInput) this.elements.emailInput.value = "";
    if (this.elements.usernameInput) this.elements.usernameInput.value = "";
  }

  // Validate email
  isValidEmail(email) {
    // More strict email validation with comprehensive checks
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    // Basic regex check
    if (!emailRegex.test(email)) {
      return false;
    }

    // Split email into local and domain parts
    const parts = email.split("@");
    if (parts.length !== 2) {
      return false;
    }

    const [localPart, domain] = parts;

    // Check local part (before @)
    if (!localPart || localPart.length < 1 || localPart.length > 64) {
      return false;
    }

    // Check domain part (after @)
    if (!domain || domain.length < 4 || domain.length > 255) {
      return false;
    }

    // Check for valid TLD (must have at least one dot and valid TLD)
    const domainParts = domain.split(".");
    if (domainParts.length < 2) {
      return false;
    }

    // Check TLD (last part)
    const tld = domainParts[domainParts.length - 1];
    if (!tld || tld.length < 2 || tld.length > 6) {
      return false;
    }

    // TLD must be alphabetic only
    if (!/^[a-zA-Z]{2,6}$/.test(tld)) {
      return false;
    }

    // Check for consecutive dots
    if (email.includes("..")) {
      return false;
    }

    // Check for domain starting or ending with hyphen
    if (domain.startsWith("-") || domain.endsWith("-")) {
      return false;
    }

    // Check each domain part
    for (const part of domainParts) {
      if (!part || part.length === 0) {
        return false;
      }

      // Domain parts cannot start or end with hyphen
      if (part.startsWith("-") || part.endsWith("-")) {
        return false;
      }
    }

    return true;
  }

  // Show sync confirmation modal
  showSyncConfirmModal(email, username, action) {

    // Remove any existing custom modal first
    const existingModal = document.getElementById("custom-sync-modal");
    if (existingModal) {
      existingModal.remove();
    }

    // Get current data for display
    const currentData = this.getCurrentDataSummary();

    const hasSignificantData =
      currentData.totalSessions > 0 ||
      currentData.currentStreak > 0 ||
      currentData.totalPoints > 0;

    let warningLevel = "info";
    let warningMessage = "";

    if (
      currentData.totalSessions >= 10 ||
      currentData.currentStreak >= 3 ||
      currentData.totalPoints >= 50
    ) {
      warningLevel = "critical";
      warningMessage = "You have substantial progress that could be lost!";
    } else if (
      currentData.totalSessions >= 3 ||
      currentData.currentStreak >= 1 ||
      currentData.totalPoints >= 10
    ) {
      warningLevel = "warning";
      warningMessage = "You have progress that could be affected.";
    } else if (hasSignificantData) {
      warningLevel = "info";
      warningMessage = "You have some local data.";
    }

    // Determine warning level
    let warningHTML = "";
    if (warningLevel === "critical") {
      warningHTML = `
        <div style="
          background: #f8d7da !important;
          border: 1px solid #f5c6cb !important;
          color: #721c24 !important;
          padding: 15px !important;
          border-radius: 5px !important;
          margin: 20px 0 !important;
          font-size: 14px !important;
        ">
          <strong>🚨 CRITICAL WARNING:</strong> ${warningMessage} ${action === "register" ? "Creating" : "Signing into"} this account will sync your data to the cloud.
        </div>
        
        <!--
        <div style="
          background: #d4edda !important;
          border: 1px solid #c3e6cb !important;
          color: #155724 !important;
          padding: 15px !important;
          border-radius: 5px !important;
          margin: 20px 0 !important;
          font-size: 14px !important;
        ">
          <strong>✅ Data Protection:</strong> Your existing progress will be preserved and uploaded to your account. Please review the current data summary first.
        </div>
        -->
      `;
    } else if (hasSignificantData) {
      warningHTML = `
        <div style="
          background: #fff3cd !important;
          border: 1px solid #ffeaa7 !important;
          color: #856404 !important;
          padding: 15px !important;
          border-radius: 5px !important;
          margin: 20px 0 !important;
          font-size: 14px !important;
        ">
          <strong>⚠️ Important:</strong> ${warningMessage} ${action === "register" ? "Creating" : "Signing into"} this account will sync your data to the cloud. If this is not your first time using sync, please review the current data summary below if it matches your current data.
        </div>
        
        <!--
        <div style="
          background: #d4edda !important;
          border: 1px solid #c3e6cb !important;
          color: #155724 !important;
          padding: 15px !important;
          border-radius: 5px !important;
          margin: 20px 0 !important;
          font-size: 14px !important;
        ">
          <strong>✅ Data Protection:</strong> Your existing progress will be preserved and uploaded to your account.
        </div>
        -->
      `;
    } else {
      warningHTML = `
        <div style="
          background: #e2e3e5 !important;
          border: 1px solid #d6d8db !important;
          color: #383d41 !important;
          padding: 15px !important;
          border-radius: 5px !important;
          margin: 20px 0 !important;
          font-size: 14px !important;
        ">
          <strong>ℹ️ No existing data found.</strong> You're starting fresh!
        </div>
      `;
    }

    // Create a completely custom modal that bypasses existing styles
    const modalHTML = `
      <div id="custom-sync-modal" style="
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: rgba(0, 0, 0, 0.9) !important;
        z-index: 2147483647 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-family: Arial, sans-serif !important;
      ">
        <div style="
          background: white !important;
          border-radius: 8px !important;
          padding: 30px !important;
          max-width: 500px !important;
          width: 90% !important;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5) !important;
          color: black !important;
          text-align: left !important;
        ">
          <h2 style="margin: 0 0 20px 0 !important; color: #333 !important; font-size: 24px !important;">
            ${hasSignificantData ? "🛡️" : "🔄"} ${action === "register" ? "Create Account" : "Sign In"} & Sync Data
          </h2>
          
          <p style="margin: 0 0 15px 0 !important; color: #555 !important; font-size: 16px !important;">
            <strong>Email:</strong> ${email}
          </p>
          
          ${warningHTML}
          
          <div style="
            background: #f8f9fa !important;
            padding: 15px !important;
            border-radius: 5px !important;
            margin: 20px 0 !important;
            border: 1px solid #dee2e6 !important;
          ">
            <p style="margin: 0 0 10px 0 !important; font-weight: bold !important; color: #333 !important;">Current Data Summary:</p>
            <ul style="margin: 0 0 0 20px !important; color: #555 !important; font-size: 14px !important;">
              <li>Sessions: ${currentData.totalSessions}</li>
              <li>Current Streak: ${currentData.currentStreak}</li>
              <li>Focus Points: ${currentData.totalPoints}</li>
            </ul>
          </div>
          
          <!--
          <p style="margin: 0 0 10px 0 !important; color: #555 !important; font-size: 14px !important;">This will:</p>
          <ul style="margin: 0 0 20px 20px !important; color: #555 !important; font-size: 14px !important;">
            <li>${hasSignificantData ? "Upload your current stats, streaks, and sessions to the cloud" : "Initialize your account with empty data"}</li>
            <li>Link this browser's data to your account permanently</li>
            <li>Allow you to access this data from other devices</li>
            ${hasSignificantData ? "<li>Keep your existing progress safe in the cloud</li>" : ""}
          </ul>
          -->
          
          <div style="
            display: flex !important;
            justify-content: flex-end !important;
            gap: 10px !important;
            margin-top: 30px !important;
          ">
            <button id="custom-sync-cancel" style="
              background: #6c757d !important;
              color: white !important;
              border: none !important;
              padding: 12px 20px !important;
              border-radius: 5px !important;
              cursor: pointer !important;
              font-size: 14px !important;
              font-weight: 500 !important;
            ">Cancel</button>
            <button id="custom-sync-proceed" style="
              background: ${hasSignificantData ? "#28a745" : "#007bff"} !important;
              color: white !important;
              border: none !important;
              padding: 12px 20px !important;
              border-radius: 5px !important;
              cursor: pointer !important;
              font-size: 14px !important;
              font-weight: 500 !important;
            ">${hasSignificantData ? "✅ Yes, Sync My Data" : "Continue"}</button>
          </div>
        </div>
      </div>
    `;

    // Insert the modal at the very end of body
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // Get the modal and buttons
    const modal = document.getElementById("custom-sync-modal");
    const cancelBtn = document.getElementById("custom-sync-cancel");
    const proceedBtn = document.getElementById("custom-sync-proceed");
    const contentWrapper = modal?.querySelector("div");

    // Make modal content scrollable on small viewports and ensure buttons are interactive
    if (contentWrapper) {
      contentWrapper.style.maxHeight = "90vh";
      contentWrapper.style.overflowY = "auto";
      contentWrapper.addEventListener("click", (e) => e.stopPropagation()); // prevent background click
    }

    // Accessibility & focus management
    if (modal) {
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.tabIndex = -1; // make focusable
      setTimeout(() => modal.focus(), 50);
    }

    // Prevent background scroll while modal is open
    document.body.classList.add("modal-open");

    // Close modal function with cleanup
    const closeModal = () => {
      if (modal) {
        modal.remove();
      }
      // Remove modal-open when closing (defensive)
      document.body.classList.remove("modal-open");
      // Remove keydown listener
      document.removeEventListener("keydown", onKeyDown);
    };

    // Escape key handler
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    // Add event listeners (defensive checks)
    try {
      if (cancelBtn) {
        cancelBtn.style.pointerEvents = "auto";
        cancelBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          closeModal();
        });
      }
    } catch (err) {
      window.customodoroLogger.error("SYNC_UI_FAILED_TO_ATTACH_CANCEL_LISTENER");
    }

    try {
      if (proceedBtn) {
        proceedBtn.style.pointerEvents = "auto";
        proceedBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          try {
            // Close first to ensure UI responsiveness while async work runs
            closeModal();
            if (action === "register") {
              await this.doRegister(email, username);
            } else if (action === "login") {
              await this.doLogin(email);
            }
          } catch (err) {
            window.customodoroLogger.error("SYNC_UI_DURING_SYNC_PROCEED_ACTION");
            // Show a non-blocking toast error if something bad happens
            this.showToast("❌ An error occurred. Please try again.", "error");
          }
        });
      }
    } catch (err) {
      window.customodoroLogger.error("SYNC_UI_FAILED_TO_ATTACH_PROCEED_LISTENER");
    }

    // Close on background click
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          closeModal();
        }
      });
    }

  }

  // Get current data summary for sync confirmation modal
  getCurrentDataSummary() {
    try {
      // Get current streak - use safer method
      let currentStreak = 0;
      let totalPoints = 0;
      let totalSessions = 0;

      // Try to get streak data using available functions
      try {
        if (typeof getCurrentStreakAndRange === "function") {
          const currentStreakData = getCurrentStreakAndRange();
          currentStreak = currentStreakData.streak || 0;
        } else if (typeof calculateCurrentStreak === "function") {
          currentStreak = calculateCurrentStreak() || 0;
        }
      } catch (error) {
        window.customodoroLogger.error("SYNC_UI_GETTING_STREAK_DATA");
        currentStreak = 0;
      }

      // Try to get total focus points
      try {
        if (typeof getTotalFocusPointsAndRange === "function") {
          const totalFocusData = getTotalFocusPointsAndRange();
          totalPoints = totalFocusData.totalPoints || 0;
        } else {
          // Calculate manually from localStorage
          const stats = JSON.parse(
            localStorage.getItem("customodoroStatsByDay") || "{}",
          );
          totalPoints = Object.values(stats).reduce((sum, day) => {
            return sum + Math.floor((day.total_minutes || 0) / 5);
          }, 0);
        }
      } catch (error) {
        window.customodoroLogger.error("SYNC_UI_GETTING_FOCUS_POINTS");
        totalPoints = 0;
      }

      // Get total sessions count
      try {
        const stats = JSON.parse(
          localStorage.getItem("customodoroStatsByDay") || "{}",
        );
        totalSessions = Object.values(stats).reduce((sum, day) => {
          return sum + (day.classic || 0) + (day.reverse || 0);
        }, 0);
      } catch (error) {
        window.customodoroLogger.error("SYNC_UI_GETTING_SESSIONS_COUNT");
        totalSessions = 0;
      }


      return {
        totalSessions,
        currentStreak,
        totalPoints,
      };
    } catch (error) {
      window.customodoroLogger.error("SYNC_UI_GETTING_CURRENT_DATA_SUMMARY");
      return {
        totalSessions: 0,
        currentStreak: 0,
        totalPoints: 0,
      };
    }
  }

  // Actually perform registration
  async doRegister(email, username) {
    this.setButtonLoading(this.elements.registerBtn, true);

    // Safety timeout to re-enable button after 10 seconds
    const timeoutId = setTimeout(() => {
      this.setButtonLoading(this.elements.registerBtn, false);
    }, 10000);

    try {
      const result = await window.authService.register(email, username);

      // Mark browser as having used sync
      this.markBrowserAsUsedWithSync();

      // Check if email verification is required
      if (result.needsVerification) {
        this.showEmailVerificationModal(email);
        this.showToast(
          "📧 Please check your email for a verification code",
          "info",
        );
      } else {
        this.showToast("✅ Account created successfully!", "success");
        this.clearForm();
      }
    } catch (error) {
      window.customodoroLogger.error("SYNC_UI_REGISTRATION");

      // Enhanced error handling for specific cases
      let errorMessage = error.message;
      if (
        errorMessage.includes("User already exists") ||
        errorMessage.includes("already exists")
      ) {
        errorMessage =
          "This email is already registered. Please use the Login option instead.";
      } else if (errorMessage.includes("Invalid email")) {
        errorMessage = "Please enter a valid email address.";
      } else if (errorMessage.includes("409")) {
        errorMessage =
          "This email is already registered. Please try logging in instead.";
      }

      this.showToast("❌ " + errorMessage, "error");
    } finally {
      clearTimeout(timeoutId);
      this.setButtonLoading(this.elements.registerBtn, false);
    }
  }

  // Show email verification modal
  showEmailVerificationModal(email) {
    // Remove any existing verification modal
    const existingModal = document.getElementById("email-verification-modal");
    if (existingModal) {
      existingModal.remove();
    }

    const modalHTML = `
      <div id="email-verification-modal" style="
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: rgba(0, 0, 0, 0.9) !important;
        z-index: 2147483647 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-family: Arial, sans-serif !important;
      ">
        <div style="
          background: white !important;
          border-radius: 8px !important;
          padding: 30px !important;
          max-width: 400px !important;
          width: 90% !important;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5) !important;
          color: black !important;
          text-align: center !important;
        ">
          <h2 style="margin: 0 0 20px 0 !important; color: #333 !important; font-size: 24px !important;">
            📧 Email Verification
          </h2>
          
          <p style="margin: 0 0 20px 0 !important; color: #555 !important; font-size: 16px !important;">
            We've sent a verification code to:
          </p>
          
          <p style="margin: 0 0 20px 0 !important; color: #333 !important; font-weight: bold !important; font-size: 16px !important;">
            ${email}
          </p>
          
          <input type="text" id="verification-code-input" placeholder="Enter verification code" style="
            width: 100% !important;
            padding: 12px !important;
            border: 2px solid #ddd !important;
            border-radius: 5px !important;
            font-size: 16px !important;
            text-align: center !important;
            letter-spacing: 2px !important;
            margin-bottom: 20px !important;
            box-sizing: border-box !important;
          ">
          
          <div style="
            display: flex !important;
            justify-content: space-between !important;
            gap: 10px !important;
          ">
            <button id="verification-cancel" style="
              background: #6c757d !important;
              color: white !important;
              border: none !important;
              padding: 12px 20px !important;
              border-radius: 5px !important;
              cursor: pointer !important;
              font-size: 14px !important;
              flex: 1 !important;
            ">Cancel</button>
            
            <button id="verification-verify" style="
              background: #28a745 !important;
              color: white !important;
              border: none !important;
              padding: 12px 20px !important;
              border-radius: 5px !important;
              cursor: pointer !important;
              font-size: 14px !important;
              flex: 1 !important;
            ">Verify</button>
          </div>
          
          <p style="margin: 20px 0 0 0 !important; color: #666 !important; font-size: 12px !important;">
            Check your spam folder if you don't see the email
          </p>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);

    const modal = document.getElementById("email-verification-modal");
    const codeInput = document.getElementById("verification-code-input");
    const cancelBtn = document.getElementById("verification-cancel");
    const verifyBtn = document.getElementById("verification-verify");
    const contentWrapper = modal?.querySelector("div");

    // Make modal content scrollable on small viewports and prevent background clicks
    if (contentWrapper) {
      contentWrapper.style.maxHeight = "90vh";
      contentWrapper.style.overflowY = "auto";
      contentWrapper.addEventListener("click", (e) => e.stopPropagation());
    }

    // Accessibility & focus
    if (modal) {
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.tabIndex = -1;
      setTimeout(() => {
        // Focus input if available, otherwise focus modal
        if (codeInput) codeInput.focus();
        else modal.focus();
      }, 100);
    }

    // Prevent background scroll while modal is open
    document.body.classList.add("modal-open");

    // Close modal function with cleanup
    const closeModal = () => {
      if (modal) modal.remove();
      document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", onKeyDown);
    };

    // Escape key handler
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    // Cancel button
    try {
      if (cancelBtn)
        cancelBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          closeModal();
        });
      else void 0;
    } catch (err) {
      window.customodoroLogger.error("SYNC_UI_FAILED_TO_ATTACH_CANCEL_LISTENER_TO_VERIFI");
    }

    // Verify button
    try {
      if (verifyBtn) {
        verifyBtn.addEventListener("click", async () => {
          const code = codeInput.value.trim();
          if (!code) {
            this.showToast("Please enter the verification code", "error");
            return;
          }

          try {
            verifyBtn.textContent = "Verifying...";
            verifyBtn.disabled = true;

            await window.authService.verifyEmail(email, code);
            this.showToast("✅ Email verified successfully!", "success");
            closeModal();
            this.clearForm();
          } catch (error) {
            window.customodoroLogger.error("SYNC_UI_VERIFICATION");
            this.showToast("❌ " + error.message, "error");
            verifyBtn.textContent = "Verify";
            verifyBtn.disabled = false;
          }
        });
      }
    } catch (err) {
      window.customodoroLogger.error("SYNC_UI_FAILED_TO_ATTACH_VERIFICATION_LISTENER");
    }

    // Enter key to verify
    if (codeInput) {
      codeInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          verifyBtn?.click();
        }
      });
    }

    // Close on background click
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          closeModal();
        }
      });
    }
  }

  // Actually perform login
  async doLogin(email) {
    this.setButtonLoading(this.elements.loginBtn, true);

    // Safety timeout to re-enable button after 10 seconds
    const timeoutId = setTimeout(() => {
      this.setButtonLoading(this.elements.loginBtn, false);
    }, 10000);

    try {
      const result = await window.authService.login(email);

      // Mark browser as having used sync
      this.markBrowserAsUsedWithSync();

      this.showToast("✅ Signed in successfully!", "success");
      this.clearForm();
    } catch (error) {
      window.customodoroLogger.error("SYNC_UI_LOGIN");
      this.showToast("❌ " + error.message, "error");
    } finally {
      clearTimeout(timeoutId);
      this.setButtonLoading(this.elements.loginBtn, false);
    }
  }

  // Mark browser as having used sync to prevent modal on future logins
  markBrowserAsUsedWithSync() {
    try {
      localStorage.setItem("customodoro-has-used-sync", "true");
    } catch (error) {
      window.customodoroLogger.error("SYNC_UI_FAILED_TO_MARK_BROWSER_AS_USED_WITH_SYNC");
    }
  }

  // Show toast notification
  showToast(message, type = "info") {
    // Try to use existing toast system
    if (window.showToast) {
      window.showToast(message);
      return;
    }

    // Fallback: create simple toast
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === "error" ? "#f44336" : type === "success" ? "#4caf50" : "#2196f3"};
      color: white;
      padding: 12px 16px;
      border-radius: 4px;
      z-index: 10000;
      font-size: 14px;
      max-width: 300px;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 3000);
  }
}

// Create global instance
window.syncUI = new SyncUI();
