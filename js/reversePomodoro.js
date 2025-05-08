// Audio setup
const sounds = {
    click: new Audio('audio/start.wav'),
    start: new Audio('audio/start.wav'),
    pause: new Audio('audio/pause.wav'),
    complete: new Audio('audio/alarm.mp3')
};

// Set custom volumes
sounds.click.volume = 0.5;
sounds.start.volume = 0.6;
sounds.pause.volume = 0.5;
sounds.complete.volume = 1.0;

// DOM Elements
const timerElement = document.getElementById('timer');
const progressBar = document.getElementById('progress-bar');
const startButton = document.getElementById('start-btn');
const resetButton = document.getElementById('reset-btn');
const reverseTab = document.getElementById('reverse-tab');
const breakTab = document.getElementById('break-tab');
const toast = document.getElementById('toast');

// Timer variables
const MAX_TIME = 3600; // 1 hour in seconds
let currentSeconds = 0;
let isRunning = false;
let timerInterval = null;
let currentMode = 'reverse';
let earnedBreakTime = 0;

// Calculate break time based on work duration
function calculateBreakTime(workedSeconds) {
    const minutes = Math.floor(workedSeconds / 60);
    
    if (minutes <= 15) return 3;
    if (minutes <= 30) return 5;
    if (minutes <= 45) return 8;
    return 15;
}

// Update timer display
function updateDisplay() {
    const minutes = Math.floor(currentSeconds / 60);
    const seconds = currentSeconds % 60;
    timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Update progress bar
    const progress = (currentSeconds / MAX_TIME) * 100;
    progressBar.style.width = `${progress}%`;
    
    // Update document title
    document.title = `${timerElement.textContent} - FocusKaya Reverse`;
}

// Toggle timer
function toggleTimer() {
    if (!isRunning) {
        if (currentSeconds >= MAX_TIME) {
            showToast("You've reached the maximum time!");
            return;
        }
        
        sounds.start.play().catch(err => console.log('Audio disabled'));
        showToast("Time to focus! 💪");
        
        isRunning = true;
        startButton.textContent = 'STOP';
        
        timerInterval = setInterval(() => {
            if (currentSeconds < MAX_TIME) {
                currentSeconds++;
                updateDisplay();
            } else {
                completeSession();
            }
        }, 1000);
    } else {
        sounds.pause.currentTime = 0;
        sounds.pause.play().catch(err => console.log('Audio disabled'));
        
        clearInterval(timerInterval);
        isRunning = false;
        startButton.textContent = 'START';
        
        if (confirm('Do you want to end this session and take your break?')) {
            completeSession();
        }
    }
}

// Complete session
function completeSession() {
    clearInterval(timerInterval);
    isRunning = false;
    
    // Play completion sound
    sounds.complete.currentTime = 0;
    sounds.complete.play().catch(err => console.log('Audio disabled'));
    
    // Calculate earned break
    earnedBreakTime = calculateBreakTime(currentSeconds);
    
    const workMinutes = Math.floor(currentSeconds / 60);
    showToast(`Great work! You worked for ${workMinutes} minutes and earned a ${earnedBreakTime}-minute break! 🎉`);
    
    startButton.textContent = 'START';
    switchMode('break');
}

// Reset timer
function resetTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    currentSeconds = 0;
    updateDisplay();
    startButton.textContent = 'START';
}

// Switch between reverse and break modes
function switchMode(mode) {
    currentMode = mode;
    reverseTab.classList.toggle('active', mode === 'reverse');
    breakTab.classList.toggle('active', mode === 'break');
    
    if (mode === 'break') {
        currentSeconds = earnedBreakTime * 60;
        timerElement.textContent = `${earnedBreakTime}:00`;
    } else {
        currentSeconds = 0;
        updateDisplay();
    }
}

// Show toast notification
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Event listeners
startButton.addEventListener('click', toggleTimer);
resetButton.addEventListener('click', resetTimer);
reverseTab.addEventListener('click', () => switchMode('reverse'));
breakTab.addEventListener('click', () => switchMode('break'));

// Add click sounds to buttons
document.querySelectorAll('.time-btn, .secondary-btn, .tab').forEach(button => {
    button.addEventListener('click', () => {
        const clone = sounds.click.cloneNode();
        clone.volume = sounds.click.volume;
        clone.play().catch(err => console.log('Audio disabled'));
    });
});

// Initialize display
updateDisplay();
