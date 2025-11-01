// Offline Fallback UI Manager
// Handles displaying offline indicators for online-only features

class OfflineFallbackUI {
  constructor() {
    this.isOnline = navigator.onLine;
    this.setupEventListeners();
    this.checkOnlineDependentFeatures();
  }

  setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.hideAllOfflineFallbacks();
      this.enableOnlineFeatures();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.showOfflineFallbacks();
      this.disableOnlineFeatures();
    });

    // Check on page load
    if (!this.isOnline) {
      setTimeout(() => this.showOfflineFallbacks(), 500);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // Check and show offline fallbacks for features
  // ═══════════════════════════════════════════════════════════════════
  checkOnlineDependentFeatures() {
    // Leaderboard button
    const leaderboardBtn = document.getElementById('leaderboard-btn');
    if (leaderboardBtn) {
      this.wrapOnlineFeature(leaderboardBtn, 'Leaderboard');
    }
  }

  showOfflineFallbacks() {
    // Show offline indicator for leaderboard
    const leaderboardBtn = document.getElementById('leaderboard-btn');
    if (leaderboardBtn) {
      this.addOfflineIndicator(leaderboardBtn);
    }
  }

  hideAllOfflineFallbacks() {
    document.querySelectorAll('.offline-indicator-badge').forEach(badge => {
      badge.remove();
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // Wrap online features with offline detection
  // ═══════════════════════════════════════════════════════════════════
  wrapOnlineFeature(element, featureName) {
    const originalClickHandler = element.onclick;
    
    element.addEventListener('click', (e) => {
      if (!navigator.onLine) {
        e.stopPropagation();
        e.preventDefault();
        this.showOfflineFeatureModal(featureName);
        return false;
      }
    }, true); // Use capture phase to intercept before other handlers
  }

  addOfflineIndicator(element) {
    if (!navigator.onLine && !element.querySelector('.offline-indicator-badge')) {
      const badge = document.createElement('span');
      badge.className = 'offline-indicator-badge';
      badge.innerHTML = '📵';
      badge.style.cssText = `
        position: absolute;
        top: -5px;
        right: -5px;
        font-size: 12px;
        background: rgba(255, 59, 48, 0.9);
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
      `;
      
      element.style.position = 'relative';
      element.appendChild(badge);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // Show offline feature modal
  // ═══════════════════════════════════════════════════════════════════
showOfflineFeatureModal(featureName) {
  // Remove existing modal if any
  const existingModal = document.getElementById('offline-feature-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.id = 'offline-feature-modal';
  modal.className = 'offline-modal';
  
  modal.innerHTML = `
    <div class="offline-modal-overlay"></div>
    <div class="offline-modal-content">
      <div class="offline-modal-icon">📵</div>
      <h2>${featureName} Unavailable</h2>
      <p class="offline-modal-message">
        ${featureName} requires an internet connection to work.
      </p>
      <p class="offline-modal-submessage">
        Your progress is being saved locally and will sync when you're back online.
      </p>
      <div class="offline-modal-button-container">
        <button class="offline-modal-close-btn" onclick="this.closest('.offline-modal').remove()">
          Got it
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Add styles
  this.addOfflineModalStyles();

  // Close on overlay click
  modal.querySelector('.offline-modal-overlay').addEventListener('click', () => {
    modal.remove();
  });

  // Close on escape key
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
}

// ═══════════════════════════════════════════════════════════════════
// METHOD 2: addOfflineModalStyles (UPDATED)
// ═══════════════════════════════════════════════════════════════════
addOfflineModalStyles() {
  if (document.getElementById('offline-modal-styles')) return;

  const styles = document.createElement('style');
  styles.id = 'offline-modal-styles';
  styles.textContent = `
    .offline-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s ease-out;
    }

    .offline-modal-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
    }

    .offline-modal-content {
      position: relative;
      background: #1a1a1a;
      border: 2px solid #333;
      border-radius: 16px;
      padding: 32px;
      max-width: 400px;
      width: 90%;
      text-align: center;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      animation: slideIn 0.3s ease-out;
    }

    .offline-modal-icon {
      font-size: 48px;
      margin-bottom: 16px;
      animation: pulse 2s ease-in-out infinite;
    }

    .offline-modal-content h2 {
      color: #fff;
      margin: 0 0 12px 0;
      font-size: 24px;
      font-weight: 600;
    }

    .offline-modal-message {
      color: #ccc;
      margin: 0 0 8px 0;
      font-size: 16px;
      line-height: 1.5;
    }

    .offline-modal-submessage {
      color: #888;
      margin: 0 0 24px 0;
      font-size: 14px;
      line-height: 1.4;
    }

    /* ✨ NEW: Button container for centering */
    .offline-modal-button-container {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
    }

    .offline-modal-close-btn {
      background: #e53935;
      color: white;
      border: none;
      padding: 12px 32px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .offline-modal-close-btn:hover {
      background: #ff5252;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(229, 57, 53, 0.4);
    }

    .offline-modal-close-btn:active {
      transform: translateY(0);
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes slideIn {
      from {
        transform: translateY(-20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.6;
      }
    }
  `;

  document.head.appendChild(styles);
}

  // ═══════════════════════════════════════════════════════════════════
  // Show inline offline notice (for embedded features)
  // ═══════════════════════════════════════════════════════════════════
  showInlineOfflineNotice(container, featureName) {
    const notice = document.createElement('div');
    notice.className = 'inline-offline-notice';
    notice.innerHTML = `
      <div class="offline-notice-icon">📵</div>
      <h3>${featureName} Unavailable</h3>
      <p>Connect to the internet to view ${featureName.toLowerCase()}</p>
      <p class="muted">Your progress is being saved locally</p>
    `;

    // Add styles for inline notice
    this.addInlineOfflineNoticeStyles();

    container.innerHTML = '';
    container.appendChild(notice);
  }

  addInlineOfflineNoticeStyles() {
    if (document.getElementById('inline-offline-notice-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'inline-offline-notice-styles';
    styles.textContent = `
      .inline-offline-notice {
        padding: 40px 20px;
        text-align: center;
        background: rgba(255, 59, 48, 0.1);
        border: 2px dashed rgba(255, 59, 48, 0.3);
        border-radius: 12px;
        margin: 20px 0;
      }

      .offline-notice-icon {
        font-size: 48px;
        margin-bottom: 16px;
        opacity: 0.8;
      }

      .inline-offline-notice h3 {
        color: #ff3b30;
        margin: 0 0 8px 0;
        font-size: 18px;
        font-weight: 600;
      }

      .inline-offline-notice p {
        color: #ccc;
        margin: 4px 0;
        font-size: 14px;
      }

      .inline-offline-notice p.muted {
        color: #888;
        font-size: 12px;
      }
    `;

    document.head.appendChild(styles);
  }

  // ═══════════════════════════════════════════════════════════════════
  // Enable/disable online features
  // ═══════════════════════════════════════════════════════════════════
  disableOnlineFeatures() {
    // Add disabled state to online-only buttons
    const leaderboardBtn = document.getElementById('leaderboard-btn');
    if (leaderboardBtn) {
      this.addOfflineIndicator(leaderboardBtn);
    }
  }

  enableOnlineFeatures() {
    // Remove disabled state
    this.hideAllOfflineFallbacks();
  }

  // ═══════════════════════════════════════════════════════════════════
  // Utility: Check if specific feature should work offline
  // ═══════════════════════════════════════════════════════════════════
  isFeatureAvailableOffline(featureName) {
    const offlineFeatures = [
      'timer',
      'tasks',
      'settings',
      'stats',
      'streaks',
      'contribution-graph'
    ];

    return offlineFeatures.includes(featureName.toLowerCase());
  }

  // ═══════════════════════════════════════════════════════════════════
  // Create offline status indicator in header
  // ═══════════════════════════════════════════════════════════════════
  createOfflineStatusIndicator() {
    if (document.getElementById('offline-status-indicator')) return;

    const indicator = document.createElement('div');
    indicator.id = 'offline-status-indicator';
    indicator.innerHTML = `
      <span class="offline-dot"></span>
      <span class="offline-text">Offline Mode</span>
    `;

    // Add to header if possible
    const header = document.querySelector('header') || document.body;
    header.insertBefore(indicator, header.firstChild);

    this.addOfflineStatusIndicatorStyles();

    // Only show when offline
    indicator.style.display = navigator.onLine ? 'none' : 'flex';

    // Update on connection change
    window.addEventListener('online', () => {
      indicator.style.display = 'none';
    });

    window.addEventListener('offline', () => {
      indicator.style.display = 'flex';
    });
  }

  addOfflineStatusIndicatorStyles() {
    if (document.getElementById('offline-status-indicator-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'offline-status-indicator-styles';
    styles.textContent = `
      #offline-status-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: rgba(255, 59, 48, 0.15);
        border: 1px solid rgba(255, 59, 48, 0.3);
        border-radius: 8px;
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 9999;
        font-size: 14px;
        color: #ff3b30;
        backdrop-filter: blur(10px);
      }

      .offline-dot {
        width: 8px;
        height: 8px;
        background: #ff3b30;
        border-radius: 50%;
        animation: blink 2s ease-in-out infinite;
      }

      .offline-text {
        font-weight: 500;
      }

      @keyframes blink {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }

      @media (max-width: 600px) {
        #offline-status-indicator {
          top: 8px;
          right: 8px;
          font-size: 12px;
          padding: 6px 12px;
        }
      }
    `;

    document.head.appendChild(styles);
  }
}

// ═══════════════════════════════════════════════════════════════════
// Initialize on page load
// ═══════════════════════════════════════════════════════════════════
if (typeof window !== 'undefined') {
  window.offlineFallbackUI = new OfflineFallbackUI();
  console.log('🎨 Offline Fallback UI initialized');
  
  // Create offline status indicator
  window.addEventListener('DOMContentLoaded', () => {
    window.offlineFallbackUI.createOfflineStatusIndicator();
  });
}
