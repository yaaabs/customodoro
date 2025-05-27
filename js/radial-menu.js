// Radial menu functionality
(function() {
  // DOM Elements
  let menuToggle, radialMenu, menuItems;
  
  // Initialize the radial menu
  function initRadialMenu() {
    // Only create the menu if it doesn't exist yet
    if (document.querySelector('.radial-menu-container')) return;
    
    // Create the menu structure
    createRadialMenu();
    
    // Get references to elements
    menuToggle = document.querySelector('.radial-menu-toggle');
    radialMenu = document.querySelector('.radial-menu');
    menuItems = document.querySelectorAll('.radial-menu-item');
    
    // Position the menu items in a circle
    positionMenuItemsInCircle();
    
    // Set up event listeners
    setupEventListeners();
    
    // Add sound effects
    addSoundEffects();
  }
  
  // Create the radial menu HTML structure
  function createRadialMenu() {
    const menuContainer = document.createElement('div');
    menuContainer.className = 'radial-menu-container';
    
    // Create the toggle button
    const toggleHTML = `
      <button class="radial-menu-toggle" aria-label="Menu">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    `;
    
    // Create the radial menu items
    const menuHTML = `
      <div class="radial-menu">
        <button class="radial-menu-item" id="radial-fullscreen-btn" aria-label="Toggle Fullscreen">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" class="enter-fullscreen-icon"></path>
            <path d="M8 15H5v3M19 15h3v3M19 9h3V6M8 9H5V6" class="exit-fullscreen-icon" style="display: none;"></path>
          </svg>
          <span class="radial-tooltip">Fullscreen</span>
        </button>
        <button class="radial-menu-item" id="radial-focus-btn" aria-label="Focus Mode">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="4"></circle>
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
          </svg>
          <span class="radial-tooltip">Focus Mode</span>
        </button>
        <button class="radial-menu-item" id="radial-music-btn" aria-label="Music Player">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="2"></circle>
            <path d="M12 1v6m0 6v6"></path>
            <path d="m15.09 9a3 3 0 1 1-6.18 0"></path>
            <path d="M9 9a3 3 0 1 0 6 0"></path>
          </svg>
          <span class="radial-tooltip">Music Player</span>
        </button>
        <button class="radial-menu-item" id="radial-settings-btn" aria-label="Settings">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          <span class="radial-tooltip">Settings</span>
        </button>
      </div>
    `;
    
    menuContainer.innerHTML = toggleHTML + menuHTML;
    document.body.appendChild(menuContainer);
  }
  
  // Position menu items in a circle
  function positionMenuItemsInCircle() {
    if (!menuItems) return;
    
    const radius = 80; // Distance from center
    const totalItems = menuItems.length;
    const startAngle = -90; // Start from top (270 degrees or -90 degrees)
    const endAngle = 0; // End at right (0 degrees)
    const angleSpread = endAngle - startAngle;
    
    // Calculate position for each item
    menuItems.forEach((item, index) => {
      // Calculate angle for this item (in radians)
      const angle = (startAngle + (angleSpread * index / (totalItems - 1))) * (Math.PI / 180);
      
      // Calculate position using trigonometry
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      
      // Position from center (right/bottom corner)
      item.style.transform = `translate(${x}px, ${y}px)`;
      
      // Add transition delay for staggered animation
      item.style.transitionDelay = `${index * 0.05}s`;
    });
  }
  
  // Set up event listeners for the menu
  function setupEventListeners() {
    // Toggle menu on click
    menuToggle.addEventListener('click', function() {
      toggleMenu();
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.radial-menu-container')) {
        closeMenu();
      }
    });
    
    // Connect menu items to their corresponding functions
    document.getElementById('radial-fullscreen-btn').addEventListener('click', function() {
      // Call the original fullscreen function
      if (typeof toggleFullscreen === 'function') {
        toggleFullscreen();
      } else if (window.toggleFullscreen) {
        window.toggleFullscreen();
      }
      
      // Close the menu after action
      closeMenu();
    });
    
    document.getElementById('radial-focus-btn').addEventListener('click', function() {
      // Call the focus mode toggle
      if (typeof focusMode !== 'undefined' && typeof focusMode.toggle === 'function') {
        focusMode.toggle();
      } else if (window.focusMode && typeof window.focusMode.toggle === 'function') {
        window.focusMode.toggle();
      }
      
      // Close the menu after action
      closeMenu();
    });
    
    document.getElementById('radial-settings-btn').addEventListener('click', function() {
      // Find and click the original settings button to trigger the same behavior
      const originalSettingsBtn = document.getElementById('settings-btn');
      if (originalSettingsBtn) {
        originalSettingsBtn.click();
      }
      
      // Close the menu after action
      closeMenu();
    });
    
    document.getElementById('radial-music-btn').addEventListener('click', function() {
      // Open mini music player modal
      if (window.miniMusicPlayer && typeof window.miniMusicPlayer.open === 'function') {
        window.miniMusicPlayer.open();
      }
      
      // Close the menu after action
      closeMenu();
    });
    
    // Keyboard shortcut (M for menu)
    document.addEventListener('keydown', function(e) {
      if (e.altKey && e.key.toLowerCase() === 'm') {
        toggleMenu();
        e.preventDefault();
      }
    });
  }
  
  // Add sound effects to menu interactions
  function addSoundEffects() {
    const clickSound = function() {
      if (typeof playSound === 'function') {
        playSound('click');
      } else if (window.playSound && typeof window.playSound === 'function') {
        window.playSound('click');
      }
    };
    
    // Add sound to toggle button
    menuToggle.addEventListener('click', clickSound);
    
    // Add sound to menu items
    menuItems.forEach(item => {
      item.addEventListener('click', clickSound);
    });
  }
  
  // Toggle menu open/closed
  function toggleMenu() {
    menuToggle.classList.toggle('active');
    radialMenu.classList.toggle('active');
    
    // Apply new positioning when opening
    if (radialMenu.classList.contains('active')) {
      // Reset transform for all items first
      menuItems.forEach(item => {
        item.style.transform = 'scale(0.5)';
      });
      
      // Re-apply circular positioning with a small delay
      setTimeout(() => {
        positionMenuItemsInCircle();
      }, 50);
      
      menuToggle.setAttribute('aria-expanded', 'true');
    } else {
      menuToggle.setAttribute('aria-expanded', 'false');
      
      // Reset positions when closed
      menuItems.forEach(item => {
        item.style.transform = 'scale(0.5)';
      });
    }
  }
  
  // Close the menu
  function closeMenu() {
    menuToggle.classList.remove('active');
    radialMenu.classList.remove('active');
    menuToggle.setAttribute('aria-expanded', 'false');
    
    // Reset positions when closed
    menuItems.forEach(item => {
      item.style.transform = 'scale(0.5)';
    });
  }
  
  // Initialize when the DOM is loaded
  document.addEventListener('DOMContentLoaded', initRadialMenu);
  
  // Hide the original buttons once the radial menu is created
  function hideOriginalButtons() {
    const originalButtons = [
      document.getElementById('fullscreen-btn'),
      document.getElementById('focus-mode-btn'),
      document.getElementById('settings-btn')
    ];
    
    originalButtons.forEach(btn => {
      if (btn) btn.style.display = 'none';
    });
  }
  
  // Public API
  window.radialMenu = {
    init: initRadialMenu,
    toggle: toggleMenu,
    close: closeMenu,
    hideOriginalButtons: hideOriginalButtons
  };
})();
