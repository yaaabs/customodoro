// Request notification permission
if ('Notification' in window) {
  Notification.requestPermission();
}

// Audio setup
const sounds = {
    click: new Audio('audio/SFX/start.wav'),
    start: new Audio('audio/SFX/start.wav'),
    pause: new Audio('audio/SFX/pause.wav'),
    pomodoroComplete: new Audio('audio/Alert Sounds/bell.mp3'),
    breakComplete: new Audio('audio/Alert Sounds/bell.mp3')
};

// Add timer sound variables and functionality
const timerSounds = {
  ticking: new Audio('audio/Timer Sounds/WallClockTicking.mp3'),
//  whitenoise: new Audio('audio/Timer Sounds/UnderWaterWhiteNoise.mp3'),
//  brownnoise: new Audio('audio/Timer Sounds/SoftBrownNoise.mp3')
};

// The whitenoise and brownnoise files were removed — alias to ticking so
// existing code paths won't fail if the files are deleted.
timerSounds.whitenoise = timerSounds.ticking;
timerSounds.brownnoise = timerSounds.ticking;

// Add the missing showToast function
function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  // Set the message
  toast.textContent = message;
  
  // Add show class to make it visible
  toast.classList.add('show');
  
  // Hide the toast after the specified duration
  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

let currentTimerSound = null;

// Initialize sound settings from localStorage keys
function initializeSoundSettings() {
    // Migration: Handle old shared settings
    const oldVolume = localStorage.getItem('volume');
    const oldAlarmSound = localStorage.getItem('alarmSound');
    
    if (oldVolume && !localStorage.getItem('pomodoroVolume')) {
        localStorage.setItem('pomodoroVolume', oldVolume);
        localStorage.setItem('breakVolume', oldVolume);
        console.log('Reverse Timer: Migrated old volume settings to separate Pomodoro/Break volumes');
    }
    
    if (oldAlarmSound && !localStorage.getItem('pomodoroSound')) {
        localStorage.setItem('pomodoroSound', oldAlarmSound);
        localStorage.setItem('breakSound', 'bell.mp3'); // Default different sound for breaks
        console.log('Reverse Timer: Migrated old alarm sound to separate Pomodoro/Break sounds');
    }
    
    const pomodoroVolume = localStorage.getItem('pomodoroVolume') ? 
                          parseInt(localStorage.getItem('pomodoroVolume')) / 100 : 0.6;
    const breakVolume = localStorage.getItem('breakVolume') ? 
                       parseInt(localStorage.getItem('breakVolume')) / 100 : 0.6;
    
    // Explicitly check for 'false' string
    const soundEffectsEnabled = localStorage.getItem('soundEffects') !== 'false';
    const alarmEnabled = localStorage.getItem('alarm') !== 'false';
    
    // Get selected alarm sounds or use defaults
    const selectedPomodoroSound = localStorage.getItem('pomodoroSound') || 'bell.mp3';
    const selectedBreakSound = localStorage.getItem('breakSound') || 'bell.mp3';
    updatePomodoroAlarmSound(selectedPomodoroSound);
    updateBreakAlarmSound(selectedBreakSound);
    
    // Set initial volumes (use pomodoroVolume for UI sounds)
    sounds.click.volume = soundEffectsEnabled ? pomodoroVolume * 0.5 : 0;
    sounds.start.volume = soundEffectsEnabled ? pomodoroVolume * 0.6 : 0;
    sounds.pause.volume = soundEffectsEnabled ? pomodoroVolume * 0.5 : 0;
    sounds.pomodoroComplete.volume = alarmEnabled ? pomodoroVolume : 0;
    sounds.breakComplete.volume = alarmEnabled ? breakVolume : 0;
    
    console.log(`Sound settings initialized for Reverse Timer:`, { 
        pomodoroVolume: pomodoroVolume,
        breakVolume: breakVolume,
        soundEffectsEnabled: soundEffectsEnabled, 
        alarmEnabled: alarmEnabled,
        pomodoroSound: selectedPomodoroSound,
        breakSound: selectedBreakSound
    });
}

// Initialize timer sound settings
function initializeTimerSoundSettings() {
  const timerSoundType = localStorage.getItem('timerSound') || 'none';
  const volume = localStorage.getItem('timerSoundVolume') ? 
                parseInt(localStorage.getItem('timerSoundVolume')) / 100 : 0.6;
  
  // Set up initial volume for all timer sounds
  Object.values(timerSounds).forEach(sound => {
    if (sound) {
      sound.volume = volume;
      sound.loop = true;
    }
  });
  
  console.log(`Timer sound settings initialized:`, {
    timerSoundType: timerSoundType,
    volume: volume
  });
}

// Function to specifically update the pomodoro alarm sound
function updatePomodoroAlarmSound(soundFileName) {
    // Create a new Audio object for the pomodoro alarm
    sounds.pomodoroComplete = new Audio('audio/Alert Sounds/' + soundFileName);
    
    // Re-apply volume settings using separate keys
    const pomodoroVolume = localStorage.getItem('pomodoroVolume') ? 
                          parseInt(localStorage.getItem('pomodoroVolume')) / 100 : 0.6;
    const alarmEnabled = localStorage.getItem('alarm') !== 'false';
    sounds.pomodoroComplete.volume = alarmEnabled ? pomodoroVolume : 0;
    
    console.log(`Reverse Timer: Updated pomodoro alarm sound to: ${soundFileName}`);
}

// Function to specifically update the break alarm sound
function updateBreakAlarmSound(soundFileName) {
    // Create a new Audio object for the break alarm
    sounds.breakComplete = new Audio('audio/Alert Sounds/' + soundFileName);
    
    // Re-apply volume settings using separate keys
    const breakVolume = localStorage.getItem('breakVolume') ? 
                       parseInt(localStorage.getItem('breakVolume')) / 100 : 0.6;
    const alarmEnabled = localStorage.getItem('alarm') !== 'false';
    sounds.breakComplete.volume = alarmEnabled ? breakVolume : 0;
    
    console.log(`Reverse Timer: Updated break alarm sound to: ${soundFileName}`);
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
    if (sound) {
      sound.volume = volume;
    }
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
    if (sound) {
      sound.volume = volume;
    }
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

  // Guard: if the selected timer sound isn't available (disabled), abort gracefully
  if (!currentTimerSound || typeof currentTimerSound.play !== 'function') {
    console.warn('Timer sound not available or disabled:', timerSoundType);
    currentTimerSound = null;
    return;
  }

  // Make sure volume is set correctly
  const volume = localStorage.getItem('timerSoundVolume') ? 
                parseInt(localStorage.getItem('timerSoundVolume')) / 100 : 0.6;
  currentTimerSound.volume = volume;

  // Start playing sound with error handling
  try {
    currentTimerSound.currentTime = 0;
    currentTimerSound.play().catch(err => {
      console.log('Timer sound playback error:', err);
      currentTimerSound = null;
    });
  } catch (err) {
    console.log('Timer sound playback error:', err);
    currentTimerSound = null;
  }

  console.log(`Timer sound started: ${timerSoundType} at volume ${volume}`);
}

// Stop the currently playing timer sound
function stopTimerSound() {
  if (currentTimerSound) {
    if (typeof currentTimerSound.pause === 'function') {
      currentTimerSound.pause();
    }
    if (typeof currentTimerSound.currentTime === 'number') {
      currentTimerSound.currentTime = 0;
    }
    currentTimerSound = null;
  }
}

// Call this function on startup
initializeSoundSettings();
initializeTimerSoundSettings();

// Play a sound with error handling and respect settings
function playSound(soundName) {
    const sound = sounds[soundName];
    if (!sound) return;
    
    // Check if the sound should be played based on settings
    if (soundName === 'complete' || soundName === 'pomodoroComplete' || soundName === 'breakComplete') {
        // For alarm sounds
        if (localStorage.getItem('alarm') === 'false') {
            console.log('Alarm sounds disabled in settings');
            return;
        }
        
        // Handle backward compatibility
        if (soundName === 'complete') {
            // Default to break complete for reverse timer
            soundName = 'breakComplete';
        }
        
        // Ensure we're using the latest alarm sound before playing
        if (soundName === 'pomodoroComplete') {
            const selectedPomodoroSound = localStorage.getItem('pomodoroSound') || 'bell.mp3';
            if (sound.src.indexOf(selectedPomodoroSound) === -1) {
                updatePomodoroAlarmSound(selectedPomodoroSound);
            }
        } else if (soundName === 'breakComplete') {
            const selectedBreakSound = localStorage.getItem('breakSound') || 'bell.mp3';
            if (sound.src.indexOf(selectedBreakSound) === -1) {
                updateBreakAlarmSound(selectedBreakSound);
            }
        }
    } else {
        // For all other UI sounds
        if (localStorage.getItem('soundEffects') === 'false') {
            console.log('Sound effects disabled in settings');
            return;
        }
    }
    
    try {
        // For click sounds that might overlap, clone the audio
        if (soundName === 'click') {
            const clone = sound.cloneNode();
            clone.volume = sound.volume;
            clone.play().catch(err => console.log('Audio playback disabled'));
        } else {
            // For other sounds, reset and play
            sound.currentTime = 0;
            sound.play().catch(err => console.log('Audio playback disabled'));
        }
    } catch (error) {
        console.error('Error playing sound:', error);
    }
}

// DOM Elements
const timerElement = document.getElementById('timer');
const progressBar = document.getElementById('progress-bar');
const startButton = document.getElementById('start-btn');
const pauseButton = document.getElementById('pause-btn');
const resumeButton = document.getElementById('resume-btn');
const stopButton = document.getElementById('stop-btn');
const resetButton = document.getElementById('reset-btn');
const reverseTab = document.getElementById('reverse-tab');
const breakTab = document.getElementById('break-tab');
const toast = document.getElementById('toast');

// Burn-Up Tracker elements
const burnupTracker = document.getElementById('burnup-tracker');
const burnupProgressBar = document.getElementById('burnup-progress-bar');
const burnupSpentTime = document.getElementById('burnup-spent-time');
const burnupPlannedTime = document.getElementById('burnup-planned-time');
const burnupPercentage = document.getElementById('burnup-percentage');

// Add task elements
const taskInput = document.getElementById('task-input');
const taskDescInput = document.getElementById('task-description-input'); // UPDATED: new textarea id
const addTaskBtn = document.getElementById('add-task-btn');
const taskList = document.getElementById('task-list');

// Current task elements
const currentTaskDisplay = document.getElementById('current-task');
const currentTaskTitle = document.getElementById('current-task-title');

// Current task tracking variables
let currentFocusedTask = null;
let currentFocusedTaskElement = null;

// Add favicon update function
function updateFavicon(status) {
  const favicon = document.getElementById('favicon');
  if (!favicon) {
    console.warn('Favicon element not found');
    return;
  }
  
  switch(status) {
    case 'reverse':
    case 'break':
    case 'paused':
    default:
      favicon.href = 'favicon/favicon-32x32.png';
  }
}

// Timer variables
let MAX_TIME;
let currentSeconds = 0;
let initialSeconds;
let isRunning = false;
let timerInterval = null;
let currentMode = 'reverse';
let earnedBreakTime = 0;
let hasUnsavedTasks = false;
let hasUnfinishedTasks = false;
let tasks = []; // This will store our tasks

// New timestamp-based timer variables for accurate time tracking
let timerStartTime = null;  // When timer started (timestamp)
let timerEndTime = null;    // When timer should end (timestamp)
let pausedTimeRemaining = null; // Time left when paused

// Timer state management for pause/resume functionality
let timerState = 'idle'; // 'idle', 'running', 'paused', 'stopped'

// Button display management function
function updateButtonDisplay() {
  // Hide all buttons first
  startButton.style.display = 'none';
  pauseButton.style.display = 'none';
  resumeButton.style.display = 'none';
  stopButton.style.display = 'none';
  resetButton.style.display = 'none';
  
  switch (timerState) {
    case 'idle':
      // State 1: [START] [Reset]
      startButton.style.display = 'inline-block';
      resetButton.style.display = 'inline-block';
      break;
      
    case 'running':
      // State 2: [STOP] [PAUSE] [Reset]
      stopButton.style.display = 'inline-block';
      pauseButton.style.display = 'inline-block';
      resetButton.style.display = 'inline-block';
      break;
      
    case 'paused':
      // State 3: [STOP] [RESUME] [Reset]
      stopButton.style.display = 'inline-block';
      resumeButton.style.display = 'inline-block';
      resetButton.style.display = 'inline-block';
      break;
      
    case 'stopped':
      // State 4: [START] [Reset] - Returns to break/idle
      startButton.style.display = 'inline-block';
      resetButton.style.display = 'inline-block';
      break;
  }
}

// Burn-Up Tracker variables
let isBurnupTrackerEnabled = localStorage.getItem('burnupTrackerEnabled') !== 'false'; // Default to true
let burnupStartTime = 0;
let burnupElapsedTime = 0;

// Calculate break time based on work duration
function calculateBreakTime(workedSeconds) {
   const breakLogicMode = localStorage.getItem('breakLogicMode') || 'default';
   const maxWorkMinutes = (parseInt(localStorage.getItem('reverseMaxTime')) || 60);
   const workedMinutes = Math.floor(workedSeconds / 60);

   const break1 = parseInt(localStorage.getItem('reverseBreak1')) || 2;
   const break2 = parseInt(localStorage.getItem('reverseBreak2')) || 5;
   const break3 = parseInt(localStorage.getItem('reverseBreak3')) || 10;
   const break4 = parseInt(localStorage.getItem('reverseBreak4')) || 15;
   const break5 = parseInt(localStorage.getItem('reverseBreak5')) || 30;

   if (workedMinutes === 0) return 0; // No break for 0 minutes worked in any mode.

   if (breakLogicMode === 'dynamic') {
       // NOTE: In dynamic mode, breaks are earned from the first minute based on percentage.
       const percentage = workedMinutes / maxWorkMinutes;
       if (percentage <= 0.2) return break1;
       if (percentage <= 0.4) return break2;
       if (percentage <= 0.6) return break3;
       if (percentage <= 0.8) return break4;
       return break5;
   } else { // 'default' mode
       if (workedMinutes < 5) return 0; // Explicitly return 0 for less than 5 minutes.
       if (workedMinutes <= 20) return break1;
       if (workedMinutes <= 30) return break2;
       if (workedMinutes <= 45) return break3;
       if (workedMinutes <= 55) return break4;
       return break5;
   }
}

// Update the "How it works" info section dynamically
function updateInfoSection() {
   const breakLogicMode = localStorage.getItem('breakLogicMode') || 'default';
   const maxWorkMinutes = parseInt(localStorage.getItem('reverseMaxTime')) || 60;
   const infoList = document.getElementById('info-break-tiers');
   if (!infoList) return;

   const break1 = parseInt(localStorage.getItem('reverseBreak1')) || 2;
   const break2 = parseInt(localStorage.getItem('reverseBreak2')) || 5;
   const break3 = parseInt(localStorage.getItem('reverseBreak3')) || 10;
   const break4 = parseInt(localStorage.getItem('reverseBreak4')) || 15;
   const break5 = parseInt(localStorage.getItem('reverseBreak5')) || 30;

   let tiers = [];
   if (breakLogicMode === 'dynamic') {
       const tier1 = Math.floor(maxWorkMinutes * 0.2);
       const tier2 = Math.floor(maxWorkMinutes * 0.4);
       const tier3 = Math.floor(maxWorkMinutes * 0.6);
       const tier4 = Math.floor(maxWorkMinutes * 0.8);
       // NOTE: Dynamic tiers start from 1, as the 5-minute minimum does not apply.
       tiers = [
           `1-${tier1} mins = ${break1} min break`,
           `${tier1 + 1}-${tier2} mins = ${break2} min break`,
           `${tier2 + 1}-${tier3} mins = ${break3} min break`,
           `${tier3 + 1}-${tier4} mins = ${break4} min break`,
           `${tier4 + 1}-${maxWorkMinutes} mins = ${break5} min break`
       ];
   } else { // 'default' mode
       tiers = [
           `5-20 mins = ${break1} min break`,
           `21-30 mins = ${break2} min break`,
           `31-45 mins = ${break3} min break`,
           `46-55 mins = ${break4} min break`,
           `56-60 mins = ${break5} min break`
       ];
   }
   
   infoList.innerHTML = tiers.map(tier => `<li>${tier}</li>`).join('');
}

// Update timer display
function updateDisplay() {
    // NEW: Show H:MM:SS if >= 1 hour, else MM:SS
    let hours = Math.floor(currentSeconds / 3600);
    let minutes = Math.floor((currentSeconds % 3600) / 60);
    let seconds = currentSeconds % 60;
    let timeString;
    if (hours > 0) {
        timeString = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
        timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    timerElement.textContent = timeString;
    
    // Update progress bar based on mode
    const progress = currentMode === 'break' 
        ? ((initialSeconds - currentSeconds) / initialSeconds) * 100
        : (currentSeconds / MAX_TIME) * 100;
    progressBar.style.width = `${progress}%`;
    
    // Update burn-up tracker
    updateBurnupTracker();
    
    // Update document title - Reverted logic
    let titleText = `${timeString} - `;
    
    if (!isRunning && currentSeconds === 0 && currentMode === 'reverse') {
        titleText += 'Reverse Pomodoro';
    } else if (!isRunning && currentSeconds === initialSeconds && currentMode === 'break') {
        titleText += 'Break Accumulated';
    } else {
        titleText += isRunning 
            ? (currentMode === 'break' ? 'Break Accumulated' : 'Reverse Pomodoro')
            : 'Paused';
    }
      document.title = titleText;
}

// Burn-Up Tracker Functions
let totalTime = 0; // Initialize totalTime variable for burn-up tracker calculations

function updateBurnupTracker() {
    if (!isBurnupTrackerEnabled || !burnupTracker) return;

    // This function now only updates the dynamic parts of the tracker
    if (isRunning) {
        let progressPercent = 0;
        let elapsedTime = 0;
        
        // Make sure totalTime is set correctly based on current mode
        if (currentMode === 'reverse') {
            totalTime = MAX_TIME; // Use MAX_TIME directly for consistency
            elapsedTime = currentSeconds;
            progressPercent = totalTime > 0 ? (elapsedTime / totalTime) * 100 : 0;
        } else if (currentMode === 'break') {
            totalTime = initialSeconds;
            elapsedTime = initialSeconds - currentSeconds;
            progressPercent = totalTime > 0 ? (elapsedTime / totalTime) * 100 : 0;
        }
        
        // Update progress bar
        if (burnupProgressBar) {
            burnupProgressBar.style.width = `${progressPercent}%`;
        }
        
        // Update spent time
if (burnupSpentTime) {
    const hours = Math.floor(elapsedTime / 3600);
    const minutes = Math.floor((elapsedTime % 3600) / 60);
    const seconds = elapsedTime % 60;
    let spentString;
    if (hours > 0) {
        spentString = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
        spentString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    burnupSpentTime.textContent = spentString;
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
    // Only show tracker in reverse mode, not during breaks
    if (isBurnupTrackerEnabled && burnupTracker && currentMode === 'reverse') {
        burnupTracker.style.display = 'block';

        // Apply saved design style
        if (window.trackerDesignManager) {
            const savedDesign = window.trackerDesignManager.getCurrentDesign();
            window.trackerDesignManager.applyDesign(savedDesign);
        }

        // Set totalTime for reverse mode
        totalTime = MAX_TIME;

        updateBurnupTracker();
    } else if (burnupTracker) {
        burnupTracker.style.display = 'none';
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

// Expose functions globally for settings
window.setBurnupTrackerEnabled = setBurnupTrackerEnabled;
window.resetBurnupTracker = resetBurnupTracker;
window.updateBurnupTracker = updateBurnupTracker;

// New timestamp-based timer update function for accurate time tracking
function updateTimerFromTimestamp() {
  const now = Date.now();
  
  if (currentMode === 'reverse') {
    // Count-up mode
    const elapsed = (now - timerStartTime) / 1000;
    currentSeconds = Math.min(Math.floor(elapsed), MAX_TIME);
    
    if (currentSeconds >= MAX_TIME) {
      completeSession();
      return;
    }
  } else {
    // Countdown mode (break)
    const remaining = (timerEndTime - now) / 1000;
    currentSeconds = Math.max(Math.floor(remaining), 0);
    
    if (currentSeconds <= 0) {
      completeBreak();
      return;
    }
  }
  
  updateDisplay();
  
  // Update locked-in mode if active
  if (window.lockedInMode && window.lockedInMode.isActive()) {
    updateLockedInMode();
  }
}

// Individual timer control functions
function handleStart() {
  // Sync settings before starting
  window.updateTimerAndUIFromSettings();
  
  if (currentMode === 'break') {
    if (currentSeconds <= 0) {
      showToast("Break time is over!");
      return;
    }
  } else if (currentSeconds >= MAX_TIME) {
    showToast("You've reached the maximum time!");
    return;
  }
  
  playSound('start');
  showToast(currentMode === 'break' ? "Enjoy your break! 😌" : "Time to focus! 💪");
  
  const now = Date.now();
  
  // MIDNIGHT: Start midnight tracking
  if (typeof window.startMidnightTracking === 'function') {
    window.startMidnightTracking(currentMode === 'break' ? 'break' : 'reverse');
  }
  
  // Fresh start
  if (currentMode === 'reverse') {
    // Count-up mode
    timerStartTime = now;
    timerEndTime = now + (MAX_TIME * 1000);
  } else {
    // Break mode - countdown
    timerEndTime = now + (currentSeconds * 1000);
  }
  
  pausedTimeRemaining = null;
  isRunning = true;
  timerState = 'running';
  updateFavicon('running');
  updateButtonDisplay();
  
  // Show burn-up tracker when timer starts
  showBurnupTracker();
  
  // Play the appropriate timer sound
  playTimerSound();
  
  // Enter locked in mode if enabled
  if (window.lockedInMode && window.lockedInMode.isEnabled()) {
    setTimeout(() => {
      if (isRunning && window.lockedInMode) {
        window.lockedInMode.enter();
      }
    }, 1000);
  }
  
  // Start the interval
  timerInterval = setInterval(updateTimerFromTimestamp, 100);
}

function handlePause() {
  playSound('pause');
  
  // Stop timer sound when pausing
  stopTimerSound();
  clearInterval(timerInterval);
  isRunning = false;
  timerState = 'paused';
  
  // Calculate and store remaining/elapsed time
  const now = Date.now();
  if (currentMode === 'reverse') {
    // For reverse: store elapsed time
    pausedTimeRemaining = Math.min((now - timerStartTime) / 1000, MAX_TIME);
  } else {
    // For break: store remaining time
    pausedTimeRemaining = Math.max((timerEndTime - now) / 1000, 0);
  }
  
  currentSeconds = Math.floor(pausedTimeRemaining);
  updateFavicon('paused');
  updateDisplay();
  updateButtonDisplay();
  
  // Hide burn-up tracker when paused
  hideBurnupTracker();
  
  // Update locked in mode if active
  if (window.lockedInMode && window.lockedInMode.isActive()) {
    const minutes = Math.floor(currentSeconds / 60);
    const seconds = currentSeconds % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    window.lockedInMode.update(timeString, null, 'RESUME');
  }
  
  showToast("Timer paused ⏸️");
}

function handleResume() {
  playSound('start');
  showToast("Resuming timer! 🔄");
  
  const now = Date.now();
  
  // Resume from paused state
  if (currentMode === 'reverse') {
    // For reverse: we stored elapsed time, calculate new start time
    timerStartTime = now - (pausedTimeRemaining * 1000);
    timerEndTime = now + ((MAX_TIME - pausedTimeRemaining) * 1000);
  } else {
    // For break: we stored remaining time
    timerEndTime = now + (pausedTimeRemaining * 1000);
  }
  
  pausedTimeRemaining = null;
  isRunning = true;
  timerState = 'running';
  updateFavicon('running');
  updateButtonDisplay();
  
  // Show burn-up tracker when resuming
  showBurnupTracker();
  
  // Play the appropriate timer sound
  playTimerSound();
  
  // Re-enter locked in mode if enabled
  if (window.lockedInMode && window.lockedInMode.isEnabled()) {
    window.lockedInMode.enter();
  }
  
  // Restart the interval
  timerInterval = setInterval(updateTimerFromTimestamp, 100);
}

function handleStop() {
  playSound('pause');
  
  // Stop timer sound when stopping
  stopTimerSound();
  clearInterval(timerInterval);
  isRunning = false;
  timerState = 'stopped';
  
  updateFavicon('paused');
  updateButtonDisplay();
  
  // Hide burn-up tracker when stopped
  hideBurnupTracker();
  
  // Handle mode-specific logic
  if (currentMode === 'reverse') {
    const breakLogicMode = localStorage.getItem('breakLogicMode') || 'default';
    const minutes = Math.floor(currentSeconds / 60);
    
    if (breakLogicMode === 'default' && minutes < 5) {
      if (confirm('You worked less than 5 minutes. No break earned. Do you want to reset the timer?')) {
        resetTimer(true); // User confirmed, show message
      }
    } else {
      completeSession(false); // Complete but don't play sound
    }
  } else {
    // For break mode, just return to idle
    timerState = 'idle';
    updateButtonDisplay();
  }
  
  showToast("Timer stopped ⏹️");
}

// Legacy toggle function - now routes to appropriate handlers
function toggleTimer() {
  switch (timerState) {
    case 'idle':
    case 'stopped':
      handleStart();
      break;
    case 'running':
      handleStop();
      break;
    case 'paused':
      handleResume();
      break;
  }
}

// Complete session
function completeSession(playSound = true) {
    clearInterval(timerInterval);
    isRunning = false;
    timerState = 'idle';
    hideBurnupTracker();
    stopTimerSound();

    const workMinutes = Math.floor(currentSeconds / 60);

    // Always record the session for the graph
    if (typeof window.addCustomodoroSession === 'function') {
        // MIDNIGHT: Use midnight splitter if available
        if (typeof window.recordSessionWithMidnightSplit === 'function') {
          window.recordSessionWithMidnightSplit('reverse', workMinutes);
        } else {
          window.addCustomodoroSession('reverse', workMinutes);
        }
    }

    // Calculate earned break BEFORE showing any messages
    earnedBreakTime = calculateBreakTime(currentSeconds);

    // Only play completion sound if the timer reached max time or playSound is true
    if (currentSeconds >= MAX_TIME || playSound) {
        window.playSound('pomodoroComplete');
        showMuteAlert(`Great work! You worked for ${workMinutes} minutes and earned a ${earnedBreakTime}-minute break!`);
        
        // Desktop notification for max time reached
        if ('Notification' in window && Notification.permission === 'granted') {
            const alarmEnabled = localStorage.getItem('alarm') !== 'false';
            if (alarmEnabled) {
                new Notification('🎉 Max Time Reached!', {
                    body: `You worked for ${workMinutes} minutes! Time for a ${earnedBreakTime}-minute break.`,
                    icon: '/images/badges/1.webp',
                    vibrate: [100, 50, 100]
                });
            }
        }
    }

    showToast(`Great work! You worked for ${workMinutes} minutes and earned a ${earnedBreakTime}-minute break! 🎉`);

    switchMode('break');

    // Auto-start the break if enabled in settings - Fixed logic
    const autoBreaks = localStorage.getItem('autoBreak') === 'true';
    console.log('🔄 Auto-break check:', { autoBreaks, setting: localStorage.getItem('autoBreak') });
    
    if (earnedBreakTime > 0 && autoBreaks) {
        console.log('✅ Auto-starting break timer');
        setTimeout(() => toggleTimer(), 500);
    } else {
        console.log('⏸️ Auto-break disabled or no break time earned');
    }
}

// Complete break
function completeBreak() {
    clearInterval(timerInterval);
    isRunning = false;
    timerState = 'idle';
    
    // Stop timer sound
    stopTimerSound();
    
    // MIDNIGHT: Reset midnight tracking
    if (typeof window.resetMidnightTracking === 'function') {
      window.resetMidnightTracking();
    }
    
    // Play completion sound when break is done
    playSound('breakComplete');
    
    // Show break readiness confirmation instead of regular mute alert
    showBreakReadinessConfirmation("Break time is over! Ready to work again?");
    
    // Desktop notification for break completion
    if ('Notification' in window && Notification.permission === 'granted') {
        const alarmEnabled = localStorage.getItem('alarm') !== 'false';
        if (alarmEnabled) {
            new Notification('⏰ Break Complete!', {
                body: 'Ready to start another work session?',
                icon: '/images/badges/2.webp',
                vibrate: [100, 50, 100]
            });
        }
    }
    
    showToast("Break time is over! Ready to work again? 💪");
    switchMode('reverse'); // Also detected as automatic transition
}

// Reset timer
function resetTimer(showMessage = false) {
    clearInterval(timerInterval);
    
    // Clear timestamp variables
    timerStartTime = null;
    timerEndTime = null;
    pausedTimeRemaining = null;
    
    // MIDNIGHT: Reset midnight tracking
    if (typeof window.resetMidnightTracking === 'function') {
      window.resetMidnightTracking();
    }
    
    isRunning = false;
    currentSeconds = 0;
    timerState = 'idle';
    
    // Sync with settings and update UI
    window.updateTimerAndUIFromSettings();
    
    updateFavicon('paused');
    updateButtonDisplay();
    
    // Reset and hide burn-up tracker
    resetBurnupTracker();
    hideBurnupTracker();
    
    // Stop timer sound
    stopTimerSound();
    
    // Also update locked in mode if active
    if (window.lockedInMode && window.lockedInMode.isActive()) {
      window.lockedInMode.update('00:00', 0, 'START');
    }
    
    // Only show toast message when explicitly requested (user clicked reset)
    if (showMessage) {
        showToast("Timer reset 🔄");
    }
}

// Switch between reverse and break modes with validation
function switchMode(mode) {
  // Don't show task deletion confirmation for automatic mode changes
  const isAutoSwitch = 
    // If we're coming from a completed session
    (currentMode === 'reverse' && mode === 'break' && currentSeconds >= MAX_TIME) || 
    // If we're coming from a completed break
    (currentMode === 'break' && mode === 'reverse' && currentSeconds <= 0);
  
  // Show confirmation for both running and paused timers (unless it's an auto switch)
  if ((isRunning || timerState === 'paused') && !isAutoSwitch) {
    let message = '';
    if (isRunning) {
      message = 'Timer is still running. Are you sure you want to switch modes? This will reset your current progress.';
    } else if (timerState === 'paused') {
      message = 'Timer is paused with unsaved progress. Are you sure you want to switch modes? This will reset your current progress.';
    }
    const confirmed = confirm(message);
    if (!confirmed) return;
  }

  // No longer prompt about task deletion when switching between timer/break modes
  // Save current tasks before switching modes
  saveTasks();

  currentMode = mode;
  reverseTab.classList.toggle('active', mode === 'reverse');
  breakTab.classList.toggle('active', mode === 'break');
  
  // Reset timer state
  clearInterval(timerInterval);
  isRunning = false;
  timerState = 'idle';
  
  // Clear timestamp variables
  timerStartTime = null;
  timerEndTime = null;
  pausedTimeRemaining = null;
  
  // Reset and hide burn-up tracker when switching modes
  resetBurnupTracker();
  hideBurnupTracker();
  
  // Stop timer sound
  stopTimerSound();
  
  if (mode === 'break') {
    currentSeconds = earnedBreakTime * 60;
    initialSeconds = currentSeconds;
  } else {
    currentSeconds = 0;
    initialSeconds = MAX_TIME;
  }
  
  updateDisplay();
  updateButtonDisplay();
  
  // Exit locked in mode when switching modes
  if (window.lockedInMode && window.lockedInMode.isActive()) {
    window.lockedInMode.exit();
  }
}

// Functions to save and load tasks from localStorage
function saveTasks() {
  const taskItems = Array.from(taskList.children).map(taskItem => {
    const text = taskItem.querySelector('.task-text').textContent;
    const completed = taskItem.querySelector('.task-checkbox').checked;
    const descElem = taskItem.querySelector('.task-description');
    const description = descElem ? descElem.textContent : '';
    return { text, completed, description };
  });
  
  localStorage.setItem('reverseTasks', JSON.stringify(taskItems));
  console.log('Tasks saved to localStorage:', taskItems);
}

function loadTasks() {
  const savedTasks = localStorage.getItem('reverseTasks');
  if (savedTasks) {
    try {
      const taskItems = JSON.parse(savedTasks);
      taskList.innerHTML = '';
      taskItems.forEach(task => {
        createTaskElement(task.text, task.completed, task.description);
      });
      updateUnfinishedTasks();
      console.log('Tasks loaded from localStorage:', taskItems);
    } catch (error) {
      console.error('Error loading tasks from localStorage:', error);
    }
  }
}

// Create task element - now supports description
function createTaskElement(title, completed = false, description = '') {
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
        saveTasks();
    });

    // Enhanced: wrap text and description in a .task-content div for better styling
    const contentDiv = document.createElement('div');
    contentDiv.className = 'task-content';

    const textElement = document.createElement('span');
    textElement.className = 'task-text';
    textElement.textContent = title;

    // Enhanced: Description element with new class and pre-wrap
    let descElement = null;
    if (description && description.trim() !== '') {
        descElement = document.createElement('div');
        descElement.className = 'task-description';
        descElement.textContent = description;
    }

    contentDiv.appendChild(textElement);
    if (descElement) contentDiv.appendChild(descElement);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'task-delete';
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete this task?')) {
            // If this is the focused task, clear the focus
            if (currentFocusedTaskElement === taskItem) {
                clearCurrentFocusedTask();
            }
            taskList.removeChild(taskItem);
            updateUnfinishedTasks();
            saveTasks();
        }
      });

    // Add click event to focus/unfocus this task
    taskItem.addEventListener('click', (e) => {
      // Don't trigger focus when clicking on checkbox or delete button
      if (e.target.type === 'checkbox' || e.target.classList.contains('task-delete')) {
        return;
      }

      // Toggle focus: if already focused, clear; otherwise, set
      if (taskItem.classList.contains('task-focused')) {
        clearCurrentFocusedTask();
      } else {
        setCurrentFocusedTask(taskItem, textElement.textContent);
      }
    });
  
      // Add right-click context menu to clear focus
      taskItem.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          if (taskItem.classList.contains('task-focused')) {
              if (confirm('Clear this task as your current focus?')) {
                  clearCurrentFocusedTask();
              }
          }
      });
  
      taskItem.appendChild(checkbox);
      taskItem.appendChild(contentDiv);
      taskItem.appendChild(deleteBtn);
  
      // Add drag & drop listeners
      addDragAndDropListeners(taskItem);
  
      taskList.appendChild(taskItem);
  }

// Add task to task list - now supports description and new textarea
function addTask() {
  const taskTitle = taskInput.value.trim();
  const taskDesc = taskDescInput.value.trim();

  if (taskTitle !== '') {
    createTaskElement(taskTitle, false, taskDesc);

    // Save tasks after adding a new task
    saveTasks();

    // Clear inputs
    taskInput.value = '';
    taskDescInput.value = '';
    hasUnsavedTasks = false;
    taskInput.focus();
  } else {
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

// Functions to handle task focusing
function setCurrentFocusedTask(taskElement, taskTitle) {
  // Remove previous focus styling
  if (currentFocusedTaskElement) {
      currentFocusedTaskElement.classList.remove('task-focused');
  }
  
  // Set new focused task
  currentFocusedTask = taskTitle;
  currentFocusedTaskElement = taskElement;
  
  // Add focus styling
  taskElement.classList.add('task-focused');
  
  // Update displays
  updateCurrentTaskDisplay();
  
  // Save focused task to localStorage
  localStorage.setItem('currentFocusedTask', taskTitle);
}

function clearCurrentFocusedTask() {
  currentFocusedTask = null;
  if (currentFocusedTaskElement) {
      currentFocusedTaskElement.classList.remove('task-focused');
      currentFocusedTaskElement = null;
  }
  updateCurrentTaskDisplay();
  localStorage.removeItem('currentFocusedTask');
}

function updateCurrentTaskDisplay() {
  if (currentFocusedTask && currentTaskDisplay && currentTaskTitle) {
      currentTaskTitle.textContent = currentFocusedTask;
      currentTaskDisplay.style.display = 'block';
  } else {
      if (currentTaskDisplay) {
          currentTaskDisplay.style.display = 'none';
      }
  }
}

function loadFocusedTask() {
  const savedFocusedTask = localStorage.getItem('currentFocusedTask');
  if (savedFocusedTask) {
      // Find the task element that matches the saved task
      const taskElements = Array.from(taskList.children);
      const matchingTaskElement = taskElements.find(taskElement => {
          const taskText = taskElement.querySelector('.task-text');
          return taskText && taskText.textContent === savedFocusedTask;
      });
      
      if (matchingTaskElement) {
          setCurrentFocusedTask(matchingTaskElement, savedFocusedTask);
      } else {
          // Task no longer exists, clear the saved focused task
          localStorage.removeItem('currentFocusedTask');
      }
  }
}

// Event listeners
startButton.addEventListener('click', handleStart);
pauseButton.addEventListener('click', handlePause);
resumeButton.addEventListener('click', handleResume);
stopButton.addEventListener('click', handleStop);
resetButton.addEventListener('click', () => resetTimer(true)); // Explicitly show message for button click
reverseTab.addEventListener('click', () => switchMode('reverse'));
breakTab.addEventListener('click', () => switchMode('break'));

// Add task event listeners
addTaskBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
});
taskInput.addEventListener('input', () => {
    hasUnsavedTasks = taskInput.value.trim().length > 0 || (taskDescInput && taskDescInput.value.trim().length > 0);
});
if (taskDescInput) {
    // Enhanced: Support Shift+Enter for new line, Enter to add task
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

// Add click sounds to buttons
document.querySelectorAll('.time-btn, .secondary-btn, .tab').forEach(button => {
    button.addEventListener('click', () => {
        playSound('click');
    });
});

// Make the playSound function available globally
window.playSound = playSound;

// Handle page leave/refresh
window.addEventListener('beforeunload', (e) => {
  // Show warning for both running and paused timers (user has unsaved progress)
  if (isRunning || timerState === 'paused') {
    e.preventDefault();
    let message = '';
    if (isRunning) message = 'Timer is still running.';
    else if (timerState === 'paused') message = 'Timer is paused with unsaved progress.';
    if (hasUnsavedTasks) message = 'You have unsaved tasks.';
    if (hasUnfinishedTasks) message = 'You have unfinished tasks.';
    e.returnValue = `${message} Changes you made may not be saved. Are you sure you want to leave?`;
    return e.returnValue;
  }
});

// Update the link handler for mode switching with task retention
document.addEventListener('DOMContentLoaded', function() {
  const switchBtn = document.querySelector('.switch-btn');
  if (switchBtn) {
    switchBtn.addEventListener('click', async (e) => {
      e.preventDefault(); // Always prevent default navigation
      
      const targetUrl = switchBtn.href;
      const targetMode = switchBtn.textContent.includes('Classic') ? 'Classic Pomodoro' : 'Reverse Pomodoro';
      
      // Check for running or paused timer first
      if (isRunning || timerState === 'paused') {
        let message = '';
        if (isRunning) {
          message = 'Timer is still running. Are you sure you want to switch to a different timer type? This will reset your progress.';
        } else if (timerState === 'paused') {
          message = 'Timer is paused with unsaved progress. Are you sure you want to switch to a different timer type? This will reset your progress.';
        }
        const confirmed = confirm(message);
        if (!confirmed) {
          return;
        }
      }
      
      // Check if we have task retention manager and tasks
      if (window.taskRetentionManager && taskList.children.length > 0) {
        // Use task retention system
        await window.taskRetentionManager.handleModeSwitch(targetUrl, targetMode);
      } else {
        // Fallback to original behavior for no tasks or no retention manager
        window.location.href = targetUrl;
      }
    });
  }
});

// Update sound volumes based on shared settings
function updateSoundVolumes() {
    // Use separate keys for sound settings
    const pomodoroVolume = localStorage.getItem('pomodoroVolume') ? 
                          parseInt(localStorage.getItem('pomodoroVolume')) / 100 : 0.6;
    const breakVolume = localStorage.getItem('breakVolume') ? 
                       parseInt(localStorage.getItem('breakVolume')) / 100 : 0.6;
    
    // Explicitly check for 'false' string to handle resets properly
    const soundEffectsEnabled = localStorage.getItem('soundEffects') !== 'false';
    const alarmEnabled = localStorage.getItem('alarm') !== 'false';
    
    // Update alarm sounds when settings change
    const selectedPomodoroSound = localStorage.getItem('pomodoroSound') || 'bell.mp3';
    const selectedBreakSound = localStorage.getItem('breakSound') || 'bell.mp3';
    updatePomodoroAlarmSound(selectedPomodoroSound);
    updateBreakAlarmSound(selectedBreakSound);
    
    // Set volumes based on settings (use pomodoroVolume for UI sounds)
    sounds.click.volume = soundEffectsEnabled ? pomodoroVolume * 0.5 : 0;
    sounds.start.volume = soundEffectsEnabled ? pomodoroVolume * 0.6 : 0;
    sounds.pause.volume = soundEffectsEnabled ? pomodoroVolume * 0.5 : 0;
    sounds.pomodoroComplete.volume = alarmEnabled ? pomodoroVolume : 0;
    sounds.breakComplete.volume = alarmEnabled ? breakVolume : 0;
    
    console.log("Reverse Timer: Sound volumes updated:", { 
        pomodoroVolume: pomodoroVolume,
        breakVolume: breakVolume,
        soundEffectsEnabled: soundEffectsEnabled,
        alarmEnabled: alarmEnabled,
        pomodoroSound: selectedPomodoroSound,
        breakSound: selectedBreakSound,
        clickVolume: sounds.click.volume,
        startVolume: sounds.start.volume,
        pauseVolume: sounds.pause.volume,
        pomodoroCompleteVolume: sounds.pomodoroComplete.volume,
        breakCompleteVolume: sounds.breakComplete.volume
    });
}

// Expose the updateAlarmSound functions for settings.js
window.updatePomodoroAlarmSound = updatePomodoroAlarmSound;
window.updateBreakAlarmSound = updateBreakAlarmSound;
window.updateSoundVolumes = updateSoundVolumes;

// Mute alert elements
const muteAlertOverlay = document.getElementById('mute-alert-overlay');
const muteAlertMessage = document.getElementById('mute-alert-message');
const muteAlertBtn = document.getElementById('mute-alert-btn');
const dismissAlertBtn = document.getElementById('dismiss-alert-btn');
const muteAlertCloseBtn = document.getElementById('mute-alert-close'); // Add reference to close button

// Motivational alert elements
const motivationalAlertOverlay = document.getElementById('motivational-alert-overlay');
const motivationalAlertMessage = document.getElementById('motivational-alert-message');
const motivationalAlertBtn = document.getElementById('motivational-alert-btn');

// Show mute alert modal
function showMuteAlert(message) {
  if (muteAlertMessage) muteAlertMessage.textContent = message;
  
  // Reset button text and event listeners for normal mute alert
  const dismissBtn = document.getElementById('dismiss-alert-btn');
  const muteBtn = document.getElementById('mute-alert-btn');
  const closeBtn = document.getElementById('mute-alert-close');
  
  if (dismissBtn) {
    dismissBtn.textContent = 'Dismiss';
    // Remove existing event listeners
    dismissBtn.replaceWith(dismissBtn.cloneNode(true));
    const newDismissBtn = document.getElementById('dismiss-alert-btn');
    newDismissBtn.addEventListener('click', hideMuteAlert);
  }
  
  if (muteBtn) {
    muteBtn.textContent = 'Mute Sound & Dismiss';
    // Remove existing event listeners
    muteBtn.replaceWith(muteBtn.cloneNode(true));
    const newMuteBtn = document.getElementById('mute-alert-btn');
    newMuteBtn.addEventListener('click', muteAlarm);
  }
  
  if (closeBtn) {
    // Remove existing event listeners
    closeBtn.replaceWith(closeBtn.cloneNode(true));
    const newCloseBtn = document.getElementById('mute-alert-close');
    newCloseBtn.addEventListener('click', hideMuteAlert);
  }
  
  if (muteAlertOverlay) muteAlertOverlay.classList.add('show');
  
  // Auto-dismiss after 15 seconds
  setTimeout(() => {
    hideMuteAlert();
  }, 15000);
}

// Hide mute alert modal
function hideMuteAlert() {
  if (muteAlertOverlay) muteAlertOverlay.classList.remove('show');
}

// Show motivational alert modal
function showMotivationalAlert(message) {
  if (motivationalAlertMessage) motivationalAlertMessage.textContent = message;
  if (motivationalAlertOverlay) motivationalAlertOverlay.classList.add('show');
}

// Hide motivational alert modal
function hideMotivationalAlert() {
  if (motivationalAlertOverlay) motivationalAlertOverlay.classList.remove('show');
}

// Mute the currently playing alarm
function muteAlarm() {
  // Stop both alarm sounds (same as Classic version)
  if (sounds.pomodoroComplete) {
    sounds.pomodoroComplete.pause();
    sounds.pomodoroComplete.currentTime = 0;
  }
  if (sounds.breakComplete) {
    sounds.breakComplete.pause();
    sounds.breakComplete.currentTime = 0;
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

// Add event listener for motivational alert button
if (motivationalAlertBtn) {
  motivationalAlertBtn.addEventListener('click', () => {
    hideMotivationalAlert();
    // After motivational alert is dismissed, show the break readiness confirmation again
    const currentMessage = "Break time is over! Ready to work again?";
    setTimeout(() => {
      showBreakReadinessConfirmation(currentMessage);
    }, 300);
  });
}

// Motivational messages for break readiness confirmation
const motivationalMessages = [
  "Time to focus! You've got this! 💪",
  "Let's make this session count! 🎯",
  "Your future self will thank you! ⭐",
  "Stay focused, stay awesome! 🚀",
  "Small steps, big results! 🌟",
  "The deadlines won't wait for you! 📚⏰",
  "Your future self is judging you right now 👀",
  "Even your coffee is getting cold waiting for you ☕😤",
  "Your textbooks are crying from neglect 📖😢",
  "Procrastination is not a life strategy! 🚫⏰",
  "Your goals are waiting... impatiently 🎯😤",
  "Netflix will still be there after you study! 📺📚",
  "Your brain needs this workout! 🧠💪",
  "Time to turn those dreams into deadlines! ⏰✨",
  "Your success story is waiting to be written! 📖🎯"
];

// New break readiness confirmation function
function showBreakReadinessConfirmation(message) {
  // Update the modal content
  if (muteAlertMessage) muteAlertMessage.textContent = message;

  // Change button text and functionality for break readiness
  const dismissBtn = document.getElementById('dismiss-alert-btn');
  const muteBtn = document.getElementById('mute-alert-btn');

  if (dismissBtn) {
    dismissBtn.textContent = 'No, not ready';
    // Remove existing event listeners
    dismissBtn.replaceWith(dismissBtn.cloneNode(true));
    const newDismissBtn = document.getElementById('dismiss-alert-btn');
    newDismissBtn.addEventListener('click', () => {
      // Show random motivational message in dedicated modal, then show dialog again
      const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
      showMotivationalAlert(randomMessage);
      // The motivational alert button will handle returning to confirmation
    });
  }

  if (muteBtn) {
    muteBtn.textContent = 'Mute Sound & Dismiss';
    // Remove existing event listeners
    muteBtn.replaceWith(muteBtn.cloneNode(true));
    const newMuteBtn = document.getElementById('mute-alert-btn');
    newMuteBtn.addEventListener('click', () => {
      // Mute sound and close modal - DO NOT switch modes
      muteAlarm();
      // Mode switching happens automatically in completeBreak
    });
  }

  // Update close button to proceed normally
  if (muteAlertCloseBtn) {
    muteAlertCloseBtn.replaceWith(muteAlertCloseBtn.cloneNode(true));
    const newCloseBtn = document.getElementById('mute-alert-close');
    newCloseBtn.addEventListener('click', () => {
      hideMuteAlert();
      // Continue with normal flow (switch to work mode)
      if (currentMode !== 'reverse') {
        switchMode('reverse');
      }
    });
  }

  // Show the modal
  if (muteAlertOverlay) muteAlertOverlay.classList.add('show');

  // Auto-dismiss after 30 seconds and proceed normally
  setTimeout(() => {
    hideMuteAlert();
    if (currentMode !== 'reverse') {
      switchMode('reverse');
    }
  }, 30000);
}

// Initialize display
// This is the single source of truth for updating the timer state and UI from settings.
window.updateTimerAndUIFromSettings = function() {
    const breakLogicMode = localStorage.getItem('breakLogicMode') || 'default';
    const savedMaxMinutes = parseInt(localStorage.getItem('reverseMaxTime')) || 60;

    const maxMinutes = breakLogicMode === 'default' ? 60 : savedMaxMinutes;
    MAX_TIME = maxMinutes * 60;
    
    // Update totalTime for the Burn-Up Tracker to ensure synchronization
    // Only update totalTime if we're in reverse mode, otherwise leave it as is for break mode
    if (currentMode === 'reverse') {
        totalTime = MAX_TIME;
    }

    // Only reset timer values if we're not running AND we're in reverse mode
    // This preserves the break time when in break mode
    if (!isRunning && currentMode === 'reverse') {
        initialSeconds = MAX_TIME;
        currentSeconds = 0;
    }

    // Update UI elements
    const maxTimeDisplay = document.querySelector('.max-time');
    if (maxTimeDisplay) {
        const hours = Math.floor(maxMinutes / 60);
        const mins = maxMinutes % 60;
        const timeString = hours > 0
            ? `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`
            : `${mins.toString().padStart(2, '0')}:00`;
        maxTimeDisplay.textContent = `Current Max Time: ${timeString}`;
    }

    if (burnupPlannedTime) {
        const hours = Math.floor(maxMinutes / 60);
        const mins = maxMinutes % 60;
        const estString = hours > 0
            ? `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`
            : `${maxMinutes.toString().padStart(2, '0')}:00`;
        burnupPlannedTime.textContent = estString;
    }
    
    // Refresh the Burn-Up Tracker UI
    updateDisplay();
    
    // If the Burn-Up Tracker is visible, update it with the new settings
    if (isBurnupTrackerEnabled && burnupTracker && burnupTracker.style.display === 'block') {
        resetBurnupTracker();
        updateBurnupTracker();
    }
}

// Initialize reverse timer page
document.addEventListener('DOMContentLoaded', function() {
  // Initialize tracker design if available
  if (window.trackerDesignManager) {
    setTimeout(() => {
      const savedDesign = window.trackerDesignManager.getCurrentDesign();
      window.trackerDesignManager.applyDesign(savedDesign);
    }, 100); // Small delay to ensure DOM is fully ready
  }
  
  // Load saved tasks
  loadTasks();

  // Load focused task after tasks are loaded
  loadFocusedTask();
  
  console.log("Reverse timer initialized");
  
  // Clear any running timers from other pages
  clearInterval(timerInterval);
  isRunning = false;
  timerState = 'idle';
  
  // Initial UI sync on page load
  window.updateTimerAndUIFromSettings();
  updateButtonDisplay();
});

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
      resetTimer(true); // User pressed R key, show message
    }
  }
});

// Add Page Visibility API for accurate timer tracking when tab becomes active
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && isRunning) {
    // Tab became visible - recalculate immediately
    updateTimerFromTimestamp();
  }
});



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



//-------------------------------------------CONTRIB CODES-------------------------------------------------------------//

// === CENTRALIZED DATE HANDLING ===
// All date operations go through these functions to ensure consistency

// Get current date in user's local timezone (replaces getPHToday)
// Now uses TimezoneManager instead of hardcoded Asia/Manila
function getPHToday() {
  return window.timezoneManager.getUserToday();
}

// Convert any date to YYYY-MM-DD string
// Now uses TimezoneManager for consistent formatting
function formatDateKey(date) {
  return window.timezoneManager.formatDateKey(date);
}

// Convert YYYY-MM-DD string back to Date object (always in local timezone)
function parseDataKey(dateStrWithSuffix) {
  const [year, month, day] = dateStrWithSuffix.split('-').map(num => parseInt(num));
  return new Date(year, month - 1, day); // month is 0-indexed
}

// Format date for display in PH locale (short month for compact cards)
function formatDateDisplay(date) {
  return date.toLocaleDateString('en-US', {
    month: 'short', // e.g. Aug instead of August
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

// Get stats from localStorage using TimezoneManager
function getStats() {
  return window.timezoneManager.getStats();
}

// Calculate total focus points and date range
function getTotalFocusPointsAndRange() {
  const stats = getStats();
  const keys = Object.keys(stats).sort();

  // Sum all minutes first, then calculate focus points
  let totalMinutes = 0;
  keys.forEach(k => {
    totalMinutes += (stats[k].total_minutes || 0);
  });
  const totalPoints = Math.floor(totalMinutes / 5);

  const start = keys.length ? keys[0] : null;
  const end = keys.length ? keys[keys.length - 1] : null;
  const todayKey = formatDateKey(getPHToday());

  // GitHub-style: always show first contribution date to Present (today),
  // even if there's no activity today.
  let range = '';
  if (start) {
    const startDate = parseDataKey(start);
    const startDisplay = formatDateDisplay(startDate);
    range = `${startDisplay} - Present`;
  }

  return { totalPoints, range };
}

// Calculate current streak and its date range
function getCurrentStreakAndRange() {
  const stats = getStats();
  const today = getPHToday();
  let streak = 0;
  let d = new Date(today);
  let end = null;
  let start = null;

  function hasActivity(date) {
    const key = formatDateKey(date);
    return stats[key] && stats[key].total_minutes > 0;
  }

  if (hasActivity(d)) {
    while (hasActivity(d)) {
      if (!end) end = new Date(d);
      start = new Date(d);
      streak++;
      d.setDate(d.getDate() - 1);
    }
  } else {
    d.setDate(d.getDate() - 1);
    if (hasActivity(d)) {
      while (hasActivity(d)) {
        if (!end) end = new Date(d);
        start = new Date(d);
        streak++;
        d.setDate(d.getDate() - 1);
      }
    } else {
      streak = 0;
      start = null;
      end = null;
    }
  }

  let range = '';
  if (streak === 1 && start) {
    range = formatDateDisplay(start);
  } else if (streak > 1 && start && end) {
    range = `${formatDateDisplay(start)} - ${formatDateDisplay(end)}`;
  }

  return {
    streak,
    range
  };
}

// Calculate longest streak and its date range
function getLongestStreakAndRange() {
  const stats = getStats();
  const keys = Object.keys(stats).sort(); // oldest to newest
  let maxStreak = 0;
  let currentStreak = 0;
  let maxStart = null, maxEnd = null;
  let curStart = null, curEnd = null;

  let prevDate = null;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const date = parseDataKey(key);

    if (stats[key] && stats[key].total_minutes > 0) {
      if (
        prevDate &&
        (date - prevDate) / (1000 * 60 * 60 * 24) === 1 // consecutive day
      ) {
        currentStreak++;
        curEnd = date;
      } else {
        currentStreak = 1;
        curStart = date;
        curEnd = date;
      }

      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
        maxStart = new Date(curStart);
        maxEnd = new Date(curEnd);
      }
    } else {
      currentStreak = 0;
      curStart = null;
      curEnd = null;
    }
    prevDate = date;
  }

  // If the longest streak is only 1, collect all single-day streak dates
  let range = '';
  if (maxStreak === 1) {
    const singleStreakDates = keys
      .filter(k => stats[k] && stats[k].total_minutes > 0)
      .map(k => formatDateDisplay(parseDataKey(k)));
    range = singleStreakDates.join(', ');
  } else if (maxStreak > 1) {
    range = `${formatDateDisplay(maxStart)} - ${formatDateDisplay(maxEnd)}`;
  }

  return {
    streak: maxStreak,
    range: range
  };
}

// Update the Streak Stats Card
function updateStreakStatsCard() {
  const total = getTotalFocusPointsAndRange();
  const current = getCurrentStreakAndRange();
  const longest = getLongestStreakAndRange();

  document.getElementById('streak-total').textContent = total.totalPoints;
  document.getElementById('streak-total-date').textContent = total.range;
  document.getElementById('streak-current').textContent = current.streak;
  document.getElementById('streak-current-date').textContent = current.range;
  document.getElementById('streak-longest').textContent = longest.streak;
  document.getElementById('streak-longest-date').textContent = longest.range;
}

// Call this after DOMContentLoaded and whenever stats change
document.addEventListener('DOMContentLoaded', updateStreakStatsCard);
// Also call updateStreakStatsCard() after adding sessions or updating stats

// GitHub-style dynamic color scale based on personal peak (even quartiles)
function getColor(minutes, maxMinutes, emptyColor = "#ebedf0") {
    if (minutes === 0) return emptyColor; // Use theme-specific empty color
    if (maxMinutes === 0) return emptyColor;

    // Calculate even quartiles                           // If peak was 30 contributions for example
    const q1 = Math.max(1, Math.ceil(maxMinutes * 0.25)); // 25% threshold (7.5 = 8 contributions)
    const q2 = Math.max(1, Math.ceil(maxMinutes * 0.50)); // 50% threshold (15 contributions)
    const q3 = Math.max(1, Math.ceil(maxMinutes * 0.93)); // 93% threshold (28 contributions)

    if (minutes >= maxMinutes) return "#a4fba6";  // Brightest (personal best)
    if (minutes >= q3) return "#a4fba6";          // Very High
    if (minutes >= q2) return "#56D364";          // High
    if (minutes >= q1) return "#2EA043";          // Medium
    if (minutes > 0)   return "#196C2E";          // Minimal/Low

    return emptyColor;
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
  const startTime = performance.now();
  console.log('🎨 Starting contribution graph render...');
  
  const stats = getStats();
  console.log('Current stats:', stats); // Debug log
  
  let dates;
  if (showAllData) {
    dates = getAllAvailableDates();
    if (dates.length === 0) dates = getDatesForHeatmap();
  } else {
    dates = getDatesForHeatmap();
  }
  
  // Performance warning for large datasets
  const statsCount = Object.keys(stats).length;
  const datesCount = dates.length;
  
  if (statsCount > 100 || datesCount > 365) {
    console.warn(`⚠️ Large dataset detected: ${statsCount} stat days, ${datesCount} graph days`);
    console.warn('This may cause performance issues - consider optimizing');
  }

  // STREAK! Duolingo-style streak display
function calculateCurrentStreak() {
  const stats = getStats();
  const today = getPHToday(); // Use the same date function as working streak calculation
  let streak = 0;
  let d = new Date(today);

  function hasActivity(date) {
    const key = formatDateKey(date);
    return stats[key] && stats[key].total_minutes > 0;
  }

  console.log('🔥 Calculating Duolingo streak from:', formatDateKey(today));
  console.log('📊 Available stats keys:', Object.keys(stats));
  console.log('📊 Raw stats data:', stats);

  if (hasActivity(d)) {
    console.log('✅ Today has activity, counting backward...');
    while (hasActivity(d)) {
      streak++;
      console.log(`  📈 Day ${formatDateKey(d)}: ${stats[formatDateKey(d)]?.total_minutes || 0} mins - Streak: ${streak}`);
      d.setDate(d.getDate() - 1);
    }
  } else {
    console.log('❌ Today has no activity, checking yesterday...');
    d.setDate(d.getDate() - 1);
    if (hasActivity(d)) {
      console.log('✅ Yesterday has activity, counting backward...');
      while (hasActivity(d)) {
        streak++;
        console.log(`  📈 Day ${formatDateKey(d)}: ${stats[formatDateKey(d)]?.total_minutes || 0} mins - Streak: ${streak}`);
        d.setDate(d.getDate() - 1);
      }
    } else {
      console.log('💥 No recent activity found');
      streak = 0;
    }
  }
  
  console.log('🎯 Final Duolingo streak:', streak);
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
        <span class="duo-streak-label">— No streak yet</span>
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

// Expose streak display function globally
window.renderStreakDisplay = renderStreakDisplay;

// Initial render on page load
document.addEventListener('DOMContentLoaded', renderStreakDisplay);

// Listen for sync events to update streak display
document.addEventListener('DOMContentLoaded', () => {
  // Listen for auth events to update streak
  if (window.authService) {
    window.authService.addEventListener((event, data) => {
      if (event === 'login' || event === 'restore') {
        console.log('🔥 Auth event detected, updating streak display in 500ms');
        setTimeout(() => {
          if (typeof renderStreakDisplay === 'function') {
            renderStreakDisplay();
          }
        }, 500); // Give time for sync to complete
      }
    });
  }
  
  // Listen for sync events to update streak
  if (window.syncManager) {
    window.syncManager.addEventListener((event, data) => {
      if (event === 'sync-complete' || event === 'initial-sync-complete') {
        console.log('🔥 Sync event detected, updating streak display');
        setTimeout(() => {
          if (typeof renderStreakDisplay === 'function') {
            renderStreakDisplay();
          }
        }, 100);
      }
    });
  }
});

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

  // SVG - Use array for better performance with large datasets
  const svgParts = [`<svg width="${width}" height="${height}" style="font-family:sans-serif;background:${bgColor};min-width:${minGraphWidth}px;display:block;">`];

  // Month labels (top)
  monthLabels.forEach(label => {
    const x = leftPad + label.x * (cellSize + cellGap);
    svgParts.push(`<text x="${x}" y="15" fill="${labelColor}" font-size="11" font-weight="500">${label.month}</text>`);
  });

  // Day labels (left, accurate)
  dayLabelIndexes.forEach(idx => {
    const y = topPad + idx * (cellSize + cellGap) + cellSize / 2 + 3;
    svgParts.push(`<text x="4" y="${y}" fill="${labelColor}" font-size="11" font-weight="500" text-anchor="start">${dayLabelsAccurate[idx]}</text>`);
  });

  // Store date objects for tooltip use
  const dateMap = new Map();

// Cells (weeks: left=oldest, right=latest)
weeks.forEach((week, x) => {
    week.forEach((date, y) => {
      const key = formatDateKey(date);
      const dayStats = stats[key] || { classic: 0, reverse: 0, break: 0, total_minutes: 0 };
      const minutes = dayStats.total_minutes || 0;
      
      // Show any activity with decimal Focus Points for under 5 minutes
      let points;
      if (minutes === 0) {
        points = 0;
      } else if (minutes < 5) {
        points = (minutes / 5).toFixed(1); // e.g., 2 mins = 0.4 Focus Points
      } else {
        points = Math.floor(minutes / 5); // e.g., 12 mins = 2 Focus Points
      }
      
      // For color calculation, treat any activity as at least 1 for visual purposes
      const colorPoints = minutes > 0 ? Math.max(1, Math.floor(minutes / 5)) : 0;
      const color = getColor(colorPoints, Math.floor(maxMinutes / 5), emptyCell);
      
      // Store the original date object for tooltip
      dateMap.set(key, date);
      
      console.log(`Date: ${key}, Minutes: ${minutes}, Points: ${points}, Color: ${color}`);
      
      const cellX = leftPad + x * (cellSize + cellGap);
      const cellY = topPad + y * (cellSize + cellGap);
      svgParts.push(`<rect x="${cellX}" y="${cellY}" width="${cellSize}" height="${cellSize}" rx="3" fill="${color}" stroke="${cellBorder}" stroke-width="1" data-date="${key}" data-classic="${dayStats.classic}" data-reverse="${dayStats.reverse}" data-break="${dayStats.break}" data-minutes="${minutes}" data-points="${points}" style="cursor:pointer;"/>`);
    });
  });

  svgParts.push(`</svg>`);
  
  // Join array once at the end for better performance
  const svg = svgParts.join('');

  // Legend (GitHub style with theme-appropriate empty color)
  const legend = `
    <div style="display:flex;align-items:center;gap:6px;margin-top:-25px;font-size:12px;color:${labelColor};">
      Less
      <span style="display:inline-block;width:12px;height:12px;background:${emptyCell};border-radius:2px;border:1px solid ${cellBorder};"></span>
      <span style="display:inline-block;width:12px;height:12px;background:#196C2E;border-radius:2px;border:1px solid ${cellBorder};"></span>
      <span style="display:inline-block;width:12px;height:12px;background:#2EA043;border-radius:2px;border:1px solid ${cellBorder};"></span>
      <span style="display:inline-block;width:12px;height:12px;background:#56D364;border-radius:2px;border:1px solid ${cellBorder};"></span>
      <span style="display:inline-block;width:12px;height:12px;background:#a4fba6;border-radius:2px;border:1px solid ${cellBorder};"></span>
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
    <td style="padding:2px 8px;border:1px solid #000;background:#1f2937;color:#fff;">0 FP</td>
    <td style="padding:2px 8px;border:1px solid #000;background:#ebedf0;color:#222;">Gray</td>
    <td style="padding:2px 8px;border:1px solid #000;background:#1f2937;color:#fff;">No Activity</td>
  </tr>
  <tr>
    <td style="padding:2px 8px;border:1px solid #000;background:#1f2937;color:#fff;">1–5 FP</td>
    <td style="padding:2px 8px;border:1px solid #000;background:#196C2E;color:#fff;">Low</td>
    <td style="padding:2px 8px;border:1px solid #000;background:#1f2937;color:#fff;">Minimal</td>
  </tr>
  <tr>
    <td style="padding:2px 8px;border:1px solid #000;background:#1f2937;color:#fff;">6–10 FP</td>
    <td style="padding:2px 8px;border:1px solid #000;background:#2EA043;color:#fff;">Medium</td>
    <td style="padding:2px 8px;border:1px solid #000;background:#1f2937;color:#fff;">Good</td>
  </tr>
  <tr>
    <td style="padding:2px 8px;border:1px solid #000;background:#1f2937;color:#fff;">11–19 FP</td>
    <td style="padding:2px 8px;border:1px solid #000;background:#56D364;color:#fff;">High</td>
    <td style="padding:2px 8px;border:1px solid #000;background:#1f2937;color:#fff;">Great</td>
  </tr>
  <tr>
    <td style="padding:2px 8px;border:1px solid #000;background:#1f2937;color:#fff;">20 FP</td>
    <td style="padding:2px 8px;border:1px solid #000;background:#a4fba6;color:#222;">Very High</td>
    <td style="padding:2px 8px;border:1px solid #000;background:#1f2937;color:#fff;">Almost Peak</td>
  </tr>
  <tr>
    <td style="padding:2px 8px;border:1px solid #000;background:#1f2937;color:#fff;">21 FP</td>
    <td style="padding:2px 8px;border:1px solid #000;background:#a4fba6;color:#222;">Highest</td>
    <td style="padding:2px 8px;border:1px solid #000;background:#1f2937;color:#fff;">Personal Best</td>
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

    // NEW APPROACH: Tooltip logic with better positioning using event delegation
    const tooltip = container.querySelector('#contribution-tooltip');
    const graphContainer = container.querySelector('.contribution-graph-scroll');
    
    // Remove any existing event listeners
    graphContainer.replaceWith(graphContainer.cloneNode(true));
    const newGraphContainer = container.querySelector('.contribution-graph-scroll');
    
    // Use event delegation for better performance with large datasets
    newGraphContainer.addEventListener('mouseenter', e => {
      if (e.target.tagName === 'rect' && e.target.dataset.date) {
        const rect = e.target;
        const d = rect.dataset;
        const dateKey = d.date;
        
        // Use the original date object we stored
        const dateObj = dateMap.get(dateKey);
        const day = dateObj.getDate();
        const month = dateObj.toLocaleString('en-US', { month: 'long' });
        const dateStrWithSuffix = `${month} ${day}${getOrdinalSuffix(day)}`;
        
        console.log(`Tooltip: Key=${dateKey}, Date=${dateObj}, Display=${dateStrWithSuffix}`); // Debug
        
const classicSessions = parseInt(d.classic) || 0;
const reverseSessions = parseInt(d.reverse) || 0;
const breakSessions = parseInt(d.break) || 0;
const totalMinutes = parseInt(d.minutes) || 0;
const totalPoints = parseFloat(d.points) || 0;

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
  // Format points display - show "2" instead of "2.0" but keep "0.4" as is
  const pointsDisplay = totalPoints % 1 === 0 ? 
    totalPoints.toString() : // Show "2" instead of "2.0"
    totalPoints.toString();   // Show "0.4" as is
    
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
        
// Calculate position relative to the scroll container
let tooltipX = rectBox.right - scrollBox.left + scrollContainer.scrollLeft + 16;
let tooltipY = rectBox.top - scrollBox.top + scrollContainer.scrollTop - 8;

// Set tooltip to absolute and append to scrollContainer if not already
tooltip.style.position = 'absolute';
if (tooltip.parentElement !== scrollContainer) {
  scrollContainer.appendChild(tooltip);
}

// Get actual tooltip size after setting content
tooltip.style.display = 'block';
tooltip.style.left = '0px';
tooltip.style.top = '0px';
const tooltipRect = tooltip.getBoundingClientRect();
const tooltipWidth = tooltipRect.width || 200;
const tooltipHeight = tooltipRect.height || 60;

// Adjust if off right edge of scroll container
if (tooltipX + tooltipWidth > scrollContainer.scrollWidth) {
  tooltipX = rectBox.left - scrollBox.left - tooltipWidth - 16 + scrollContainer.scrollLeft;
}
// Adjust if off bottom edge of scroll container
if (tooltipY + tooltipHeight > scrollContainer.scrollHeight) {
  tooltipY = scrollContainer.scrollHeight - tooltipHeight - 16;
}
if (tooltipY < 0) tooltipY = 8;

tooltip.style.left = tooltipX + 'px';
tooltip.style.top = tooltipY + 'px';
      }
    }, true);
    
    newGraphContainer.addEventListener('mouseleave', e => {
      if (e.target.tagName === 'rect' && e.target.dataset.date) {
        tooltip.style.display = 'none';
      }
    }, true);

    // Add toggle event
    const toggleBtn = container.querySelector('#toggle-graph-range');
    if (toggleBtn) {
      toggleBtn.onclick = function() {
        showAllData = !showAllData;
        renderContributionGraph();
      };
    }
  }
  
  // Performance logging
  const endTime = performance.now();
  const renderTime = endTime - startTime;
  console.log(`🎨 Contribution graph rendered in ${renderTime.toFixed(2)}ms`);
  
  if (renderTime > 50) {
    console.warn('⚠️ Slow rendering detected:', {
      renderTime: `${renderTime.toFixed(2)}ms`,
      statsCount,
      datesCount,
      suggestion: 'Consider optimizing for large datasets'
    });
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

// Session management using TimezoneManager for user's local timezone
// This ensures sessions are recorded in the user's actual timezone, not GMT+8
window.addCustomodoroSession = function(type, minutes) {
  return window.timezoneManager.addCustomodoroSession(type, minutes);
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


document.addEventListener('DOMContentLoaded', function() {
  if (window.renderContributionGraph) {
    window.renderContributionGraph();
  }
  if (window.setupThemeSync) {
    window.setupThemeSync();
  }
});