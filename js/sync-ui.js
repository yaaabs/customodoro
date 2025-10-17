// Sync UI Manager
class SyncUI {
  constructor() {
    console.log('SyncUI constructor starting...');
    this.elements = {};
    this.isInitialized = false;
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      console.log('DOM still loading, waiting for DOMContentLoaded...');
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      console.log('DOM already ready, initializing immediately...');
      this.init();
    }
  }
  
  // Initialize UI
  init() {
    console.log('SyncUI.init() called, isInitialized:', this.isInitialized);
    if (this.isInitialized) return;
    
    console.log('Caching elements...');
    this.cacheElements();
    console.log('Setting up event listeners...');
    this.setupEventListeners();
    console.log('Updating UI...');
    this.updateUI();
    this.isInitialized = true;
    
    console.log('Sync UI initialized successfully');
  }
  
  // Cache DOM elements
  cacheElements() {
    console.log('Caching DOM elements...');
    this.elements = {
      // States
      notLoggedIn: document.getElementById('sync-not-logged-in'),
      loggedIn: document.getElementById('sync-logged-in'),
      error: document.getElementById('sync-error'),
      
      // Form elements
      emailInput: document.getElementById('sync-email-input'),
      usernameInput: document.getElementById('sync-username-input'),
      
      // Buttons
      registerBtn: document.getElementById('sync-register-btn'),
      loginBtn: document.getElementById('sync-login-btn'),
      manualSyncBtn: document.getElementById('sync-manual-btn'),
      exportBtn: document.getElementById('sync-export-btn'),
      logoutBtn: document.getElementById('sync-logout-btn'),
      retryBtn: document.getElementById('sync-retry-btn'),
      
      // User info
      userName: document.getElementById('sync-user-name'),
      userEmail: document.getElementById('sync-user-email'),
      syncStatus: document.getElementById('sync-status'),
      
      // Stats
      sessionsCount: document.getElementById('sync-sessions-count'),
      lastSync: document.getElementById('sync-last-sync'),
      createdDate: document.getElementById('sync-created-date'),
      
      // Error
      errorMessage: document.getElementById('sync-error-message')
    };
    
    console.log('Cached elements:', {
      registerBtn: !!this.elements.registerBtn,
      loginBtn: !!this.elements.loginBtn,
      emailInput: !!this.elements.emailInput,
      usernameInput: !!this.elements.usernameInput
    });
  }
  
  // Setup event listeners
  setupEventListeners() {
    // Auth service events (with retry logic)
    if (window.authService) {
      window.authService.addEventListener((event, data) => {
        console.log('SyncUI: Auth event received:', event, data);
        if (event === 'login' || event === 'logout' || event === 'restore') {
          this.updateUI();
          
          // If restore event, ensure we stay in logged-in state
          if (event === 'restore' && data) {
            console.log('SyncUI: Handling auth restore, staying logged in');
            this.showLoggedInState();
          }
        }
      });
    } else {
      console.warn('SyncUI: authService not available during setup, will retry in updateUI');
    }
    
    // Sync manager events
    if (window.syncManager) {
      window.syncManager.addEventListener((event, data) => {
        this.handleSyncEvent(event, data);
      });
    }
    
    // Button events
    if (this.elements.registerBtn) {
      console.log('Adding click listener to register button');
      this.elements.registerBtn.addEventListener('click', (e) => {
        console.log('Register button clicked!', e);
        e.preventDefault();
        e.stopPropagation();
        this.handleRegister();
      });
    } else {
      console.error('Register button not found!');
    }
    
    if (this.elements.loginBtn) {
      console.log('Adding click listener to login button');
      this.elements.loginBtn.addEventListener('click', (e) => {
        console.log('Login button clicked!', e);
        e.preventDefault();
        e.stopPropagation();
        this.handleLogin();
      });
    } else {
      console.error('Login button not found!');
    }
    
    if (this.elements.manualSyncBtn) {
      this.elements.manualSyncBtn.addEventListener('click', () => this.handleManualSync());
    }
    
    if (this.elements.exportBtn) {
      this.elements.exportBtn.addEventListener('click', () => this.handleExport());
    }
    
    if (this.elements.logoutBtn) {
      this.elements.logoutBtn.addEventListener('click', () => this.handleLogout());
    }
    
    if (this.elements.retryBtn) {
      this.elements.retryBtn.addEventListener('click', () => this.handleRetry());
    }
    
    // Form submission
    if (this.elements.emailInput) {
      this.elements.emailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleRegister();
        }
      });
    }
    
    if (this.elements.usernameInput) {
      this.elements.usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleRegister();
        }
      });
    }
  }
  
  // Handle sync events
  handleSyncEvent(event, data) {
    switch (event) {
      case 'sync-start':
        this.updateSyncStatus('syncing', 'Syncing...');
        this.setButtonLoading(this.elements.manualSyncBtn, true);
        break;
        
      case 'sync-complete':
        this.updateSyncStatus('synced', 'Synced');
        this.setButtonLoading(this.elements.manualSyncBtn, false);
        this.updateStats();
        // Productivity stats now sync via streaks field workaround
        this.showToast('✅ All data synced successfully!', 'success');
        break;
        
      case 'sync-error':
        this.updateSyncStatus('error', 'Sync failed');
        this.setButtonLoading(this.elements.manualSyncBtn, false);
        
        // Enhanced error messaging for backend issues
        let errorMessage = data.message;
        if (errorMessage.includes('Validation failed')) {
          errorMessage = 'Backend schema limitation detected. Some data may remain local-only.';
        }
        
        this.showToast('❌ Sync failed: ' + errorMessage, 'error');
        break;
        
      case 'connection':
        this.updateUI();
        break;
    }
  }
  
  // Update entire UI based on current state
  updateUI() {
    if (!this.isInitialized) return;
    
    // Check if auth service is available
    if (!window.authService) {
      console.warn('SyncUI: authService not available yet, retrying...');
      setTimeout(() => this.updateUI(), 100);
      return;
    }
    
    const isLoggedIn = window.authService.isLoggedIn();
    const user = window.authService.getCurrentUser();
    
    console.log('SyncUI: Updating UI - isLoggedIn:', isLoggedIn, 'user:', user);
    
    // Emit auth state change event for header profile
    document.dispatchEvent(new CustomEvent('authStateChanged', {
      detail: {
        isLoggedIn,
        user
      }
    }));
    
    if (isLoggedIn) {
      this.showLoggedInState();
    } else {
      this.showNotLoggedInState();
    }
    
    this.hideErrorState();
  }
  
  // Show not logged in state
  showNotLoggedInState() {
    if (this.elements.notLoggedIn) this.elements.notLoggedIn.style.display = 'block';
    if (this.elements.loggedIn) this.elements.loggedIn.style.display = 'none';
  }
  
  // Show logged in state
  showLoggedInState() {
    if (this.elements.notLoggedIn) this.elements.notLoggedIn.style.display = 'none';
    if (this.elements.loggedIn) this.elements.loggedIn.style.display = 'block';
    
    this.updateUserInfo();
    this.updateStats();
    this.updateSyncStatusFromManager();
  }
  
  // Show error state
  showErrorState(message) {
    if (this.elements.error) {
      this.elements.error.style.display = 'block';
      if (this.elements.errorMessage) {
        this.elements.errorMessage.textContent = message;
      }
    }
    if (this.elements.notLoggedIn) this.elements.notLoggedIn.style.display = 'none';
    if (this.elements.loggedIn) this.elements.loggedIn.style.display = 'none';
  }
  
  // Hide error state
  hideErrorState() {
    if (this.elements.error) {
      this.elements.error.style.display = 'none';
    }
  }
  
  // Update user info
  updateUserInfo() {
    const user = window.authService?.getCurrentUser();
    if (!user) return;
    
    if (this.elements.userName) {
      // Show username if available, otherwise extract from email
      const displayName = user.username || user.email.split('@')[0];
      this.elements.userName.textContent = displayName;
    }
    
    if (this.elements.userEmail) {
      this.elements.userEmail.textContent = user.email || '';
    }
  }
  
  // Update sync status
  updateSyncStatus(status, message) {
    if (!this.elements.syncStatus) return;
    
    // Emit sync status change event for header profile
    document.dispatchEvent(new CustomEvent('syncStatusChanged', {
      detail: {
        status,
        message
      }
    }));
    
    // Remove all status classes
    this.elements.syncStatus.className = 'sync-status';
    
    // Add current status class
    this.elements.syncStatus.classList.add(status);
    
    // Update icon and text
    const icon = this.elements.syncStatus.querySelector('.sync-status-icon');
    const text = this.elements.syncStatus.querySelector('.sync-status-text');
    
    if (icon && text) {
      switch (status) {
        case 'synced':
          icon.textContent = '✅';
          break;
        case 'syncing':
          icon.textContent = '🔄';
          break;
        case 'error':
          icon.textContent = '❌';
          break;
        case 'offline':
          icon.textContent = '📡';
          break;
        default:
          icon.textContent = '⏸️';
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
        this.elements.lastSync.textContent = new Date(stats.lastSync).toLocaleDateString('en-US', {
          month: 'numeric',
          day: 'numeric', 
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      } else {
        this.elements.lastSync.textContent = 'Never';
      }
    }
    
    // Update account created date
    if (this.elements.createdDate) {
      if (user && user.createdAt) {
        this.elements.createdDate.textContent = new Date(user.createdAt).toLocaleDateString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric'
        });
      } else {
        this.elements.createdDate.textContent = 'Unknown';
      }
    }
  }
  
  // Handle register
  async handleRegister() {
    console.log('Register button clicked');
    if (!window.authService) {
      console.error('AuthService not available');
      this.showToast('Sync service not available. Please refresh the page.', 'error');
      return;
    }
    
    const email = this.elements.emailInput?.value.trim();
    const username = this.elements.usernameInput?.value.trim();
    
    console.log('Registration attempt:', { email, username });
    
    if (!email) {
      this.showToast('Please enter your email address', 'error');
      return;
    }
    
    if (!this.isValidEmail(email)) {
      this.showToast('Please enter a valid email address', 'error');
      return;
    }

  try {
    // Check if user has local data - if so, show confirmation modal
    const hasLocalData = this.hasSignificantLocalData();
    if (hasLocalData) {
      // Show confirmation modal before registering
      console.log('✅ Showing sync confirmation modal for registration');
      this.showSyncConfirmModal(email, username, 'register');
    } else {
      // No significant local data, ask for confirmation before registering
      const confirmed = confirm('Are you sure you want to create an account and sync your data with this email?');
      if (!confirmed) return;
      console.log('⚡ User confirmed registration with no local data, proceeding...');
      await this.doRegister(email, username);
    }
  } catch (error) {
    console.error('Error in registration flow:', error);
    // Fallback: try register directly
    console.log('Fallback: proceeding with direct registration');
    await this.doRegister(email, username);
  }
}

// Handle login
async handleLogin() {
    console.log('Login button clicked');
    if (!window.authService) {
      console.error('AuthService not available');
      this.showToast('Sync service not available. Please refresh the page.', 'error');
      return;
    }
    
    const email = this.elements.emailInput?.value.trim();
    
    console.log('Login attempt:', { email });
    
    if (!email) {
      this.showToast('Please enter your email address', 'error');
      return;
    }
    
    if (!this.isValidEmail(email)) {
      this.showToast('Please enter a valid email address', 'error');
      return;
    }

    try {
      // Check if user has local data - if so, show confirmation modal
      const hasLocalData = this.hasSignificantLocalData();
      console.log('🔍 Login flow debug:');
      console.log('- User has significant local data:', hasLocalData);
      console.log('- Will show confirmation modal:', hasLocalData);
      
      if (hasLocalData) {
        console.log('✅ Showing sync confirmation modal for login');
        this.showSyncConfirmModal(email, '', 'login');
      } else {
        // No local data, proceed directly
        console.log('⚡ No significant local data, proceeding directly with login');
        await this.doLogin(email);
      }
    } catch (error) {
      console.error('Error in login flow:', error);
      // Fallback: try login directly
      console.log('Fallback: proceeding with direct login');
      await this.doLogin(email);
    }
  }

  // Check if user has significant local data that might be overwritten
  hasSignificantLocalData() {
    try {
      // If user is already logged in, don't show confirmation modal
      // This prevents the modal from showing when switching between accounts
      if (window.authService?.isLoggedIn()) {
        console.log('User already logged in, skipping local data check');
        return false;
      }
      
      // Check if this browser has been used with sync before
      const hasUsedSync = localStorage.getItem('customodoro-has-used-sync') === 'true';
      if (hasUsedSync) {
        console.log('Browser has been used with sync before, skipping modal');
        return false;
      }
      
      const stats = JSON.parse(localStorage.getItem('customodoroStatsByDay') || '{}');
      const totalSessions = Object.values(stats).reduce((sum, day) => {
        return sum + (day.classic || 0) + (day.reverse || 0);
      }, 0);
      
      console.log('Local data check - total sessions:', totalSessions);
      
      const hasSignificantData = totalSessions >= 1; 
      console.log('Has significant local data:', hasSignificantData);
      return hasSignificantData;
    } catch (error) {
      console.warn('Error checking local data:', error);
      return false;
    }
  }  // Handle manual sync
  async handleManualSync() {
    if (!window.syncManager) return;
    
    try {
      await window.syncManager.manualSync();
    } catch (error) {
      console.error('Manual sync error:', error);
      // Error handling is done in sync event listener
    }
  }
  
  // Handle export
  handleExport() {
    if (!window.syncManager) return;
    
    try {
      window.syncManager.exportData();
      this.showToast('📥 Data exported successfully!', 'success');
    } catch (error) {
      console.error('Export error:', error);
      this.showToast('❌ Failed to export data', 'error');
    }
  }
  
  // Handle logout
  handleLogout() {
    if (!window.authService) return;
    
    if (confirm('Are you sure you want to sign out? Your local data will remain on this device.')) {
      window.authService.logout();
      this.showToast('👋 Signed out successfully', 'success');
    }
  }
  
  // Handle retry
  handleRetry() {
    this.hideErrorState();
    this.updateUI();
  }
  
  // Set button loading state
  setButtonLoading(button, loading) {
    console.log('setButtonLoading called:', { button: !!button, loading });
    if (!button) {
      console.warn('setButtonLoading: button is null or undefined');
      return;
    }
    
    const textSpan = button.querySelector('.sync-btn-text');
    const spinnerSpan = button.querySelector('.sync-btn-spinner');
    
    console.log('Button elements found:', { textSpan: !!textSpan, spinnerSpan: !!spinnerSpan });
    
    if (loading) {
      console.log('Disabling button and showing spinner');
      button.disabled = true;
      if (textSpan) textSpan.style.display = 'none';
      if (spinnerSpan) spinnerSpan.style.display = 'inline-flex';
    } else {
      console.log('Enabling button and hiding spinner');
      button.disabled = false;
      if (textSpan) textSpan.style.display = 'inline';
      if (spinnerSpan) spinnerSpan.style.display = 'none';
    }
    
    console.log('Button state after change:', { disabled: button.disabled });
  }
  
  // Clear form
  clearForm() {
    if (this.elements.emailInput) this.elements.emailInput.value = '';
    if (this.elements.usernameInput) this.elements.usernameInput.value = '';
  }
  
  // Validate email
  isValidEmail(email) {
    // More strict email validation with comprehensive checks
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    // Basic regex check
    if (!emailRegex.test(email)) {
      console.log('Email validation failed: Basic regex test');
      return false;
    }
    
    // Split email into local and domain parts
    const parts = email.split('@');
    if (parts.length !== 2) {
      console.log('Email validation failed: Invalid @ structure');
      return false;
    }
    
    const [localPart, domain] = parts;
    
    // Check local part (before @)
    if (!localPart || localPart.length < 1 || localPart.length > 64) {
      console.log('Email validation failed: Invalid local part length');
      return false;
    }
    
    // Check domain part (after @)
    if (!domain || domain.length < 4 || domain.length > 255) {
      console.log('Email validation failed: Invalid domain length');
      return false;
    }
    
    // Check for valid TLD (must have at least one dot and valid TLD)
    const domainParts = domain.split('.');
    if (domainParts.length < 2) {
      console.log('Email validation failed: No TLD found');
      return false;
    }
    
    // Check TLD (last part)
    const tld = domainParts[domainParts.length - 1];
    if (!tld || tld.length < 2 || tld.length > 6) {
      console.log('Email validation failed: Invalid TLD length');
      return false;
    }
    
    // TLD must be alphabetic only
    if (!/^[a-zA-Z]{2,6}$/.test(tld)) {
      console.log('Email validation failed: TLD contains non-alphabetic characters');
      return false;
    }
    
    // Check for consecutive dots
    if (email.includes('..')) {
      console.log('Email validation failed: Consecutive dots found');
      return false;
    }
    
    // Check for domain starting or ending with hyphen
    if (domain.startsWith('-') || domain.endsWith('-')) {
      console.log('Email validation failed: Domain starts or ends with hyphen');
      return false;
    }
    
    // Check each domain part
    for (const part of domainParts) {
      if (!part || part.length === 0) {
        console.log('Email validation failed: Empty domain part');
        return false;
      }
      
      // Domain parts cannot start or end with hyphen
      if (part.startsWith('-') || part.endsWith('-')) {
        console.log('Email validation failed: Domain part starts or ends with hyphen');
        return false;
      }
    }
    
    console.log('Email validation passed:', email);
    return true;
  }

  // Show sync confirmation modal
  showSyncConfirmModal(email, username, action) {
    console.log('Showing sync confirmation modal for action:', action);
    
    // Remove any existing custom modal first
    const existingModal = document.getElementById('custom-sync-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    // Get current data for display
    const currentData = this.getCurrentDataSummary();
    
  
    const hasSignificantData = currentData.totalSessions > 0 || currentData.currentStreak > 0 || currentData.totalPoints > 0;
    
    let warningLevel = 'info';
    let warningMessage = '';
    
    if (currentData.totalSessions >= 10 || currentData.currentStreak >= 3 || currentData.totalPoints >= 50) {
      warningLevel = 'critical';
      warningMessage = 'You have substantial progress that could be lost!';
    } else if (currentData.totalSessions >= 3 || currentData.currentStreak >= 1 || currentData.totalPoints >= 10) {
      warningLevel = 'warning';
      warningMessage = 'You have progress that could be affected.';
    } else if (hasSignificantData) {
      warningLevel = 'info';
      warningMessage = 'You have some local data.';
    }
    
    // Determine warning level
    let warningHTML = '';
    if (warningLevel === 'critical') {
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
          <strong>🚨 CRITICAL WARNING:</strong> ${warningMessage} ${action === 'register' ? 'Creating' : 'Signing into'} this account will sync your data to the cloud.
        </div>
        
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
          <strong>⚠️ Important:</strong> ${warningMessage} ${action === 'register' ? 'Creating' : 'Signing into'} this account will sync your data to the cloud. If this is not your first time using sync, please review the current data summary below if it matches your current data.
        </div>
        
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
            ${hasSignificantData ? '🛡️' : '🔄'} ${action === 'register' ? 'Create Account' : 'Sign In'} & Sync Data
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
          
          <p style="margin: 0 0 10px 0 !important; color: #555 !important; font-size: 14px !important;">This will:</p>
          <ul style="margin: 0 0 20px 20px !important; color: #555 !important; font-size: 14px !important;">
            <li>${hasSignificantData ? 'Upload your current stats, streaks, and sessions to the cloud' : 'Initialize your account with empty data'}</li>
            <li>Link this browser's data to your account permanently</li>
            <li>Allow you to access this data from other devices</li>
            ${hasSignificantData ? '<li>Keep your existing progress safe in the cloud</li>' : ''}
          </ul>
          
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
              background: ${hasSignificantData ? '#28a745' : '#007bff'} !important;
              color: white !important;
              border: none !important;
              padding: 12px 20px !important;
              border-radius: 5px !important;
              cursor: pointer !important;
              font-size: 14px !important;
              font-weight: 500 !important;
            ">${hasSignificantData ? '✅ Yes, Sync My Data' : 'Continue'}</button>
          </div>
        </div>
      </div>
    `;
    
    // Insert the modal at the very end of body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Get the modal and buttons
    const modal = document.getElementById('custom-sync-modal');
    const cancelBtn = document.getElementById('custom-sync-cancel');
    const proceedBtn = document.getElementById('custom-sync-proceed');
    
    // Close modal function
    const closeModal = () => {
      if (modal) {
        modal.remove();
      }
    };
    
    // Add event listeners
    cancelBtn.addEventListener('click', closeModal);
    
    proceedBtn.addEventListener('click', async () => {
      console.log('User confirmed sync, proceeding with', action);
      closeModal();
      
      if (action === 'register') {
        await this.doRegister(email, username);
      } else if (action === 'login') {
        await this.doLogin(email);
      }
    });
    
    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
    
    console.log('Custom modal created and should be visible!');
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
        if (typeof getCurrentStreakAndRange === 'function') {
          const currentStreakData = getCurrentStreakAndRange();
          currentStreak = currentStreakData.streak || 0;
        } else if (typeof calculateCurrentStreak === 'function') {
          currentStreak = calculateCurrentStreak() || 0;
        }
      } catch (error) {
        console.warn('Error getting streak data:', error);
        currentStreak = 0;
      }
      
      // Try to get total focus points
      try {
        if (typeof getTotalFocusPointsAndRange === 'function') {
          const totalFocusData = getTotalFocusPointsAndRange();
          totalPoints = totalFocusData.totalPoints || 0;
        } else {
          // Calculate manually from localStorage
          const stats = JSON.parse(localStorage.getItem('customodoroStatsByDay') || '{}');
          totalPoints = Object.values(stats).reduce((sum, day) => {
            return sum + Math.floor((day.total_minutes || 0) / 5);
          }, 0);
        }
      } catch (error) {
        console.warn('Error getting focus points:', error);
        totalPoints = 0;
      }
      
      // Get total sessions count
      try {
        const stats = JSON.parse(localStorage.getItem('customodoroStatsByDay') || '{}');
        totalSessions = Object.values(stats).reduce((sum, day) => {
          return sum + (day.classic || 0) + (day.reverse || 0);
        }, 0);
      } catch (error) {
        console.warn('Error getting sessions count:', error);
        totalSessions = 0;
      }

      console.log('Current data summary:', { totalSessions, currentStreak, totalPoints });

      return {
        totalSessions,
        currentStreak,
        totalPoints
      };
    } catch (error) {
      console.warn('Error getting current data summary:', error);
      return {
        totalSessions: 0,
        currentStreak: 0,
        totalPoints: 0
      };
    }
  }

  // Actually perform registration
  async doRegister(email, username) {
    console.log('doRegister called with:', { email, username });
    console.log('Setting register button to loading state...');
    this.setButtonLoading(this.elements.registerBtn, true);
    
    // Safety timeout to re-enable button after 10 seconds
    const timeoutId = setTimeout(() => {
      console.log('Registration timeout - re-enabling button');
      this.setButtonLoading(this.elements.registerBtn, false);
    }, 10000);
    
    try {
      console.log('Calling authService.register...');
      const result = await window.authService.register(email, username);
      console.log('Registration result:', result);
      
      // Mark browser as having used sync
      this.markBrowserAsUsedWithSync();
      
      // Check if email verification is required
      if (result.needsVerification) {
        console.log('Email verification required, showing verification modal');
        this.showEmailVerificationModal(email);
        this.showToast('📧 Please check your email for a verification code', 'info');
      } else {
        console.log('Registration completed successfully without verification');
        this.showToast('✅ Account created successfully!', 'success');
        this.clearForm();
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      // Enhanced error handling for specific cases
      let errorMessage = error.message;
      if (errorMessage.includes('User already exists') || errorMessage.includes('already exists')) {
        errorMessage = 'This email is already registered. Please use the Login option instead.';
      } else if (errorMessage.includes('Invalid email')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (errorMessage.includes('409')) {
        errorMessage = 'This email is already registered. Please try logging in instead.';
      }
      
      this.showToast('❌ ' + errorMessage, 'error');
    } finally {
      console.log('Registration complete - re-enabling button');
      clearTimeout(timeoutId);
      this.setButtonLoading(this.elements.registerBtn, false);
    }
  }

  // Show email verification modal
  showEmailVerificationModal(email) {
    // Remove any existing verification modal
    const existingModal = document.getElementById('email-verification-modal');
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

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('email-verification-modal');
    const codeInput = document.getElementById('verification-code-input');
    const cancelBtn = document.getElementById('verification-cancel');
    const verifyBtn = document.getElementById('verification-verify');

    // Focus on input
    setTimeout(() => codeInput.focus(), 100);

    // Close modal function
    const closeModal = () => {
      if (modal) modal.remove();
    };

    // Cancel button
    cancelBtn.addEventListener('click', closeModal);

    // Verify button
    verifyBtn.addEventListener('click', async () => {
      const code = codeInput.value.trim();
      if (!code) {
        this.showToast('Please enter the verification code', 'error');
        return;
      }

      try {
        verifyBtn.textContent = 'Verifying...';
        verifyBtn.disabled = true;

        await window.authService.verifyEmail(email, code);
        this.showToast('✅ Email verified successfully!', 'success');
        closeModal();
        this.clearForm();
      } catch (error) {
        console.error('Verification error:', error);
        this.showToast('❌ ' + error.message, 'error');
        verifyBtn.textContent = 'Verify';
        verifyBtn.disabled = false;
      }
    });

    // Enter key to verify
    codeInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        verifyBtn.click();
      }
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  // Actually perform login  
  async doLogin(email) {
    console.log('doLogin called with:', { email });
    console.log('Setting login button to loading state...');
    this.setButtonLoading(this.elements.loginBtn, true);
    
    // Safety timeout to re-enable button after 10 seconds
    const timeoutId = setTimeout(() => {
      console.log('Login timeout - re-enabling button');
      this.setButtonLoading(this.elements.loginBtn, false);
    }, 10000);
    
    try {
      console.log('Calling authService.login...');
      const result = await window.authService.login(email);
      console.log('Login successful:', result);
      
      // Mark browser as having used sync
      this.markBrowserAsUsedWithSync();
      
      this.showToast('✅ Signed in successfully!', 'success');
      this.clearForm();
    } catch (error) {
      console.error('Login error:', error);
      this.showToast('❌ ' + error.message, 'error');
    } finally {
      console.log('Login complete - re-enabling button');
      clearTimeout(timeoutId);
      this.setButtonLoading(this.elements.loginBtn, false);
    }
  }
  
  // Mark browser as having used sync to prevent modal on future logins
  markBrowserAsUsedWithSync() {
    try {
      localStorage.setItem('customodoro-has-used-sync', 'true');
      console.log('✅ Marked browser as having used sync');
    } catch (error) {
      console.warn('Failed to mark browser as used with sync:', error);
    }
  }
  
  // Show toast notification
  showToast(message, type = 'info') {
    // Try to use existing toast system
    if (window.showToast) {
      window.showToast(message);
      return;
    }
    
    // Fallback: create simple toast
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4caf50' : '#2196f3'};
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
console.log('Creating SyncUI instance...');
window.syncUI = new SyncUI();
console.log('SyncUI created successfully:', window.syncUI);
