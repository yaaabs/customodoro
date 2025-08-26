// Database Leaderboard Button Integration
// Connects the leaderboard button with the database modal

document.addEventListener('DOMContentLoaded', function() {
  console.log('🔗 Leaderboard integration initializing...');
  
  // Initialize database leaderboard automatically with retry mechanism
  let initRetryCount = 0;
  const maxInitRetries = 5;
  
  function tryInitLeaderboard() {
    if (typeof window.initDatabaseLeaderboard === 'function') {
      window.initDatabaseLeaderboard();
      console.log('🔗 Database leaderboard auto-initialized');
      setupLeaderboardButton();
    } else {
      initRetryCount++;
      if (initRetryCount <= maxInitRetries) {
        console.log(`🔄 Retrying leaderboard init (${initRetryCount}/${maxInitRetries})...`);
        setTimeout(tryInitLeaderboard, 200 * initRetryCount);
      } else {
        console.warn('⚠️ Failed to initialize database leaderboard after retries');
        setupLeaderboardButton(); // Still try to set up the button
      }
    }
  }
  
  // Start initialization
  setTimeout(tryInitLeaderboard, 100);

  function setupLeaderboardButton() {
    // Initialize leaderboard button with multiple attempts
    let buttonRetryCount = 0;
    const maxButtonRetries = 10;
    
    function trySetupButton() {
      const leaderboardBtn = document.getElementById('leaderboard-btn');
      
      if (leaderboardBtn) {
        // Remove any existing listeners to prevent duplicates
        leaderboardBtn.removeEventListener('click', handleLeaderboardClick);
        leaderboardBtn.addEventListener('click', handleLeaderboardClick);
        console.log('✅ Leaderboard button listener attached successfully');
        
        // Setup mobile tip functionality
        setupMobileTip();
      } else {
        buttonRetryCount++;
        if (buttonRetryCount <= maxButtonRetries) {
          console.log(`🔄 Retrying button setup (${buttonRetryCount}/${maxButtonRetries})...`);
          setTimeout(trySetupButton, 100 * buttonRetryCount);
        } else {
          console.error('❌ Leaderboard button not found after retries');
        }
      }
    }
    
    trySetupButton();
  }

  // Setup mobile tip functionality
  function setupMobileTip() {
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) return;

    // Check if user has already clicked leaderboard
    const hasClicked = localStorage.getItem('hasSeenLeaderboardTip');
    if (hasClicked) return;

    // Show permanent tip after delay
    setTimeout(() => {
      showMobileTip();
    }, 2000);
  }

  // Show mobile tip function
  function showMobileTip() {
    const leaderboardBtn = document.getElementById('leaderboard-btn');
    if (!leaderboardBtn) return;

    // Don't show if already exists or user has clicked
    if (document.querySelector('.mobile-leaderboard-tip')) return;
    const hasClicked = localStorage.getItem('hasSeenLeaderboardTip');
    if (hasClicked) return;

    // Create tip element
    const tip = document.createElement('div');
    tip.className = 'mobile-leaderboard-tip';
    tip.innerHTML = `
      <div class="mobile-tip-content">
      </div>
    `;

    // Position near the leaderboard button
    const btnRect = leaderboardBtn.getBoundingClientRect();
    tip.style.position = 'fixed';
    tip.style.top = (btnRect.top - 50) + 'px';
    tip.style.right = '20px';
    tip.style.zIndex = '10000';

    // Add to body
    document.body.appendChild(tip);

    // NO AUTO-HIDE - stays permanent until user clicks leaderboard
    console.log('💬 Permanent mobile leaderboard tip displayed');
  }
  
  function handleLeaderboardClick() {
    console.log('🏆 Leaderboard button clicked');
    
    // Mark that user has seen and interacted with leaderboard
    localStorage.setItem('hasSeenLeaderboardTip', 'true');
    
    // Hide any existing mobile tip immediately
    const existingTip = document.querySelector('.mobile-leaderboard-tip');
    if (existingTip) {
      existingTip.style.animation = 'leaderboardTipFadeOut 0.3s ease-out forwards';
      setTimeout(() => {
        if (existingTip.parentNode) {
          existingTip.parentNode.removeChild(existingTip);
        }
      }, 300);
    }
    
    // Hide the mobile tip animations
    const leaderboardBtn = document.getElementById('leaderboard-btn');
    if (leaderboardBtn) {
      leaderboardBtn.classList.add('clicked');
    }
    
    try {
      // Ensure database leaderboard is active
      if (!window.leaderboardModal || window.leaderboardModal.constructor.name !== 'DatabaseLeaderboardModal') {
        if (typeof window.initDatabaseLeaderboard === 'function') {
          window.initDatabaseLeaderboard();
        }
      }
      
      // Show leaderboard with multiple fallbacks
      if (window.showLeaderboard) {
        window.showLeaderboard('total_focus', 'all_time');
      } else if (window.leaderboardModal && window.leaderboardModal.show) {
        window.leaderboardModal.show();
      } else {
        console.warn('Database leaderboard not available');
        console.log('Available globals:', Object.keys(window).filter(k => k.includes('leader')));
      }
    } catch (error) {
      console.error('Error in leaderboard click handler:', error);
    }
  }

  // Auto-refresh leaderboard when user's data changes
  // Listen for sync events or session completions
  if (window.authService) {
    window.authService.addEventListener((event, data) => {
      if (event === 'login' || event === 'logout') {
        // Refresh leaderboard data if modal is open
        if (window.leaderboardModal && window.leaderboardModal.isVisible) {
          setTimeout(() => {
            window.leaderboardModal.leaderboard.getCurrentUser();
            window.leaderboardModal.loadLeaderboard();
          }, 1000);
        }
      }
    });
  }

  // Listen for sync events to refresh leaderboard
  if (window.syncManager) {
    window.syncManager.addEventListener((event, data) => {
      if (event === 'sync_complete' || event === 'data_updated') {
        // Refresh leaderboard data if modal is open
        if (window.leaderboardModal && window.leaderboardModal.isVisible) {
          setTimeout(() => {
            window.leaderboardModal.leaderboard.getCurrentUser();
            window.leaderboardModal.loadLeaderboard();
          }, 500);
        }
      }
    });
  }
});

console.log('🏆 Leaderboard integration loaded with enhanced error handling');
