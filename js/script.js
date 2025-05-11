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

// Settings elements
const settingsToggle = document.getElementById('settings-toggle');
const settingsContent = document.getElementById('settings-content');

// Task elements
const taskInput = document.getElementById('task-input');
const addTaskBtn = document.getElementById('add-task-btn');
const taskList = document.getElementById('task-list');

// Time setting elements
const pomodoroValue = document.getElementById('pomodoro-value');
const shortValue = document.getElementById('short-value');
const longValue = document.getElementById('long-value');
const sessionsValue = document.getElementById('sessions-value');

// Time setting buttons
const pomodoroMinus = document.getElementById('pomodoro-minus');
const pomodoroPlus = document.getElementById('pomodoro-plus');
const shortMinus = document.getElementById('short-minus');
const shortPlus = document.getElementById('short-plus');
const longMinus = document.getElementById('long-minus');
const longPlus = document.getElementById('long-plus');
const sessionsMinus = document.getElementById('sessions-minus');
const sessionsPlus = document.getElementById('sessions-plus');

// Toast notification
const toast = document.getElementById('toast');

// Timer variables
let pomodoroTime = 25;
let shortBreakTime = 5;
let longBreakTime = 15;
let maxSessions = 4;
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

// Play sound with error handling
function playSound(soundName) {
  const sound = sounds[soundName];
  if (sound) {
    // Clone the audio for overlapping sounds
    if (soundName === 'click') {
      const clone = sound.cloneNode();
      clone.volume = sound.volume;
      clone.play().catch(err => console.log('Audio playback disabled'));
    } else {
      sound.currentTime = 0;
      sound.play().catch(err => console.log('Audio playback disabled'));
    }
  }
}

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

// Settings toggle
settingsToggle.addEventListener('click', toggleSettings);

// Time setting event listeners
pomodoroMinus.addEventListener('click', () => updateTimeValue('pomodoro', -1));
pomodoroPlus.addEventListener('click', () => updateTimeValue('pomodoro', 1));
shortMinus.addEventListener('click', () => updateTimeValue('shortBreak', -1));
shortPlus.addEventListener('click', () => updateTimeValue('shortBreak', 1));
longMinus.addEventListener('click', () => updateTimeValue('longBreak', -1));
longPlus.addEventListener('click', () => updateTimeValue('longBreak', 1));
sessionsMinus.addEventListener('click', () => updateTimeValue('sessions', -1));
sessionsPlus.addEventListener('click', () => updateTimeValue('sessions', 1));

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

  // Update document title with status
  const modeText = currentMode.charAt(0).toUpperCase() + currentMode.slice(1);
  const statusText = isRunning ? timeString : 'Paused';
  document.title = `${statusText} - FocusKaya ${modeText}`;

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
    updateFavicon(currentMode); // Add this line

    timerInterval = setInterval(() => {
      if (currentSeconds > 0) {
        currentSeconds--;
        updateTimerDisplay();
      } else {
        // Timer completed
        clearInterval(timerInterval);
        playNotification();
        showToast(getCompletionMessage());

        // Move to next timer phase
        if (currentMode === 'pomodoro') {
          completedPomodoros++;
          updateStats();
          if (completedPomodoros % maxSessions === 0) {
            switchMode('longBreak');
          } else {
            switchMode('shortBreak');
          }
        } else {
          // After a break, go back to pomodoro
          if (currentMode === 'longBreak') {
            currentSession = 1;
          } else {
            currentSession++;
          }
          switchMode('pomodoro');
        }

        updateSessionDots();
        startButton.textContent = 'START';
        isRunning = false;
      }
    }, 1000);
  } else {
    sounds.pause.currentTime = 0;
    sounds.pause.play().catch(err => console.log('Audio playback disabled')); // Only play pause sound

    // Pause timer
    clearInterval(timerInterval);
    isRunning = false;
    startButton.textContent = 'START';
    updateFavicon('paused'); // Add this line
  }
}

// Reset the current timer
function resetTimer() {
  clearInterval(timerInterval);

  // Reset to initial time based on current mode
  if (currentMode === 'pomodoro') {
    currentSeconds = pomodoroTime * 60;
  } else if (currentMode === 'shortBreak') {
    currentSeconds = shortBreakTime * 60;
  } else {
    currentSeconds = longBreakTime * 60;
  }

  initialSeconds = currentSeconds;
  isRunning = false;
  startButton.textContent = 'START';
  updateFavicon('paused'); // Add this line
  updateTimerDisplay();
  progressBar.style.width = '0%';
}

// Switch between pomodoro, short break, and long break modes with validation
function switchMode(mode) {
  if (isRunning) {
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

  // Set up the new mode
  if (mode === 'pomodoro') {
    currentSeconds = pomodoroTime * 60;
    body.className = 'focus-mode';
    pomodoroTab.classList.add('active');
  } else if (mode === 'shortBreak') {
    currentSeconds = shortBreakTime * 60;
    body.className = 'short-break-mode';
    shortBreakTab.classList.add('active');
  } else {
    currentSeconds = longBreakTime * 60;
    body.className = 'long-break-mode';
    longBreakTab.classList.add('active');
  }

  initialSeconds = currentSeconds;

  // Reset timer state
  clearInterval(timerInterval);
  isRunning = false;
  startButton.textContent = 'START';

  updateFavicon(mode); // Add this line before updateTimerDisplay()
  updateTimerDisplay();
  progressBar.style.width = '0%';
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

// Toggle settings panel
function toggleSettings() {
  settingsContent.classList.toggle('open');
  const isOpen = settingsContent.classList.contains('open');
  settingsToggle.querySelector('span').textContent = isOpen ? 'Hide' : 'Show';
}

// Update time values (pomodoro, short break, long break, sessions)
function updateTimeValue(type, change) {
  let currentValue, minValue = 1, maxValue = 60;

  if (type === 'pomodoro') {
    currentValue = pomodoroTime;
    pomodoroTime = Math.max(minValue, Math.min(maxValue, currentValue + change));
    pomodoroValue.textContent = pomodoroTime;

    if (currentMode === 'pomodoro') {
      resetTimer();
    }
  } else if (type === 'shortBreak') {
    currentValue = shortBreakTime;
    shortBreakTime = Math.max(minValue, Math.min(maxValue, currentValue + change));
    shortValue.textContent = shortBreakTime;

    if (currentMode === 'shortBreak') {
      resetTimer();
    }
  } else if (type === 'longBreak') {
    currentValue = longBreakTime;
    longBreakTime = Math.max(minValue, Math.min(maxValue, currentValue + change));
    longValue.textContent = longBreakTime;

    if (currentMode === 'longBreak') {
      resetTimer();
    }
  } else if (type === 'sessions') {
    minValue = 1;
    maxValue = 12;
    currentValue = maxSessions;
    maxSessions = Math.max(minValue, Math.min(maxValue, currentValue + change));
    sessionsValue.textContent = maxSessions;

    // Update session dots
    updateSessionDots();
  }
}

// Enhanced notification sound
function playNotification() {
  // Play alarm for its full duration
  const completeSound = sounds.complete;
  completeSound.currentTime = 0; // Reset to start
  completeSound.play().catch(err => console.log('Audio playback disabled'));

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
    if (!confirm('Add this task to your list?')) {
      return;
    }

    // Check for unfinished tasks
    const unfinishedTasks = Array.from(taskList.children).filter(task => 
      !task.querySelector('.task-checkbox').checked
    );

    if (unfinishedTasks.length > 0) {
      if (!confirm('You have unfinished tasks. Add another one anyway?')) {
        return;
      }
    }

    createTaskElement(taskText);

    // Clear input
    taskInput.value = '';
    hasUnsavedTasks = false;
  }
}

// Add function to update unfinished tasks status
function updateUnfinishedTasks() {
  const unfinishedTasks = Array.from(taskList.children).filter(task => 
    !task.querySelector('.task-checkbox').checked
  );
  hasUnfinishedTasks = unfinishedTasks.length > 0;
}

// Add click sound to buttons (excluding start/pause button)
document.querySelectorAll('.time-btn, .secondary-btn, .tab').forEach(button => {
  button.addEventListener('click', () => playSound('click'));
});

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
