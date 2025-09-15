// Locked In Mode - Provides a simplified distraction-free interface
(function() {
  // Variables
  let isLockedInModeEnabled = false;
  let isLockedInModeActive = false;
  let lockedInModeTimer = null; // Timer variable for the delayed activation
  
  // Create locked in mode overlay
  function createLockedInModeElements() {
    const overlay = document.createElement('div');
    overlay.className = 'lockedin-mode-overlay';
    overlay.innerHTML = `
      <div class="lockedin-mode-timer">00:00</div>
      <div class="lockedin-mode-buttons">
        <button class="primary-btn" id="lockedin-mode-toggle-btn">PAUSE</button>
        <button class="secondary-btn" id="lockedin-mode-reset-btn">Reset</button>
      </div>
      <div class="lockedin-mode-progress">
        <div class="lockedin-mode-progress-inner"></div>
      </div>
      <div class="lockedin-mode-session" id="lockedin-mode-session">#1</div>
      <button class="lockedin-mode-exit" id="lockedin-mode-exit">Exit Locked In Mode</button>
    `;
    
    document.body.appendChild(overlay);
    
    // Set up event listeners
    document.getElementById('lockedin-mode-toggle-btn').addEventListener('click', function() {
      const startBtn = document.getElementById('start-btn');
      if (startBtn) startBtn.click();
    });
    
    document.getElementById('lockedin-mode-reset-btn').addEventListener('click', function() {
      const resetBtn = document.getElementById('reset-btn');
      if (resetBtn) resetBtn.click();
    });
    
    document.getElementById('lockedin-mode-exit').addEventListener('click', exitLockedInMode);
    
    // Keyboard shortcut to exit locked in mode
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && isLockedInModeActive) {
        exitLockedInMode();
      }
    });
  }
  
  // Initialize locked in mode
  function initLockedInMode() {
    // Default to OFF unless explicitly enabled
    if (localStorage.getItem('lockedInModeEnabled') === null && localStorage.getItem('focusModeEnabled') === null) {
      isLockedInModeEnabled = false;
      localStorage.setItem('lockedInModeEnabled', 'false');
    } else if (localStorage.getItem('lockedInModeEnabled') !== null) {
      isLockedInModeEnabled = localStorage.getItem('lockedInModeEnabled') !== 'false';
    } else if (localStorage.getItem('focusModeEnabled') !== null) {
      isLockedInModeEnabled = localStorage.getItem('focusModeEnabled') !== 'false';
      localStorage.setItem('lockedInModeEnabled', isLockedInModeEnabled);
    }
    
    // Create the overlay if it doesn't exist
    if (!document.querySelector('.lockedin-mode-overlay')) {
      createLockedInModeElements();
    }
    
    // Set up the toggle in theme settings
    setupLockedInModeToggle();
    
    console.log('Locked In Mode initialized:', {enabled: isLockedInModeEnabled});
  }
  
  // Set up the locked in mode toggle in theme settings
  function setupLockedInModeToggle() {
    // First, look for existing toggle
    const existingToggle = document.getElementById('lockedin-mode-toggle');
    
    if (existingToggle) {
      // Update the checked state
      existingToggle.checked = isLockedInModeEnabled;
      
      // Add/update event listener
      existingToggle.addEventListener('change', function() {
        setLockedInModeEnabled(existingToggle.checked);
      });
      
      return;
    }
    
    // If we don't find an existing toggle, add it to the theme section
    const themeSection = document.getElementById('theme-section');
    if (themeSection) {
      // Find first settings row to insert after
      const firstRow = themeSection.querySelector('.settings-row');
      
      if (firstRow) {
        // Create the toggle row
        const lockedInModeRow = document.createElement('div');
        lockedInModeRow.className = 'settings-row';
        // Default to unchecked unless enabled in settings
        lockedInModeRow.innerHTML = `
          <div class="settings-label">
            Locked In Mode when running
            <span class="info-icon" id="lockedin-mode-info">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </span>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="lockedin-mode-toggle" ${isLockedInModeEnabled ? 'checked' : ''}>
            <span class="slider-toggle"></span>
          </label>
        `;
        
        // Insert after the first row
        firstRow.parentNode.insertBefore(lockedInModeRow, firstRow.nextSibling);
        
        // Add event listener
        const newToggle = document.getElementById('lockedin-mode-toggle');
        if (newToggle) {
          newToggle.checked = isLockedInModeEnabled; // Ensure correct state
          newToggle.addEventListener('change', function() {
            setLockedInModeEnabled(newToggle.checked);
          });
        }
      }
    }
  }
  
  // Enter locked in mode with delay option
  function enterLockedInMode(withDelay = false) {
    if (!isLockedInModeEnabled) return;
    
    // Clear any existing timer
    if (lockedInModeTimer) {
      clearTimeout(lockedInModeTimer);
      lockedInModeTimer = null;
    }
    
    // If delay is requested, wait 1 second before activating
    if (withDelay) {
      lockedInModeTimer = setTimeout(() => {
        activateLockedInMode();
      }, 1000); // 1-second delay
      
      console.log("Locked In Mode will activate in 1 second");
      return;
    }
    
    // Otherwise activate immediately
    activateLockedInMode();
  }
  
  // Actual function to activate the locked in mode
  function activateLockedInMode() {
    const overlay = document.querySelector('.lockedin-mode-overlay');
    if (!overlay) return;
    
    // Get current timer value and update the locked in mode timer
    const mainTimer = document.getElementById('timer');
    const lockedInModeTimer = document.querySelector('.lockedin-mode-timer');
    
    if (mainTimer && lockedInModeTimer) {
      lockedInModeTimer.textContent = mainTimer.textContent;
    }
    
    // Copy progress bar width
    const progressBar = document.getElementById('progress-bar');
    const lockedInModeProgress = document.querySelector('.lockedin-mode-progress-inner');
    
    if (progressBar && lockedInModeProgress) {
      lockedInModeProgress.style.width = progressBar.style.width;
    }
    
    // Update session number if it exists
    const sessionText = document.getElementById('session-text');
    const lockedInModeSession = document.getElementById('lockedin-mode-session');
    
    if (sessionText && lockedInModeSession) {
      lockedInModeSession.textContent = sessionText.textContent;
      lockedInModeSession.style.display = ''; // Make sure it's visible
    } else if (lockedInModeSession) {
      // Hide session info for reverse timer
      lockedInModeSession.style.display = 'none';
    }
    
    // Copy button state
    const startBtn = document.getElementById('start-btn');
    const lockedInModeToggleBtn = document.getElementById('lockedin-mode-toggle-btn');
    
    if (startBtn && lockedInModeToggleBtn) {
      lockedInModeToggleBtn.textContent = startBtn.textContent;
    }
    
    // Show the overlay
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling when in locked in mode
    isLockedInModeActive = true;
    
    // Apply theme-specific styling to locked in mode if needed
    const currentTheme = document.body.className.match(/theme-\S+/);
    if (currentTheme) {
      overlay.setAttribute('data-theme', currentTheme[0]);
    }
    
    console.log("Locked In Mode activated");
  }
  
  // Exit locked in mode
  function exitLockedInMode() {
    // Clear any pending activation timer
    if (lockedInModeTimer) {
      clearTimeout(lockedInModeTimer);
      lockedInModeTimer = null;
    }
    
    const overlay = document.querySelector('.lockedin-mode-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = ''; // Restore scrolling
      isLockedInModeActive = false;
    }
  }
  
  // Update locked in mode data
  function updateLockedInMode(timeText, progressPercent, buttonText, sessionText) {
    if (!isLockedInModeActive) return;
    
    const lockedInModeTimer = document.querySelector('.lockedin-mode-timer');
    const lockedInModeProgress = document.querySelector('.lockedin-mode-progress-inner');
    const lockedInModeToggleBtn = document.getElementById('lockedin-mode-toggle-btn');
    const lockedInModeSession = document.getElementById('lockedin-mode-session');
    
    if (lockedInModeTimer && timeText) {
      lockedInModeTimer.textContent = timeText;
    }
    
    if (lockedInModeProgress && progressPercent !== undefined) {
      lockedInModeProgress.style.width = `${progressPercent}%`;
    }
    
    if (lockedInModeToggleBtn && buttonText) {
      lockedInModeToggleBtn.textContent = buttonText;
    }
    
    if (lockedInModeSession && sessionText) {
      lockedInModeSession.textContent = sessionText;
      lockedInModeSession.style.display = ''; // Make it visible
    }
  }
  
  // Settings functions
  function setLockedInModeEnabled(enabled) {
    isLockedInModeEnabled = enabled;
    localStorage.setItem('lockedInModeEnabled', enabled);
    localStorage.setItem('focusModeEnabled', enabled); // For backward compatibility
    
    if (!enabled && isLockedInModeActive) {
      exitLockedInMode();
    }
    
    // Update any toggle switches in the UI
    const toggles = document.querySelectorAll('#lockedin-mode-toggle');
    toggles.forEach(toggle => {
      toggle.checked = enabled;
    });
    
    console.log('Locked In Mode setting changed:', enabled);
  }
  
  function isLockedInActive() {
    return isLockedInModeActive;
  }
  
  function isLockedInEnabled() {
    return isLockedInModeEnabled;
  }
  
  // Initialize on page load
  document.addEventListener('DOMContentLoaded', initLockedInMode);
  
  // Also set up the toggle when settings is opened
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', function() {
      // Use a small delay to ensure the settings modal is open
      setTimeout(setupLockedInModeToggle, 300);
    });
  }
  
  // For backward compatibility
  function forwardToNewFunctions(oldFn, newFn) {
    return function() {
      return newFn.apply(this, arguments);
    };
  }
  
  // Expose public API
  window.lockedInMode = {
    enter: enterLockedInMode,
    exit: exitLockedInMode,
    update: updateLockedInMode,
    isActive: isLockedInActive,
    isEnabled: isLockedInEnabled,
    setEnabled: setLockedInModeEnabled,
    setup: setupLockedInModeToggle
  };
  
  // For backward compatibility
  window.focusMode = {
    enter: forwardToNewFunctions(enterLockedInMode, enterLockedInMode),
    exit: forwardToNewFunctions(exitLockedInMode, exitLockedInMode),
    update: forwardToNewFunctions(updateLockedInMode, updateLockedInMode),
    isActive: forwardToNewFunctions(isLockedInActive, isLockedInActive),
    isEnabled: forwardToNewFunctions(isLockedInEnabled, isLockedInEnabled),
    setEnabled: forwardToNewFunctions(setLockedInModeEnabled, setLockedInModeEnabled),
    setup: forwardToNewFunctions(setupLockedInModeToggle, setupLockedInModeToggle)
  };
})();
