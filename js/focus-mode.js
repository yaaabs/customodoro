// Focus Mode - Provides a simplified distraction-free interface
(function() {
  // Variables
  let isFocusModeEnabled = false;
  let isFocusModeActive = false;
  
  // Create focus mode overlay
  function createFocusModeElements() {
    const overlay = document.createElement('div');
    overlay.className = 'focus-mode-overlay';
    overlay.innerHTML = `
      <div class="focus-mode-timer">00:00</div>
      <div class="focus-mode-buttons">
        <button class="primary-btn" id="focus-mode-toggle-btn">PAUSE</button>
        <button class="secondary-btn" id="focus-mode-reset-btn">Reset</button>
      </div>
      <div class="focus-mode-progress">
        <div class="focus-mode-progress-inner"></div>
      </div>
      <div class="focus-mode-session" id="focus-mode-session">#1</div>
      <button class="focus-mode-exit" id="focus-mode-exit">Exit Focus Mode</button>
    `;
    
    document.body.appendChild(overlay);
    
    // Set up event listeners
    document.getElementById('focus-mode-toggle-btn').addEventListener('click', function() {
      const startBtn = document.getElementById('start-btn');
      if (startBtn) startBtn.click();
    });
    
    document.getElementById('focus-mode-reset-btn').addEventListener('click', function() {
      const resetBtn = document.getElementById('reset-btn');
      if (resetBtn) resetBtn.click();
    });
    
    document.getElementById('focus-mode-exit').addEventListener('click', exitFocusMode);
    
    // Keyboard shortcut to exit focus mode
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && isFocusModeActive) {
        exitFocusMode();
      }
    });
  }
  
  // Initialize focus mode
  function initFocusMode() {
    // Check if focus mode is enabled in settings
    isFocusModeEnabled = localStorage.getItem('focusModeEnabled') !== 'false';
    
    // Create the overlay if it doesn't exist
    if (!document.querySelector('.focus-mode-overlay')) {
      createFocusModeElements();
    }
    
    // Set up the toggle in theme settings
    setupFocusModeToggle();
    
    console.log('Focus Mode initialized:', {enabled: isFocusModeEnabled});
  }
  
  // Set up the focus mode toggle in theme settings
  function setupFocusModeToggle() {
    // First, look for existing toggle
    const existingToggle = document.getElementById('focus-mode-toggle');
    
    if (existingToggle) {
      // Update the checked state
      existingToggle.checked = isFocusModeEnabled;
      
      // Add/update event listener
      existingToggle.addEventListener('change', function() {
        setFocusModeEnabled(existingToggle.checked);
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
        const focusModeRow = document.createElement('div');
        focusModeRow.className = 'settings-row';
        focusModeRow.innerHTML = `
          <div class="settings-label">Focus Mode (hide distractions when timer runs)</div>
          <label class="toggle-switch">
            <input type="checkbox" id="focus-mode-toggle" ${isFocusModeEnabled ? 'checked' : ''}>
            <span class="slider-toggle"></span>
          </label>
        `;
        
        // Insert after the first row
        firstRow.parentNode.insertBefore(focusModeRow, firstRow.nextSibling);
        
        // Add event listener
        const newToggle = document.getElementById('focus-mode-toggle');
        if (newToggle) {
          newToggle.addEventListener('change', function() {
            setFocusModeEnabled(newToggle.checked);
          });
        }
      }
    }
  }
  
  // Enter focus mode
  function enterFocusMode() {
    if (!isFocusModeEnabled) return;
    
    const overlay = document.querySelector('.focus-mode-overlay');
    if (!overlay) return;
    
    // Get current timer value and update the focus mode timer
    const mainTimer = document.getElementById('timer');
    const focusModeTimer = document.querySelector('.focus-mode-timer');
    
    if (mainTimer && focusModeTimer) {
      focusModeTimer.textContent = mainTimer.textContent;
    }
    
    // Copy progress bar width
    const progressBar = document.getElementById('progress-bar');
    const focusModeProgress = document.querySelector('.focus-mode-progress-inner');
    
    if (progressBar && focusModeProgress) {
      focusModeProgress.style.width = progressBar.style.width;
    }
    
    // Update session number if it exists
    const sessionText = document.getElementById('session-text');
    const focusModeSession = document.getElementById('focus-mode-session');
    
    if (sessionText && focusModeSession) {
      focusModeSession.textContent = sessionText.textContent;
      focusModeSession.style.display = ''; // Make sure it's visible
    } else if (focusModeSession) {
      // Hide session info for reverse timer
      focusModeSession.style.display = 'none';
    }
    
    // Copy button state
    const startBtn = document.getElementById('start-btn');
    const focusModeToggleBtn = document.getElementById('focus-mode-toggle-btn');
    
    if (startBtn && focusModeToggleBtn) {
      focusModeToggleBtn.textContent = startBtn.textContent;
    }
    
    // Show the overlay
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling when in focus mode
    isFocusModeActive = true;
    
    // Apply theme-specific styling to focus mode if needed
    const currentTheme = document.body.className.match(/theme-\S+/);
    if (currentTheme) {
      overlay.setAttribute('data-theme', currentTheme[0]);
    }
  }
  
  // Exit focus mode
  function exitFocusMode() {
    const overlay = document.querySelector('.focus-mode-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = ''; // Restore scrolling
      isFocusModeActive = false;
    }
  }
  
  // Update focus mode data
  function updateFocusMode(timeText, progressPercent, buttonText, sessionText) {
    if (!isFocusModeActive) return;
    
    const focusModeTimer = document.querySelector('.focus-mode-timer');
    const focusModeProgress = document.querySelector('.focus-mode-progress-inner');
    const focusModeToggleBtn = document.getElementById('focus-mode-toggle-btn');
    const focusModeSession = document.getElementById('focus-mode-session');
    
    if (focusModeTimer && timeText) {
      focusModeTimer.textContent = timeText;
    }
    
    if (focusModeProgress && progressPercent !== undefined) {
      focusModeProgress.style.width = `${progressPercent}%`;
    }
    
    if (focusModeToggleBtn && buttonText) {
      focusModeToggleBtn.textContent = buttonText;
    }
    
    if (focusModeSession && sessionText) {
      focusModeSession.textContent = sessionText;
      focusModeSession.style.display = ''; // Make it visible
    }
  }
  
  // Settings functions
  function setFocusModeEnabled(enabled) {
    isFocusModeEnabled = enabled;
    localStorage.setItem('focusModeEnabled', enabled);
    
    if (!enabled && isFocusModeActive) {
      exitFocusMode();
    }
    
    // Update any toggle switches in the UI
    const toggles = document.querySelectorAll('#focus-mode-toggle');
    toggles.forEach(toggle => {
      toggle.checked = enabled;
    });
    
    console.log('Focus Mode setting changed:', enabled);
  }
  
  function isFocusActive() {
    return isFocusModeActive;
  }
  
  function isFocusEnabled() {
    return isFocusModeEnabled;
  }
  
  // Initialize on page load
  document.addEventListener('DOMContentLoaded', initFocusMode);
  
  // Also set up the toggle when settings is opened
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', function() {
      // Use a small delay to ensure the settings modal is open
      setTimeout(setupFocusModeToggle, 300);
    });
  }
  
  // Expose public API
  window.focusMode = {
    enter: enterFocusMode,
    exit: exitFocusMode,
    update: updateFocusMode,
    isActive: isFocusActive,
    isEnabled: isFocusEnabled,
    setEnabled: setFocusModeEnabled,
    setup: setupFocusModeToggle
  };
})();
