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
  
  // Open settings modal
  function openSettings() {
    settingsModal.classList.add('show');
    loadSettings();
    
    // Ensure the first tab is active
    if (navItems.length > 0) {
      activateTab(navItems[0]);
    }
  }
  
  // Close settings modal
  function closeSettings() {
    settingsModal.classList.remove('show');
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
  function activateTab(tabItem) {
    // Remove active class from all navigation items
    navItems.forEach(item => {
      item.classList.remove('active');
    });
    
    // Add active class to clicked item
    tabItem.classList.add('active');
    
    // Hide all sections
    const sections = document.querySelectorAll('.settings-section');
    sections.forEach(section => {
      section.classList.remove('active');
    });
    
    // Show the corresponding section
    const sectionId = tabItem.getAttribute('data-section');
    const activeSection = document.getElementById(sectionId + '-section');
    if (activeSection) {
      activeSection.classList.add('active');
    }
  }
  
  // Save settings and apply them immediately
  function saveSettings() {
    if (isReversePage) {
      saveReverseSettings();
    } else {
      savePomodoroSettings();
    }
    
    // Save sound settings for both modes
    saveSoundSettings();
    
    // Save theme settings
    saveThemeSettings();
    
    // Apply settings immediately to update the timer
    applySettingsToTimer();
    
    // Force an immediate timer reset to apply new settings
    forceTimerReset();
    
    closeSettings();
    showToast('Settings saved successfully!');
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
        localStorage.setItem('autoBreak', 'true');
        localStorage.setItem('autoPomodoro', 'true');
      } else {
        // Reset Reverse Timer settings
        localStorage.setItem('reverseMaxTime', '60');
        localStorage.setItem('reverseBreak1', '2');
        localStorage.setItem('reverseBreak2', '5');
        localStorage.setItem('reverseBreak3', '10');
        localStorage.setItem('reverseBreak4', '15');
        localStorage.setItem('reverseBreak5', '30');
        localStorage.setItem('reverseAutoBreak', 'true');
      }
      
      // Reset sound settings for both pages
      const prefix = isReversePage ? 'reverse_' : 'classic_';
      localStorage.setItem(prefix + 'volume', '60');
      localStorage.setItem(prefix + 'soundEffects', 'true');
      localStorage.setItem(prefix + 'alarm', 'true');
      
      // Reset theme to site-wide default
      localStorage.setItem('siteTheme', 'default');
      
      // Reload settings into form
      loadSettings();
      
      // Apply theme immediately
      applyTheme('default');
      
      // Update theme selector
      const themeSelector = document.getElementById('theme-selector');
      if (themeSelector) {
        themeSelector.value = 'default';
      }
      
      // Update sound settings visually
      const volumeSlider = document.getElementById('volume-slider');
      const volumePercentage = document.getElementById('volume-percentage');
      const soundEffectsToggle = document.getElementById('sound-effects-toggle');
      const alarmToggle = document.getElementById('alarm-toggle');
      
      if (volumeSlider) volumeSlider.value = 60;
      if (volumePercentage) volumePercentage.textContent = '60%';
      if (soundEffectsToggle) soundEffectsToggle.checked = true;
      if (alarmToggle) alarmToggle.checked = true;
      
      // Update auto-start settings visually
      const autoBreakToggle = document.getElementById('auto-break-toggle');
      const autoPomoToggle = document.getElementById('auto-pomodoro-toggle');
      
      if (autoBreakToggle) autoBreakToggle.checked = true;
      if (autoPomoToggle && !isReversePage) autoPomoToggle.checked = true;
      
      // Apply defaults to the timer
      applySettingsToTimer();
      forceTimerReset();
      
      // Update sound volumes
      updateSoundsDirectly();
      
      showToast('Settings reset to defaults!');
    }
  }
  
  // Add this function to apply the selected theme
  function applyTheme(themeName) {
    // Remove any previous theme classes from body
    document.body.classList.remove('theme-default', 'theme-dark', 'theme-light', 'theme-nature');
    
    // Apply selected theme
    switch(themeName) {
      case 'dark':
        document.body.classList.add('theme-dark');
        break;
      case 'nature':
        document.body.classList.add('theme-nature');
        break;
      case 'light':
      default:
        document.body.classList.add('theme-light');
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
      applyTheme(selectedTheme);
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
        const minutes = Math.floor(workedSeconds / 60);
        
        if (minutes <= 4) return 0;
        
        const break1 = parseInt(localStorage.getItem('reverseBreak1')) || 2;
        const break2 = parseInt(localStorage.getItem('reverseBreak2')) || 5;
        const break3 = parseInt(localStorage.getItem('reverseBreak3')) || 10;
        const break4 = parseInt(localStorage.getItem('reverseBreak4')) || 15;
        const break5 = parseInt(localStorage.getItem('reverseBreak5')) || 30;
        
        if (minutes <= 20) return break1;
        if (minutes <= 30) return break2;
        if (minutes <= 45) return break3;
        if (minutes <= 55) return break4;
        return break5;
      };
    }
  }
  
  // Load settings based on the current page
  function loadSettings() {
    if (isReversePage) {
      loadReverseSettings();
    } else {
      loadPomodoroSettings();
    }
    
    // Load sound settings for both modes
    loadSoundSettings();
    
    // Load theme settings
    loadThemeSettings();
  }
  
  // Save Pomodoro settings
  function savePomodoroSettings() {
    const pomodoroTime = document.getElementById('pomodoro-time').value;
    const shortBreakTime = document.getElementById('short-break-time').value;
    const longBreakTime = document.getElementById('long-break-time').value;
    const sessionsCount = document.getElementById('sessions-count').value;
    const autoBreak = document.getElementById('auto-break-toggle').checked;
    const autoPomodoro = document.getElementById('auto-pomodoro-toggle').checked;
    
    // Save to localStorage
    localStorage.setItem('pomodoroTime', pomodoroTime);
    localStorage.setItem('shortBreakTime', shortBreakTime);
    localStorage.setItem('longBreakTime', longBreakTime);
    localStorage.setItem('sessionsCount', sessionsCount);
    localStorage.setItem('autoBreak', autoBreak);
    localStorage.setItem('autoPomodoro', autoPomodoro);
    
    console.log("Saved settings:", 
      {pomodoro: pomodoroTime, short: shortBreakTime, long: longBreakTime, sessions: sessionsCount});
  }
  
  // Load Pomodoro settings
  function loadPomodoroSettings() {
    const pomodoroTimeInput = document.getElementById('pomodoro-time');
    const shortBreakTimeInput = document.getElementById('short-break-time');
    const longBreakTimeInput = document.getElementById('long-break-time');
    const sessionsCountInput = document.getElementById('sessions-count');
    const autoBreakToggle = document.getElementById('auto-break-toggle');
    const autoPomoToggle = document.getElementById('auto-pomodoro-toggle');
    
    if (!pomodoroTimeInput) return;
    
    // Get from localStorage or set defaults
    pomodoroTimeInput.value = localStorage.getItem('pomodoroTime') || 25;
    shortBreakTimeInput.value = localStorage.getItem('shortBreakTime') || 5;
    longBreakTimeInput.value = localStorage.getItem('longBreakTime') || 15;
    sessionsCountInput.value = localStorage.getItem('sessionsCount') || 4;
    
    if (autoBreakToggle) autoBreakToggle.checked = localStorage.getItem('autoBreak') !== 'false';
    if (autoPomoToggle) autoPomoToggle.checked = localStorage.getItem('autoPomodoro') !== 'false';
  }
  
  // Save Reverse timer settings
  function saveReverseSettings() {
    const maxTime = document.getElementById('max-time').value;
    const break1Time = document.getElementById('break1-time').value;
    const break2Time = document.getElementById('break2-time').value;
    const break3Time = document.getElementById('break3-time').value;
    const break4Time = document.getElementById('break4-time').value;
    const break5Time = document.getElementById('break5-time').value;
    const autoBreak = document.getElementById('auto-break-toggle').checked;
    
    // Save to localStorage
    localStorage.setItem('reverseMaxTime', maxTime);
    localStorage.setItem('reverseBreak1', break1Time);
    localStorage.setItem('reverseBreak2', break2Time);
    localStorage.setItem('reverseBreak3', break3Time);
    localStorage.setItem('reverseBreak4', break4Time);
    localStorage.setItem('reverseBreak5', break5Time);
    localStorage.setItem('reverseAutoBreak', autoBreak);
  }
  
  // Load Reverse timer settings
  function loadReverseSettings() {
    const maxTimeInput = document.getElementById('max-time');
    const break1Input = document.getElementById('break1-time');
    const break2Input = document.getElementById('break2-time');
    const break3Input = document.getElementById('break3-time');
    const break4Input = document.getElementById('break4-time');
    const break5Input = document.getElementById('break5-time');
    const autoBreakToggle = document.getElementById('auto-break-toggle');
    
    // Get from localStorage or set defaults
    maxTimeInput.value = localStorage.getItem('reverseMaxTime') || 60;
    break1Input.value = localStorage.getItem('reverseBreak1') || 2;
    break2Input.value = localStorage.getItem('reverseBreak2') || 5;
    break3Input.value = localStorage.getItem('reverseBreak3') || 10;
    break4Input.value = localStorage.getItem('reverseBreak4') || 15;
    break5Input.value = localStorage.getItem('reverseBreak5') || 30;
    autoBreakToggle.checked = localStorage.getItem('reverseAutoBreak') !== 'false';
  }
  
  // Save sound settings
  function saveSoundSettings() {
    const volumeSlider = document.getElementById('volume-slider');
    const soundEffectsToggle = document.getElementById('sound-effects-toggle');
    const alarmToggle = document.getElementById('alarm-toggle');
    
    if (!volumeSlider || !soundEffectsToggle || !alarmToggle) {
        console.error("Sound setting elements not found");
        return;
    }
    
    // Add page-specific prefix to sound settings
    const prefix = isReversePage ? 'reverse_' : 'classic_';
    
    localStorage.setItem(prefix + 'volume', volumeSlider.value);
    localStorage.setItem(prefix + 'soundEffects', soundEffectsToggle.checked);
    localStorage.setItem(prefix + 'alarm', alarmToggle.checked);
    
    console.log(`Sound settings saved for ${prefix}:`, {
        volume: volumeSlider.value,
        soundEffects: soundEffectsToggle.checked,
        alarm: alarmToggle.checked
    });
    
    // Update sound volumes immediately 
    if (typeof window.updateSoundVolumes === 'function') {
        window.updateSoundVolumes();
    } else {
        updateSoundsDirectly();
    }
}

// Load sound settings
function loadSoundSettings() {
    const volumeSlider = document.getElementById('volume-slider');
    const soundEffectsToggle = document.getElementById('sound-effects-toggle');
    const alarmToggle = document.getElementById('alarm-toggle');
    
    if (!volumeSlider || !soundEffectsToggle || !alarmToggle) {
        return;
    }
    
    // Use page-specific prefix for sound settings
    const prefix = isReversePage ? 'reverse_' : 'classic_';
    
    // Get from localStorage or set defaults
    volumeSlider.value = localStorage.getItem(prefix + 'volume') || 60;
    
    // Explicitly convert to boolean to handle 'false' string correctly
    const soundEffectsEnabled = localStorage.getItem(prefix + 'soundEffects') !== 'false';
    const alarmEnabled = localStorage.getItem(prefix + 'alarm') !== 'false';
    
    soundEffectsToggle.checked = soundEffectsEnabled;
    alarmToggle.checked = alarmEnabled;
    
    console.log(`Sound settings loaded for ${prefix}:`, {
        volume: volumeSlider.value,
        soundEffects: soundEffectsEnabled,
        alarm: alarmEnabled
    });
    
    // Apply settings immediately after loading
    if (typeof window.updateSoundVolumes === 'function') {
        window.updateSoundVolumes();
    } else {
        updateSoundsDirectly();
    }
}

// Update sounds directly
function updateSoundsDirectly() {
    if (typeof window.sounds !== 'undefined') {
        const prefix = isReversePage ? 'reverse_' : 'classic_';
        const volume = parseInt(localStorage.getItem(prefix + 'volume') || 60) / 100;
        const soundsEnabled = localStorage.getItem(prefix + 'soundEffects') !== 'false';
        const alarmEnabled = localStorage.getItem(prefix + 'alarm') !== 'false';
        
        if (window.sounds.click) window.sounds.click.volume = soundsEnabled ? volume * 0.5 : 0;
        if (window.sounds.start) window.sounds.start.volume = soundsEnabled ? volume * 0.6 : 0;
        if (window.sounds.pause) window.sounds.pause.volume = soundsEnabled ? volume * 0.5 : 0;
        if (window.sounds.complete) window.sounds.complete.volume = alarmEnabled ? volume : 0;
        
        console.log(`Sounds updated directly for ${prefix}:`, {
            clickVolume: window.sounds.click ? window.sounds.click.volume : "N/A",
            startVolume: window.sounds.start ? window.sounds.start.volume : "N/A",
            pauseVolume: window.sounds.pause ? window.sounds.pause.volume : "N/A",
            completeVolume: window.sounds.complete ? window.sounds.complete.volume : "N/A"
        });
    }
}

// Test sound function
function testSound(type) {
    if (typeof window.playSound === 'function') {
        window.playSound(type);
    } else if (typeof window.sounds !== 'undefined') {
        const sound = window.sounds[type];
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(err => console.log('Audio playback disabled'));
        }
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

  // Event listeners for sound test buttons (if added)
  document.addEventListener('DOMContentLoaded', function() {
    const clickTestBtn = document.getElementById('test-click-sound');
    const alarmTestBtn = document.getElementById('test-alarm-sound');
    
    if (clickTestBtn) {
        clickTestBtn.addEventListener('click', function() {
            testSound('click');
        });
    }
    
    if (alarmTestBtn) {
        alarmTestBtn.addEventListener('click', function() {
            testSound('complete');
        });
    }
});
  
  // Handle increment/decrement buttons
  function setupTimeControls() {
    // Define all control buttons
    const controls = [
      { minus: 'pomodoro-minus-btn', plus: 'pomodoro-plus-btn', input: 'pomodoro-time', min: 1, max: 60 },
      { minus: 'short-break-minus-btn', plus: 'short-break-plus-btn', input: 'short-break-time', min: 1, max: 30 },
      { minus: 'long-break-minus-btn', plus: 'long-break-plus-btn', input: 'long-break-time', min: 5, max: 60 },
      { minus: 'sessions-minus-btn', plus: 'sessions-plus-btn', input: 'sessions-count', min: 1, max: 10 },
      { minus: 'max-time-minus-btn', plus: 'max-time-plus-btn', input: 'max-time', min: 15, max: 120 },
      { minus: 'break1-minus-btn', plus: 'break1-plus-btn', input: 'break1-time', min: 1, max: 10 },
      { minus: 'break2-minus-btn', plus: 'break2-plus-btn', input: 'break2-time', min: 2, max: 15 },
      { minus: 'break3-minus-btn', plus: 'break3-plus-btn', input: 'break3-time', min: 5, max: 20 },
      { minus: 'break4-minus-btn', plus: 'break4-plus-btn', input: 'break4-time', min: 10, max: 25 },
      { minus: 'break5-minus-btn', plus: 'break5-plus-btn', input: 'break5-time', min: 15, max: 45 },
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
      forceTimerReset();
    }, 100); // Small delay to ensure all values are initialized
  });
  
  // Add event listener for volume slider to update percentage display
  document.addEventListener('DOMContentLoaded', function() {
    const volumeSlider = document.getElementById('volume-slider');
    const volumePercentage = document.getElementById('volume-percentage');
    
    if (volumeSlider && volumePercentage) {
      // Update percentage display when slider value changes
      volumeSlider.addEventListener('input', function() {
        volumePercentage.textContent = volumeSlider.value + '%';
      });
      
      // Initial setup of percentage display
      volumeSlider.addEventListener('DOMContentLoaded', function() {
        const prefix = isReversePage ? 'reverse_' : 'classic_';
        const savedVolume = localStorage.getItem(prefix + 'volume') || 60;
        volumePercentage.textContent = savedVolume + '%';
      });
      
      // Set initial value on load
      const prefix = isReversePage ? 'reverse_' : 'classic_';
      const savedVolume = localStorage.getItem(prefix + 'volume') || 60;
      volumePercentage.textContent = savedVolume + '%';
    }
  });
  
  // Update the loadSoundSettings function to also update the percentage display
  function loadSoundSettings() {
    const volumeSlider = document.getElementById('volume-slider');
    const soundEffectsToggle = document.getElementById('sound-effects-toggle');
    const alarmToggle = document.getElementById('alarm-toggle');
    
    if (!volumeSlider || !soundEffectsToggle || !alarmToggle) {
        return;
    }
    
    // Use page-specific prefix for sound settings
    const prefix = isReversePage ? 'reverse_' : 'classic_';
    
    // Get from localStorage or set defaults
    volumeSlider.value = localStorage.getItem(prefix + 'volume') || 60;
    
    // Explicitly convert to boolean to handle 'false' string correctly
    const soundEffectsEnabled = localStorage.getItem(prefix + 'soundEffects') !== 'false';
    const alarmEnabled = localStorage.getItem(prefix + 'alarm') !== 'false';
    
    soundEffectsToggle.checked = soundEffectsEnabled;
    alarmToggle.checked = alarmEnabled;
    
    console.log(`Sound settings loaded for ${prefix}:`, {
        volume: volumeSlider.value,
        soundEffects: soundEffectsEnabled,
        alarm: alarmEnabled
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

// Initialize site theme immediately on page load before DOM is fully loaded
(function initializeSiteTheme() {
  const savedTheme = localStorage.getItem('siteTheme') || 'light';
  applyTheme(savedTheme);
})();
})();
