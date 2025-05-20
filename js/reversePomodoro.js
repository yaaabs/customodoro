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

// Call this function on startup
initializeSoundSettings();

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
    if (status === 'paused') {
        favicon.href = 'images/Paused.png';
    } else {
        favicon.href = 'images/Reverse Pomodoro.png';
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
        
        isRunning = true;
        startButton.textContent = 'STOP';
        updateFavicon('running');
        
        timerInterval = setInterval(() => {
            if (currentMode === 'break') {
                if (currentSeconds > 0) {
                    currentSeconds--;
                    updateDisplay();
                } else {
                    completeBreak();
                }
            } else {
                if (currentSeconds < MAX_TIME) {
                    currentSeconds++;
                    updateDisplay();
                } else {
                    completeSession();
                }
            }
        }, 1000);
    } else {
        playSound('pause');
        
        clearInterval(timerInterval);
        isRunning = false;
        startButton.textContent = 'START';
        updateFavicon('paused');
        
        if (currentMode === 'reverse') {
            const minutes = Math.floor(currentSeconds / 60);
            if (minutes < 5) {
                if (confirm('You worked less than 5 minutes. No break earned. Do you want to reset the timer?')) {
                    resetTimer();
                }
            } else {
                completeSession(false); // Auto-start break without confirmation
            }
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
    isRunning = false;
    currentSeconds = 0;
    initialSeconds = MAX_TIME;
    updateFavicon('paused');
    updateDisplay();
    startButton.textContent = 'START';
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
  }, 30000);
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
