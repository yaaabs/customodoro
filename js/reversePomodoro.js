// Request notification permission
if ('Notification' in window) {
  Notification.requestPermission();
}

// Audio setup
const sounds = {
    click: new Audio('audio/SFX/start.wav'),
    start: new Audio('audio/SFX/start.wav'),
    pause: new Audio('audio/SFX/pause.wav'),
    complete: new Audio('audio/Alert Sounds/alarm.mp3')
};

// Add timer sound variables and functionality
const timerSounds = {
  //COMMENT ticking: new Audio('audio/Timer Sounds/WallClockTicking.mp3'),
  whitenoise: new Audio('audio/Timer Sounds/UnderWaterWhiteNoise.mp3'),
 //COMMENT brownnoise: new Audio('audio/Timer Sounds/SoftBrownNoise.mp3')
};

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

// Initialize sound settings from shared localStorage keys
function initializeSoundSettings() {
    const volume = localStorage.getItem('volume') ? 
                  parseInt(localStorage.getItem('volume')) / 100 : 0.6;
    
    // Explicitly check for 'false' string
    const soundEffectsEnabled = localStorage.getItem('soundEffects') !== 'false';
    const alarmEnabled = localStorage.getItem('alarm') !== 'false';
    
    // Get selected alarm sound or use default - FIXED: Load the sound properly
    const selectedAlarmSound = localStorage.getItem('alarmSound') || 'alarm.mp3';
    updateAlarmSound(selectedAlarmSound);
    
    // Set initial volumes
    sounds.click.volume = soundEffectsEnabled ? volume * 0.5 : 0;
    sounds.start.volume = soundEffectsEnabled ? volume * 0.6 : 0;
    sounds.pause.volume = soundEffectsEnabled ? volume * 0.5 : 0;
    sounds.complete.volume = alarmEnabled ? volume : 0;
    
    console.log(`Sound settings initialized for Reverse Timer:`, { 
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

// Function to specifically update the alarm sound
function updateAlarmSound(soundFileName) {
    // Create a new Audio object for the alarm instead of just changing the src
    sounds.complete = new Audio('audio/Alert Sounds/' + soundFileName);
    
    // Re-apply volume settings using shared keys
    const volume = localStorage.getItem('volume') ? 
                  parseInt(localStorage.getItem('volume')) / 100 : 0.6;
    const alarmEnabled = localStorage.getItem('alarm') !== 'false';
    sounds.complete.volume = alarmEnabled ? volume : 0;
    
    console.log(`Updated alarm sound to: ${soundFileName}`);
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
  /*  case 'brownnoise':
      sound = timerSounds.brownnoise;
      break;  */
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

// Call this function on startup
initializeSoundSettings();
initializeTimerSoundSettings();

// Play a sound with error handling and respect settings from shared keys
function playSound(soundName) {
    const sound = sounds[soundName];
    if (!sound) return;
    
    // Check if the sound should be played based on shared settings
    if (soundName === 'complete') {
        // For alarm sound
        if (localStorage.getItem('alarm') === 'false') {
            console.log('Alarm sounds disabled in settings');
            return;
        }
        
        // FIXED: Ensure we're using the latest alarm sound before playing
        const selectedAlarmSound = localStorage.getItem('alarmSound') || 'alarm.mp3';
        if (sound.src.indexOf(selectedAlarmSound) === -1) {
            updateAlarmSound(selectedAlarmSound);
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
    const minutes = Math.floor(currentSeconds / 60);
    const seconds = currentSeconds % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
            const minutes = Math.floor(elapsedTime / 60);
            const seconds = elapsedTime % 60;
            burnupSpentTime.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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

// Toggle timer
function toggleTimer() {
  if (!isRunning) {
    // Sync settings before starting, just in case
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
      isRunning = true;
    startButton.textContent = 'STOP';
    updateFavicon('running');
    
    // Show burn-up tracker when timer starts
    showBurnupTracker();
    
    // Play the appropriate timer sound
    playTimerSound();
    
    // Store reference to lockedInMode for delay implementation
    const lockedInModeRef = window.lockedInMode;
    
    // Enter locked in mode if enabled, but with a 1-second delay
    if (lockedInModeRef && lockedInModeRef.isEnabled()) {
      // Start a timeout to enter locked in mode after 1 second
      setTimeout(() => {
        if (isRunning && lockedInModeRef) {  // Check if still running after delay
          lockedInModeRef.enter();
        }
      }, 1000);
    }
    
    timerInterval = setInterval(() => {
      if (currentMode === 'break') {
        if (currentSeconds > 0) {
          currentSeconds--;
          updateDisplay();
          
          // Update locked in mode if active
          if (window.lockedInMode && window.lockedInMode.isActive()) {
            const minutes = Math.floor(currentSeconds / 60);
            const seconds = currentSeconds % 60;
            const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            const progress = ((initialSeconds - currentSeconds) / initialSeconds) * 100;
            window.lockedInMode.update(timeString, progress, startButton.textContent);
          }
        } else {
          completeBreak();
        }
      } else {
        if (currentSeconds < MAX_TIME) {
          currentSeconds++;
          updateDisplay();
          
          // Update locked in mode if active
          if (window.lockedInMode && window.lockedInMode.isActive()) {
            const minutes = Math.floor(currentSeconds / 60);
            const seconds = currentSeconds % 60;
            const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            const progress = (currentSeconds / MAX_TIME) * 100;
            window.lockedInMode.update(timeString, progress, startButton.textContent);
          }
        } else {
          completeSession();
        }
      }
    }, 1000);
  } else {
    playSound('pause');
    
    // Stop timer sound when pausing
    stopTimerSound();
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
    
    if (currentMode === 'reverse') {
      const breakLogicMode = localStorage.getItem('breakLogicMode') || 'default';
      const minutes = Math.floor(currentSeconds / 60);
      // The "less than 5 minutes" validation only applies to the default mode.
      if (breakLogicMode === 'default' && minutes < 5) {
        if (confirm('You worked less than 5 minutes. No break earned. Do you want to reset the timer?')) {
          resetTimer();
        }
      } else {
        completeSession(false); // For dynamic mode or if work is >= 5 mins in default.
      }
    }
  }
}

// Complete session
function completeSession(playSound = true) {
    clearInterval(timerInterval);
    isRunning = false;
    
    // Hide burn-up tracker when session completes
    hideBurnupTracker();
    
    // Stop timer sound
    stopTimerSound();
    
    // Only play completion sound if the timer reached max time or playSound is true
    if (currentSeconds >= MAX_TIME || playSound) {
        window.playSound('complete');
        
        // Show mute alert
        const workMinutes = Math.floor(currentSeconds / 60);
        showMuteAlert(`Great work! You worked for ${workMinutes} minutes and earned a ${earnedBreakTime}-minute break!`);
    }
    
    // Calculate earned break
    earnedBreakTime = calculateBreakTime(currentSeconds);
    
    const workMinutes = Math.floor(currentSeconds / 60);
    showToast(`Great work! You worked for ${workMinutes} minutes and earned a ${earnedBreakTime}-minute break! 🎉`);
    
    startButton.textContent = 'START';
    switchMode('break'); // The switchMode function will detect this as an automatic transition
    
    // Auto-start the break if enabled in settings (using shared key)
    const autoBreaks = localStorage.getItem('autoBreak') !== 'false';
    if (earnedBreakTime > 0 && autoBreaks) {
        setTimeout(() => toggleTimer(), 500);
    }
}

// Complete break
function completeBreak() {
    clearInterval(timerInterval);
    isRunning = false;
    
    // Stop timer sound
    stopTimerSound();
    
    // Play completion sound when break is done
    playSound('complete');
    
    // Show mute alert
    showMuteAlert("Break time is over! Ready to work again?");
    
    showToast("Break time is over! Ready to work again? 💪");
    startButton.textContent = 'START';
    switchMode('reverse'); // Also detected as automatic transition
}

// Reset timer
function resetTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    currentSeconds = 0;
    
    // Sync with settings and update UI
    window.updateTimerAndUIFromSettings();
    
    updateFavicon('paused');
    startButton.textContent = 'START';
    
    // Reset and hide burn-up tracker
    resetBurnupTracker();
    hideBurnupTracker();
    
    // Stop timer sound
    stopTimerSound();
    
    // Also update locked in mode if active
    if (window.lockedInMode && window.lockedInMode.isActive()) {
      window.lockedInMode.update('00:00', 0, 'START');
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
  
  if (isRunning && !isAutoSwitch) {
    const confirmed = confirm('Timer is still running. Are you sure you want to switch modes? This will reset your current progress.');
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
            taskList.removeChild(taskItem);
            updateUnfinishedTasks();
            saveTasks();
        }
    });

    taskItem.appendChild(checkbox);
    taskItem.appendChild(contentDiv);
    taskItem.appendChild(deleteBtn);

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

// Event listeners
startButton.addEventListener('click', toggleTimer);
resetButton.addEventListener('click', resetTimer);
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

// Update the link handler for mode switching to only warn about tasks when switching between major timer types (reverse/classic)
document.querySelector('.switch-btn').addEventListener('click', (e) => {
  // Only show confirmation when switching between major timer types (reverse/classic)
  if (isRunning) {
    const confirmed = confirm('Timer is still running. Are you sure you want to switch to a different timer type? This will reset your progress.');
    if (!confirmed) {
      e.preventDefault();
    }
  } else if (hasUnfinishedTasks || taskList.children.length > 0) {
    const confirmed = confirm('Switching to a different timer type will delete all your tasks. Do you want to continue?');
    if (!confirmed) {
      e.preventDefault();
    }
  }
});

// Update sound volumes based on shared settings
function updateSoundVolumes() {
    // Use shared keys for sound settings
    const volume = localStorage.getItem('volume') ? 
                  parseInt(localStorage.getItem('volume')) / 100 : 0.6;
    
    // Explicitly check for 'false' string to handle resets properly
    const soundEffectsEnabled = localStorage.getItem('soundEffects') !== 'false';
    const alarmEnabled = localStorage.getItem('alarm') !== 'false';
    
    // FIXED: Update alarm sound when settings change
    const selectedAlarmSound = localStorage.getItem('alarmSound') || 'alarm.mp3';
    updateAlarmSound(selectedAlarmSound);
    
    // Set volumes based on settings
    sounds.click.volume = soundEffectsEnabled ? volume * 0.5 : 0;
    sounds.start.volume = soundEffectsEnabled ? volume * 0.6 : 0;
    sounds.pause.volume = soundEffectsEnabled ? volume * 0.5 : 0;
    sounds.complete.volume = alarmEnabled ? volume : 0;
    
    console.log("Reverse Timer: Sound volumes updated:", { 
        volume: volume,
        soundEffectsEnabled: soundEffectsEnabled,
        alarmEnabled: alarmEnabled,
        alarmSound: selectedAlarmSound,
        clickVolume: sounds.click.volume,
        startVolume: sounds.start.volume,
        pauseVolume: sounds.pause.volume,
        completeVolume: sounds.complete.volume
    });
}

// Expose the updateAlarmSound function for settings.js
window.updateAlarmSound = updateAlarmSound;

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
  
  console.log("Reverse timer initialized");
  
  // Initial UI sync on page load
  window.updateTimerAndUIFromSettings();
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
      resetTimer();
    }
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