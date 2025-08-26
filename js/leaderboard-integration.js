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
  
  function handleLeaderboardClick() {
    console.log('🏆 Leaderboard button clicked');
    
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
