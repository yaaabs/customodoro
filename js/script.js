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
    taskInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addTask();
    });
    
    // Update timer display
    function updateTimerDisplay() {
      const minutes = Math.floor(currentSeconds / 60);
      const seconds = currentSeconds % 60;
      timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      document.title = `${timerElement.textContent} - FocusKaya Timer`;
      
      // Update progress bar
      if (initialSeconds > 0) {
        const progress = ((initialSeconds - currentSeconds) / initialSeconds) * 100;
        progressBar.style.width = `${progress}%`;
      }
    }
    
    // Toggle timer between start and pause
    function toggleTimer() {
      if (!isRunning) {
        // Start timer
        isRunning = true;
        startButton.textContent = 'PAUSE';
        
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
        // Pause timer
        clearInterval(timerInterval);
        isRunning = false;
        startButton.textContent = 'START';
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
      updateTimerDisplay();
      progressBar.style.width = '0%';
    }
    
    // Switch between pomodoro, short break, and long break modes
    function switchMode(mode) {
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
      
      // Reset timer if it was running
      if (isRunning) {
        clearInterval(timerInterval);
        isRunning = false;
        startButton.textContent = 'START';
      }
      
      updateTimerDisplay();
      progressBar.style.width = '0%';
    }
    
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
    
    // Play notification sound
    function playNotification() {
      try {
        // Create audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create oscillator
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.5;
        
        oscillator.start();
        
        // Fade out
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1);
        
        // Stop after 1 second
        setTimeout(() => {
          oscillator.stop();
        }, 1000);
      } catch (e) {
        console.log('Audio not supported');
      }
      
      // Desktop notification
      if ('Notification' in window && Notification.permission === 'granted') {
        let title, body;
        
        if (currentMode === 'pomodoro') {
          title = 'Break Time!';
          body = 'Great job! Time to take a break.';
        } else {
          title = 'Focus Time!';
          body = 'Break is over. Time to focus!';
        }
        
        new Notification(title, {
          body: body,
          icon: '/api/placeholder/192/192'
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
    
    // Add task to task list
    function addTask() {
      const taskText = taskInput.value.trim();
      
      if (taskText !== '') {
        // Create task item
        const taskItem = document.createElement('li');
        taskItem.className = 'task-item';
        
        // Create checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.addEventListener('change', () => {
          taskItem.classList.toggle('task-completed', checkbox.checked);
        });
        
        // Create task text
        const text = document.createElement('span');
        text.className = 'task-text';
        text.textContent = taskText;
        
        // Create delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'task-delete';
        deleteBtn.textContent = '×';
        deleteBtn.addEventListener('click', () => {
          taskList.removeChild(taskItem);
        });
        
        // Append elements to task item
        taskItem.appendChild(checkbox);
        taskItem.appendChild(text);
        taskItem.appendChild(deleteBtn);
        
        // Add task to list
        taskList.appendChild(taskItem);
        
        // Clear input
        taskInput.value = '';
      }
    }
    
    // Request notification permission
    if ('Notification' in window) {
      Notification.requestPermission();
    }
