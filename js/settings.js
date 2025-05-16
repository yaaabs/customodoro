// Settings handling
(function() {
  // DOM Elements
  const settingsBtn = document.getElementById('settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  const closeBtn = document.getElementById('settings-close');
  const saveBtn = document.getElementById('save-settings-btn');
  
  // Check if we're on the reverse timer page
  const isReversePage = document.body.classList.contains('reverse-mode');
  
  // Open settings modal
  function openSettings() {
    settingsModal.classList.add('show');
    loadSettings();
  }
  
  // Close settings modal
  function closeSettings() {
    settingsModal.classList.remove('show');
  }
  
  // Save settings
  function saveSettings() {
    if (isReversePage) {
      saveReverseSettings();
    } else {
      savePomodoroSettings();
    }
    
    // Save sound settings for both modes
    saveSoundSettings();
    
    closeSettings();
    showToast('Settings saved successfully!');
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
    
    // Update the timer if it exists
    if (typeof pomodoroTimer !== 'undefined' && typeof pomodoroTimer.updateSettings === 'function') {
      pomodoroTimer.updateSettings({
        pomodoroTime: parseInt(pomodoroTime),
        shortBreakTime: parseInt(shortBreakTime),
        longBreakTime: parseInt(longBreakTime),
        sessionsCount: parseInt(sessionsCount),
        autoBreak: autoBreak,
        autoPomodoro: autoPomodoro
      });
    } else {
      // Direct update for compatibility with existing code
      if (typeof pomodoroTime !== 'undefined') {
        window.pomodoroTime = parseInt(pomodoroTime);
      }
      if (typeof shortBreakTime !== 'undefined') {
        window.shortBreakTime = parseInt(shortBreakTime);
      }
      if (typeof longBreakTime !== 'undefined') {
        window.longBreakTime = parseInt(longBreakTime);
      }
      if (typeof maxSessions !== 'undefined') {
        window.maxSessions = parseInt(sessionsCount);
      }
    }
  }
  
  // Load Pomodoro settings
  function loadPomodoroSettings() {
    const pomodoroTimeInput = document.getElementById('pomodoro-time');
    const shortBreakTimeInput = document.getElementById('short-break-time');
    const longBreakTimeInput = document.getElementById('long-break-time');
    const sessionsCountInput = document.getElementById('sessions-count');
    const autoBreakToggle = document.getElementById('auto-break-toggle');
    const autoPomoToggle = document.getElementById('auto-pomodoro-toggle');
    
    // Get from localStorage or set defaults
    pomodoroTimeInput.value = localStorage.getItem('pomodoroTime') || 25;
    shortBreakTimeInput.value = localStorage.getItem('shortBreakTime') || 5;
    longBreakTimeInput.value = localStorage.getItem('longBreakTime') || 15;
    sessionsCountInput.value = localStorage.getItem('sessionsCount') || 4;
    autoBreakToggle.checked = localStorage.getItem('autoBreak') !== 'false';
    autoPomoToggle.checked = localStorage.getItem('autoPomodoro') !== 'false';
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
    
    // Update max time display
    const maxTimeElement = document.querySelector('.max-time');
    if (maxTimeElement) {
      const hours = Math.floor(maxTime / 60);
      const mins = maxTime % 60;
      maxTimeElement.textContent = `Max Time: ${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
    }
    
    // Update MAX_TIME constant if it exists
    if (typeof MAX_TIME !== 'undefined') {
      window.MAX_TIME = parseInt(maxTime) * 60;
    }
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
    
    localStorage.setItem('volume', volumeSlider.value);
    localStorage.setItem('soundEffects', soundEffectsToggle.checked);
    localStorage.setItem('alarm', alarmToggle.checked);
    
    // Update sound volumes
    if (typeof sounds !== 'undefined') {
      const volume = volumeSlider.value / 100;
      const soundsEnabled = soundEffectsToggle.checked;
      const alarmEnabled = alarmToggle.checked;
      
      if (sounds.click) sounds.click.volume = soundsEnabled ? volume * 0.5 : 0;
      if (sounds.start) sounds.start.volume = soundsEnabled ? volume * 0.6 : 0;
      if (sounds.pause) sounds.pause.volume = soundsEnabled ? volume * 0.5 : 0;
      if (sounds.complete) sounds.complete.volume = alarmEnabled ? volume : 0;
    }
  }
  
  // Load sound settings
  function loadSoundSettings() {
    const volumeSlider = document.getElementById('volume-slider');
    const soundEffectsToggle = document.getElementById('sound-effects-toggle');
    const alarmToggle = document.getElementById('alarm-toggle');
    
    // Get from localStorage or set defaults
    volumeSlider.value = localStorage.getItem('volume') || 60;
    soundEffectsToggle.checked = localStorage.getItem('soundEffects') !== 'false';
    alarmToggle.checked = localStorage.getItem('alarm') !== 'false';
  }
  
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
  
  // Set up event listeners
  if (settingsBtn) {
    settingsBtn.addEventListener('click', openSettings);
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', closeSettings);
  }
  
  if (saveBtn) {
    saveBtn.addEventListener('click', saveSettings);
  }
  
  // Close when clicking outside the modal
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      closeSettings();
    }
  });
  
  // Setup time controls
  setupTimeControls();
  
  // Initialize settings on page load
  document.addEventListener('DOMContentLoaded', loadSettings);
})();
