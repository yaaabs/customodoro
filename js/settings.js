// Settings handling
(function() {
  // DOM Elements
  const settingsBtn = document.getElementById('settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  const closeBtn = document.getElementById('settings-close');
  const saveBtn = document.getElementById('save-settings-btn');
  const resetBtn = document.getElementById('reset-settings-btn');
  
  // Navigation Elements
  const navItems = document.querySelectorAll('.settings-nav-item');
  
  // Check if we're on the reverse timer page
  const isReversePage = document.body.classList.contains('reverse-mode');
  
  // Track the currently playing test sound
  let currentTestSound = null;
  let volumeChangeTimeout = null;
  
  // Track the currently playing timer sound
  let currentTimerSound = null;
  let timerSoundChangeTimeout = null;
  
  // Open settings modal
  function openSettings() {
    settingsModal.classList.add('show');
    
    document.body.classList.add('modal-open');
    loadSettings();
    
    // Ensure the first tab is active
    if (navItems.length > 0) {
      activateTab(navItems[0]);
    }
    
    // Make sure locked in mode toggle is visible and properly set
    setTimeout(function() {
      if (window.lockedInMode && typeof window.lockedInMode.setup === 'function') {
        window.lockedInMode.setup();
      }
      
      // Update color theme visibility
      if (window.colorTheme && typeof window.colorTheme.updateColorThemeVisibility === 'function') {
        window.colorTheme.updateColorThemeVisibility();
      }
      
      // Initialize BGM player for reverse page if it doesn't exist
      if (isReversePage && window.bgmPlayer && !window.bgmPlayer.isInitialized) {
        window.bgmPlayer.init();
      }
    }, 100);
  }
  
  // Function to stop any currently playing test sounds
  function stopTestSound() {
    // Clear any pending volume change timeouts
    if (volumeChangeTimeout) {
      clearTimeout(volumeChangeTimeout);
      volumeChangeTimeout = null;
    }
    
    // Stop any currently playing test sound
    if (currentTestSound) {
      currentTestSound.pause();
      currentTestSound.currentTime = 0;
      currentTestSound = null;
    }
    
    // Clear any pending timer sound change timeouts
    if (timerSoundChangeTimeout) {
      clearTimeout(timerSoundChangeTimeout);
      timerSoundChangeTimeout = null;
    }
    
    // Stop any currently playing timer test sound
    if (currentTimerSound) {
      currentTimerSound.pause();
      currentTimerSound.currentTime = 0;
      currentTimerSound = null;
    }
  }
  
  // Close settings modal
  function closeSettings() {
    // Stop any playing test sounds
    stopTestSound();
    
    // Try to save BGM player state, but don't let errors prevent modal closing
    try {
      if (window.bgmPlayer && typeof window.bgmPlayer.saveState === 'function') {
        window.bgmPlayer.saveState();
      }
    } catch (error) {
      console.error('Error saving BGM state:', error);
    }
    
    // Always close the modal, even if there was an error
    settingsModal.classList.remove('show');

    document.body.classList.remove('modal-open')
  }
  
  // Handle tab navigation
  function setupTabNavigation() {
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        activateTab(item);
      });
    });
  }
  
  // Activate tab and show corresponding section
  function activateTab(item) {
    // Remove active class from all nav items and sections
    navItems.forEach(nav => nav.classList.remove('active'));
    document.querySelectorAll('.settings-section').forEach(section => {
      section.classList.remove('active');
    });
    
    // Add active class to clicked item
    item.classList.add('active');
    
    // Show corresponding section
    const sectionId = item.dataset.section;
    const section = document.getElementById(sectionId + '-section');
    if (section) {
      section.classList.add('active');
      
      // If opening BGM section, ensure player is properly initialized
      if (sectionId === 'bgm' && window.bgmPlayer && typeof window.bgmPlayer.refreshUI === 'function') {
        setTimeout(() => {
          window.bgmPlayer.refreshUI();
        }, 100);
      }
    }
  }
  
  // Save settings and apply them immediately
  function saveSettings() {
    // Stop any playing test sounds
    stopTestSound();
    
    try {
      if (isReversePage) {
        saveReverseSettings();
      } else {
        savePomodoroSettings();
      }
      
      // Save sound settings for both modes
      saveSoundSettings();
      
      // Save auto-start settings - now using shared keys
      saveAutoStartSettings();
      
      // Save theme settings
      saveThemeSettings();
        // Save locked in mode setting
      saveLockedInModeSettings();
      
      // Save burn-up tracker setting
      saveBurnupTrackerSettings();
      
      // Apply settings immediately to update the timer
      applySettingsToTimer();
      
      // Update info section on main page
      if (isReversePage && typeof window.updateInfoSection === 'function') {
        window.updateInfoSection();
      }
      
      // Force an immediate timer reset to apply new settings
      forceTimerReset();
      
      // Close the modal with proper error handling
      closeSettings();
      showToast('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      // Make sure modal closes even if there's an error
      settingsModal.classList.remove('show');
      showToast('There was an error saving settings.');
    }
  }
  
  // Reset all settings to defaults
  function resetSettings() {
    if (confirm('Are you sure you want to reset all settings to default values?')) {
      // Reset Pomodoro settings
      if (!isReversePage) {
        localStorage.setItem('pomodoroTime', '25');
        localStorage.setItem('shortBreakTime', '5');
        localStorage.setItem('longBreakTime', '15');
        localStorage.setItem('sessionsCount', '4');
      } else {
        // Reset Reverse Timer settings
        localStorage.setItem('breakLogicMode', 'default');
        localStorage.setItem('reverseMaxTime', '60');
        localStorage.setItem('reverseBreak1', '2');
        localStorage.setItem('reverseBreak2', '5');
        localStorage.setItem('reverseBreak3', '10');
        localStorage.setItem('reverseBreak4', '15');
        localStorage.setItem('reverseBreak5', '30');
      }
      
      // Reset auto start settings - using shared keys
      localStorage.setItem('autoBreak', 'true');
      localStorage.setItem('autoPomodoro', 'true');
      
      // Reset sound settings - using separate keys for Pomodoro and Break
      localStorage.setItem('pomodoroVolume', '60');
      localStorage.setItem('breakVolume', '60');
      localStorage.setItem('soundEffects', 'true');
      localStorage.setItem('alarm', 'true');
      // Set Bell as the default sound for both
      localStorage.setItem('pomodoroSound', 'bell.mp3');
      localStorage.setItem('breakSound', 'bell.mp3');
      
      // Reset timer sound settings
      localStorage.setItem('timerSound', 'none');
      localStorage.setItem('timerSoundVolume', '60');
      
      // Reset BGM settings to defaults
      localStorage.setItem('bgmEnabled', 'false');
      localStorage.setItem('selectedPlaylist', 'deep-focus');
      localStorage.setItem('bgmVolume', '60');
        // Reset theme to light mode
      localStorage.setItem('siteTheme', 'light');
        // Reset burn-up tracker settings
      localStorage.setItem('burnupTrackerEnabled', 'false');

      localStorage.setItem('isLockedInModeEnabled', 'false');
        
      
      // Reset burn-up tracker design to default (Match Theme)
      localStorage.setItem('burnupTrackerDesign', 'match-theme');

      // Reload settings into form
      loadSettings();
      
      // Apply theme immediately
      applyTheme('light');
      
      // Update theme selector to show Light Mode
      const themeSelector = document.getElementById('theme-selector');
      if (themeSelector) {
        themeSelector.value = 'light';
      }
      
      // Update sound settings visually
      const pomodoroVolumeSlider = document.getElementById('pomodoro-volume-slider');
      const pomodoroVolumePercentage = document.getElementById('pomodoro-volume-percentage');
      const breakVolumeSlider = document.getElementById('break-volume-slider');
      const breakVolumePercentage = document.getElementById('break-volume-percentage');
      const soundEffectsToggle = document.getElementById('sound-effects-toggle');
      const alarmToggle = document.getElementById('alarm-toggle');
      const pomodoroSoundSelector = document.getElementById('pomodoro-sound-selector');
      const breakSoundSelector = document.getElementById('break-sound-selector');
      
      if (pomodoroVolumeSlider) pomodoroVolumeSlider.value = 60;
      if (pomodoroVolumePercentage) pomodoroVolumePercentage.textContent = '60%';
      if (breakVolumeSlider) breakVolumeSlider.value = 60;
      if (breakVolumePercentage) breakVolumePercentage.textContent = '60%';
      if (soundEffectsToggle) soundEffectsToggle.checked = true;
      if (alarmToggle) alarmToggle.checked = true;
      // Set Bell as selected in both dropdowns
      if (pomodoroSoundSelector) pomodoroSoundSelector.value = 'bell.mp3';
      if (breakSoundSelector) breakSoundSelector.value = 'bell.mp3';
      
      // Update timer sound settings visually
      const timerSoundSelector = document.getElementById('timer-sound-selector');
      const timerSoundVolumeSlider = document.getElementById('timer-sound-volume-slider');
      const timerSoundVolumePercentage = document.getElementById('timer-sound-volume-percentage');
      
      if (timerSoundSelector) timerSoundSelector.value = 'none';
      if (timerSoundVolumeSlider) timerSoundVolumeSlider.value = 60;
      if (timerSoundVolumePercentage) timerSoundVolumePercentage.textContent = '60%';
      
      // Update BGM settings visually
      const bgmToggle = document.getElementById('bgm-toggle');
      const playlistSelector = document.getElementById('playlist-selector');
      const bgmVolumeSlider = document.getElementById('bgm-volume-slider');
      const bgmVolumePercentage = document.getElementById('bgm-volume-percentage');
      
      if (bgmToggle) bgmToggle.checked = false;
      if (playlistSelector) playlistSelector.value = 'deep-focus';
      if (bgmVolumeSlider) bgmVolumeSlider.value = 60;
      if (bgmVolumePercentage) bgmVolumePercentage.textContent = '60%';
      
      // Update auto-start settings visually
      const autoBreakToggle = document.getElementById('auto-break-toggle');
      const autoPomoToggle = document.getElementById('auto-pomodoro-toggle');
      
      if (autoBreakToggle) autoBreakToggle.checked = true;
      if (autoPomoToggle) autoPomoToggle.checked = true;
      
      // --- LOCKED IN MODE: Reset toggle to OFF and save ---
      const lockedInModeToggle = document.getElementById('lockedin-mode-toggle');
      if (lockedInModeToggle) {
        lockedInModeToggle.checked = false;
        saveLockedInModeSettings();
      }

      // Apply defaults to the timer
      applySettingsToTimer();
      forceTimerReset();
      
      // Update sound volumes and immediately apply the new Bell sound
      updateSoundsDirectly();
      
      // Apply BGM settings reset
      if (window.bgmPlayer) {
        window.bgmPlayer.setEnabled(false);
        window.bgmPlayer.setVolume(60);
        window.bgmPlayer.stop();
      }
        // Stop any currently playing timer sounds and reset
      if (window.stopTimerSound && typeof window.stopTimerSound === 'function') {
        window.stopTimerSound();
      }
      
      // Reset tracker design selector visually and apply the design
      const trackerDesignRadios = document.querySelectorAll('input[name="tracker-design"]');
      const trackerDesignOptions = document.querySelectorAll('.tracker-design-option');
      
      if (trackerDesignRadios.length > 0) {
        trackerDesignRadios.forEach(radio => {
          if (radio.value === 'match-theme') {
            radio.checked = true;
            radio.closest('.tracker-design-option')?.classList.add('selected');
          } else {
            radio.checked = false;
            radio.closest('.tracker-design-option')?.classList.remove('selected');
          }
        });
        
        // Apply the match-theme design to all trackers
        applyTrackerDesign('match-theme');
      }
      
      showToast('Settings reset to defaults!');
    }
  }
  
  // Update the applyTheme function to handle custom themes
  function applyTheme(themeName) {
    // Remove any previous theme classes from body
    document.body.classList.remove('theme-default', 'theme-dark', 'theme-light', 'theme-yourname', 'theme-rain', 'theme-custom', 'theme-color');
    
    // Reset any inline background image and CSS custom properties
    document.body.style.backgroundImage = '';
    document.documentElement.style.removeProperty('--color-theme-bg');
    
    // Clear any existing overlays or pseudo-elements
    const existingOverlay = document.querySelector('.theme-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
    // If selecting color theme, apply it using theme-manager.js
    if (themeName === 'color') {
      const colorTheme = localStorage.getItem('colorThemeBackground'); // Use consistent key
      if (colorTheme) {
        // We have a saved color theme
        document.body.classList.add('theme-color');
        document.documentElement.style.setProperty('--color-theme-bg', colorTheme);
        console.log('Color theme applied:', colorTheme);
        
        // Force theme-manager to update the color theme visibility
        if (window.colorTheme && window.colorTheme.updateColorThemeVisibility) {
          setTimeout(() => {
            window.colorTheme.updateColorThemeVisibility();
          }, 100);
        }
      } else {
        // No color theme saved, use default color
        const defaultColor = '#A53860';
        document.body.classList.add('theme-color');
        document.documentElement.style.setProperty('--color-theme-bg', defaultColor);
        localStorage.setItem('colorThemeBackground', defaultColor);
        console.log('Default color theme applied:', defaultColor);
        
        // Force theme-manager to update the color theme visibility
        if (window.colorTheme && window.colorTheme.updateColorThemeVisibility) {
          setTimeout(() => {
            window.colorTheme.updateColorThemeVisibility();
          }, 100);
        }
      }
      return;
    }
    
    // If selecting custom theme, apply it using theme-manager.js
    if (themeName === 'custom') {
      const customTheme = localStorage.getItem('customThemeBackground');
      
      if (customTheme) {
        // We have a saved custom theme
        document.body.classList.add('theme-custom');
        document.body.style.backgroundImage = `url(${customTheme})`;
      } else {
        // No custom theme saved, fallback to light theme
        document.body.classList.add('theme-light');
        console.error('No custom theme found, falling back to light theme');
        
        // Update the selector to match actual theme
        const themeSelector = document.getElementById('theme-selector');
        if (themeSelector) themeSelector.value = 'light';
        
        // Save the fallback theme
        localStorage.setItem('siteTheme', 'light');
        
        // Show error message
        const toast = document.getElementById('toast');
        if (toast) {
          toast.textContent = 'No custom theme found. Please upload an image in settings.';
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 3000);
        }
        
        return;
      }
    } else if (themeName === 'yourname') {
      // For yourname theme, preload the image first
      const preloadImg = new Image();
      preloadImg.src = 'images/Theme/kimi-no-na-wa.jpg';
      
      // Show loading indicator
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = 'Loading theme...';
        toast.classList.add('show');
      }
      
      // When image is loaded, apply the theme
      preloadImg.onload = function() {
        document.body.classList.add('theme-yourname');
        // Hide loading indicator
        if (toast) toast.classList.remove('show');
        console.log('Nature theme image loaded successfully');
      };
      
      // If image fails to load, fall back to light theme and show error
      preloadImg.onerror = function() {
        document.body.classList.add('theme-light');
        console.error('Failed to load yourname theme image');
        // Show error message
        if (toast) {
          toast.textContent = 'Failed to load theme image. Using light theme instead.';
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 3000);
        }
        // Update the selector to match actual theme
        const themeSelector = document.getElementById('theme-selector');
        if (themeSelector) themeSelector.value = 'light';
        // Save the fallback theme
        localStorage.setItem('siteTheme', 'light');
      };
    } else if (themeName === 'rain') {
      // For rain theme, preload the image first
      const preloadImg = new Image();
      preloadImg.src = 'images/Theme/man-in-rain.gif';
      
      // Show loading indicator
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = 'Loading theme...';
        toast.classList.add('show');
      }
      
      // When image is loaded, apply the theme
      preloadImg.onload = function() {
        document.body.classList.add('theme-rain');
        // Hide loading indicator
        if (toast) toast.classList.remove('show');
        console.log('Rain theme image loaded successfully');
      };
      
      // If image fails to load, fall back to light theme and show error
      preloadImg.onerror = function() {
        document.body.classList.add('theme-light');
        console.error('Failed to load rain theme image');
        // Show error message
        if (toast) {
          toast.textContent = 'Failed to load theme image. Using light theme instead.';
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 3000);
        }
        // Update the selector to match actual theme
        const themeSelector = document.getElementById('theme-selector');
        if (themeSelector) themeSelector.value = 'light';
        // Save the fallback theme
        localStorage.setItem('siteTheme', 'light');
      };
    } else {
      // For other themes, apply directly
      switch(themeName) {
        case 'dark':
          document.body.classList.add('theme-dark');
          break;
        case 'light':
        default:
          document.body.classList.add('theme-light');
      }
    }
    
    // Store theme preference - using a common key without page prefix for site-wide theme
    localStorage.setItem('siteTheme', themeName);
  }
  
  // Save theme settings
  function saveThemeSettings() {
    const themeSelector = document.getElementById('theme-selector');
    if (themeSelector) {
      const selectedTheme = themeSelector.value;
      localStorage.setItem('siteTheme', selectedTheme); // Use site-wide key
      
      // If it's a color theme, also trigger the color theme save
      if (selectedTheme === 'color' && window.colorTheme) {
        // Get the currently selected color and apply it
        const savedColor = localStorage.getItem('colorThemeBackground');
        if (savedColor && window.colorTheme.applyColorTheme) {
          window.colorTheme.applyColorTheme(savedColor);
        }
      } else {
        applyTheme(selectedTheme);
      }
    }
  }
  
  // Load theme settings
  function loadThemeSettings() {
    const themeSelector = document.getElementById('theme-selector');
    if (themeSelector) {
      // Use site-wide theme setting
      const savedTheme = localStorage.getItem('siteTheme') || 'light';
      themeSelector.value = savedTheme;
      
      // Apply the theme immediately
      applyTheme(savedTheme);
    }
  }
  
  // Save Auto Start Settings - Now using shared keys for both pages
  function saveAutoStartSettings() {
    const autoBreakToggle = document.getElementById('auto-break-toggle');
    const autoPomoToggle = document.getElementById('auto-pomodoro-toggle');
    
    // Use shared keys for auto-start settings (no page-specific prefix)
    if (autoBreakToggle) {
      localStorage.setItem('autoBreak', autoBreakToggle.checked);
    }
    
    if (autoPomoToggle) {
      localStorage.setItem('autoPomodoro', autoPomoToggle.checked);
    }
    
    console.log("Auto-start settings saved (shared):", {
      autoBreak: autoBreakToggle ? autoBreakToggle.checked : "N/A",
      autoPomodoro: autoPomoToggle ? autoPomoToggle.checked : "N/A"
    });
  }
  
  // Load Auto Start Settings from shared keys
  function loadAutoStartSettings() {
    const autoBreakToggle = document.getElementById('auto-break-toggle');
    const autoPomoToggle = document.getElementById('auto-pomodoro-toggle');
    
    // Load from shared keys
    if (autoBreakToggle) {
      autoBreakToggle.checked = localStorage.getItem('autoBreak') !== 'false';
    }
    
    if (autoPomoToggle) {
      autoPomoToggle.checked = localStorage.getItem('autoPomodoro') !== 'false';
    }
    
    console.log("Auto-start settings loaded (shared):", {
      autoBreak: autoBreakToggle ? autoBreakToggle.checked : "N/A",
      autoPomodoro: autoPomoToggle ? autoPomoToggle.checked : "N/A"
    });
  }
  
  
  function saveLockedInModeSettings() {
    const lockedInModeToggle = document.getElementById('lockedin-mode-toggle');
    if (lockedInModeToggle) {
      localStorage.setItem('lockedInModeEnabled', lockedInModeToggle.checked);
      localStorage.setItem('focusModeEnabled', lockedInModeToggle.checked); // For backward compatibility
      
      // Update Locked In Mode if the global object exists
      if (window.lockedInMode && typeof window.lockedInMode.setEnabled === 'function') {
        window.lockedInMode.setEnabled(lockedInModeToggle.checked);
      }
    }
  }
  
  function loadLockedInModeSettings() {
    const lockedInModeToggle = document.getElementById('lockedin-mode-toggle');
    if (lockedInModeToggle) {
      // First check new key, then fall back to old key
      const newKey = localStorage.getItem('lockedInModeEnabled');
      const oldKey = localStorage.getItem('focusModeEnabled');
      
      // Default to true unless explicitly set to 'false'
      const enabled = (newKey !== null) ? newKey !== 'false' : 
                     (oldKey !== null) ? oldKey !== 'false' : true;
      
      lockedInModeToggle.checked = enabled;
    }
  }
  
  // Burn-Up Tracker Settings
  function saveBurnupTrackerSettings() {
    const burnupTrackerToggle = document.getElementById('burnup-tracker-toggle');
    if (burnupTrackerToggle) {
      localStorage.setItem('burnupTrackerEnabled', burnupTrackerToggle.checked);
      
      // Update Burn-Up Tracker if the global function exists
      if (window.setBurnupTrackerEnabled && typeof window.setBurnupTrackerEnabled === 'function') {
        window.setBurnupTrackerEnabled(burnupTrackerToggle.checked);
      }
    }
  }
  
  function loadBurnupTrackerSettings() {
    const burnupTrackerToggle = document.getElementById('burnup-tracker-toggle');
    if (burnupTrackerToggle) {
      // Default to true unless explicitly set to 'false'
      const enabled = localStorage.getItem('burnupTrackerEnabled') !== 'false';
      burnupTrackerToggle.checked = enabled;
    }
  }

  // Replace saveFocusModeSettings with saveLockedInModeSettings
  function saveFocusModeSettings() {
    saveLockedInModeSettings();
  }
  
  // Replace loadFocusModeSettings with loadLockedInModeSettings
  function loadFocusModeSettings() {
    loadLockedInModeSettings();
  }
  
  // Force timer reset to update with new settings
  function forceTimerReset() {
    if (isReversePage) {
      // For reverse timer, update MAX_TIME and reset timer display
      if (typeof window.resetTimer === 'function') {
        window.resetTimer();
      }
    } else {
      // For pomodoro timer, we need to:
      // 1. Update all timer variables
      // 2. Reset the current timer based on active mode
      // 3. Force DOM update of the timer
      
      // Update main timer variables from localStorage
      window.pomodoroTime = parseInt(localStorage.getItem('pomodoroTime')) || 25;
      window.shortBreakTime = parseInt(localStorage.getItem('shortBreakTime')) || 5;
      window.longBreakTime = parseInt(localStorage.getItem('longBreakTime')) || 15;
      window.maxSessions = parseInt(localStorage.getItem('sessionsCount')) || 4;
      
      // Force reset timer based on current mode
      if (window.currentMode === 'pomodoro') {
        window.currentSeconds = window.pomodoroTime * 60;
      } else if (window.currentMode === 'shortBreak') {
        window.currentSeconds = window.shortBreakTime * 60;
      } else if (window.currentMode === 'longBreak') {
        window.currentSeconds = window.longBreakTime * 60;
      }
      
      // Update initialSeconds to match currentSeconds
      window.initialSeconds = window.currentSeconds;
      
      // Reset the timer display
      if (typeof window.resetTimer === 'function') {
        window.resetTimer();
      } else {
        // Direct timer update as fallback
        const timer = document.getElementById('timer');
        if (timer) {
          const minutes = Math.floor(window.currentSeconds / 60);
          const seconds = window.currentSeconds % 60;
          timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        // Reset progress bar
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
          progressBar.style.width = '0%';
        }
      }
      
      // Update session dots
      if (typeof window.updateSessionDots === 'function') {
        window.updateSessionDots();
      }
    }
  }
  
  // Add this new function to directly update the timer display
  function forceTimerUpdate() {
    if (isReversePage) {
      // For reverse timer
      const newMaxTime = parseInt(localStorage.getItem('reverseMaxTime')) || 60;
      document.querySelector('.max-time').textContent = `Max Time: ${Math.floor(newMaxTime / 60).toString().padStart(2, '0')}:${(newMaxTime % 60).toString().padStart(2, '0')}:00`;
      
      // Update timer if not running and in reverse mode
      if (!window.isRunning && window.currentMode === 'reverse') {
        window.currentSeconds = 0;
        document.getElementById('timer').textContent = '00:00';
      }
    } else {
      // For pomodoro timer
      const timerDisplay = document.getElementById('timer');
      if (!timerDisplay) return;
      
      // Get the latest settings
      const pomodoroTime = parseInt(localStorage.getItem('pomodoroTime')) || 25;
      const shortBreakTime = parseInt(localStorage.getItem('shortBreakTime')) || 5;
      const longBreakTime = parseInt(localStorage.getItem('longBreakTime')) || 15;
      
      // If not running, update the display immediately based on current mode
      if (!window.isRunning) {
        let minutes, seconds;
        
        if (window.currentMode === 'pomodoro') {
          minutes = pomodoroTime;
          seconds = 0;
          window.currentSeconds = minutes * 60 + seconds;
          window.initialSeconds = window.currentSeconds;
        } else if (window.currentMode === 'shortBreak') {
          minutes = shortBreakTime;
          seconds = 0;
          window.currentSeconds = minutes * 60 + seconds;
          window.initialSeconds = window.currentSeconds;
        } else if (window.currentMode === 'longBreak') {
          minutes = longBreakTime;
          seconds = 0;
          window.currentSeconds = minutes * 60 + seconds;
          window.initialSeconds = window.currentSeconds;
        }
        
        // Directly update timer display without relying on other functions
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Reset progress bar
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) progressBar.style.width = '0%';
      }
      
      // Also update the document title
      const currentTimeDisplay = timerDisplay.textContent;
      let modeName = '';
      
      switch(window.currentMode) {
        case 'pomodoro': modeName = 'Pomodoro'; break;
        case 'shortBreak': modeName = 'Short Break'; break;
        case 'longBreak': modeName = 'Long Break'; break;
      }
      
      document.title = `${currentTimeDisplay} - ${modeName}`;
    }
  }
  
  // Function to apply settings to the active timer
  function applySettingsToTimer() {
    if (isReversePage) {
      applyReverseSettings();
    } else {
      applyPomodoroSettings();
    }
  }
  
  // Apply Pomodoro settings to the active timer
  function applyPomodoroSettings() {
    // Get values from localStorage
    const newPomodoroTime = parseInt(localStorage.getItem('pomodoroTime')) || 25;
    const newShortBreakTime = parseInt(localStorage.getItem('shortBreakTime')) || 5;
    const newLongBreakTime = parseInt(localStorage.getItem('longBreakTime')) || 15;
    const newSessionsCount = parseInt(localStorage.getItem('sessionsCount')) || 4;
    
    console.log("Applying new settings:", 
      {pomodoro: newPomodoroTime, short: newShortBreakTime, long: newLongBreakTime, sessions: newSessionsCount});
    
    // Update global variables - these must be updated for any mode
    window.pomodoroTime = newPomodoroTime;
    window.shortBreakTime = newShortBreakTime;
    window.longBreakTime = newLongBreakTime;
    window.maxSessions = newSessionsCount;
    
    // Always update the current timer based on active mode
    if (!window.isRunning) {
      if (window.currentMode === 'pomodoro') {
        window.currentSeconds = newPomodoroTime * 60;
      } else if (window.currentMode === 'shortBreak') {
        window.currentSeconds = newShortBreakTime * 60;
      } else if (window.currentMode === 'longBreak') {
        window.currentSeconds = newLongBreakTime * 60;
      }
      window.initialSeconds = window.currentSeconds;
    }
    
    // We'll rely on forceTimerReset() to update the display
  }
  
  // Apply Reverse timer settings to the active timer
  function applyReverseSettings() {
    // Get max time from localStorage
    const newMaxTime = parseInt(localStorage.getItem('reverseMaxTime')) || 60;
    
    // Update global MAX_TIME variable
    if (typeof window.MAX_TIME !== 'undefined') {
      window.MAX_TIME = newMaxTime * 60;
      
      // Update max time display
      const maxTimeElement = document.querySelector('.max-time');
      if (maxTimeElement) {
        const hours = Math.floor(newMaxTime / 60);
        const mins = newMaxTime % 60;
        maxTimeElement.textContent = `Max Time: ${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
      }
      
      // If in reverse mode and timer is not running, update the timer
      if (window.currentMode === 'reverse' && window.isRunning !== true) {
        window.initialSeconds = window.MAX_TIME;
        
        // Update the timer display
        if (typeof window.updateDisplay === 'function') {
          window.updateDisplay();
        }
      }
    }
    
    // Override the calculateBreakTime function to use our custom settings
    if (typeof window.calculateBreakTime === 'function') {
      window.calculateBreakTime = function(workedSeconds) {
        const breakLogicMode = localStorage.getItem('breakLogicMode') || 'default';
        const maxWorkMinutes = parseInt(localStorage.getItem('reverseMaxTime')) || 60;
        const workedMinutes = Math.floor(workedSeconds / 60);

        const break1 = parseInt(localStorage.getItem('reverseBreak1')) || 2;
        const break2 = parseInt(localStorage.getItem('reverseBreak2')) || 5;
        const break3 = parseInt(localStorage.getItem('reverseBreak3')) || 10;
        const break4 = parseInt(localStorage.getItem('reverseBreak4')) || 15;
        const break5 = parseInt(localStorage.getItem('reverseBreak5')) || 30;

        if (workedMinutes === 0) return 0;

        if (breakLogicMode === 'dynamic') {
            const percentage = workedMinutes / maxWorkMinutes;
            if (percentage <= 0.2) return break1;
            if (percentage <= 0.4) return break2;
            if (percentage <= 0.6) return break3;
            if (percentage <= 0.8) return break4;
            return break5;
        } else { // 'default' mode
            if (workedMinutes < 5) return 0;
            if (workedMinutes <= 20) return break1;
            if (workedMinutes <= 30) return break2;
            if (workedMinutes <= 45) return break3;
            if (workedMinutes <= 55) return break4;
            return break5;
        }
      };
    }
  }
    // Load settings based on the current page
  function loadSettings() {
    // Determine which page we're on
    const isReversePage = window.location.pathname.includes('reverse');
    currentPage = isReversePage ? 'reverse' : 'classic';
    isSettingsOpen = false;
    
    // Load appropriate settings
    if (currentPage === 'classic') {
      loadPomodoroSettings();
    } else {
      loadReverseSettings();
    }
      loadSoundSettings();
    loadAutoStartSettings();
    loadThemeSettings();
    loadLockedInModeSettings();
    loadBurnupTrackerSettings();
    
    // Initialize tracker design selector
    initializeTrackerDesignSelector();
    
    // Setup locked in mode toggle if needed
    if (window.lockedInMode && typeof window.lockedInMode.setup === 'function') {
      window.lockedInMode.setup();
    }
  }
  
  // Save Pomodoro settings
  function savePomodoroSettings() {
    const pomodoroTime = document.getElementById('pomodoro-time').value;
    const shortBreakTime = document.getElementById('short-break-time').value;
    const longBreakTime = document.getElementById('long-break-time').value;
    const sessionsCount = document.getElementById('sessions-count').value;
    
    // Save to localStorage
    localStorage.setItem('pomodoroTime', pomodoroTime);
    localStorage.setItem('shortBreakTime', shortBreakTime);
    localStorage.setItem('longBreakTime', longBreakTime);
    localStorage.setItem('sessionsCount', sessionsCount);
    
    console.log("Saved settings:", 
      {pomodoro: pomodoroTime, short: shortBreakTime, long: longBreakTime, sessions: sessionsCount});
  }
  
  // Load Pomodoro settings
  function loadPomodoroSettings() {
    const pomodoroTimeInput = document.getElementById('pomodoro-time');
    const shortBreakTimeInput = document.getElementById('short-break-time');
    const longBreakTimeInput = document.getElementById('long-break-time');
    const sessionsCountInput = document.getElementById('sessions-count');
    
    if (!pomodoroTimeInput) return;
    
    // Get from localStorage or set defaults
    pomodoroTimeInput.value = localStorage.getItem('pomodoroTime') || 25;
    shortBreakTimeInput.value = localStorage.getItem('shortBreakTime') || 5;
    longBreakTimeInput.value = localStorage.getItem('longBreakTime') || 15;
    sessionsCountInput.value = localStorage.getItem('sessionsCount') || 4;
  }
  
  // Save Reverse timer settings
  function saveReverseSettings() {
    const breakLogicMode = document.getElementById('break-logic-mode-selector').value;
    const maxTime = document.getElementById('max-time').value;
    const break1Time = document.getElementById('break1-time').value;
    const break2Time = document.getElementById('break2-time').value;
    const break3Time = document.getElementById('break3-time').value;
    const break4Time = document.getElementById('break4-time').value;
    const break5Time = document.getElementById('break5-time').value;
    
    // Save to localStorage
    localStorage.setItem('breakLogicMode', breakLogicMode);
    localStorage.setItem('reverseMaxTime', maxTime);
    localStorage.setItem('reverseBreak1', break1Time);
    localStorage.setItem('reverseBreak2', break2Time);
    localStorage.setItem('reverseBreak3', break3Time);
    localStorage.setItem('reverseBreak4', break4Time);
    localStorage.setItem('reverseBreak5', break5Time);
  }
  
  // Load Reverse timer settings
  function loadReverseSettings() {
    const breakLogicModeSelector = document.getElementById('break-logic-mode-selector');
    const maxTimeInput = document.getElementById('max-time');
    const break1Input = document.getElementById('break1-time');
    const break2Input = document.getElementById('break2-time');
    const break3Input = document.getElementById('break3-time');
    const break4Input = document.getElementById('break4-time');
    const break5Input = document.getElementById('break5-time');
    
    // Get from localStorage or set defaults
    if (breakLogicModeSelector) {
        breakLogicModeSelector.value = localStorage.getItem('breakLogicMode') || 'default';
    }
    maxTimeInput.value = localStorage.getItem('reverseMaxTime') || 60;
    break1Input.value = localStorage.getItem('reverseBreak1') || 2;
    break2Input.value = localStorage.getItem('reverseBreak2') || 5;
    break3Input.value = localStorage.getItem('reverseBreak3') || 10;
    break4Input.value = localStorage.getItem('reverseBreak4') || 15;
    break5Input.value = localStorage.getItem('reverseBreak5') || 30;

    if (isReversePage) {
        toggleBreakModeUI();
    }
  }
  
  // Save sound settings - Now using separate keys for Pomodoro and Break
  function saveSoundSettings() {
    const pomodoroVolumeSlider = document.getElementById('pomodoro-volume-slider');
    const breakVolumeSlider = document.getElementById('break-volume-slider');
    const soundEffectsToggle = document.getElementById('sound-effects-toggle');
    const alarmToggle = document.getElementById('alarm-toggle');
    const pomodoroSoundSelector = document.getElementById('pomodoro-sound-selector');
    const breakSoundSelector = document.getElementById('break-sound-selector');
    const timerSoundSelector = document.getElementById('timer-sound-selector');
    const timerSoundVolumeSlider = document.getElementById('timer-sound-volume-slider');
    
    if (!soundEffectsToggle || !alarmToggle) {
        console.error("Sound setting elements not found");
        return;
    }
    
    // Save separate volume settings
    if (pomodoroVolumeSlider) {
        localStorage.setItem('pomodoroVolume', pomodoroVolumeSlider.value);
    }
    if (breakVolumeSlider) {
        localStorage.setItem('breakVolume', breakVolumeSlider.value);
    }
    
    // Save shared settings
    localStorage.setItem('soundEffects', soundEffectsToggle.checked);
    localStorage.setItem('alarm', alarmToggle.checked);
    
    // Save the selected alarm sounds
    if (pomodoroSoundSelector) {
        localStorage.setItem('pomodoroSound', pomodoroSoundSelector.value);
    }
    if (breakSoundSelector) {
        localStorage.setItem('breakSound', breakSoundSelector.value);
    }
    
    // Save timer sound settings
    if (timerSoundSelector) {
        localStorage.setItem('timerSound', timerSoundSelector.value);
    }
    
    if (timerSoundVolumeSlider) {
        localStorage.setItem('timerSoundVolume', timerSoundVolumeSlider.value);
    }
    
    console.log(`Sound settings saved (separate):`, {
        pomodoroVolume: pomodoroVolumeSlider ? pomodoroVolumeSlider.value : 'N/A',
        breakVolume: breakVolumeSlider ? breakVolumeSlider.value : 'N/A',
        soundEffects: soundEffectsToggle.checked,
        alarm: alarmToggle.checked,
        pomodoroSound: pomodoroSoundSelector ? pomodoroSoundSelector.value : 'N/A',
        breakSound: breakSoundSelector ? breakSoundSelector.value : 'N/A',
        timerSound: timerSoundSelector ? timerSoundSelector.value : 'N/A',
        timerSoundVolume: timerSoundVolumeSlider ? timerSoundVolumeSlider.value : 'N/A'
    });
    
    // Update sound volumes immediately 
    if (typeof window.updateSoundVolumes === 'function') {
        window.updateSoundVolumes();
    } else {
        updateSoundsDirectly();
    }
    
    // Update timer sounds
    if (typeof window.updateTimerSound === 'function') {
        window.updateTimerSound();
    }
}

// Load sound settings - Now using separate keys for Pomodoro and Break
function loadSoundSettings() {
    // Migration: Handle old shared settings
    const oldVolume = localStorage.getItem('volume');
    const oldAlarmSound = localStorage.getItem('alarmSound');
    
    if (oldVolume && !localStorage.getItem('pomodoroVolume')) {
        localStorage.setItem('pomodoroVolume', oldVolume);
        localStorage.setItem('breakVolume', oldVolume);
        console.log('Settings: Migrated old volume settings to separate Pomodoro/Break volumes');
    } else if (!localStorage.getItem('pomodoroVolume')) {
        // Set defaults if no migration is needed
        localStorage.setItem('pomodoroVolume', '60');
        localStorage.setItem('breakVolume', '60');
        console.log('Settings: Set default Pomodoro/Break volumes to 60%');
    }
    
    if (oldAlarmSound && !localStorage.getItem('pomodoroSound')) {
        localStorage.setItem('pomodoroSound', oldAlarmSound);
        localStorage.setItem('breakSound', 'bell.mp3'); // Default different sound for breaks
        console.log('Settings: Migrated old alarm sound to separate Pomodoro/Break sounds');
    } else if (!localStorage.getItem('pomodoroSound')) {
        // Set defaults if no migration is needed
        localStorage.setItem('pomodoroSound', 'bell.mp3');
        localStorage.setItem('breakSound', 'bell.mp3');
        console.log('Settings: Set default Pomodoro/Break sounds to bell.mp3');
    }

    const pomodoroVolumeSlider = document.getElementById('pomodoro-volume-slider');
    const pomodoroVolumePercentage = document.getElementById('pomodoro-volume-percentage');
    const breakVolumeSlider = document.getElementById('break-volume-slider');
    const breakVolumePercentage = document.getElementById('break-volume-percentage');
    const soundEffectsToggle = document.getElementById('sound-effects-toggle');
    const alarmToggle = document.getElementById('alarm-toggle');
    const pomodoroSoundSelector = document.getElementById('pomodoro-sound-selector');
    const breakSoundSelector = document.getElementById('break-sound-selector');
    const timerSoundSelector = document.getElementById('timer-sound-selector');
    const timerSoundVolumeSlider = document.getElementById('timer-sound-volume-slider');
    const timerSoundVolumePercentage = document.getElementById('timer-sound-volume-percentage');
    
    if (!soundEffectsToggle || !alarmToggle) {
        return;
    }
    
    // Load separate volume settings
    if (pomodoroVolumeSlider) {
        pomodoroVolumeSlider.value = localStorage.getItem('pomodoroVolume') || 60;
    }
    if (pomodoroVolumePercentage) {
        pomodoroVolumePercentage.textContent = (localStorage.getItem('pomodoroVolume') || 60) + '%';
    }
    if (breakVolumeSlider) {
        breakVolumeSlider.value = localStorage.getItem('breakVolume') || 60;
    }
    if (breakVolumePercentage) {
        breakVolumePercentage.textContent = (localStorage.getItem('breakVolume') || 60) + '%';
    }
    
    // Explicitly convert to boolean to handle 'false' string correctly
    const soundEffectsEnabled = localStorage.getItem('soundEffects') !== 'false';
    const alarmEnabled = localStorage.getItem('alarm') !== 'false';
    
    soundEffectsToggle.checked = soundEffectsEnabled;
    alarmToggle.checked = alarmEnabled;
    
    // Set the selected alarm sounds
    if (pomodoroSoundSelector) {
        const savedPomodoroSound = localStorage.getItem('pomodoroSound') || 'bell.mp3';
        pomodoroSoundSelector.value = savedPomodoroSound;
    }
    if (breakSoundSelector) {
        const savedBreakSound = localStorage.getItem('breakSound') || 'bell.mp3';
        breakSoundSelector.value = savedBreakSound;
    }
    
    // Load timer sound settings
    if (timerSoundSelector) {
        const savedTimerSound = localStorage.getItem('timerSound') || 'none';
        timerSoundSelector.value = savedTimerSound;
    }
    
    if (timerSoundVolumeSlider) {
        timerSoundVolumeSlider.value = localStorage.getItem('timerSoundVolume') || 60;
    }
    
    if (timerSoundVolumePercentage) {
        timerSoundVolumePercentage.textContent = (localStorage.getItem('timerSoundVolume') || 60) + '%';
    }
    
    console.log(`Sound settings loaded (separate):`, {
        pomodoroVolume: pomodoroVolumeSlider ? pomodoroVolumeSlider.value : 'N/A',
        breakVolume: breakVolumeSlider ? breakVolumeSlider.value : 'N/A',
        soundEffects: soundEffectsEnabled,
        alarm: alarmEnabled,
        pomodoroSound: pomodoroSoundSelector ? pomodoroSoundSelector.value : 'N/A',
        breakSound: breakSoundSelector ? breakSoundSelector.value : 'N/A',
        timerSound: timerSoundSelector ? timerSoundSelector.value : 'N/A',
        timerSoundVolume: timerSoundVolumeSlider ? timerSoundVolumeSlider.value : 'N/A'
    });
    
    // Apply settings immediately after loading
    if (typeof window.updateSoundVolumes === 'function') {
        window.updateSoundVolumes();
    } else {
        updateSoundsDirectly();
    }
    
    // Also update percentage display if it exists
    const volumePercentage = document.getElementById('volume-percentage');
    if (volumePercentage && volumeSlider) {
        volumePercentage.textContent = volumeSlider.value + '%';
    }
}

// Update sounds directly - Now using separate keys for Pomodoro and Break
function updateSoundsDirectly() {
    if (typeof window.sounds !== 'undefined') {
        // Use separate keys for sound settings
        const pomodoroVolume = parseInt(localStorage.getItem('pomodoroVolume') || 60) / 100;
        const breakVolume = parseInt(localStorage.getItem('breakVolume') || 60) / 100;
        const soundsEnabled = localStorage.getItem('soundEffects') !== 'false';
        const alarmEnabled = localStorage.getItem('alarm') !== 'false';
        
        // Update alarm sound files
        const selectedPomodoroSound = localStorage.getItem('pomodoroSound') || 'alarm.mp3';
        const selectedBreakSound = localStorage.getItem('breakSound') || 'bell.mp3';
        
        // Use the new update functions if available
        if (typeof window.updatePomodoroAlarmSound === 'function') {
            window.updatePomodoroAlarmSound(selectedPomodoroSound);
        }
        if (typeof window.updateBreakAlarmSound === 'function') {
            window.updateBreakAlarmSound(selectedBreakSound);
        }
        
        // Update UI sound volumes (use Pomodoro volume for UI sounds)
        if (window.sounds.click) window.sounds.click.volume = soundsEnabled ? pomodoroVolume * 0.5 : 0;
        if (window.sounds.start) window.sounds.start.volume = soundsEnabled ? pomodoroVolume * 0.6 : 0;
        if (window.sounds.pause) window.sounds.pause.volume = soundsEnabled ? pomodoroVolume * 0.5 : 0;
        
        // Update alarm volumes
        if (window.sounds.pomodoroComplete) window.sounds.pomodoroComplete.volume = alarmEnabled ? pomodoroVolume : 0;
        if (window.sounds.breakComplete) window.sounds.breakComplete.volume = alarmEnabled ? breakVolume : 0;
        
        // Update timer sound if the function exists
        if (typeof window.updateTimerSound === 'function') {
            window.updateTimerSound();
        }
        
        console.log(`Sounds updated directly with separate settings:`, {
            pomodoroSound: selectedPomodoroSound,
            breakSound: selectedBreakSound,
            pomodoroVolume: pomodoroVolume,
            breakVolume: breakVolume,
            clickVolume: window.sounds.click ? window.sounds.click.volume : "N/A",
            startVolume: window.sounds.start ? window.sounds.start.volume : "N/A",
            pauseVolume: window.sounds.pause ? window.sounds.pause.volume : "N/A",
            pomodoroCompleteVolume: window.sounds.pomodoroComplete ? window.sounds.pomodoroComplete.volume : "N/A",
            breakCompleteVolume: window.sounds.breakComplete ? window.sounds.breakComplete.volume : "N/A"
        });
    }
}

// Test sound function
function testSound(type) {
  // Stop any currently playing test sound
  stopTestSound();
  
  // Check toggle states for validation
  const soundEffectsToggle = document.getElementById('sound-effects-toggle');
  const alarmToggle = document.getElementById('alarm-toggle');
  
  // If it's the complete/alarm sound, use the selected sound
  if (type === 'complete') {
    // For backward compatibility, test the pomodoro sound
    type = 'pomodoroComplete';
  }
  
  // Handle UI Click Sound test
  if (type === 'click') {
    // Check if Timer Sound Effects (UI Click Sound) is enabled
    if (soundEffectsToggle && !soundEffectsToggle.checked) {
      showToast('The Timer Sound Effects is off');
      return;
    }
    
    // Use the existing playSound function if available
    if (typeof window.playSound === 'function') {
      window.playSound(type);
    }
    return;
  }
  
  if (type === 'pomodoroComplete') {
    // Check if End of Session Alarm is enabled
    if (alarmToggle && !alarmToggle.checked) {
      showToast('The End of Session Alarm is off');
      return;
    }
    
    const pomodoroSoundSelector = document.getElementById('pomodoro-sound-selector');
    const selectedSound = pomodoroSoundSelector ? pomodoroSoundSelector.value : 'alarm.mp3';
    
    // Apply the current volume settings
    const pomodoroVolumeSlider = document.getElementById('pomodoro-volume-slider');
    const volume = pomodoroVolumeSlider ? parseInt(pomodoroVolumeSlider.value) / 100 : 0.6;
    
    // Create and play the test sound
    currentTestSound = new Audio('audio/Alert Sounds/' + selectedSound);
    currentTestSound.volume = volume;
    
    if (volume > 0) {
      currentTestSound.play().catch(err => console.log('Audio playback disabled'));
    }
  } else if (type === 'breakComplete') {
    // Check if End of Session Alarm is enabled
    if (alarmToggle && !alarmToggle.checked) {
      showToast('The End of Session Alarm is off');
      return;
    }
    
    const breakSoundSelector = document.getElementById('break-sound-selector');
    const selectedSound = breakSoundSelector ? breakSoundSelector.value : 'bell.mp3';
    
    // Apply the current volume settings
    const breakVolumeSlider = document.getElementById('break-volume-slider');
    const volume = breakVolumeSlider ? parseInt(breakVolumeSlider.value) / 100 : 0.6;
    
    // Create and play the test sound
    currentTestSound = new Audio('audio/Alert Sounds/' + selectedSound);
    currentTestSound.volume = volume;
    
    if (volume > 0) {
      currentTestSound.play().catch(err => console.log('Audio playback disabled'));
    }
  } else if (type === 'timer') {
    // For testing timer sounds
    const timerSoundSelector = document.getElementById('timer-sound-selector');
    const selectedSound = timerSoundSelector ? timerSoundSelector.value : 'none';
    
    if (selectedSound === 'none') {
      showToast('No timer sound selected');
      return;
    }
    
    // Apply the current timer sound volume settings
    const timerSoundVolumeSlider = document.getElementById('timer-sound-volume-slider');
    const volume = timerSoundVolumeSlider ? parseInt(timerSoundVolumeSlider.value) / 100 : 0.6;
    
    // Create and play the test sound based on selected timer sound
    let soundPath;
    // If whitenoise/brownnoise files are removed, fall back to ticking sound
    switch (selectedSound) {
      case 'ticking':
        soundPath = 'audio/Timer Sounds/WallClockTicking.mp3';
        break;
      case 'whitenoise':
      case 'brownnoise':
        // fallback: use the ticking sound if these files are not present
        soundPath = 'audio/Timer Sounds/WallClockTicking.mp3';
        break;
      default:
        return;
    }
    
    currentTimerSound = new Audio(soundPath);
    currentTimerSound.volume = volume;
    currentTimerSound.loop = true;
    
    if (volume > 0) {
      currentTimerSound.play().catch(err => {
        console.log('Audio playback disabled:', err);
        showToast('Failed to play audio. Check browser permissions.');
      });
      
      // Stop the timer sound after a few seconds
      timerSoundChangeTimeout = setTimeout(() => {
        if (currentTimerSound) {
          currentTimerSound.pause();
          currentTimerSound.currentTime = 0;
          currentTimerSound = null;
        }
      }, 5000);
    }
  } else if (typeof window.playSound === 'function') {
    window.playSound(type);
  }
}

// Add these to your settings modal in both HTML files (optional)
// Add these sound test buttons to the sound settings section:
 /*
<div class="settings-row">
  <div class="settings-label">Test Sounds</div>
  <div class="sound-test-buttons">
    <button class="sound-test-btn" id="test-click-sound">UI Sound</button>
    <button class="sound-test-btn" id="test-alarm-sound">Alarm</button>
  </div>
</div>
*/

  // Event listeners for sound test buttons
  document.addEventListener('DOMContentLoaded', function() {
    const clickTestBtn = document.getElementById('test-click-sound');
    const pomodoroTestBtn = document.getElementById('test-pomodoro-sound');
    const breakTestBtn = document.getElementById('test-break-sound');
    const timerSoundTestBtn = document.getElementById('test-timer-sound');
    
    if (clickTestBtn) {
        clickTestBtn.addEventListener('click', function() {
            testSound('click');
        });
    }
    
    if (pomodoroTestBtn) {
        pomodoroTestBtn.addEventListener('click', function() {
            testSound('pomodoroComplete');
        });
    }
    
    if (breakTestBtn) {
        breakTestBtn.addEventListener('click', function() {
            testSound('breakComplete');
        });
    }
    
    if (timerSoundTestBtn) {
        timerSoundTestBtn.addEventListener('click', function() {
            testSound('timer');
        });
    }
    
    // Add event listener for timer sound volume slider
    const timerSoundVolumeSlider = document.getElementById('timer-sound-volume-slider');
    const timerSoundVolumePercentage = document.getElementById('timer-sound-volume-percentage');
    
    if (timerSoundVolumeSlider && timerSoundVolumePercentage) {
        timerSoundVolumeSlider.addEventListener('input', function() {
            timerSoundVolumePercentage.textContent = timerSoundVolumeSlider.value + '%';
            
            // Update the volume in localStorage
            localStorage.setItem('timerSoundVolume', timerSoundVolumeSlider.value);
            
            // Update active timer sound volume if running
            if (typeof window.updateTimerSoundVolume === 'function') {
                window.updateTimerSoundVolume();
            }
            
            // Preview the timer sound change
            if (timerSoundChangeTimeout) {
                clearTimeout(timerSoundChangeTimeout);
            }
            
            timerSoundChangeTimeout = setTimeout(() => {
                // Play a sample of the timer sound
                testSound('timer');
            }, 300);
        });
    }
    
    // Add change listener for timer sound selector
    const timerSoundSelector = document.getElementById('timer-sound-selector');
    if (timerSoundSelector) {
        timerSoundSelector.addEventListener('change', function() {
            const selectedSound = timerSoundSelector.value;
            
            // Save to localStorage
            localStorage.setItem('timerSound', selectedSound);
            
            // Update active timer sound if running
            if (typeof window.updateTimerSound === 'function') {
                window.updateTimerSound();
            }
            
            // Play a sample of the selected timer sound if not none
            if (selectedSound !== 'none') {
                testSound('timer');
            } else {
                // Stop any currently playing timer sound
                if (currentTimerSound) {
                    currentTimerSound.pause();
                    currentTimerSound.currentTime = 0;
                    currentTimerSound = null;
                }
                if (typeof window.stopTimerSound === 'function') {
                    window.stopTimerSound();
                }
            }
        });
    }
});
  
  // Handle increment/decrement buttons
  function setupTimeControls() {
    // Define all control buttons
    const controls = [
      { minus: 'pomodoro-minus-btn', plus: 'pomodoro-plus-btn', input: 'pomodoro-time', min: 1, max: 999 },
      { minus: 'short-break-minus-btn', plus: 'short-break-plus-btn', input: 'short-break-time', min: 1, max: 999 },
      { minus: 'long-break-minus-btn', plus: 'long-break-plus-btn', input: 'long-break-time', min: 5, max: 999 },
      { minus: 'sessions-minus-btn', plus: 'sessions-plus-btn', input: 'sessions-count', min: 1, max: 999 },
      { minus: 'max-time-minus-btn', plus: 'max-time-plus-btn', input: 'max-time', min: 15, max: 360 },
      // Updated all break controls to allow max 360
      { minus: 'break1-minus-btn', plus: 'break1-plus-btn', input: 'break1-time', min: 1, max: 360 },
      { minus: 'break2-minus-btn', plus: 'break2-plus-btn', input: 'break2-time', min: 2, max: 360 },
      { minus: 'break3-minus-btn', plus: 'break3-plus-btn', input: 'break3-time', min: 5, max: 360 },
      { minus: 'break4-minus-btn', plus: 'break4-plus-btn', input: 'break4-time', min: 10, max: 360 },
      { minus: 'break5-minus-btn', plus: 'break5-plus-btn', input: 'break5-time', min: 15, max: 360 },
    ];
    
    // Set up each control if it exists
    controls.forEach(control => {
      const minusBtn = document.getElementById(control.minus);
      const plusBtn = document.getElementById(control.plus);
      const input = document.getElementById(control.input);
      
      if (minusBtn && input) {
        minusBtn.addEventListener('click', () => {
          const currentValue = parseInt(input.value) || control.min;
          input.value = Math.max(control.min, currentValue - 1);
        });
      }
      
      if (plusBtn && input) {
        plusBtn.addEventListener('click', () => {
          const currentValue = parseInt(input.value) || control.min;
          input.value = Math.min(control.max, currentValue + 1);
        });
      }
      
      // Validate inputs directly
      if (input) {
        input.addEventListener('blur', () => {
          const currentValue = parseInt(input.value) || control.min;
          input.value = Math.max(control.min, Math.min(control.max, currentValue));
        });
      }
    });

    if (isReversePage) {
        const breakLogicModeSelector = document.getElementById('break-logic-mode-selector');
        const maxTimeInput = document.getElementById('max-time');

        if (breakLogicModeSelector) {
            breakLogicModeSelector.addEventListener('change', toggleBreakModeUI);
        }
        if (maxTimeInput) {
            maxTimeInput.addEventListener('input', updateBreakTierLabels);
        }
    }
  }
  
  function updateBreakTierLabels() {
    const breakLogicModeSelector = document.getElementById('break-logic-mode-selector');
    if (!breakLogicModeSelector) return;

    const breakLogicMode = breakLogicModeSelector.value;
    const maxTime = parseInt(document.getElementById('max-time').value) || 60;

    const labels = {
        1: document.getElementById('break1-label'),
        2: document.getElementById('break2-label'),
        3: document.getElementById('break3-label'),
        4: document.getElementById('break4-label'),
        5: document.getElementById('break5-label'),
    };

    if (breakLogicMode === 'dynamic') {
        const tier1 = Math.floor(maxTime * 0.2);
        const tier2 = Math.floor(maxTime * 0.4);
        const tier3 = Math.floor(maxTime * 0.6);
        const tier4 = Math.floor(maxTime * 0.8);
        // NOTE:
        // In dynamic mode, break tier scaling becomes inaccurate if maxWorkTime < 15 mins.
        // This can result in invalid ranges like "5–2 mins", so we clamp the minimum to 15.
        if (labels[1]) labels[1].textContent = `Break Time (1-${tier1} mins work)`;
        if (labels[2]) labels[2].textContent = `Break Time (${tier1 + 1}-${tier2} mins work)`;
        if (labels[3]) labels[3].textContent = `Break Time (${tier2 + 1}-${tier3} mins work)`;
        if (labels[4]) labels[4].textContent = `Break Time (${tier3 + 1}-${tier4} mins work)`;
        if (labels[5]) labels[5].textContent = `Break Time (${tier4 + 1}-${maxTime} mins work)`;
    } else { // default
        if (labels[1]) labels[1].textContent = 'Break Time (5-20 mins work)';
        if (labels[2]) labels[2].textContent = 'Break Time (21-30 mins work)';
        if (labels[3]) labels[3].textContent = 'Break Time (31-45 mins work)';
        if (labels[4]) labels[4].textContent = 'Break Time (46-55 mins work)';
        if (labels[5]) labels[5].textContent = 'Break Time (56-60 mins work)';
    }
  }

  function toggleBreakModeUI() {
      const breakLogicModeSelector = document.getElementById('break-logic-mode-selector');
      if (!breakLogicModeSelector) return;

      const breakLogicMode = breakLogicModeSelector.value;
      const maxTimeInput = document.getElementById('max-time');
      const maxTimeMinusBtn = document.getElementById('max-time-minus-btn');
      const maxTimePlusBtn = document.getElementById('max-time-plus-btn');

      // TEMP FIX: Always disable the + and - buttons for Max Work Time
      if (maxTimeMinusBtn) maxTimeMinusBtn.disabled = true;
      if (maxTimePlusBtn) maxTimePlusBtn.disabled = true;

      if (breakLogicMode === 'dynamic') {
          maxTimeInput.disabled = false;
          // Clamp the value to a minimum of 15 in dynamic mode to prevent invalid ranges.
          if (parseInt(maxTimeInput.value) < 15) {
              maxTimeInput.value = 15;
          }
      } else { // default
          maxTimeInput.disabled = true;
          maxTimeInput.value = 60;
      }
      updateBreakTierLabels();
  }
  
  // Show toast notification (use existing one if available)
  function showToast(message) {
    const toastElement = document.getElementById('toast');
    
    if (toastElement) {
      toastElement.textContent = message;
      toastElement.classList.add('show');
      setTimeout(() => toastElement.classList.remove('show'), 3000);
    } else {
      alert(message);
    }
  }
  
  // Add keyboard shortcuts for the settings modal
  document.addEventListener('keydown', function(e) {
    // If settings modal is open (has 'show' class)
    if (settingsModal.classList.contains('show')) {
      // ESC key - close modal
      if (e.key === 'Escape') {
        closeSettings();
      }
      
      // ENTER key - save settings
      if (e.key === 'Enter') {
        // Only trigger save if not in a text input to avoid conflicts
        const activeElement = document.activeElement;
        const isInput = activeElement.tagName === 'INPUT' && 
                      (activeElement.type === 'text' || activeElement.type === 'number');
        
        if (!isInput) {
          e.preventDefault();
          saveSettings();
        }
      }
    }
  });
  
  // Set up event listeners
  if (settingsBtn) {
    settingsBtn.addEventListener('click', openSettings);
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', closeSettings);
  }
  
  // Add event listener for the new close button in footer
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', closeSettings);
  }
  
  if (saveBtn) {
    saveBtn.addEventListener('click', saveSettings);
  }
  
  if (resetBtn) {
    resetBtn.addEventListener('click', resetSettings);
  }
  
  // Close when clicking outside the modal
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      closeSettings();
    }
  });
  
  // Setup tab navigation
  setupTabNavigation();
  
  // Setup time controls
  setupTimeControls();
  
  // Initialize settings on page load
  document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    
    // Apply settings immediately on page load
    setTimeout(() => {
      applySettingsToTimer();
      if (isReversePage && typeof window.updateInfoSection === 'function') {
        window.updateInfoSection();
      }
      forceTimerReset();
    }, 100); // Small delay to ensure all values are initialized
  });
  
  // Add event listeners for separate volume sliders to update percentage display and play test sound
  document.addEventListener('DOMContentLoaded', function() {
    const pomodoroVolumeSlider = document.getElementById('pomodoro-volume-slider');
    const pomodoroVolumePercentage = document.getElementById('pomodoro-volume-percentage');
    const breakVolumeSlider = document.getElementById('break-volume-slider');
    const breakVolumePercentage = document.getElementById('break-volume-percentage');
    
    // Pomodoro Volume Slider
    if (pomodoroVolumeSlider && pomodoroVolumePercentage) {
      pomodoroVolumeSlider.addEventListener('input', function() {
        pomodoroVolumePercentage.textContent = pomodoroVolumeSlider.value + '%';
        
        // Immediately update the volume in localStorage
        localStorage.setItem('pomodoroVolume', pomodoroVolumeSlider.value);
        
        // Clear any pending timeouts to avoid multiple sounds playing
        if (volumeChangeTimeout) {
          clearTimeout(volumeChangeTimeout);
        }
        
        // Stop the current test sound if it exists
        if (currentTestSound) {
          currentTestSound.pause();
          currentTestSound.currentTime = 0;
          currentTestSound = null;
        }
        
        // Set a small timeout to avoid firing too many sounds
        volumeChangeTimeout = setTimeout(function() {
          // Play the selected pomodoro alarm sound
          const pomodoroSoundSelector = document.getElementById('pomodoro-sound-selector');
          const selectedSound = pomodoroSoundSelector ? pomodoroSoundSelector.value : 'alarm.mp3';
          
          // Apply the new volume to sound settings
          updateSoundsDirectly();
          
          // Create and play the test sound
          currentTestSound = new Audio('audio/Alert Sounds/' + selectedSound);
          currentTestSound.volume = parseInt(pomodoroVolumeSlider.value) / 100;
          
          // Only play if volume > 0
          if (currentTestSound.volume > 0) {
            currentTestSound.play().catch(err => console.log('Audio playback disabled'));
          }
        }, 150); // Small delay to debounce
      });
    }
    
    // Break Volume Slider
    if (breakVolumeSlider && breakVolumePercentage) {
      breakVolumeSlider.addEventListener('input', function() {
        breakVolumePercentage.textContent = breakVolumeSlider.value + '%';
        
        // Immediately update the volume in localStorage
        localStorage.setItem('breakVolume', breakVolumeSlider.value);
        
        // Clear any pending timeouts to avoid multiple sounds playing
        if (volumeChangeTimeout) {
          clearTimeout(volumeChangeTimeout);
        }
        
        // Stop the current test sound if it exists
        if (currentTestSound) {
          currentTestSound.pause();
          currentTestSound.currentTime = 0;
          currentTestSound = null;
        }
        
        // Set a small timeout to avoid firing too many sounds
        volumeChangeTimeout = setTimeout(function() {
          // Play the selected break alarm sound
          const breakSoundSelector = document.getElementById('break-sound-selector');
          const selectedSound = breakSoundSelector ? breakSoundSelector.value : 'bell.mp3';
          
          // Apply the new volume to sound settings
          updateSoundsDirectly();
          
          // Create and play the test sound
          currentTestSound = new Audio('audio/Alert Sounds/' + selectedSound);
          currentTestSound.volume = parseInt(breakVolumeSlider.value) / 100;
          
          // Only play if volume > 0
          if (currentTestSound.volume > 0) {
            currentTestSound.play().catch(err => console.log('Audio playback disabled'));
          }
        }, 150); // Small delay to debounce
      });
    }
    
    // Add event listeners for sound selectors
    const pomodoroSoundSelector = document.getElementById('pomodoro-sound-selector');
    const breakSoundSelector = document.getElementById('break-sound-selector');
    
    if (pomodoroSoundSelector) {
      pomodoroSoundSelector.addEventListener('change', function() {
        localStorage.setItem('pomodoroSound', pomodoroSoundSelector.value);
        updateSoundsDirectly();
      });
    }
    
    if (breakSoundSelector) {
      breakSoundSelector.addEventListener('change', function() {
        localStorage.setItem('breakSound', breakSoundSelector.value);
        updateSoundsDirectly();
      });
    }
  });
  
  // ===== BURN-UP TRACKER DESIGN SELECTOR =====
  
  // Initialize tracker design selector
  function initializeTrackerDesignSelector() {
    const trackerDesignRadios = document.querySelectorAll('input[name="tracker-design"]');
    const trackerDesignOptions = document.querySelectorAll('.tracker-design-option');
    const trackerDesignInfoIcon = document.getElementById('tracker-design-info');
    const trackerDesignInfoModal = document.getElementById('tracker-design-info-modal-overlay');
    const trackerDesignInfoClose = document.getElementById('tracker-design-info-modal-close');
    const trackerDesignInfoCloseBtn = document.getElementById('tracker-design-info-close-btn');
    
    // Load saved design preference
    const savedDesign = localStorage.getItem('burnupTrackerDesign') || 'match-theme';
    
    // Apply saved design
    if (trackerDesignRadios.length > 0) {
      trackerDesignRadios.forEach(radio => {
        if (radio.value === savedDesign) {
          radio.checked = true;
          radio.closest('.tracker-design-option').classList.add('selected');
        }
      });
    }
    
    // Apply the design to the actual tracker
    applyTrackerDesign(savedDesign);
    
    // Handle design selection
    trackerDesignRadios.forEach(radio => {
      radio.addEventListener('change', function() {
        if (this.checked) {
          // Update visual selection
          trackerDesignOptions.forEach(option => {
            option.classList.remove('selected');
          });
          this.closest('.tracker-design-option').classList.add('selected');
          
          // Save preference
          localStorage.setItem('burnupTrackerDesign', this.value);
          
          // Apply the design immediately
          applyTrackerDesign(this.value);
          
          // Also update any existing trackers on the page
          updateAllTrackers(this.value);
        }
      });
    });
    
    // Handle clicking on option containers
    trackerDesignOptions.forEach(option => {
      option.addEventListener('click', function(e) {
        // Don't trigger if clicking on the radio button itself
        if (e.target.type === 'radio') return;
        
        const radio = this.querySelector('input[type="radio"]');
        if (radio && !radio.checked) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change'));
        }
      });
    });
    
    // Handle info modal
    if (trackerDesignInfoIcon && trackerDesignInfoModal) {
      trackerDesignInfoIcon.addEventListener('click', function() {
        trackerDesignInfoModal.style.display = 'flex';
      });
    }
    
    if (trackerDesignInfoClose && trackerDesignInfoModal) {
      trackerDesignInfoClose.addEventListener('click', function() {
        trackerDesignInfoModal.style.display = 'none';
      });
    }
    
    if (trackerDesignInfoCloseBtn && trackerDesignInfoModal) {
      trackerDesignInfoCloseBtn.addEventListener('click', function() {
        trackerDesignInfoModal.style.display = 'none';
      });
    }
    
    // Close modal when clicking outside
    if (trackerDesignInfoModal) {
      trackerDesignInfoModal.addEventListener('click', function(e) {
        if (e.target === this) {
          this.style.display = 'none';
        }
      });
    }
    
    // Apply keyboard accessibility
    trackerDesignRadios.forEach(radio => {
      radio.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.checked = true;
          this.dispatchEvent(new Event('change'));
        }
      });
    });
  }
  
  // Apply tracker design styles to a specific tracker
  function applyTrackerDesign(designType, trackerElement = null) {
    const burnupTrackers = trackerElement ? [trackerElement] : document.querySelectorAll('.burnup-tracker');
    
    if (burnupTrackers.length === 0) return;
    
    burnupTrackers.forEach(tracker => {
      // Remove existing design classes
      tracker.classList.remove(
        'tracker-design-match-theme',
        'tracker-design-use-dark-style', 
        'tracker-design-use-kimi-style'
      );
      
      // Add new design class based on the design type
      switch(designType) {
        case 'match-theme':
          // Uses default adaptive styling - no additional class needed
          tracker.classList.add('tracker-design-match-theme');
          break;
        case 'use-dark-style':
          tracker.classList.add('tracker-design-use-dark-style');
          break;
        case 'use-kimi-style':
          tracker.classList.add('tracker-design-use-kimi-style');
          break;
        default:
          tracker.classList.add('tracker-design-match-theme');
          break;
      }
      
      // Store current design for persistence
      tracker.setAttribute('data-design', designType);
    });
  }
  
  // Update all trackers on the page with the selected design
  function updateAllTrackers(designType) {
    const allTrackers = document.querySelectorAll('.burnup-tracker');
    allTrackers.forEach(tracker => {
      applyTrackerDesign(designType, tracker);
    });
  }
  
  // Function to get current tracker design
  function getCurrentTrackerDesign() {
    return localStorage.getItem('burnupTrackerDesign') || 'match-theme';
  }
  
  // Apply design to newly created trackers
  function applyDesignToNewTracker(trackerElement) {
    const currentDesign = getCurrentTrackerDesign();
    applyTrackerDesign(currentDesign, trackerElement);
  }
  
  // Export function for use in other modules
  window.trackerDesignManager = {
    applyDesign: applyTrackerDesign,
    getCurrentDesign: getCurrentTrackerDesign,
    initialize: initializeTrackerDesignSelector,
    updateAll: updateAllTrackers,
    applyToNew: applyDesignToNewTracker
  };
  // Initialize site theme immediately on page load before DOM is fully loaded
  (function initializeSiteTheme() {
    const savedTheme = localStorage.getItem('siteTheme') || 'light';
    if (savedTheme === 'yourname') {
      // For yourname theme, we'll do immediate basic styling for smoother experience
      document.body.classList.add('theme-yourname');
      // Then fully load with the preload mechanism once JS is parsed
      setTimeout(() => applyTheme(savedTheme), 10);
    } else {
      applyTheme(savedTheme);
    }
  })();

  // Initialize tracker design immediately on page load
  (function initializeTrackerDesignOnLoad() {
    const savedDesign = localStorage.getItem('burnupTrackerDesign') || 'match-theme';
    // Wait a bit for the DOM to be ready
    setTimeout(() => {
      applyTrackerDesign(savedDesign);
    }, 50);
  })();
})();