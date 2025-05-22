// Focus Mode - Provides a cleaner, distraction-free timer interface
(function() {
  // Variables
  let isFocusModeActive = false;
  
  // DOM Elements
  const body = document.body;
  const html = document.documentElement;
  const focusModeBtn = document.getElementById('focus-mode-btn');
  let focusModeExit = document.getElementById('focus-mode-exit');
  let focusModeStatus = document.getElementById('focus-mode-status');
  
  // Initialize focus mode
  function initFocusMode() {
    // Create UI elements if they don't exist
    createFocusModeElements();
    
    // Set up event listeners
    if (focusModeBtn) {
      focusModeBtn.addEventListener('click', toggleFocusMode);
    }
    
    // Set up keyboard shortcut (Alt+F for focus)
    document.addEventListener('keydown', function(e) {
      // Alt+F to toggle focus mode
      if (e.altKey && e.key.toLowerCase() === 'f') {
        toggleFocusMode();
        e.preventDefault();
      }
      
      // Escape key to exit focus mode
      if (e.key === 'Escape' && isFocusModeActive) {
        exitFocusMode();
      }
    });
    
    // Check for URL parameter to auto-enable focus mode
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('focus') === 'true') {
      setTimeout(enterFocusMode, 1000);
    }
  }
  
  // Create the necessary focus mode UI elements
  function createFocusModeElements() {
    // Create exit button if it doesn't exist
    if (!focusModeExit) {
      focusModeExit = document.createElement('button');
      focusModeExit.id = 'focus-mode-exit';
      focusModeExit.className = 'focus-mode-exit';
      focusModeExit.textContent = 'Exit Focus Mode (Esc)';
      focusModeExit.addEventListener('click', exitFocusMode);
      document.body.appendChild(focusModeExit);
    }
    
    // Create status indicator if it doesn't exist
    if (!focusModeStatus) {
      focusModeStatus = document.createElement('div');
      focusModeStatus.id = 'focus-mode-status';
      focusModeStatus.className = 'focus-mode-status';
      focusModeStatus.textContent = 'Focus Mode Active';
      document.body.appendChild(focusModeStatus);
    }
  }
  
  // Toggle focus mode on/off
  function toggleFocusMode() {
    if (isFocusModeActive) {
      exitFocusMode();
    } else {
      enterFocusMode();
    }
  }
  
  // Enter focus mode
  function enterFocusMode() {
    // Play sound effect if available
    if (typeof window.playSound === 'function') {
      window.playSound('click');
    }
    
    body.classList.add('focus-mode-active');
    html.classList.add('focus-mode-active'); // Also add to html to prevent scrolling
    if (focusModeBtn) focusModeBtn.classList.add('active');
    isFocusModeActive = true;
    
    // Show toast if available
    if (typeof window.showToast === 'function') {
      window.showToast('Focus Mode activated. Press ESC to exit.');
    }
    
    // Remember state
    localStorage.setItem('focusModeActive', 'true');
    
    // Create UI elements if they don't exist yet
    createFocusModeElements();
    
    // Show status briefly then fade it
    if (focusModeStatus) {
      focusModeStatus.style.opacity = '1';
      focusModeStatus.style.visibility = 'visible';
      
      setTimeout(() => {
        focusModeStatus.style.opacity = '0';
      }, 3000);
    }
  }
  
  // Exit focus mode
  function exitFocusMode() {
    // Play sound effect if available
    if (typeof window.playSound === 'function') {
      window.playSound('click');
    }
    
    body.classList.remove('focus-mode-active');
    html.classList.remove('focus-mode-active'); // Also remove from html
    if (focusModeBtn) focusModeBtn.classList.remove('active');
    isFocusModeActive = false;
    
    // Show toast if available
    if (typeof window.showToast === 'function') {
      window.showToast('Focus Mode deactivated');
    }
    
    // Remember state
    localStorage.setItem('focusModeActive', 'false');
  }
  
  // Check if focus mode was active in previous session
  function checkPreviousState() {
    const wasActive = localStorage.getItem('focusModeActive') === 'true';
    if (wasActive) {
      enterFocusMode();
    }
  }
  
  // Initialize on page load
  document.addEventListener('DOMContentLoaded', function() {
    initFocusMode();
    checkPreviousState();
  });
  
  // Public API
  window.focusMode = {
    enter: enterFocusMode,
    exit: exitFocusMode,
    toggle: toggleFocusMode,
    isActive: function() { return isFocusModeActive; }
  };
})();
