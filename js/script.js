// Add this at the top of your script.js (after DOM loads):
console.log('=== DEBUGGING CONTRIBUTION GRAPH CONNECTION ===');
console.log('addCustomodoroSession function exists:', typeof window.addCustomodoroSession === 'function');
console.log('renderContributionGraph function exists:', typeof window.renderContributionGraph === 'function');

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
// Update: reference to new description textarea (now inside .description-group)
const taskDescInput = document.getElementById('task-description-input');

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
 //COMMENT ticking: new Audio('audio/Timer Sounds/WallClockTicking.mp3'),
  whitenoise: new Audio('audio/Timer Sounds/UnderWaterWhiteNoise.mp3'),
 //COMMENT brownnoise: new Audio('audio/Timer Sounds/SoftBrownNoise.mp3')
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
   /* case 'brownnoise':
      sound = timerSounds.brownnoise;
      break; */
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
  // Check if user is currently typing in an input field
  const activeElement = document.activeElement;
  const isTypingInInput = activeElement && (
    activeElement.tagName === 'INPUT' || 
    activeElement.tagName === 'TEXTAREA' || 
    activeElement.isContentEditable
  );
  
  if (e.code === 'Space') {
    // Only trigger timer control if NOT typing in an input field
    if (!isTypingInInput) {
      e.preventDefault();
      toggleTimer();
    }
    // If typing in input field, let the space character be added normally
  } else if (e.code === 'KeyR') {
    // Only trigger reset if NOT typing in an input field
    if (!isTypingInInput) {
      resetTimer();
    }
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
  hasUnsavedTasks = taskInput.value.trim().length > 0 || (taskDescInput && taskDescInput.value.trim().length > 0);
});
taskInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addTask();
});
// Add description input listeners (Shift+Enter for newline, Enter to add)
if (taskDescInput) {
  taskDescInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addTask();
    }
    // Shift+Enter will insert a new line by default
  });
  taskDescInput.addEventListener('input', () => {
    hasUnsavedTasks = taskInput.value.trim().length > 0 || taskDescInput.value.trim().length > 0;
  });
}

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
    
    // Apply saved design style
    if (window.trackerDesignManager) {
      const savedDesign = window.trackerDesignManager.getCurrentDesign();
      window.trackerDesignManager.applyDesign(savedDesign);
    }
    
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
    }
  } else {
    // Timer completed
    clearInterval(timerInterval);
    isRunning = false;
    
    // Hide burn-up tracker when timer completes
    hideBurnupTracker();
    
    // For pomodoro mode, increment counter BEFORE showing notification
    if (currentMode === 'pomodoro') {
      completedPomodoros++;
      updateStats();

      // 🚀 ENHANCED DEBUG VERSION - Replace your previous addition with this:
      console.log('🎯 Pomodoro completed! Current mode:', currentMode);
      console.log('🕐 Initial seconds:', initialSeconds);
      console.log('⏱️ Current seconds remaining:', currentSeconds);
      
      const sessionMinutes = Math.floor(initialSeconds / 60);
      console.log('📊 Session minutes to add:', sessionMinutes);
      
      if (typeof window.addCustomodoroSession === 'function') {
          console.log('✅ Adding session to contribution graph...');
          window.addCustomodoroSession('classic', sessionMinutes);
          console.log('✅ Session added successfully!');
          
          // Also manually trigger a re-render
          if (typeof window.renderContributionGraph === 'function') {
              window.renderContributionGraph();
              console.log('✅ Graph re-rendered!');
          }
      } else {
          console.error('❌ addCustomodoroSession function not found!');
          console.log('Available window functions:', Object.keys(window).filter(key => key.includes('custom')));
      }
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

// --- DRAG & DROP TASK REORDERING ---

// Helper to get the closest task-item element
function getTaskItemElem(elem) {
  while (elem && !elem.classList.contains('task-item')) {
    elem = elem.parentElement;
  }
  return elem;
}

// Drag state
let draggedTask = null;

// Add drag & drop listeners to a task item
function addDragAndDropListeners(taskItem) {
  taskItem.setAttribute('draggable', 'true');

  taskItem.addEventListener('dragstart', function (e) {
    draggedTask = taskItem;
    taskItem.classList.add('dragging');
    // For Firefox compatibility
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
  });

  taskItem.addEventListener('dragend', function () {
    draggedTask = null;
    taskItem.classList.remove('dragging');
    // Remove all drop indicators
    document.querySelectorAll('.task-item.drop-above, .task-item.drop-below').forEach(el => {
      el.classList.remove('drop-above', 'drop-below');
    });
  });

  taskItem.addEventListener('dragover', function (e) {
    e.preventDefault();
    if (!draggedTask || draggedTask === taskItem) return;
    // Visual feedback: highlight drop position
    const bounding = taskItem.getBoundingClientRect();
    const offset = e.clientY - bounding.top;
    if (offset < bounding.height / 2) {
      taskItem.classList.add('drop-above');
      taskItem.classList.remove('drop-below');
    } else {
      taskItem.classList.add('drop-below');
      taskItem.classList.remove('drop-above');
    }
  });

  taskItem.addEventListener('dragleave', function () {
    taskItem.classList.remove('drop-above', 'drop-below');
  });

  taskItem.addEventListener('drop', function (e) {
    e.preventDefault();
    if (!draggedTask || draggedTask === taskItem) return;
    const bounding = taskItem.getBoundingClientRect();
    const offset = e.clientY - bounding.top;
    if (offset < bounding.height / 2) {
      taskList.insertBefore(draggedTask, taskItem);
    } else {
      taskList.insertBefore(draggedTask, taskItem.nextSibling);
    }
    // Clean up
    taskItem.classList.remove('drop-above', 'drop-below');
    draggedTask.classList.remove('dragging');
    draggedTask = null;
    updateUnfinishedTasks();
  });
}

// Patch: Add drag & drop listeners to all current tasks on page load
document.addEventListener('DOMContentLoaded', function () {
  Array.from(taskList.children).forEach(addDragAndDropListeners);
});

// Create task element (now supports description)
function createTaskElement(text, completed = false, description = '') {
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

  // Wrap text and description in a .task-content div for better styling
  const contentDiv = document.createElement('div');
  contentDiv.className = 'task-content';

  const taskText = document.createElement('span');
  taskText.className = 'task-text';
  taskText.textContent = text;

  // Description element (if provided)
  let descElem = null;
  if (description && description.trim() !== '') {
    descElem = document.createElement('div');
    descElem.className = 'task-description';
    descElem.textContent = description;
  }

  contentDiv.appendChild(taskText);
  if (descElem) contentDiv.appendChild(descElem);

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
  taskItem.appendChild(contentDiv);
  taskItem.appendChild(deleteBtn);
  taskList.appendChild(taskItem);

  // Add drag & drop listeners
  addDragAndDropListeners(taskItem);
}

// Add task to task list (now supports description)
function addTask() {
  const taskText = taskInput.value.trim();
  const taskDesc = taskDescInput ? taskDescInput.value.trim() : '';

  if (taskText !== '') {
    createTaskElement(taskText, false, taskDesc);

    // Clear inputs
    taskInput.value = '';
    if (taskDescInput) taskDescInput.value = '';
    hasUnsavedTasks = false;
    taskInput.focus();
  } else {
    // Alert the user when trying to add an empty task
    alert("Please enter a task title before adding!");
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
  
  // Initialize tracker design if available
  if (window.trackerDesignManager) {
    setTimeout(() => {
      const savedDesign = window.trackerDesignManager.getCurrentDesign();
      window.trackerDesignManager.applyDesign(savedDesign);
    }, 100); // Small delay to ensure DOM is fully ready
  }
  
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

// Lazy load images
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('img').forEach(img => {
    img.loading = 'lazy';
  });
});

//-------------------------------------------CONTRIB CODES-------------------------------------------------------------//

// === CENTRALIZED DATE HANDLING ===
// All date operations go through these functions to ensure consistency

// Get current PH date as a Date object
function getPHToday() {
  const now = new Date();
  const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  // Create a clean date object in local timezone but with PH date values
  return new Date(phTime.getFullYear(), phTime.getMonth(), phTime.getDate());
}

// Convert any date to YYYY-MM-DD string
function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Convert YYYY-MM-DD string back to Date object (always in local timezone)
function parseDataKey(dateStrWithSuffix) {
  const [year, month, day] = dateStrWithSuffix.split('-').map(num => parseInt(num));
  return new Date(year, month - 1, day); // month is 0-indexed
}

// Format date for display in PH locale
function formatDateDisplay(date) {
  return date.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric',
    timeZone: 'Asia/Manila'
  });
}

// === MAIN FUNCTIONS ===

// Utility: get all available dates from localStorage stats
function getAllAvailableDates() {
  const stats = getStats();
  const keys = Object.keys(stats).sort(); // oldest to newest
  return keys.map(k => parseDataKey(k));
}

// Utility: get last 12 months of dates, PH timezone
function getDatesForHeatmap() {
  const todayPH = getPHToday();
  console.log('Today PH:', formatDateKey(todayPH)); // Debug log
  
  const dates = [];
  let d = new Date(todayPH);
  d.setDate(d.getDate() - 364); // Go back 364 days for 365 total days
  
  for (let i = 0; i < 365; i++) {
    dates.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

// Get stats from localStorage
function getStats() {
  return JSON.parse(localStorage.getItem('customodoroStatsByDay') || '{}');
}

// GitHub-style dynamic color scale based on personal peak
function getColor(minutes, maxMinutes, emptyColor = "#ebedf0") {
    if (minutes === 0) return emptyColor; // Use theme-specific empty color
    
    // If there's no data yet, use minimum scale
    if (maxMinutes === 0) return emptyColor;
    
    // Calculate quartiles based on personal max
    const q1 = Math.max(1, Math.ceil(maxMinutes * 0.15));
    const q2 = Math.max(1, Math.ceil(maxMinutes * 0.35));
    const q3 = Math.max(1, Math.ceil(maxMinutes * 0.75));
    
    if (minutes >= maxMinutes) return "#56D364";  // Brightest (personal best)
    if (minutes >= q3) return "#2EA043";          // High
    if (minutes >= q2) return "#196C2E";          // Medium    
    if (minutes >= q1) return "#033A16";          // Low
    
    // For any non-zero value below q1, use the darkest green instead of empty color
    return "#033A16";                            // Minimal but visible contribution
}

// Day labels (GitHub shows Mon, Wed, Fri)
const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Month labels
function getMonthLabels(dates) {
  const labels = [];
  let lastMonth = -1;
  dates.forEach((date, i) => {
    const month = date.getMonth();
    if (month !== lastMonth) {
      labels.push({ month: date.toLocaleString('default', { month: 'short' }), x: i });
      lastMonth = month;
    }
  });
  return labels;
}

function getThemeMode() {
  // Try to detect theme from body class
  const body = document.body;
  if (body.classList.contains('theme-dark')) return 'dark';
  if (body.classList.contains('theme-light')) return 'light';
  // Fallback to localStorage
  const theme = localStorage.getItem('siteTheme');
  if (theme === 'dark') return 'dark';
  return 'light';
}

// --- Add toggle logic ---
let showAllData = false;

function renderContributionGraph() {
  const stats = getStats();
  console.log('Current stats:', stats); // Debug log
  
  let dates;
  if (showAllData) {
    dates = getAllAvailableDates();
    if (dates.length === 0) dates = getDatesForHeatmap();
  } else {
    dates = getDatesForHeatmap();
  }

// STREAK! 
function calculateCurrentStreak() {
  const stats = getStats();
  const today = getPHToday();
  let streak = 0;
  let d = new Date(today);

  while (true) {
    const key = formatDateKey(d);
    if (stats[key] && stats[key].total_minutes > 0) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
function renderStreakDisplay() {
  const streak = calculateCurrentStreak();
  const streakNum = document.getElementById('duo-streak-num');
  const streakDisplay = document.getElementById('streak-display');
  if (streakNum) {
    streakNum.textContent = streak;
  }
  // Optionally, show/hide or update label for 0 streak
  if (streakDisplay && streak === 0) {
    streakDisplay.innerHTML = `
      <div class="duo-streak-pill" style="opacity:0.7;">
        <span class="duo-flame">🔥</span>
        <span class="duo-streak-num">0</span>
        <span class="duo-streak-label">No streak yet</span>
      </div>
    `;
  }
}

// Call this after rendering the graph
const originalRenderContributionGraph = renderContributionGraph;
window.renderContributionGraph = function() {
  originalRenderContributionGraph();
  renderStreakDisplay();
};

// Initial render on page load
document.addEventListener('DOMContentLoaded', renderStreakDisplay);



  // Calculate max minutes for dynamic scaling
  let maxMinutes = 0;
  dates.forEach(date => {
    const key = formatDateKey(date);
    const dayStats = stats[key] || { total_minutes: 0 };
    maxMinutes = Math.max(maxMinutes, dayStats.total_minutes || 0);
  });
  
  console.log('Max minutes for scaling:', maxMinutes); // Debug log

  // Arrange dates into weeks (columns, oldest to newest, left to right)
  const weeks = [];
  for (let i = 0; i < dates.length; i += 7) {
    weeks.push(dates.slice(i, i + 7));
  }

  // Reverse weeks so latest week is on the right (GitHub style)
  weeks.reverse();

  // Day labels: get weekday for first date in each row
  const firstDayOfWeek = weeks[0][0].getDay(); // 0=Sun, 1=Mon, ...
  const dayLabelsAccurate = [];
  for (let i = 0; i < 7; i++) {
    dayLabelsAccurate.push(dayLabels[(firstDayOfWeek + i) % 7]);
  }
  
  // Only show Mon, Wed, Fri (GitHub style)
  const dayLabelIndexes = [];
  for (let i = 0; i < 7; i++) {
    if (dayLabelsAccurate[i] === "Mon" || dayLabelsAccurate[i] === "Wed" || dayLabelsAccurate[i] === "Fri") {
      dayLabelIndexes.push(i);
    }
  }

  // Sizing
  const cellSize = 12, cellGap = 4;
  const leftPad = 36, topPad = 22, bottomPad = 22;
  const minGraphWidth = 420;
  const width = Math.max(leftPad + weeks.length * (cellSize + cellGap) + 8, minGraphWidth);
  const height = topPad + 7 * (cellSize + cellGap) + bottomPad;

  // Detect theme
  const mode = getThemeMode();
  const body = document.body;
  let bgColor = "#fff";
  let borderColor = "#d0d7de";
  let labelColor = "#57606a";
  let titleColor = "#24292f";
  let tooltipBg = "#24292f";
  let tooltipText = "#fff";
  let cellBorder = "#d0d7de";
  let emptyCell = "#ebedf0";

  if (mode === "dark") {
    bgColor = "#1E1E1E";
    borderColor = "#30363d";
    labelColor = "#c9d1d9";
    titleColor = "#fff";
    tooltipBg = "#1E1E1E";
    tooltipText = "#fff";
    cellBorder = "#30363d";
    emptyCell = "#21262d";
  }

  // Custom/Kimi no Nawa: glass style
  if (body.classList.contains('theme-custom') || body.classList.contains('theme-yourname') || body.classList.contains('theme-rain')) {
    bgColor = "rgba(30,30,30,0.7)";
    borderColor = "rgba(255,255,255,0.18)";
    labelColor = "#fff";
    titleColor = "#fff";
    tooltipBg = "rgba(30,30,30,0.95)";
    tooltipText = "#fff";
    cellBorder = "rgba(255,255,255,0.18)";
    emptyCell = "rgba(255,255,255,0.12)";
  }

  // Month labels (top, left to right, latest month rightmost)
  const monthLabels = getMonthLabels(weeks.map(w => w[0]));

  // SVG
  let svg = `<svg width="${width}" height="${height}" style="font-family:sans-serif;background:${bgColor};min-width:${minGraphWidth}px;display:block;">`;

  // Month labels (top)
  monthLabels.forEach(label => {
    const x = leftPad + label.x * (cellSize + cellGap);
    svg += `<text x="${x}" y="15" fill="${labelColor}" font-size="11" font-weight="500">${label.month}</text>`;
  });

  // Day labels (left, accurate)
  dayLabelIndexes.forEach(idx => {
    const y = topPad + idx * (cellSize + cellGap) + cellSize / 2 + 3;
    svg += `<text x="4" y="${y}" fill="${labelColor}" font-size="11" font-weight="500" text-anchor="start">${dayLabelsAccurate[idx]}</text>`;
  });

  // Store date objects for tooltip use
  const dateMap = new Map();

  // Cells (weeks: left=oldest, right=latest)
  weeks.forEach((week, x) => {
    week.forEach((date, y) => {
      const key = formatDateKey(date);
      const dayStats = stats[key] || { classic: 0, reverse: 0, break: 0, total_minutes: 0 };
      const minutes = dayStats.total_minutes || 0;
      const points = Math.floor(minutes / 5); // 5 minutes per point
      const color = getColor(points, Math.floor(maxMinutes / 5), emptyCell);
      
      // Store the original date object for tooltip
      dateMap.set(key, date);
      
      console.log(`Date: ${key}, Minutes: ${minutes}, Max: ${maxMinutes}, Color: ${color}`); // Debug log
      
      const cellX = leftPad + x * (cellSize + cellGap);
      const cellY = topPad + y * (cellSize + cellGap);
      svg += `<rect x="${cellX}" y="${cellY}" width="${cellSize}" height="${cellSize}" rx="3" fill="${color}" stroke="${cellBorder}" stroke-width="1" data-date="${key}" data-classic="${dayStats.classic}" data-reverse="${dayStats.reverse}" data-break="${dayStats.break}" data-minutes="${minutes}" style="cursor:pointer;"/>`;
    });
  });

  svg += `</svg>`;

  // Legend (GitHub style with theme-appropriate empty color)
  const legend = `
    <div style="display:flex;align-items:center;gap:6px;margin-top:-25px;font-size:12px;color:${labelColor};">
      Less
      <span style="display:inline-block;width:12px;height:12px;background:${emptyCell};border-radius:2px;border:1px solid ${cellBorder};"></span>
      <span style="display:inline-block;width:12px;height:12px;background:#033A16;border-radius:2px;border:1px solid ${cellBorder};"></span>
      <span style="display:inline-block;width:12px;height:12px;background:#196C2E;border-radius:2px;border:1px solid ${cellBorder};"></span>
      <span style="display:inline-block;width:12px;height:12px;background:#2EA043;border-radius:2px;border:1px solid ${cellBorder};"></span>
      <span style="display:inline-block;width:12px;height:12px;background:#56D364;border-radius:2px;border:1px solid ${cellBorder};"></span>
      More
    </div>
  `;

  // Place toggle above graph
  const container = document.getElementById('contribution-graph');
  if (container) {
    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <div style="font-weight:600;color:${titleColor};font-size:20px;">Productivity Graph</div>
        <button id="toggle-graph-range" style="font-size:12px;padding:4px 10px;border-radius:6px;border:1px solid #d0d7de;background:#f6f8fa;cursor:pointer;">
          ${showAllData ? 'Show Last 12 Months' : 'Show All'}
        </button>
      </div>

      <div style="font-size:12px;color:${labelColor};margin-bottom:8px;"><b>1 Focus Point = 5 minutes of work.</b> The brightest shade marks your personal peak.</div>

      <div style="font-size:12px;color:${labelColor};margin-bottom:8px;">Example: If your best day is 21 Focus Points - 105 mins (1.75 hrs):</div>

<div style="font-size:12px;color:#222;">
  
  <table style="border-collapse:collapse;font-size:12px;margin-top:4px;">
    <tr>
      <td style="padding:2px 8px;border:1px solid #000000;background:#1f2937;color:#fff;">0 FP</td>
      <td style="padding:2px 8px;border:1px solid #000000;background:#ebedf0;color:#222;">Gray</td>
      <td style="padding:2px 8px;border:1px solid #000000;background:#1f2937;color:#fff;">No activity</td>
    </tr>
    <tr>
      <td style="padding:2px 8px;border:1px solid #000000;background:#1f2937;color:#fff;">1–3 FP</td>
      <td style="padding:2px 8px;border:1px solid #000000;background:#033A16;color:#fff;">Low</td>
      <td style="padding:2px 8px;border:1px solid #000000;background:#1f2937;color:#fff;">Minimal</td>
    </tr>
    <tr>
      <td style="padding:2px 8px;border:1px solid #000000;background:#1f2937;color:#fff;">4–7 FP</td>
      <td style="padding:2px 8px;border:1px solid #000000;background:#033A16;color:#fff;">Low</td>
      <td style="padding:2px 8px;border:1px solid #000000;background:#1f2937;color:#fff;">Low</td>
    </tr>
    <tr>
      <td style="padding:2px 8px;border:1px solid #000000;background:#1f2937;color:#fff;">8–15 FP</td>
      <td style="padding:2px 8px;border:1px solid #000000;background:#196C2E;color:#fff;">Medium</td>
      <td style="padding:2px 8px;border:1px solid #000000;background:#1f2937;color:#fff;">Good</td>
    </tr>
    <tr>
      <td style="padding:2px 8px;border:1px solid #000000;background:#1f2937;color:#fff;">16–20 FP</td>
      <td style="padding:2px 8px;border:1px solid #000000;background:#2EA043;color:#fff;">High</td>
      <td style="padding:2px 8px;border:1px solid #000000;background:#1f2937;color:#fff;">Great</td>
    </tr>
    <tr>
      <td style="padding:2px 8px;border:1px solid #000000;background:#1f2937;color:#fff;">21 FP</td>
      <td style="padding:2px 8px;border:1px solid #000000;background:#56D364;color:#222;">Brightest</td>
      <td style="padding:2px 8px;border:1px solid #000000;background:#1f2937;color:#fff;">Personal best</td>
    </tr>
  </table>
  <br>
<div style="font-size:12px;color:${labelColor};margin-bottom:8px;">Hover for details.
(This Productivity Graph is inspired by GitHub's contribution calendar.)</div><br>
      
      <div class="contribution-graph-scroll" style="overflow-x:auto;overflow-y:hidden;position:relative;padding:0 0 32px 0;">
        <div style="background:${bgColor};border-radius:6px;border:1px solid ${borderColor};box-shadow:0 1px 4px rgba(27,31,35,0.04);padding:8px 0 0 0;display:inline-block;min-width:${minGraphWidth}px;">
          ${svg}
        </div>
        <div id="contribution-tooltip" style="position:fixed;pointer-events:none;z-index:10000;display:none;background:${tooltipBg};color:${tooltipText};border-radius:6px;padding:7px 12px;font-size:13px;box-shadow:0 4px 16px rgba(0,0,0,0.18);border:1px solid #1b1f23;"></div>
      </div>
      ${legend}
    `;
    
    // Add clean scrollbar style
    const style = document.createElement('style');
    style.textContent = `
      .contribution-graph-scroll::-webkit-scrollbar {
        height: 8px;
        background: transparent;
      }
      .contribution-graph-scroll::-webkit-scrollbar-thumb {
        background: #e1e4e8;
        border-radius: 4px;
      }
      .contribution-graph-scroll {
        scrollbar-width: thin;
        scrollbar-color: #e1e4e8 #fff;
      }
    `;
    container.appendChild(style);

    // NEW APPROACH: Tooltip logic with better positioning
    const tooltip = container.querySelector('#contribution-tooltip');
    container.querySelectorAll('rect').forEach(rect => {
      rect.addEventListener('mouseenter', e => {
        const d = rect.dataset;
        const dateKey = d.date;
        
        // Use the original date object we stored
        const dateObj = dateMap.get(dateKey);
        const day = dateObj.getDate();
        const month = dateObj.toLocaleString('en-US', { month: 'long' });
        const dateStrWithSuffix = `${month} ${day}${getOrdinalSuffix(day)}`;
        
        console.log(`Tooltip: Key=${dateKey}, Date=${dateObj}, Display=${dateStrWithSuffix}`); // Debug
        
// ...inside mouseenter event...
const classicSessions = parseInt(d.classic) || 0;
const reverseSessions = parseInt(d.reverse) || 0;
const breakSessions = parseInt(d.break) || 0;
const totalMinutes = parseInt(d.minutes) || 0;
const totalPoints = Math.floor(totalMinutes / 5);

// Singular/plural helpers
function pluralize(count, singular, plural) {
  return count === 1 ? singular : plural;
}

function getOrdinalSuffix(day) {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1:  return 'st';
    case 2:  return 'nd';
    case 3:  return 'rd';
    default: return 'th';
  }
}

// Time formatting
function formatMinutes(mins) {
  if (mins < 60) {
    return `${mins} ${pluralize(mins, 'min', 'mins')}`;
  } else {
    const hrs = mins / 60;
    return `${mins} ${pluralize(mins, 'min', 'mins')} (${hrs.toFixed(2)} ${pluralize(hrs, 'hr', 'hrs')})`;
  }
}

let tip = '';
if (totalPoints === 0) {
  tip = `No contributions on ${dateStrWithSuffix}.`;
} else {
  tip = `<b>${totalPoints} ${pluralize(totalPoints, 'Focus Point', 'Focus Points')}</b> on ${dateStrWithSuffix}<br>`;
  if (classicSessions > 0) tip += `${classicSessions} ${pluralize(classicSessions, 'Classic Pomodoro', 'Classic Pomodoros')}<br>`;
  if (reverseSessions > 0) tip += `${reverseSessions} ${pluralize(reverseSessions, 'Reverse Pomodoro', 'Reverse Pomodoros')}<br>`;
  if (breakSessions > 0) tip += `${breakSessions} ${pluralize(breakSessions, 'Break', 'Breaks')}<br>`;
  tip += `<br><b>⏱ ${formatMinutes(totalMinutes)}</b><br>`;
  tip = tip.replace(/<br>$/, '');
}
tooltip.innerHTML = tip;
tooltip.style.display = 'block';
        
        // Better positioning - avoid bottom rows being cut off
        const rectBox = rect.getBoundingClientRect();
        const containerBox = container.getBoundingClientRect();
        const scrollContainer = container.querySelector('.contribution-graph-scroll');
        const scrollBox = scrollContainer.getBoundingClientRect();

// Calculate position relative to viewport
let tooltipX = rectBox.right + 16;
let tooltipY = rectBox.top - 8;

// Get actual tooltip size after setting content
tooltip.style.display = 'block';
tooltip.style.left = '0px';
tooltip.style.top = '0px';
const tooltipRect = tooltip.getBoundingClientRect();
const tooltipWidth = tooltipRect.width || 200;
const tooltipHeight = tooltipRect.height || 60;

// Adjust if off right edge
if (tooltipX + tooltipWidth > window.innerWidth) {
  tooltipX = rectBox.left - tooltipWidth - 16;
}
// Adjust if off bottom edge
if (tooltipY + tooltipHeight > window.innerHeight) {
  tooltipY = window.innerHeight - tooltipHeight - 16;
}
if (tooltipY < 0) tooltipY = 8;

tooltip.style.left = tooltipX + 'px';
tooltip.style.top = tooltipY + 'px';
});
      rect.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
      });
    });

    // Add toggle event
    const toggleBtn = container.querySelector('#toggle-graph-range');
    if (toggleBtn) {
      toggleBtn.onclick = function() {
        showAllData = !showAllData;
        renderContributionGraph();
      };
    }
  }
}

// Sync graph with theme changes
function setupThemeSync() {
  const body = document.body;
  const observer = new MutationObserver(() => {
    renderContributionGraph();
  });
  observer.observe(body, { attributes: true, attributeFilter: ['class'] });

  window.addEventListener('storage', function(e) {
    if (e.key === 'siteTheme') {
      renderContributionGraph();
    }
  });
}

// Call on page load
document.addEventListener('DOMContentLoaded', function() {
  renderContributionGraph();
  setupThemeSync();
});

// Expose update function for other scripts
window.renderContributionGraph = renderContributionGraph;

// Session management using centralized date functions
window.addCustomodoroSession = function(type, minutes) {
  const key = formatDateKey(getPHToday()); // Use centralized date handling
  console.log('Adding session for date:', key); // Debug log
  
  const stats = getStats();
  if (!stats[key]) stats[key] = { classic: 0, reverse: 0, break: 0, total_minutes: 0 };
  
  if (type === 'classic') stats[key].classic++;
  if (type === 'reverse') stats[key].reverse++;
  if (type === 'break') stats[key].break++;
  stats[key].total_minutes += minutes;
  
  localStorage.setItem('customodoroStatsByDay', JSON.stringify(stats));
  console.log('Updated stats:', stats[key]); // Debug log
  renderContributionGraph();
};

// TESTING FUNCTION: Add test data for today
window.addTestSession = function() {
  window.addCustomodoroSession('classic', 1);
  console.log('Added 1 minute test session for today');
};







// Add this anywhere in your script.js:
window.testContributionConnection = function() {
    console.log('🧪 Testing contribution connection...');
    if (typeof window.addCustomodoroSession === 'function') {
        window.addCustomodoroSession('classic', 1);
        console.log('✅ Test session added!');
    } else {
        console.error('❌ Function not available!');
    }
};

// 4. LOAD ORDER CHECK - Add this to see script loading order:
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 Script.js DOM loaded');
    console.log('🔗 Contribution functions available:', {
        addSession: typeof window.addCustomodoroSession === 'function',
        renderGraph: typeof window.renderContributionGraph === 'function'
    });
});