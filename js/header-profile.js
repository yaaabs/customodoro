/**
 * Header Profile Manager
 * Handles the user profile display in the header
 */
class HeaderProfile {
  constructor() {
    this.userProfile = document.getElementById("user-profile");
    this.userName = document.getElementById("header-user-name");
    this.syncStatus = document.getElementById("header-sync-status");
    this.syncIndicator = document.getElementById("header-sync-indicator");
    this.syncBtn = document.getElementById("header-sync-btn");
    this.logoutBtn = document.getElementById("header-logout-btn");


    this.init();
  }

  init() {
    // Add event listeners
    if (this.syncBtn) {
      this.syncBtn.addEventListener("click", () => this.openSyncSettings());
    }

    if (this.logoutBtn) {
      this.logoutBtn.addEventListener("click", () => this.handleLogout());
    }

    // Listen for auth state changes
    document.addEventListener("authStateChanged", (event) => {
      this.updateDisplay(event.detail);
    });

    // Listen for sync status changes
    document.addEventListener("syncStatusChanged", (event) => {
      this.updateSyncStatus(event.detail);
    });

    // Check initial auth state with multiple retries
    this.checkAuthState();
  }

  async checkAuthState() {
    let retryCount = 0;
    const maxRetries = 20; // Increased retries

    const doCheck = () => {
      try {
        if (window.authService) {
          const currentUser = window.authService.getCurrentUser();
          if (currentUser) {
            this.updateDisplay({
              isLoggedIn: true,
              user: currentUser,
            });
            this.show();
          } else {
            this.hide();
          }
          return true; // Success
        } else {
          retryCount++;
          if (retryCount < maxRetries) {
            setTimeout(doCheck, 250); // Faster retries
          } else {
            window.customodoroLogger.error("HEADER_PROFILE_HEADERPROFILE_FAILED_TO_FIND_AUTHSERVICE_A");
            this.hide();
          }
          return false;
        }
      } catch (error) {
        window.customodoroLogger.error("HEADER_PROFILE_HEADERPROFILE_AUTH_CHECK_FAILED");
        this.hide();
        return true; // Stop retrying on error
      }
    };

    doCheck();
  }

  updateDisplay(authState) {
    if (!this.userProfile) return;

    if (authState.isLoggedIn && authState.user) {
      // Use username if available, otherwise extract from email
      const displayName =
        authState.user.username || this.getDisplayName(authState.user.email);
      this.userName.textContent = displayName;
      this.show();
    } else {
      this.hide();
    }
  }

  updateSyncStatus(status) {
    if (!this.syncIndicator) return;

    // Remove all status classes
    this.syncIndicator.classList.remove(
      "synced",
      "syncing",
      "error",
      "offline",
    );

    let indicator = "✅";
    let text = "Synced";

    switch (status.status) {
      case "syncing":
        indicator = "🔄";
        text = "Syncing...";
        this.syncIndicator.classList.add("syncing");
        break;
      case "error":
        indicator = "❌";
        text = "Sync Error";
        this.syncIndicator.classList.add("error");
        break;
      case "offline":
        indicator = "📴";
        text = "Offline";
        this.syncIndicator.classList.add("offline");
        break;
      case "synced":
      default:
        indicator = "✅";
        text = "Synced";
        this.syncIndicator.classList.add("synced");
        break;
    }

    this.syncIndicator.textContent = indicator;
    this.syncStatus.querySelector(".sync-text").textContent = text;
  }

  getDisplayName(email) {
    // Extract name from email (part before @)
    const name = email.split("@")[0];
    // Capitalize first letter and replace dots/underscores with spaces
    return name.charAt(0).toUpperCase() + name.slice(1).replace(/[._]/g, " ");
  }

  show() {
    if (this.userProfile) {
      this.userProfile.style.display = "flex";
    }
  }

  hide() {
    if (this.userProfile) {
      this.userProfile.style.display = "none";
    }
  }

  openSyncSettings() {

    // Open settings modal and navigate to sync section
    const settingsBtn = document.getElementById("settings-btn");
    if (settingsBtn) {
      settingsBtn.click();

      // Wait for modal to open, then navigate to sync section using direct class manipulation
      // (same reliable method as mini music player)
      setTimeout(() => {

        const navItems = document.querySelectorAll(".settings-nav-item");
        const syncNavItem = document.querySelector(
          '.settings-nav-item[data-section="sync"]',
        );
        const syncSection = document.getElementById("sync-section");


        if (syncNavItem && syncSection) {
          // Remove active from all nav items and sections
          navItems.forEach((item) => item.classList.remove("active"));
          document.querySelectorAll(".settings-section").forEach((section) => {
            section.classList.remove("active");
          });

          // Activate sync section directly (same as mini music player)
          syncNavItem.classList.add("active");
          syncSection.classList.add("active");


          // Additional verification
          setTimeout(() => {
            if (!syncSection.classList.contains("active")) {
              window.customodoroLogger.error("HEADER_PROFILE_HEADERPROFILE_SYNC_SECTION_ACTIVATION_FAIL");
            }
          }, 100);
        } else {
          window.customodoroLogger.error("HEADER_PROFILE_HEADERPROFILE_REQUIRED_ELEMENTS_NOT_FOUND");

          // Fallback: try clicking the nav item if direct manipulation fails
          if (syncNavItem) {
            syncNavItem.click();
          } else {
            // Debug: List all available data-section elements
            const allSections = document.querySelectorAll("[data-section]");
          }
        }
      }, 400); // Keep the timeout for modal to fully load
    } else {

      // Debug: Try to find settings button with alternative selectors
      const altSettingsSelectors = [
        "#settingsBtn",
        ".settings-btn",
        '[data-action="settings"]',
      ];
      for (const selector of altSettingsSelectors) {
        const altBtn = document.querySelector(selector);
        if (altBtn) {
          altBtn.click();
          break;
        }
      }
    }
  }

  async handleLogout() {
    if (confirm("Are you sure you want to sign out?")) {
      try {
        if (window.authService) {
          await window.authService.logout();
        }
      } catch (error) {
        window.customodoroLogger.error("HEADER_PROFILE_LOGOUT_FAILED");
        alert("Failed to sign out. Please try again.");
      }
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    // Wait a bit for other scripts to load
    setTimeout(() => {
      new HeaderProfile();
    }, 100);
  });
} else {
  // DOM already loaded, wait for auth service
  setTimeout(() => {
    new HeaderProfile();
  }, 100);
}
