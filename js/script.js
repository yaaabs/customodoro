// DOM Elements
const timerElement = document.getElementById('timer');
const progressBar = document.getElementById('progress-bar');
const startButton = document.getElementById('start-btn');
const resetButton = document.getElementById('reset-btn');
const sessionDots = document.getElementById('session-dots');
const sessionText = document.getElementById('session-text');
const body = document.body;

// Burn-Up Tracker elements
const burnupTracker = document.getElementById('burnup-tracker');
const burnupProgressBar = document.getElementById('burnup-progress-bar');
const burnupSpentTime = document.getElementById('burnup-spent-time');
const burnupPlannedTime = document.getElementById('burnup-planned-time');
const burnupPercentage = document.getElementById('burnup-percentage');

// Tab elements
const pomodoroTab = document.getElementById('pomodoro-tab');
const shortBreakTab = document.getElementById('short-break-tab');
const longBreakTab = document.getElementById('long-break-tab');

// Task elements
const taskInput = document.getElementById('task-input');
const addTaskBtn = document.getElementById('add-task-btn');
const taskList = document.getElementById('task-list');

// Timer variables - Load from localStorage or use defaults
let pomodoroTime = parseInt(localStorage.getItem('pomodoroTime')) || 25;
let shortBreakTime = parseInt(localStorage.getItem('shortBreakTime')) || 5;
let longBreakTime = parseInt(localStorage.getItem('longBreakTime')) || 15;
let maxSessions = parseInt(localStorage.getItem('sessionsCount')) || 4;
let currentMode = 'pomodoro';
let currentSeconds = pomodoroTime * 60;
let initialSeconds = currentSeconds;
let timerInterval = null;
let isRunning = false;
let currentSession = 1;
let completedPomodoros = 0;
let hasUnsavedTasks = false;
let hasUnfinishedTasks = false;

// Burn-Up Tracker variables
let isBurnupTrackerEnabled = localStorage.getItem('burnupTrackerEnabled') !== 'false'; // Default to true
let burnupStartTime = 0;
let burnupElapsedTime = 0;

// Update audio variables
const sounds = {
  click: new Audio('audio/SFX/start.wav'),
  start: new Audio('audio/SFX/start.wav'),
  pause: new Audio('audio/SFX/pause.wav'),
  complete: new Audio('audio/Alert Sounds/alarm.mp3')
};

// Set custom volumes for each sound
sounds.click.volume = 0.5;  // Quieter click
sounds.start.volume = 0.6;  // Medium volume start
sounds.pause.volume = 0.5;  // Quieter pause
sounds.complete.volume = 1.0;  // Full volume for alarm

// Add timer sound variables and functionality
const timerSounds = {
  ticking: new Audio('audio/Timer Sounds/WallClockTicking.mp3'),
  whitenoise: new Audio('audio/Timer Sounds/UnderWaterWhiteNoise.mp3'),
  brownnoise: new Audio('audio/Timer Sounds/SoftBrownNoise.mp3')
};

let currentTimerSound = null;

// Initialize sound settings from localStorage
function initializeSoundSettings() {
    // Get settings from shared localStorage keys
    const volume = localStorage.getItem('volume') ? 
                  parseInt(localStorage.getItem('volume')) / 100 : 0.6;
    
    // Explicitly check for 'false' string
    const soundEffectsEnabled = localStorage.getItem('soundEffects') !== 'false';
    const alarmEnabled = localStorage.getItem('alarm') !== 'false';
    
    // Get selected alarm sound or use default
    const selectedAlarmSound = localStorage.getItem('alarmSound') || 'alarm.mp3';
    sounds.complete.src = 'audio/Alert Sounds/' + selectedAlarmSound;
    
    // Set initial volumes
    sounds.click.volume = soundEffectsEnabled ? volume * 0.5 : 0;
    sounds.start.volume = soundEffectsEnabled ? volume * 0.6 : 0;
    sounds.pause.volume = soundEffectsEnabled ? volume * 0.5 : 0;
    sounds.complete.volume = alarmEnabled ? volume : 0;
    
    console.log(`Sound settings initialized for Classic Timer:`, { 
        volume: volume, 
        soundEffectsEnabled: soundEffectsEnabled, 
        alarmEnabled: alarmEnabled,
        alarmSound: selectedAlarmSound
    });
}

// NEW: Function to specifically update the alarm sound
function updateAlarmSound(soundFileName) {
    // Create a new Audio object for the alarm instead of just changing the src
    sounds.complete = new Audio('audio/Alert Sounds/' + soundFileName);
    
    // Re-apply volume settings
    const volume = parseInt(localStorage.getItem('volume') || 60) / 100;
    const alarmEnabled = localStorage.getItem('alarm') !== 'false';
    sounds.complete.volume = alarmEnabled ? volume : 0;
    
    console.log(`Updated alarm sound to: ${soundFileName}`);
}

// Update sound volumes based on settings
function updateSoundVolumes() {
    // Get settings from shared localStorage keys
    const volume = localStorage.getItem('volume') ? 
                  parseInt(localStorage.getItem('volume')) / 100 : 0.6;
    
    // Explicitly check for 'false' string to handle resets properly
    const soundEffectsEnabled = localStorage.getItem('soundEffects') !== 'false';
    const alarmEnabled = localStorage.getItem('alarm') !== 'false';
    
    // Update the alarm sound file
    const selectedAlarmSound = localStorage.getItem('alarmSound') || 'alarm.mp3';
    sounds.complete.src = 'audio/Alert Sounds/' + selectedAlarmSound;
    
    // Set volumes based on settings
    sounds.click.volume = soundEffectsEnabled ? volume * 0.5 : 0;
    sounds.start.volume = soundEffectsEnabled ? volume * 0.6 : 0;
    sounds.pause.volume = soundEffectsEnabled ? volume * 0.5 : 0;
    sounds.complete.volume = alarmEnabled ? volume : 0;
    
    console.log("Classic Timer: Sound volumes updated:", { 
        volume: volume,
        soundEffectsEnabled: soundEffectsEnabled,
        alarmEnabled: alarmEnabled,
        alarmSound: selectedAlarmSound
    });
}

// Play sound with error handling and respect settings
function playSound(soundName) {
    const sound = sounds[soundName];
    if (!sound) return;
    
    // Check if the sound should be played based on settings using shared keys
    if (soundName === 'complete') {
        // For alarm sound
        if (localStorage.getItem('alarm') === 'false') {
            console.log('Alarm sounds disabled in settings');
            return;
        }
    } else {
        // For all other UI sounds
        if (localStorage.getItem('soundEffects') === 'false') {
            console.log('Sound effects disabled in settings');
            return;
        }
    }
    
    try {
        // Get volume from shared settings
        const volume = parseInt(localStorage.getItem('volume') || 60) / 100;
        
        // For click sounds that might overlap, clone the audio
        if (soundName === 'click') {
            const clone = sound.cloneNode();
            clone.volume = volume * 0.5;
            clone.play().catch(err => console.log('Audio playback disabled'));
        } else if (soundName === 'complete') {
          // Make sure we're using the latest selected alarm sound
          const selectedAlarmSound = localStorage.getItem('alarmSound') || 'alarm.mp3';
          if (sound.src.indexOf(selectedAlarmSound) === -1) {
            sound.src = 'audio/Alert Sounds/' + selectedAlarmSound;
          }
          sound.volume = volume;
          sound.currentTime = 0;
          sound.play().catch(err => console.log('Audio playback disabled'));
        } else {
          // For other sounds
          sound.volume = volume * 0.6;
          sound.currentTime = 0;
          sound.play().catch(err => console.log('Audio playback disabled'));
        }
    } catch (error) {
        console.error('Error playing sound:', error);
    }
}

// Expose the updateAlarmSound function for settings.js
window.updateAlarmSound = updateAlarmSound;

// Initialize sound settings on startup
initializeSoundSettings();

// Play sound with error handling and respect settings
function playSound(soundName) {
    const sound = sounds[soundName];
    if (!sound) return;
    
    // Check if the sound should be played based on settings using shared keys
    if (soundName === 'complete') {
        // For alarm sound
        if (localStorage.getItem('alarm') === 'false') {
            console.log('Alarm sounds disabled in settings');
            return;
        }
    } else {
        // For all other UI sounds
        if (localStorage.getItem('soundEffects') === 'false') {
            console.log('Sound effects disabled in settings');
            return;
        }
    }
    
    try {
        // Get volume from shared settings
        const volume = parseInt(localStorage.getItem('volume') || 60) / 100;
        
        // For click sounds that might overlap, clone the audio
        if (soundName === 'click') {
            const clone = sound.cloneNode();
            clone.volume = volume * 0.5;
            clone.play().catch(err => console.log('Audio playback disabled'));
        } else if (soundName === 'complete') {
          // Make sure we're using the latest selected alarm sound
          const selectedAlarmSound = localStorage.getItem('alarmSound') || 'alarm.mp3';
          if (sound.src.indexOf(selectedAlarmSound) === -1) {
            sound.src = 'audio/Alert Sounds/' + selectedAlarmSound;
          }
          sound.volume = volume;
          sound.currentTime = 0;
          sound.play().catch(err => console.log('Audio playback disabled'));
        } else {
          // For other sounds
          sound.volume = volume * 0.6;
          sound.currentTime = 0;
          sound.play().catch(err => console.log('Audio playback disabled'));
        }
    } catch (error) {
        console.error('Error playing sound:', error);
    }
}

// Update sound volumes based on settings from shared keys
function updateSoundVolumes() {
  // Get settings from shared localStorage keys
  const volume = localStorage.getItem('volume') ? 
                parseInt(localStorage.getItem('volume')) / 100 : 0.6;
  
  // Explicitly check for 'false' string
  const soundEffectsEnabled = localStorage.getItem('soundEffects') !== 'false';
  const alarmEnabled = localStorage.getItem('alarm') !== 'false';
  
  // Update the alarm sound file
  const selectedAlarmSound = localStorage.getItem('alarmSound') || 'alarm.mp3';
  sounds.complete.src = 'audio/Alert Sounds/' + selectedAlarmSound;
  
  // Set volumes based on settings
  sounds.click.volume = soundEffectsEnabled ? volume * 0.5 : 0;
  sounds.start.volume = soundEffectsEnabled ? volume * 0.6 : 0;
  sounds.pause.volume = soundEffectsEnabled ? volume * 0.5 : 0;
  sounds.complete.volume = alarmEnabled ? volume : 0;
  
  console.log("Classic Timer: Sound volumes updated:", { 
      volume: volume,
      soundEffectsEnabled: soundEffectsEnabled,
      alarmEnabled: alarmEnabled,
      alarmSound: selectedAlarmSound
  });
}

// Initialize timer sound settings
function initializeTimerSoundSettings() {
  const timerSoundType = localStorage.getItem('timerSound') || 'none';
  const volume = localStorage.getItem('timerSoundVolume') ? 
                parseInt(localStorage.getItem('timerSoundVolume')) / 100 : 0.6;
  
  // Set up initial volume for all timer sounds
  Object.values(timerSounds).forEach(sound => {
    sound.volume = volume;
    sound.loop = true;
  });
  
  console.log(`Timer sound settings initialized:`, {
    timerSoundType: timerSoundType,
    volume: volume
  });
}

// Function to update timer sound type and volume
function updateTimerSound() {
  // Stop any currently playing timer sound
  stopTimerSound();
  
  // Get current settings
  const timerSoundType = localStorage.getItem('timerSound') || 'none';
  const volume = localStorage.getItem('timerSoundVolume') ? 
                parseInt(localStorage.getItem('timerSoundVolume')) / 100 : 0.6;
  
  // Set volume for all timer sounds
  Object.values(timerSounds).forEach(sound => {
    sound.volume = volume;
  });
  
  // If timer is running, start the appropriate timer sound
  if (isRunning) {
    playTimerSound();
  }
  
  console.log(`Timer sound updated:`, {
    timerSoundType: timerSoundType,
    volume: volume
  });
}

// Function to just update timer sound volume
function updateTimerSoundVolume() {
  const volume = localStorage.getItem('timerSoundVolume') ? 
                parseInt(localStorage.getItem('timerSoundVolume')) / 100 : 0.6;
  
  // Update volume for any currently playing timer sound
  if (currentTimerSound) {
    currentTimerSound.volume = volume;
  }
  
  // Update volume for all timer sounds
  Object.values(timerSounds).forEach(sound => {
    sound.volume = volume;
  });
  
  console.log(`Timer sound volume updated: ${volume}`);
}

// Play the selected timer sound
function playTimerSound() {
  // Get the current timer sound setting
  const timerSoundType = localStorage.getItem('timerSound') || 'none';
  
  // Stop any currently playing sound
  stopTimerSound();
  
  // If none is selected, don't play anything
  if (timerSoundType === 'none') {
    return;
  }
  
  // Get the appropriate sound
  let sound;
  switch(timerSoundType) {
    case 'ticking':
      sound = timerSounds.ticking;
      break;
    case 'whitenoise':
      sound = timerSounds.whitenoise;
      break;
    case 'brownnoise':
      sound = timerSounds.brownnoise;
      break;
    default:
      return;
  }
  
  // Set as current timer sound
  currentTimerSound = sound;
  
  // Make sure volume is set correctly
  const volume = localStorage.getItem('timerSoundVolume') ? 
                parseInt(localStorage.getItem('timerSoundVolume')) / 100 : 0.6;
  currentTimerSound.volume = volume;
  
  // Start playing sound with error handling
  currentTimerSound.currentTime = 0;
  currentTimerSound.play().catch(err => {
    console.log('Timer sound playback error:', err);
    currentTimerSound = null;
  });
  
  console.log(`Timer sound started: ${timerSoundType} at volume ${volume}`);
}

// Stop the currently playing timer sound
function stopTimerSound() {
  if (currentTimerSound) {
    currentTimerSound.pause();
    currentTimerSound.currentTime = 0;
    currentTimerSound = null;
  }
}

// Expose functions to be called from settings.js
window.updateTimerSound = updateTimerSound;
window.updateTimerSoundVolume = updateTimerSoundVolume;
window.stopTimerSound = stopTimerSound;

// Initialize timer sounds
document.addEventListener('DOMContentLoaded', function() {
  initializeTimerSoundSettings();
});

// Add motivational messages
const motivationalMessages = [
  "Time to focus! You've got this! 💪",
  "Let's make this session count! 🎯",
  "Your future self will thank you! ⭐",
  "Stay focused, stay awesome! 🚀",
  "Small steps, big results! 🌟"
];

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    toggleTimer();
  } else if (e.code === 'KeyR') {
    resetTimer();
  }
});

// Session tracking
let dailyStats = {
  completedPomodoros: 0,
  totalFocusTime: 0,
  startDate: new Date().toDateString()
};

// Load stats from localStorage
function loadStats() {
  const saved = localStorage.getItem('customodoroStats');
  if (saved) {
    const stats = JSON.parse(saved);
    if (stats.startDate === new Date().toDateString()) {
      dailyStats = stats;
    }
  }
}

// Save stats to localStorage
function saveStats() {
  localStorage.setItem('customodoroStats', JSON.stringify(dailyStats));
}

// Update stats when pomodoro completes
function updateStats() {
  dailyStats.completedPomodoros++;
  dailyStats.totalFocusTime += pomodoroTime;
  saveStats();
}

// Initialize stats on load
loadStats();

// Initialize the timer display
updateTimerDisplay();
updateSessionDots();

// Initialize event listeners
startButton.addEventListener('click', toggleTimer);
resetButton.addEventListener('click', resetTimer);

// Tab event listeners
pomodoroTab.addEventListener('click', () => switchMode('pomodoro'));
shortBreakTab.addEventListener('click', () => switchMode('shortBreak'));
longBreakTab.addEventListener('click', () => switchMode('longBreak'));

// Task event listeners
addTaskBtn.addEventListener('click', addTask);
taskInput.addEventListener('input', () => {
  hasUnsavedTasks = taskInput.value.trim().length > 0;
});
taskInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addTask();
});

// Update timer display
function updateTimerDisplay() {
  const minutes = Math.floor(currentSeconds / 60);
  const seconds = currentSeconds % 60;
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  timerElement.textContent = timeString;

  // Update document title - Reverted logic
  let titleText;
  if (!isRunning && currentSeconds === initialSeconds) {
    // Initial/reset state - show mode name
    switch(currentMode) {
      case 'pomodoro':
        titleText = `${timeString} - Pomodoro`;
        break;
      case 'shortBreak':
        titleText = `${timeString} - Short Break`;  // Ensure space is here
        break;
      case 'longBreak':
        titleText = `${timeString} - Long Break`;   // Ensure space is here
        break;
    }
  } else {
    // Fix: Add proper spacing for mode names in title
    let modeName;
    switch(currentMode) {
      case 'pomodoro':
        modeName = 'Pomodoro';
        break;
      case 'shortBreak':
        modeName = 'Short Break';  // Ensure space is here
        break;
      case 'longBreak':
        modeName = 'Long Break';   // Ensure space is here
        break;
      default:
        modeName = currentMode.charAt(0).toUpperCase() + currentMode.slice(1);
    }
    
    titleText = isRunning 
      ? `${timeString} - ${modeName}`
      : `${timeString} - Paused`;
  }
  document.title = titleText;
  // Update progress bar
  if (initialSeconds > 0) {
    const progress = ((initialSeconds - currentSeconds) / initialSeconds) * 100;
    progressBar.style.width = `${progress}%`;
  }
  
  // Update burn-up tracker
  updateBurnupTracker();
}

// Burn-Up Tracker Functions
function updateBurnupTracker() {
  if (!isBurnupTrackerEnabled || !burnupTracker) return;
  
  if (isRunning) {
    const elapsedSeconds = initialSeconds - currentSeconds;
    const progressPercent = initialSeconds > 0 ? (elapsedSeconds / initialSeconds) * 100 : 0;
    
    // Update progress bar
    if (burnupProgressBar) {
      burnupProgressBar.style.width = `${progressPercent}%`;
    }
    
    // Update spent time
    if (burnupSpentTime) {
      const minutes = Math.floor(elapsedSeconds / 60);
      const seconds = elapsedSeconds % 60;
      burnupSpentTime.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // Update planned time
    if (burnupPlannedTime) {
      const totalMinutes = Math.floor(initialSeconds / 60);
      const totalSeconds = initialSeconds % 60;
      burnupPlannedTime.textContent = `${totalMinutes.toString().padStart(2, '0')}:${totalSeconds.toString().padStart(2, '0')}`;
    }
    
    // Update percentage
    if (burnupPercentage) {
      burnupPercentage.textContent = `${Math.round(progressPercent)}%`;
    }
    
    // Add active class for visual enhancement
    burnupTracker.classList.add('active');
  }
}

function showBurnupTracker() {
  if (isBurnupTrackerEnabled && burnupTracker) {
    burnupTracker.style.display = 'block';
    updateBurnupTracker();
  }
}

function hideBurnupTracker() {
  if (burnupTracker) {
    burnupTracker.style.display = 'none';
    burnupTracker.classList.remove('active');
  }
}

function resetBurnupTracker() {
  if (burnupTracker) {
    if (burnupProgressBar) burnupProgressBar.style.width = '0%';
    if (burnupSpentTime) burnupSpentTime.textContent = '00:00';
    if (burnupPercentage) burnupPercentage.textContent = '0%';
    burnupTracker.classList.remove('active');
  }
}

// Toggle burn-up tracker on/off
function setBurnupTrackerEnabled(enabled) {
  isBurnupTrackerEnabled = enabled;
  localStorage.setItem('burnupTrackerEnabled', enabled.toString());
  
  if (enabled && isRunning) {
    showBurnupTracker();
  } else {
    hideBurnupTracker();
  }
}

// Expose the function globally for settings
window.setBurnupTrackerEnabled = setBurnupTrackerEnabled;

// Add this function after the DOM Elements section
function updateFavicon(status) {
  const favicon = document.getElementById('favicon');
  if (!favicon) {
    console.warn('Favicon element not found');
    return;
  }
  
  switch(status) {
    case 'pomodoro':
      favicon.href = 'favicon/favicon-32x32.png';
      break;
    case 'shortBreak':
      favicon.href = 'favicon/favicon-32x32.png';
      break;
    case 'longBreak':
      favicon.href = 'favicon/favicon-32x32.png';
      break;
    case 'paused':
      favicon.href = 'favicon/favicon-32x32.png';
      break;
    default:
      favicon.href = 'favicon/favicon-32x32.png';
  }
}

// Toggle timer between start and pause
function toggleTimer() {
  if (!isRunning) {
    playSound('start'); // Play start/click sound
    showToast(motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]);    // Start timer
    isRunning = true;
    startButton.textContent = 'PAUSE';
    updateFavicon(currentMode);
    
    // Show burn-up tracker when timer starts
    showBurnupTracker();
    
    // Play the appropriate timer sound
    playTimerSound();
    
    // Enter locked in mode with a 1-second delay if it's enabled
    if (window.lockedInMode && typeof window.lockedInMode.isEnabled === 'function' && 
        window.lockedInMode.isEnabled() && !window.lockedInMode.isActive()) {
      window.lockedInMode.enter(true); // true = with delay
    }

    timerInterval = setInterval(() => {
      if (currentSeconds > 0) {
        currentSeconds--;
        updateTimerDisplay();
        
        // Update locked in mode if active
        if (window.lockedInMode && window.lockedInMode.isActive()) {
          const minutes = Math.floor(currentSeconds / 60);
          const seconds = currentSeconds % 60;
          const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          const progress = ((initialSeconds - currentSeconds) / initialSeconds) * 100;
          window.lockedInMode.update(timeString, progress, startButton.textContent, sessionText.textContent);
        }      } else {
        // Timer completed
        clearInterval(timerInterval);
        isRunning = false;
        
        // Hide burn-up tracker when timer completes
        hideBurnupTracker();
        
        // For pomodoro mode, increment counter BEFORE showing notification
        if (currentMode === 'pomodoro') {
          completedPomodoros++;
          updateStats();
        }
        
        // Now show notification with updated counter
        playNotification();
        showToast(getCompletionMessage());

        // Move to next timer phase with auto-start
        if (currentMode === 'pomodoro') {
          if (completedPomodoros % maxSessions === 0) {
            switchMode('longBreak', true);
          } else {
            switchMode('shortBreak', true);
          }
        } else {
          if (currentMode === 'longBreak') {
            currentSession = 1;
          } else {
            currentSession++;
          }
          switchMode('pomodoro', true);
        }
        updateSessionDots();
      }
    }, 1000);
  } else {
    playSound('pause'); // Use function instead of direct play
    
    // Stop timer sound when pausing
    stopTimerSound();    // Pause timer
    clearInterval(timerInterval);
    isRunning = false;
    startButton.textContent = 'START';
    updateFavicon('paused');
    
    // Hide burn-up tracker when paused
    hideBurnupTracker();
    
    // Also update locked in mode if active
    if (window.lockedInMode && window.lockedInMode.isActive()) {
      const minutes = Math.floor(currentSeconds / 60);
      const seconds = currentSeconds % 60;
      const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      window.lockedInMode.update(timeString, null, 'START');
    }

    // Auto-start next phase if timer is complete
    if (currentSeconds === 0) {
      if (currentMode === 'pomodoro') {
        // REMOVED: Don't increment here as it would cause double counting
        // We already increment when timer completes in the interval function
        playNotification(); // Keep notification
        
        if (completedPomodoros % maxSessions === 0) {
          switchMode('longBreak', true);
        } else {
          switchMode('shortBreak', true);
        }
        toggleTimer(); // Auto-start break
      } else {
        if (currentMode === 'longBreak') {
          currentSession = 1;
        } else {
          currentSession++;
        }
        switchMode('pomodoro', true);
        toggleTimer(); // Auto-start next pomodoro
      }
      updateSessionDots();
    }
  }
}

// Reset the current timer - modified to be more robust
function resetTimer() {
  clearInterval(timerInterval);

  // Reset to initial time based on current mode - use latest values
  if (currentMode === 'pomodoro') {
    // Grab latest value from localStorage for immediate updates
    pomodoroTime = parseInt(localStorage.getItem('pomodoroTime')) || pomodoroTime;
    currentSeconds = pomodoroTime * 60;
  } else if (currentMode === 'shortBreak') {
    shortBreakTime = parseInt(localStorage.getItem('shortBreakTime')) || shortBreakTime;
    currentSeconds = shortBreakTime * 60;
  } else {
    longBreakTime = parseInt(localStorage.getItem('longBreakTime')) || longBreakTime;
    currentSeconds = longBreakTime * 60;
  }
  initialSeconds = currentSeconds;
  isRunning = false;
  startButton.textContent = 'START';
  updateFavicon('paused');
  updateTimerDisplay();
  progressBar.style.width = '0%';
  
  // Reset and hide burn-up tracker
  resetBurnupTracker();
  hideBurnupTracker();
  
  // Stop timer sound when resetting - added to fix sound continuing after reset
  stopTimerSound();

  // Also update locked in mode if active
  if (window.lockedInMode && window.lockedInMode.isActive()) {
    const minutes = Math.floor(currentSeconds / 60);
    const seconds = currentSeconds % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    window.lockedInMode.update(timeString, 0, 'START');
  }
}

// Switch between pomodoro, short break, and long break modes with validation
function switchMode(mode, autoStart = false) {
  // Don't show deletion confirmation when auto-switching between work/break phases
  const isTimerPhaseSwitch = 
    // Going from pomodoro to any break
    (currentMode === 'pomodoro' && (mode === 'shortBreak' || mode === 'longBreak')) ||
    // Going from any break to pomodoro
    ((currentMode === 'shortBreak' || currentMode === 'longBreak') && mode === 'pomodoro');
  
  // Only show running timer confirmation for manual mode changes, not auto transitions
  if (!autoStart && isRunning) {
    const confirmed = confirm('Timer is still running. Are you sure you want to switch modes? This will reset your current progress.');
    if (!confirmed) return;
  }

  // Only show task deletion warning for manual mode changes, not auto transitions between phases
  if (taskList.children.length > 0 && !autoStart && !isTimerPhaseSwitch) {
    const confirmed = confirm('Switching modes will delete all your tasks. Do you want to continue?');
    if (!confirmed) return;
  }

  // Clear all tasks only when confirmed by user or when there's an explicit mode change
  // (not auto phase transitions during normal timer operation)
  if (!isTimerPhaseSwitch || !autoStart) {
    taskList.innerHTML = '';
    hasUnfinishedTasks = false;
    hasUnsavedTasks = false;
  }

  currentMode = mode;

  // Reset active tab styles
  pomodoroTab.classList.remove('active');
  shortBreakTab.classList.remove('active');
  longBreakTab.classList.remove('active');

  // Save current theme class before changing body class
  const currentTheme = localStorage.getItem('siteTheme') || 'default';
  const themeClass = currentTheme !== 'default' ? `theme-${currentTheme}` : '';
  
  // Set up the new mode - always use the latest values from localStorage
  if (mode === 'pomodoro') {
    pomodoroTime = parseInt(localStorage.getItem('pomodoroTime')) || pomodoroTime;
    currentSeconds = pomodoroTime * 60;
    // Use 'pomodoro-mode' instead of 'focus-mode' to match CSS
    body.className = 'pomodoro-mode' + (themeClass ? ' ' + themeClass : '');
    pomodoroTab.classList.add('active');
  } else if (mode === 'shortBreak') {
    shortBreakTime = parseInt(localStorage.getItem('shortBreakTime')) || shortBreakTime;
    currentSeconds = shortBreakTime * 60;
    // Use 'short-break-mode' to be consistent
    body.className = 'short-break-mode' + (themeClass ? ' ' + themeClass : '');
    shortBreakTab.classList.add('active');
  } else {
    longBreakTime = parseInt(localStorage.getItem('longBreakTime')) || longBreakTime;
    currentSeconds = longBreakTime * 60;
    // Use 'long-break-mode' to be consistent
    body.className = 'long-break-mode' + (themeClass ? ' ' + themeClass : '');
    longBreakTab.classList.add('active');
  }

  initialSeconds = currentSeconds;
  // Reset timer state
  clearInterval(timerInterval);
  isRunning = false;
  startButton.textContent = 'START';
  
  // Reset and hide burn-up tracker when switching modes
  resetBurnupTracker();
  hideBurnupTracker();
  
  // Stop any playing timer sound
  stopTimerSound();

  updateFavicon(mode);
  updateTimerDisplay();
  progressBar.style.width = '0%';

  // Auto-start if requested - Now using shared settings key
  if (autoStart) {
    // Check if auto start is enabled based on the mode
    const shouldAutoStart = mode === 'pomodoro' 
      ? localStorage.getItem('autoPomodoro') !== 'false'
      : localStorage.getItem('autoBreak') !== 'false';
      
    if (shouldAutoStart) {
      setTimeout(toggleTimer, 500);
    }
  }
}

// Add link handler for mode switching
document.querySelector('.switch-btn').addEventListener('click', (e) => {
  // Only show confirmation when switching between major timer types (classic/reverse)
  const hasTasks = taskList.children.length > 0;
  if (hasTasks) {
    const confirmed = confirm('Switching to a different timer type will delete all your tasks. Do you want to continue?');
    if (!confirmed) {
      e.preventDefault();
    }
  }
});

// Update session dots display
function updateSessionDots() {
  // Clear all dots
  while (sessionDots.firstChild) {
    sessionDots.removeChild(sessionDots.firstChild);
  }

  // Add dots based on maxSessions
  for (let i = 0; i < maxSessions; i++) {
    const dot = document.createElement('span');
    dot.className = 'session-dot';
    if (i < completedPomodoros % maxSessions) {
      dot.classList.add('completed');
    }
    sessionDots.appendChild(dot);
  }

  sessionText.textContent = `#${currentSession}`;
}

// Mute alert elements
const muteAlertOverlay = document.getElementById('mute-alert-overlay');
const muteAlertMessage = document.getElementById('mute-alert-message');
const muteAlertBtn = document.getElementById('mute-alert-btn');
const dismissAlertBtn = document.getElementById('dismiss-alert-btn');
const muteAlertCloseBtn = document.getElementById('mute-alert-close'); // Add reference to close button

// Show mute alert modal
function showMuteAlert(message) {
  if (muteAlertMessage) muteAlertMessage.textContent = message;
  if (muteAlertOverlay) muteAlertOverlay.classList.add('show');
  
  // Auto-dismiss after 30 seconds
  setTimeout(() => {
    hideMuteAlert();
  }, 15000);
}

// Hide mute alert modal
function hideMuteAlert() {
  if (muteAlertOverlay) muteAlertOverlay.classList.remove('show');
}

// Mute the currently playing alarm
function muteAlarm() {
  if (sounds.complete) {
    sounds.complete.pause();
    sounds.complete.currentTime = 0;
  }
  hideMuteAlert();
}

// Add event listeners for mute alert buttons
if (muteAlertBtn) {
  muteAlertBtn.addEventListener('click', muteAlarm);
}

if (dismissAlertBtn) {
  dismissAlertBtn.addEventListener('click', hideMuteAlert);
}

// Add event listener for the close (X) button
if (muteAlertCloseBtn) {
  muteAlertCloseBtn.addEventListener('click', hideMuteAlert);
}

// Enhanced notification sound - update to use mute alert
function playNotification() {
  // Check if alarm is enabled using shared key
  const alarmEnabled = localStorage.getItem('alarm') !== 'false';
  
  if (alarmEnabled) {
    // Play alarm for its full duration
    playSound('complete');
  }
  
  // Show mute alert with correct count (since counter is incremented BEFORE calling this)
  let message = '';
  if (currentMode === 'pomodoro') {
    // Determine if we're heading to a long break
    const isLongBreak = completedPomodoros % maxSessions === 0;
    // If just completed a pomodoro, the counter has already been incremented
    message = `Great work! You've completed ${completedPomodoros} pomodoro${completedPomodoros !== 1 ? 's' : ''}. Time for a ${isLongBreak ? 'long ' : ''}break!`;
  } else {
    message = 'Break complete! Ready to focus again?';
  }
  showMuteAlert(message);

  // Also update the notification
  if ('Notification' in window && Notification.permission === 'granted') {
    let title, body, icon;

    if (currentMode === 'pomodoro') {
      // Determine if we're heading to a long break
      const isLongBreak = completedPomodoros % maxSessions === 0;
      title = '🎉 Great Work!';
      body = `You've completed ${completedPomodoros} pomodoros today! Time for a ${isLongBreak ? 'long ' : ''}break.`;
      icon = '/images/break-icon.png';
    } else {
      title = '⏰ Break Complete!';
      body = 'Ready to crush another focused session?';
      icon = '/images/focus-icon.png';
    }

    // Only create notification if alarm is enabled
    if (alarmEnabled) {
      new Notification(title, {
        body: body,
        icon: icon,
        badge: '/images/badge.png',
        vibrate: [100, 50, 100]
      });
    }
  } else if ('Notification' in window && Notification.permission !== 'denied') {
    Notification.requestPermission();
  }
}

// Get timer completion message
function getCompletionMessage() {
  if (currentMode === 'pomodoro') {
    // Determine if we're heading to a long break
    const isLongBreak = completedPomodoros % maxSessions === 0;
    return `Time for a ${isLongBreak ? 'long ' : ''}break!`;
  } else if (currentMode === 'shortBreak') {
    return 'Break finished! Time to focus.';
  } else {
    return 'Long break finished! Ready for a new session?';
  }
}

// Show toast notification
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  toast.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Create task element
function createTaskElement(text, completed = false) {
  const taskItem = document.createElement('li');
  taskItem.className = 'task-item';
  if (completed) taskItem.classList.add('task-completed');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'task-checkbox';
  checkbox.checked = completed;
  checkbox.addEventListener('change', () => {
    taskItem.classList.toggle('task-completed', checkbox.checked);
    updateUnfinishedTasks();
  });

  const taskText = document.createElement('span');
  taskText.className = 'task-text';
  taskText.textContent = text;

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'task-delete';
  deleteBtn.textContent = '×';
  deleteBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete this task?')) {
      taskList.removeChild(taskItem);
      updateUnfinishedTasks();
    }
  });

  taskItem.appendChild(checkbox);
  taskItem.appendChild(taskText);
  taskItem.appendChild(deleteBtn);
  taskList.appendChild(taskItem);
}

// Add task to task list
function addTask() {
  const taskText = taskInput.value.trim();

  if (taskText !== '') {
    createTaskElement(taskText);

    // Clear input
    taskInput.value = '';
    hasUnsavedTasks = false;
  } else {
    // Alert the user when trying to add an empty task
    alert("Please enter a task before adding!");
  }
}

// Add function to update unfinished tasks status
function updateUnfinishedTasks() {
  const unfinishedTasks = Array.from(taskList.children).filter(task => 
    !task.querySelector('.task-checkbox').checked
  );
  hasUnfinishedTasks = unfinishedTasks.length > 0;
}

// Add click sound to buttons - update to use our playSound function
document.querySelectorAll('.secondary-btn, .tab').forEach(button => {
    button.addEventListener('click', () => playSound('click'));
});

// Make the playSound function available globally
window.playSound = playSound;

// Handle page leave/refresh
window.addEventListener('beforeunload', (e) => {
  if (isRunning || hasUnsavedTasks || hasUnfinishedTasks) {
    e.preventDefault();
    let message = '';
    if (isRunning) message = 'Timer is still running.';
    if (hasUnsavedTasks) message = 'You have unsaved tasks.';
    if (hasUnfinishedTasks) message = 'You have unfinished tasks.';
    e.returnValue = `${message} Are you sure you want to leave?`;
    return e.returnValue;
  }
});

// Request notification permission
if ('Notification' in window) {
  Notification.requestPermission();
}

// Near the beginning of the file after initializing timer variables, add this initialization
document.addEventListener('DOMContentLoaded', function() {
  // Initialize sounds with shared settings
  initializeSoundSettings();
  
  // Apply any saved settings immediately when page loads
  pomodoroTime = parseInt(localStorage.getItem('pomodoroTime')) || 25;
  shortBreakTime = parseInt(localStorage.getItem('shortBreakTime')) || 5;
  longBreakTime = parseInt(localStorage.getItem('longBreakTime')) || 15;
  maxSessions = parseInt(localStorage.getItem('sessionsCount')) || 4;
  
  // Set the initial timer based on current mode
  if (currentMode === 'pomodoro') {
    currentSeconds = pomodoroTime * 60;
  } else if (currentMode === 'shortBreak') {
    currentSeconds = shortBreakTime * 60;
  } else if (currentMode === 'longBreak') {
    currentSeconds = longBreakTime * 60;
  }
  
  initialSeconds = currentSeconds;
  updateTimerDisplay();
  updateSessionDots();
  
  console.log("Timer initialized with:", 
    {pomodoro: pomodoroTime, short: shortBreakTime, long: longBreakTime, sessions: maxSessions});
});

// Initialize sound settings using shared keys
function initializeSoundSettings() {
  // Get settings from shared localStorage keys
  const volume = localStorage.getItem('volume') ? 
                parseInt(localStorage.getItem('volume')) / 100 : 0.6;
  
  // Explicitly check for 'false' string
  const soundEffectsEnabled = localStorage.getItem('soundEffects') !== 'false';
  const alarmEnabled = localStorage.getItem('alarm') !== 'false';
  
  // Get selected alarm sound or use default
  const selectedAlarmSound = localStorage.getItem('alarmSound') || 'alarm.mp3';
  sounds.complete.src = 'audio/Alert Sounds/' + selectedAlarmSound;
  
  // Set initial volumes
  sounds.click.volume = soundEffectsEnabled ? volume * 0.5 : 0;
  sounds.start.volume = soundEffectsEnabled ? volume * 0.6 : 0;
  sounds.pause.volume = soundEffectsEnabled ? volume * 0.5 : 0;
  sounds.complete.volume = alarmEnabled ? volume : 0;
  
  console.log(`Sound settings initialized for Classic Timer:`, { 
      volume: volume, 
      soundEffectsEnabled: soundEffectsEnabled, 
      alarmEnabled: alarmEnabled,
      alarmSound: selectedAlarmSound
  });
}

// Update sound volumes based on settings from shared keys
function updateSoundVolumes() {
  // Get settings from shared localStorage keys
  const volume = localStorage.getItem('volume') ? 
                parseInt(localStorage.getItem('volume')) / 100 : 0.6;
  
  // Explicitly check for 'false' string
  const soundEffectsEnabled = localStorage.getItem('soundEffects') !== 'false';
  const alarmEnabled = localStorage.getItem('alarm') !== 'false';
  
  // Update the alarm sound file
  const selectedAlarmSound = localStorage.getItem('alarmSound') || 'alarm.mp3';
  sounds.complete.src = 'audio/Alert Sounds/' + selectedAlarmSound;
  
  // Set volumes based on settings
  sounds.click.volume = soundEffectsEnabled ? volume * 0.5 : 0;
  sounds.start.volume = soundEffectsEnabled ? volume * 0.6 : 0;
  sounds.pause.volume = soundEffectsEnabled ? volume * 0.5 : 0;
  sounds.complete.volume = alarmEnabled ? volume : 0;
  
  console.log("Classic Timer: Sound volumes updated:", { 
      volume: volume,
      soundEffectsEnabled: soundEffectsEnabled,
      alarmEnabled: alarmEnabled,
      alarmSound: selectedAlarmSound
  });
}