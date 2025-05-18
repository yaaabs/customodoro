// DOM Elements
const timerElement = document.getElementById('timer');
const progressBar = document.getElementById('progress-bar');
const startButton = document.getElementById('start-btn');
const resetButton = document.getElementById('reset-btn');
const sessionDots = document.getElementById('session-dots');
const sessionText = document.getElementById('session-text');
const body = document.body;

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

// Update audio variables
const sounds = {
  click: new Audio('audio/start.wav'),
  start: new Audio('audio/start.wav'),
  pause: new Audio('audio/pause.wav'),
  complete: new Audio('audio/alarm.mp3')
};

// Set custom volumes for each sound
sounds.click.volume = 0.5;  // Quieter click
sounds.start.volume = 0.6;  // Medium volume start
sounds.pause.volume = 0.5;  // Quieter pause
sounds.complete.volume = 1.0;  // Full volume for alarm

// Initialize sound settings from localStorage
function initializeSoundSettings() {
    // Use page-specific prefix for sound settings
    const prefix = 'classic_';
    
    const volume = localStorage.getItem(prefix + 'volume') ? 
                  parseInt(localStorage.getItem(prefix + 'volume')) / 100 : 0.6;
    
    // Explicitly check for 'false' string
    const soundEffectsEnabled = localStorage.getItem(prefix + 'soundEffects') !== 'false';
    const alarmEnabled = localStorage.getItem(prefix + 'alarm') !== 'false';
    
    // Set initial volumes
    sounds.click.volume = soundEffectsEnabled ? volume * 0.5 : 0;
    sounds.start.volume = soundEffectsEnabled ? volume * 0.6 : 0;
    sounds.pause.volume = soundEffectsEnabled ? volume * 0.5 : 0;
    sounds.complete.volume = alarmEnabled ? volume : 0;
    
    console.log(`Sound settings initialized for Classic Timer:`, { 
        volume: volume, 
        soundEffectsEnabled: soundEffectsEnabled, 
        alarmEnabled: alarmEnabled 
    });
}

// Call this function on startup
initializeSoundSettings();

// Play sound with error handling and respect settings
function playSound(soundName) {
    const sound = sounds[soundName];
    if (!sound) return;
    
    // Use page-specific prefix for sound settings
    const prefix = 'classic_';
    
    // Check if the sound should be played based on settings
    if (soundName === 'complete') {
        // For alarm sound
        if (localStorage.getItem(prefix + 'alarm') === 'false') {
            console.log('Alarm sounds disabled in settings');
            return;
        }
    } else {
        // For all other UI sounds
        if (localStorage.getItem(prefix + 'soundEffects') === 'false') {
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

// Update sound volumes based on settings
function updateSoundVolumes() {
    // Use page-specific prefix for sound settings
    const prefix = 'classic_';
    
    const volume = localStorage.getItem(prefix + 'volume') ? 
                  parseInt(localStorage.getItem(prefix + 'volume')) / 100 : 0.6;
    
    // Explicitly check for 'false' string
    const soundEffectsEnabled = localStorage.getItem(prefix + 'soundEffects') !== 'false';
    const alarmEnabled = localStorage.getItem(prefix + 'alarm') !== 'false';
    
    sounds.click.volume = soundEffectsEnabled ? volume * 0.5 : 0;
    sounds.start.volume = soundEffectsEnabled ? volume * 0.6 : 0;
    sounds.pause.volume = soundEffectsEnabled ? volume * 0.5 : 0;
    sounds.complete.volume = alarmEnabled ? volume : 0;
    
    console.log("Classic Timer: Sound volumes updated:", { 
        clickVolume: sounds.click.volume,
        startVolume: sounds.start.volume,
        pauseVolume: sounds.pause.volume,
        completeVolume: sounds.complete.volume
    });
}

// Expose the function for settings.js
window.updateSoundVolumes = updateSoundVolumes;

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
  const saved = localStorage.getItem('focusKayaStats');
  if (saved) {
    const stats = JSON.parse(saved);
    if (stats.startDate === new Date().toDateString()) {
      dailyStats = stats;
    }
  }
}

// Save stats to localStorage
function saveStats() {
  localStorage.setItem('focusKayaStats', JSON.stringify(dailyStats));
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
        titleText = `${timeString} - Short Break`;
        break;
      case 'longBreak':
        titleText = `${timeString} - Long Break`;
        break;
    }
  } else {
    titleText = isRunning 
      ? `${timeString} - ${currentMode.charAt(0).toUpperCase() + currentMode.slice(1)}`
      : `${timeString} - Paused`;
  }
  document.title = titleText;

  // Update progress bar
  if (initialSeconds > 0) {
    const progress = ((initialSeconds - currentSeconds) / initialSeconds) * 100;
    progressBar.style.width = `${progress}%`;
  }
}

// Add this new function after the DOM Elements section
function updateFavicon(status) {
  const favicon = document.getElementById('favicon');
  switch(status) {
    case 'pomodoro':
      favicon.href = 'images/Pomodoro.png';
      break;
    case 'shortBreak':
      favicon.href = 'images/Short Break.png';
      break;
    case 'longBreak':
      favicon.href = 'images/Long Break.png';
      break;
    case 'paused':
      favicon.href = 'images/Paused.png';
      break;
  }
}

// Toggle timer between start and pause
function toggleTimer() {
  if (!isRunning) {
    playSound('start'); // Play start/click sound
    showToast(motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]);

    // Start timer
    isRunning = true;
    startButton.textContent = 'PAUSE';
    updateFavicon(currentMode);

    timerInterval = setInterval(() => {
      if (currentSeconds > 0) {
        currentSeconds--;
        updateTimerDisplay();
      } else {
        // Timer completed
        clearInterval(timerInterval);
        playNotification();
        showToast(getCompletionMessage());
        isRunning = false;

        // Move to next timer phase with auto-start
        if (currentMode === 'pomodoro') {
          completedPomodoros++;
          updateStats();
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

    // Pause timer
    clearInterval(timerInterval);
    isRunning = false;
    startButton.textContent = 'START';
    updateFavicon('paused');

    // Auto-start next phase if timer is complete
    if (currentSeconds === 0) {
      if (currentMode === 'pomodoro') {
        completedPomodoros++;
        updateStats();
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
}

// Switch between pomodoro, short break, and long break modes with validation
function switchMode(mode, autoStart = false) {
  // Remove the running timer check since we want automatic transitions
  if (!autoStart && isRunning) {
    const confirmed = confirm('Timer is still running. Are you sure you want to switch modes? This will reset your current progress.');
    if (!confirmed) return;
  }

  if (taskList.children.length > 0) {
    const confirmed = confirm('Switching modes will delete all your tasks. Do you want to continue?');
    if (!confirmed) return;
  }

  // Clear all tasks if user confirms
  taskList.innerHTML = '';
  hasUnfinishedTasks = false;
  hasUnsavedTasks = false;

  currentMode = mode;

  // Reset active tab styles
  pomodoroTab.classList.remove('active');
  shortBreakTab.classList.remove('active');
  longBreakTab.classList.remove('active');

  // Set up the new mode - always use the latest values from localStorage
  if (mode === 'pomodoro') {
    pomodoroTime = parseInt(localStorage.getItem('pomodoroTime')) || pomodoroTime;
    currentSeconds = pomodoroTime * 60;
    body.className = 'focus-mode';
    pomodoroTab.classList.add('active');
  } else if (mode === 'shortBreak') {
    shortBreakTime = parseInt(localStorage.getItem('shortBreakTime')) || shortBreakTime;
    currentSeconds = shortBreakTime * 60;
    body.className = 'short-break-mode';
    shortBreakTab.classList.add('active');
  } else {
    longBreakTime = parseInt(localStorage.getItem('longBreakTime')) || longBreakTime;
    currentSeconds = longBreakTime * 60;
    body.className = 'long-break-mode';
    longBreakTab.classList.add('active');
  }

  initialSeconds = currentSeconds;

  // Reset timer state
  clearInterval(timerInterval);
  isRunning = false;
  startButton.textContent = 'START';

  updateFavicon(mode);
  updateTimerDisplay();
  progressBar.style.width = '0%';

  // Auto-start if requested
  if (autoStart) {
    setTimeout(() => toggleTimer(), 500);
  }
}

// Add link handler for mode switching
document.querySelector('.switch-btn').addEventListener('click', (e) => {
  const hasTasks = taskList.children.length > 0;
  if (hasTasks) {
    const confirmed = confirm('Switching modes will delete all your tasks. Do you want to continue?');
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

// Enhanced notification sound - update to use our playSound function
function playNotification() {
  // Play alarm for its full duration
  playSound('complete');

  // Show notification
  if ('Notification' in window && Notification.permission === 'granted') {
    let title, body, icon;

    if (currentMode === 'pomodoro') {
      title = '🎉 Great Work!';
      body = `You've completed ${completedPomodoros} pomodoros today! Time for a break.`;
      icon = '/images/break-icon.png';
    } else {
      title = '⏰ Break Complete!';
      body = 'Ready to crush another focused session?';
      icon = '/images/focus-icon.png';
    }

    new Notification(title, {
      body: body,
      icon: icon,
      badge: '/images/badge.png',
      vibrate: [100, 50, 100]
    });
  } else if ('Notification' in window && Notification.permission !== 'denied') {
    Notification.requestPermission();
  }
}

// Get timer completion message
function getCompletionMessage() {
  if (currentMode === 'pomodoro') {
    return 'Time for a break!';
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

// Make functions available to settings.js
window.updateTimerDisplay = updateTimerDisplay;
window.updateSessionDots = updateSessionDots;
window.resetTimer = resetTimer;

// Initialize variables based on localStorage or defaults
(function initializeSettings() {
  // Load settings from localStorage if available
  pomodoroTime = parseInt(localStorage.getItem('pomodoroTime')) || 25;
  shortBreakTime = parseInt(localStorage.getItem('shortBreakTime')) || 5;
  longBreakTime = parseInt(localStorage.getItem('longBreakTime')) || 15;
  maxSessions = parseInt(localStorage.getItem('sessionsCount')) || 4;
  
  // Set initial timer based on current mode
  if (currentMode === 'pomodoro') {
    currentSeconds = pomodoroTime * 60;
  } else if (currentMode === 'shortBreak') {
    currentSeconds = shortBreakTime * 60;
  } else if (currentMode === 'longBreak') {
    currentSeconds = longBreakTime * 60;
  }
  
  initialSeconds = currentSeconds;
  
  // Make updateTimerDisplay available globally
  window.updateTimerDisplay = updateTimerDisplay;
  window.updateSessionDots = updateSessionDots;
  
  console.log("Initial timer values:", 
    {pomodoro: pomodoroTime, short: shortBreakTime, long: longBreakTime, sessions: maxSessions});
})();
