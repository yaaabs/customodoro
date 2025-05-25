// Request notification permission
if ('Notification' in window) {
  Notification.requestPermission();
}

// Reverse Pomodoro Timer
(function() {
  // Audio objects
  const sounds = {
    click: new Audio('audio/SFX/start.wav'),
    start: new Audio('audio/SFX/start.wav'),
    pause: new Audio('audio/SFX/pause.wav'),
    complete: new Audio('audio/Alert Sounds/alarm.mp3'),
    timer: null
  };
  
  // Initialize sound settings from localStorage
  function initializeSoundSettings() {
    // Get settings from shared localStorage keys
    const volume = localStorage.getItem('volume') ? 
                  parseInt(localStorage.getItem('volume')) / 100 : 0.6;
    const timerVolume = localStorage.getItem('timerVolume') ?
                       parseInt(localStorage.getItem('timerVolume')) / 100 : 0.3;
    
    // Explicitly check for 'false' string
    const soundEffectsEnabled = localStorage.getItem('soundEffects') !== 'false';
    const alarmEnabled = localStorage.getItem('alarm') !== 'false';
    
    // Get selected alarm sound or use default
    const selectedAlarmSound = localStorage.getItem('alarmSound') || 'alarm.mp3';
    sounds.complete.src = 'audio/Alert Sounds/' + selectedAlarmSound;
    
    // Initialize timer sound - Fix: Default to 'none' if not set
    const selectedTimerSound = localStorage.getItem('timerSound') || 'none';
    if (selectedTimerSound !== 'none') {
        sounds.timer = new Audio('audio/Timer Sounds/' + selectedTimerSound);
        sounds.timer.loop = true;
        sounds.timer.volume = soundEffectsEnabled ? timerVolume : 0;
    } else {
        sounds.timer = null; // Ensure it's null when none is selected
    }
    
    // Set initial volumes
    sounds.click.volume = soundEffectsEnabled ? volume * 0.5 : 0;
    sounds.start.volume = soundEffectsEnabled ? volume * 0.6 : 0;
    sounds.pause.volume = soundEffectsEnabled ? volume * 0.5 : 0;
    sounds.complete.volume = alarmEnabled ? volume : 0;
    
    console.log(`Sound settings initialized for Reverse Timer:`, { 
        volume: volume,
        timerVolume: timerVolume,
        soundEffectsEnabled: soundEffectsEnabled, 
        alarmEnabled: alarmEnabled,
        alarmSound: selectedAlarmSound,
        timerSound: selectedTimerSound
    });
  }
  
  // Update sound volumes based on settings
  function updateSoundVolumes() {
    // Get settings from shared localStorage keys
    const volume = localStorage.getItem('volume') ? 
                  parseInt(localStorage.getItem('volume')) / 100 : 0.6;
    const timerVolume = localStorage.getItem('timerVolume') ?
                       parseInt(localStorage.getItem('timerVolume')) / 100 : 0.3;
    
    // Explicitly check for 'false' string to handle resets properly
    const soundEffectsEnabled = localStorage.getItem('soundEffects') !== 'false';
    const alarmEnabled = localStorage.getItem('alarm') !== 'false';
    
    // Update the alarm sound file
    const selectedAlarmSound = localStorage.getItem('alarmSound') || 'alarm.mp3';
    sounds.complete.src = 'audio/Alert Sounds/' + selectedAlarmSound;
    
    // FIX: Properly handle timer sound changes - stop old sound first
    const selectedTimerSound = localStorage.getItem('timerSound') || 'none';
    
    // Stop and clear any existing timer sound
    if (sounds.timer) {
        sounds.timer.pause();
        sounds.timer.currentTime = 0;
        sounds.timer = null;
    }
    
    // Set up new timer sound if not 'none'
    if (selectedTimerSound !== 'none') {
        sounds.timer = new Audio('audio/Timer Sounds/' + selectedTimerSound);
        sounds.timer.loop = true;
        sounds.timer.volume = soundEffectsEnabled ? timerVolume : 0;
        
        // If timer is currently running, start the new sound
        if (isRunning) {
            try {
                sounds.timer.currentTime = 0;
                sounds.timer.play().catch(err => console.log('Timer sound disabled'));
            } catch (error) {
                console.error('Error playing new timer sound:', error);
            }
        }
    }
    
    // Set volumes based on settings
    sounds.click.volume = soundEffectsEnabled ? volume * 0.5 : 0;
    sounds.start.volume = soundEffectsEnabled ? volume * 0.6 : 0;
    sounds.pause.volume = soundEffectsEnabled ? volume * 0.5 : 0;
    sounds.complete.volume = alarmEnabled ? volume : 0;
    
    console.log("Reverse Timer: Sound volumes updated:", { 
        volume: volume,
        timerVolume: timerVolume,
        soundEffectsEnabled: soundEffectsEnabled,
        alarmEnabled: alarmEnabled,
        alarmSound: selectedAlarmSound,
        timerSound: selectedTimerSound
    });
  }
  
  // Initialize on load
  initializeSoundSettings();
})();

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

// Add task elements
const taskInput = document.getElementById('task-input');
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
const MAX_TIME = 3600; // 1 hour in seconds
let currentSeconds = 0;
let initialSeconds = MAX_TIME;
let isRunning = false;
let timerInterval = null;
let currentMode = 'reverse';
let earnedBreakTime = 0;
let hasUnsavedTasks = false;
let hasUnfinishedTasks = false;
let tasks = [];

// Calculate break time based on work duration
function calculateBreakTime(workedSeconds) {
    const minutes = Math.floor(workedSeconds / 60);
    
    if (minutes <= 4) return 0;        // Less than 5 mins = no break
    if (minutes <= 20) return 2;       // 5-20 mins = 2 min break
    if (minutes <= 30) return 5;       // 21-30 mins = 5 min break
    if (minutes <= 45) return 10;      // 31-45 mins = 10 min break
    if (minutes <= 55) return 15;      // 46-55 mins = 15 min break
    return 30;                         // 56-60 mins = 30 min break
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

// Toggle timer
function toggleTimer() {
  if (!isRunning) {
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
    
    // Start timer sound
    if (sounds.timer && localStorage.getItem('soundEffects') !== 'false') {
        try {
            sounds.timer.currentTime = 0;
            sounds.timer.play().catch(err => console.log('Timer sound disabled'));
        } catch (error) {
            console.error('Error playing timer sound:', error);
        }
    }

    isRunning = true;
    startButton.textContent = 'PAUSE';
    updateFavicon('running');
    
    // Enter locked in mode if enabled
    if (window.lockedInMode && window.lockedInMode.isEnabled()) {
      window.lockedInMode.enter();
    }

    timerInterval = setInterval(() => {
      currentSeconds++;
      updateTimerDisplay();
      
      // Update locked in mode if active
      if (window.lockedInMode && window.lockedInMode.isActive()) {
        const timeString = formatTime(currentSeconds);
        const progress = Math.min((currentSeconds / maxSeconds) * 100, 100);
        window.lockedInMode.update(timeString, progress, startButton.textContent);
      }

      if (currentSeconds >= maxSeconds) {
        // Max time reached
        clearInterval(timerInterval);
        isRunning = false;
        
        // Stop timer sound
        if (sounds.timer) {
            sounds.timer.pause();
            sounds.timer.currentTime = 0;
        }
        
        playNotification();
        showToast(`Max time reached! You've earned a ${getBreakTime(currentSeconds)} minute break.`);
        
        if (currentMode === 'reverse') {
          switchMode('break', true);
        } else {
          switchMode('reverse', true);
        }
      }
    }, 1000);
  } else {
    playSound('pause');

    // Stop timer sound
    if (sounds.timer) {
        sounds.timer.pause();
        sounds.timer.currentTime = 0;
    }

    clearInterval(timerInterval);
    isRunning = false;
    startButton.textContent = 'START';
    updateFavicon('paused');
    
    // Also update locked in mode if active
    if (window.lockedInMode && window.lockedInMode.isActive()) {
      const timeString = formatTime(currentSeconds);
      window.lockedInMode.update(timeString, null, 'START');
    }
  }
}

// Complete session
function completeSession(playSound = true) {
    clearInterval(timerInterval);
    isRunning = false;
    
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
    const autoStartBreaks = localStorage.getItem('autoBreak') !== 'false';
    if (earnedBreakTime > 0 && autoStartBreaks) {
        setTimeout(() => toggleTimer(), 500);
    }
}

// Complete break
function completeBreak() {
    clearInterval(timerInterval);
    isRunning = false;
    
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

    // Stop timer sound
    if (sounds.timer) {
        sounds.timer.pause();
        sounds.timer.currentTime = 0;
    }

    currentSeconds = 0;
    isRunning = false;
    startButton.textContent = 'START';
    updateFavicon('paused');
    updateDisplay();
    progressBar.style.width = '0%';
    
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

  // Only show task deletion warning for manual mode changes
  if (taskList.children.length > 0 && !isAutoSwitch) {
    const confirmed = confirm('Switching modes will delete all your tasks. Do you want to continue?');
    if (!confirmed) return;
  }

  // Clear tasks only when manually switching, not during automatic transitions
  if (!isAutoSwitch) {
    // Clear all tasks if user confirms
    taskList.innerHTML = '';
    hasUnfinishedTasks = false;
    hasUnsavedTasks = false;
  }

  currentMode = mode;
  reverseTab.classList.toggle('active', mode === 'reverse');
  breakTab.classList.toggle('active', mode === 'break');
  
  // Reset timer state
  clearInterval(timerInterval);
  isRunning = false;
  startButton.textContent = 'START';
  
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

// Show toast notification
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
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

    const textElement = document.createElement('span');
    textElement.className = 'task-text';
    textElement.textContent = text;

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
    taskItem.appendChild(textElement);
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
    hasUnsavedTasks = taskInput.value.trim().length > 0;
});

// Add click sounds to buttons
document.querySelectorAll('.time-btn, .secondary-btn, .tab').forEach(button => {
    button.addEventListener('click', () => {
        playSound('click');
    });
});

// Make the playSound function available globally
window.playSound = playSound;

// Expose functions globally
window.updateSoundVolumes = updateSoundVolumes;
window.sounds = sounds;

// Update sound volumes based on shared settings
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
    
    // Update timer sound
    const selectedTimerSound = localStorage.getItem('timerSound') || 'none';
    if (selectedTimerSound !== 'none') {
      if (!sounds.timer || sounds.timer.src.indexOf(selectedTimerSound) === -1) {
        sounds.timer = new Audio('audio/Timer Sounds/' + selectedTimerSound);
        sounds.timer.loop = true;
      }
      sounds.timer.volume = soundEffectsEnabled ? volume * 0.3 : 0;
    } else {
      if (sounds.timer) {
        sounds.timer.pause();
        sounds.timer = null;
      }
    }
    
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
        timerSound: selectedTimerSound
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
updateDisplay();
