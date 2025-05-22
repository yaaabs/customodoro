(function() {
  // DOM Elements
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  
  // Check if fullscreen is supported
  function isFullscreenEnabled() {
    return (
      document.fullscreenEnabled ||
      document.webkitFullscreenEnabled ||
      document.mozFullScreenEnabled ||
      document.msFullscreenEnabled
    );
  }
  
  // Get current fullscreen element
  function getFullscreenElement() {
    return (
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
  }
  
  // Request fullscreen
  function requestFullscreen(element) {
    if (element.requestFullscreen) {
      return element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
      return element.webkitRequestFullscreen();
    } else if (element.mozRequestFullScreen) {
      return element.mozRequestFullScreen();
    } else if (element.msRequestFullscreen) {
      return element.msRequestFullscreen();
    }
  }
  
  // Exit fullscreen
  function exitFullscreen() {
    if (document.exitFullscreen) {
      return document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      return document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      return document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      return document.msExitFullscreen();
    }
  }
  
  // Toggle fullscreen state with improved error handling
  function toggleFullscreen() {
    if (!isFullscreenEnabled()) {
      showToast('Fullscreen is not supported in your browser.');
      return;
    }
    
    try {
      if (!getFullscreenElement()) {
        // Enter fullscreen
        const promise = requestFullscreen(document.documentElement);
        
        if (promise) {  // Modern browsers return a promise
          promise.then(() => {
            document.body.classList.add('is-fullscreen');
            playSound('click');
            toggleFullscreenIcons(true);
            
            // Update radial menu icon if it exists
            updateRadialMenuIcon(true);
          }).catch(err => {
            console.error('Error attempting to enable fullscreen:', err);
            showToast('Failed to enter fullscreen mode. Try tapping the button again.');
          });
        } else {  // Older browsers don't return a promise
          document.body.classList.add('is-fullscreen');
          playSound('click');
          toggleFullscreenIcons(true);
          updateRadialMenuIcon(true);
        }
      } else {
        // Exit fullscreen
        const promise = exitFullscreen();
        
        if (promise) {  // Modern browsers return a promise
          promise.then(() => {
            document.body.classList.remove('is-fullscreen');
            playSound('click');
            toggleFullscreenIcons(false);
            updateRadialMenuIcon(false);
          }).catch(err => {
            console.error('Error attempting to exit fullscreen:', err);
            showToast('Failed to exit fullscreen. Try using your device\'s back button.');
          });
        } else {  // Older browsers don't return a promise
          document.body.classList.remove('is-fullscreen');
          playSound('click');
          toggleFullscreenIcons(false);
          updateRadialMenuIcon(false);
        }
      }
    } catch (error) {
      console.error('Fullscreen toggle error:', error);
      showToast('Fullscreen toggle failed. Try using your device\'s back button to exit.');
    }
  }
  
  // Toggle fullscreen icons explicitly
  function toggleFullscreenIcons(isFullscreen) {
    if (!fullscreenBtn) return;
    
    const enterIcon = fullscreenBtn.querySelector('.enter-fullscreen-icon');
    const exitIcon = fullscreenBtn.querySelector('.exit-fullscreen-icon');
    
    if (isFullscreen) {
      if (enterIcon) enterIcon.style.display = 'none';
      if (exitIcon) exitIcon.style.display = 'block';
    } else {
      if (enterIcon) enterIcon.style.display = 'block';
      if (exitIcon) exitIcon.style.display = 'none';
    }
  }
  
  // Update the radial menu icon
  function updateRadialMenuIcon(isFullscreen) {
    const radialFullscreenBtn = document.getElementById('radial-fullscreen-btn');
    if (!radialFullscreenBtn) return;
    
    const enterIcon = radialFullscreenBtn.querySelector('.enter-fullscreen-icon');
    const exitIcon = radialFullscreenBtn.querySelector('.exit-fullscreen-icon');
    
    if (isFullscreen) {
      if (enterIcon) enterIcon.style.display = 'none';
      if (exitIcon) exitIcon.style.display = 'block';
      radialFullscreenBtn.querySelector('.radial-tooltip').textContent = 'Exit Fullscreen';
    } else {
      if (enterIcon) enterIcon.style.display = 'block';
      if (exitIcon) exitIcon.style.display = 'none';
      radialFullscreenBtn.querySelector('.radial-tooltip').textContent = 'Fullscreen';
    }
  }
  
  // Show toast notification if available
  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) {
      console.log(message);
      return;
    }
    
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
  
  // Play sound if available
  function playSound(soundName) {
    if (window.playSound && typeof window.playSound === 'function') {
      window.playSound(soundName);
    }
  }
  
  // Set up event listeners
  function setupEventListeners() {
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', toggleFullscreen);
    }
    
    // Listen for fullscreen change events to update UI correctly
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    // Mobile exit helper - listen for back button events
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && getFullscreenElement()) {
        exitFullscreen();
      }
    });
  }
  
  // Handle fullscreen change events
  function handleFullscreenChange() {
    const isFullscreen = !!getFullscreenElement();
    document.body.classList.toggle('is-fullscreen', isFullscreen);
    toggleFullscreenIcons(isFullscreen);
    updateRadialMenuIcon(isFullscreen);
  }
  
  // Initialize on DOM content loaded
  document.addEventListener('DOMContentLoaded', setupEventListeners);
  
  // Expose the function globally for the radial menu to use
  window.toggleFullscreen = toggleFullscreen;
})();
