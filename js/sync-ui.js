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

    // Legacy-session check runs after authService finishes its async
    // session restore (which is what detects a pre-Supabase login)
    setTimeout(() => this.maybeShowLegacyNotice(), 800);
  }

  // Users signed in under the old backend see a gentle one-time prompt to
  // re-verify their email. Local data is NEVER touched by this path.
  maybeShowLegacyNotice() {
    if (!window.authService?.hasLegacySession?.()) {
      const stale = document.getElementById("sync-legacy-notice");
      if (stale) stale.remove();
      return;
    }

    const container = this.elements.notLoggedIn;
    if (!container || document.getElementById("sync-legacy-notice")) return;

    const notice = document.createElement("div");
    notice.id = "sync-legacy-notice";
    notice.style.cssText =
      "background: rgba(33,150,243,0.12); border: 1px solid #2196f3; " +
      "border-radius: 8px; padding: 12px 14px; margin-bottom: 14px; " +
      "font-size: 13px; line-height: 1.5;";
    notice.innerHTML =
      "<strong>Sync upgraded.</strong> Sign-ins now use a 6-digit email code. " +
      "Verify your email below to continue syncing — your data is safe and waiting.";
    container.insertBefore(notice, container.firstChild);

    // Legacy users obviously "already have an account" — skip the choice
    // screen and land on the sign-in form with their email prefilled
    this.showFormStep("existing");
    const legacyEmail = window.authService.getLegacyEmail();
    if (this.elements.emailInput && !this.elements.emailInput.value && legacyEmail) {
      this.elements.emailInput.value = legacyEmail;
    }
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
      emailError: document.getElementById("sync-email-error"),
      usernameInput: document.getElementById("sync-username-input"),
      usernameGroup: document.getElementById("sync-username-group"),

      // Two-step flow: choice screen → form
      authChoice: document.getElementById("sync-auth-choice"),
      authForm: document.getElementById("sync-auth-form"),
      choiceExisting: document.getElementById("sync-choice-existing"),
      choiceNew: document.getElementById("sync-choice-new"),
      backBtn: document.getElementById("sync-back-btn"),

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
          this.maybeShowLegacyNotice();

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

    // Button events — one unified "Continue with Email" button
    // (the old separate register button no longer exists in the markup)
    if (this.elements.registerBtn) {
      this.elements.registerBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleLogin();
      });
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

    // Form submission — Enter anywhere in the form triggers the same
    // unified continue-with-email flow as the button
    if (this.elements.emailInput) {
      this.elements.emailInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.handleLogin();
        }
      });
    }

    if (this.elements.usernameInput) {
      this.elements.usernameInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.handleLogin();
        }
      });
    }

    // Two-door entry: pick "existing" or "new", then see a tailored form
    if (this.elements.choiceExisting) {
      this.elements.choiceExisting.addEventListener("click", () =>
        this.showFormStep("existing"),
      );
    }
    if (this.elements.choiceNew) {
      this.elements.choiceNew.addEventListener("click", () =>
        this.showFormStep("new"),
      );
    }
    if (this.elements.backBtn) {
      this.elements.backBtn.addEventListener("click", () =>
        this.showChoiceStep(),
      );
    }

    // Clear inline validation as soon as the user starts fixing the field
    if (this.elements.emailInput) {
      this.elements.emailInput.addEventListener("input", () =>
        this.clearEmailError(),
      );
    }
  }

  // Step 2: the email form, tailored to the door the user picked.
  // Both modes run the exact same OTP flow underneath — only the wording
  // and visible fields differ.
  showFormStep(mode) {
    this.authMode = mode;

    if (this.elements.authChoice) {
      this.elements.authChoice.style.display = "none";
    }
    if (this.elements.authForm) {
      this.elements.authForm.style.display = "block";
    }
    if (this.elements.usernameGroup) {
      this.elements.usernameGroup.style.display =
        mode === "new" ? "block" : "none";
    }

    const textSpan = this.elements.loginBtn?.querySelector(".sync-btn-text");
    if (textSpan) {
      textSpan.textContent =
        mode === "new" ? "Create My Account" : "Send My Sign-In Code";
    }

    this.clearEmailError();
    this.elements.emailInput?.focus();
  }

  // Step 1: back to the choice screen (misclick-friendly)
  showChoiceStep() {
    this.authMode = null;
    if (this.elements.authForm) {
      this.elements.authForm.style.display = "none";
    }
    if (this.elements.authChoice) {
      this.elements.authChoice.style.display = "flex";
    }
    this.clearEmailError();
  }

  // Inline email validation — toasts render behind the settings modal,
  // so errors belong right under the field they refer to
  showEmailError(message) {
    if (this.elements.emailError) {
      this.elements.emailError.textContent = message;
      this.elements.emailError.style.display = "block";
    }
    if (this.elements.emailInput) {
      this.elements.emailInput.classList.remove("sync-input-error");
      // Re-trigger the shake animation on repeat errors
      void this.elements.emailInput.offsetWidth;
      this.elements.emailInput.classList.add("sync-input-error");
      this.elements.emailInput.focus();
    }
  }

  clearEmailError() {
    if (this.elements.emailError) {
      this.elements.emailError.style.display = "none";
    }
    this.elements.emailInput?.classList.remove("sync-input-error");
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
        this.showToast("All data synced successfully", "success");
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

        this.showToast("Sync failed: " + errorMessage, "error");
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

    // Fresh visit (or just logged out): start from the choice screen —
    // unless a legacy session already fast-tracked into the form
    if (!this.authMode) {
      this.showChoiceStep();
    }

    // Keep the settings "Account & Sync" value hint in sync
    if (typeof window.updateSettingsNavHints === "function") {
      window.updateSettingsNavHints();
    }
  }

  // Show logged in state
  showLoggedInState() {
    if (this.elements.notLoggedIn)
      this.elements.notLoggedIn.style.display = "none";
    if (this.elements.loggedIn) this.elements.loggedIn.style.display = "block";

    this.updateUserInfo();
    this.updateStats();
    this.updateSyncStatusFromManager();

    // Keep the settings "Account & Sync" value hint in sync
    if (typeof window.updateSettingsNavHints === "function") {
      window.updateSettingsNavHints();
    }
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
      this.showEmailError("Please enter your email address");
      return;
    }

    if (!this.isValidEmail(email)) {
      this.showEmailError("That doesn't look like a valid email address");
      return;
    }

    this.clearEmailError();

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
      this.showToast("Data exported successfully", "success");
    } catch (error) {
      window.customodoroLogger.error("SYNC_UI_EXPORT");
      this.showToast("Failed to export data", "error");
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
      this.showToast("Signed out successfully", "success");
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

    // Build a single, tone-appropriate note (no emoji, design-system colors)
    const actionVerb = action === "register" ? "Creating" : "Signing into";
    let warningHTML = "";
    if (warningLevel === "critical") {
      warningHTML = `
        <div class="sync-confirm-note is-critical">
          <strong>Heads up:</strong> ${warningMessage} ${actionVerb} this
          account will sync your data to the cloud.
        </div>`;
    } else if (hasSignificantData) {
      warningHTML = `
        <div class="sync-confirm-note is-warning">
          <strong>Important:</strong> ${warningMessage} ${actionVerb} this
          account will sync your data to the cloud. If this isn't your first
          time using sync, check that the summary below matches your data.
        </div>`;
    } else {
      warningHTML = `
        <div class="sync-confirm-note is-info">
          No existing data found. You're starting fresh.
        </div>`;
    }

    const safeEmail = String(email).replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
    );
    const iconSvg = hasSignificantData
      ? `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>`
      : `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path><path d="M12 16V9m0 0-2.5 2.5M12 9l2.5 2.5"></path></svg>`;

    const modalHTML = `
      <div id="custom-sync-modal" class="otp-modal" role="dialog" aria-modal="true" aria-labelledby="sync-confirm-title">
        <div class="otp-modal-card sync-confirm-card">
          <div class="otp-icon" aria-hidden="true">${iconSvg}</div>

          <h2 class="sync-confirm-title" id="sync-confirm-title">
            ${action === "register" ? "Create account &amp; sync" : "Sign in &amp; sync"}
          </h2>
          <p class="sync-confirm-email">${safeEmail}</p>

          ${warningHTML}

          <div class="sync-confirm-summary">
            <p class="sync-confirm-summary-title">Data on this device</p>
            <div class="sync-confirm-stats">
              <div class="sync-confirm-stat">
                <div class="sync-confirm-stat-value">${currentData.totalSessions}</div>
                <div class="sync-confirm-stat-label">Sessions</div>
              </div>
              <div class="sync-confirm-stat">
                <div class="sync-confirm-stat-value">${currentData.currentStreak}</div>
                <div class="sync-confirm-stat-label">Streak</div>
              </div>
              <div class="sync-confirm-stat">
                <div class="sync-confirm-stat-value">${currentData.totalPoints}</div>
                <div class="sync-confirm-stat-label">Focus points</div>
              </div>
            </div>
          </div>

          <div class="sync-confirm-actions">
            <button id="custom-sync-cancel" class="otp-btn otp-btn-secondary">
              Cancel
            </button>
            <button id="custom-sync-proceed" class="otp-btn otp-btn-primary">
              ${hasSignificantData ? "Yes, sync my data" : "Continue"}
            </button>
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
            this.showToast("An error occurred. Please try again.", "error");
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
      // Passwordless flow: request a 6-digit code (creates the account
      // automatically if the email is new; username rides along for it)
      await window.authService.requestOtp(email, username);

      // Mark browser as having used sync
      this.markBrowserAsUsedWithSync();

      this.showEmailVerificationModal(email);
      this.showToast("We emailed you a 6-digit sign-in code", "info");
    } catch (error) {
      window.customodoroLogger.error("SYNC_UI_REGISTRATION");
      this.showEmailError(error.message);
    } finally {
      clearTimeout(timeoutId);
      this.setButtonLoading(this.elements.registerBtn, false);
    }
  }

  // Show email verification modal
  showEmailVerificationModal(email, notice = null) {
    // Remove any existing verification modal
    const existingModal = document.getElementById("email-verification-modal");
    if (existingModal) {
      existingModal.remove();
    }

    const safeEmail = String(email).replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
    );

    const modalHTML = `
      <div id="email-verification-modal" class="otp-modal" role="dialog" aria-modal="true" aria-labelledby="otp-title">
        <div class="otp-modal-card">
          <div class="otp-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2"></rect>
              <path d="m3 7 9 6 9-6"></path>
            </svg>
          </div>

          <h2 class="otp-title" id="otp-title">Enter your sign-in code</h2>
          <p class="otp-subtitle">We sent a 6-digit code to</p>
          <p class="otp-email">${safeEmail}</p>

          ${notice ? `<p class="otp-notice">${notice}</p>` : ""}

          <p id="verification-error" class="otp-error" role="alert"></p>

          <input
            type="text"
            id="verification-code-input"
            class="otp-input"
            placeholder="000000"
            maxlength="6"
            inputmode="numeric"
            pattern="[0-9]*"
            autocomplete="one-time-code"
            aria-label="6-digit verification code"
          />

          <div class="otp-actions">
            <button id="verification-cancel" class="otp-btn otp-btn-secondary">
              Cancel
            </button>
            <button id="verification-verify" class="otp-btn otp-btn-primary">
              Verify
            </button>
          </div>

          <button id="verification-resend" class="otp-resend">Resend code</button>

          <p class="otp-hint">
            The code expires in 10 minutes. Check your spam folder if you don't
            see the email.
          </p>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);

    const modal = document.getElementById("email-verification-modal");
    const codeInput = document.getElementById("verification-code-input");
    const cancelBtn = document.getElementById("verification-cancel");
    const verifyBtn = document.getElementById("verification-verify");
    const resendBtn = document.getElementById("verification-resend");
    const errorEl = document.getElementById("verification-error");
    const contentWrapper = modal?.querySelector("div");

    // Errors show INSIDE the modal — toasts render behind its overlay
    const showModalError = (message) => {
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.add("show");
      }
      if (codeInput) {
        codeInput.classList.add("error");
        codeInput.focus();
        codeInput.select();
      }
    };
    const clearModalError = () => {
      if (errorEl) errorEl.classList.remove("show");
      if (codeInput) codeInput.classList.remove("error");
    };

    // Resend cooldown (matches the SMTP 60s per-user minimum interval).
    // Starts counting the moment the modal opens — a code was JUST sent,
    // so an instantly-clickable Resend would only trip the rate limit.
    const startResendCooldown = (seconds) => {
      if (!resendBtn) return;
      let secondsLeft = seconds;
      // Styling (muted, no underline) is handled by .otp-resend:disabled in CSS
      resendBtn.disabled = true;
      resendBtn.textContent = `Resend code (${secondsLeft}s)`;
      const countdown = setInterval(() => {
        secondsLeft--;
        if (secondsLeft <= 0 || !document.body.contains(resendBtn)) {
          clearInterval(countdown);
          resendBtn.disabled = false;
          resendBtn.textContent = "Resend code";
        } else {
          resendBtn.textContent = `Resend code (${secondsLeft}s)`;
        }
      }, 1000);
    };

    startResendCooldown(60);

    if (resendBtn) {
      resendBtn.addEventListener("click", async () => {
        if (resendBtn.disabled) return;
        resendBtn.disabled = true;
        clearModalError();
        try {
          await window.authService.requestOtp(email);
          if (codeInput) codeInput.value = "";
          this.showToast("New code sent", "info");
          startResendCooldown(60);
        } catch (error) {
          resendBtn.disabled = false;
          showModalError(error.message);
        }
      });
    }

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
            clearModalError();

            await window.authService.verifyEmail(email, code);
            this.showToast("Signed in successfully", "success");
            closeModal();
            this.clearForm();
          } catch (error) {
            window.customodoroLogger.error("SYNC_UI_VERIFICATION");
            showModalError(error.message);
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

      // Digits only, and auto-verify the moment all 6 are in —
      // one less tap, especially with email apps' code autofill
      codeInput.addEventListener("input", () => {
        clearModalError();
        codeInput.value = codeInput.value.replace(/\D/g, "").slice(0, 6);
        if (codeInput.value.length === 6 && !verifyBtn?.disabled) {
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
      // Passwordless flow: request a 6-digit code, then verify in the modal.
      // The chosen door (new vs existing) decides how strictly we send.
      const username = this.elements.usernameInput?.value.trim() || "";
      const result = await window.authService.requestOtp(
        email,
        username,
        this.authMode || "auto",
      );

      // Mark browser as having used sync
      this.markBrowserAsUsedWithSync();

      // Picked "I'm new here" but the email already has an account?
      // Be honest about it — the code signs them into the EXISTING account.
      let notice = null;
      if (this.authMode === "new" && result.existingAccount) {
        notice =
          "Good news — this email already has an account! We sent a sign-in code instead. Entering it signs you into your existing account.";
      }

      this.showEmailVerificationModal(email, notice);
      this.showToast("We emailed you a 6-digit code", "info");
    } catch (error) {
      window.customodoroLogger.error("SYNC_UI_LOGIN");
      // Inline, under the field — toasts hide behind the settings modal
      this.showEmailError(error.message);
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
