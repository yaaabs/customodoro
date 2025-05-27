(function() {
  let miniPlayerModal;
  let isOpen = false;

  // Create mini music player modal
  function createMiniPlayerModal() {
    if (document.querySelector('.mini-music-player-modal')) return;

    const modalHTML = `
      <div class="mini-music-player-modal" id="mini-music-player-modal">
        <div class="mini-music-player-content">
          <div class="mini-player-header">
            <h3>🎵 Music Player</h3>
            <button class="mini-player-close" id="mini-player-close">&times;</button>
          </div>
          
          <div class="mini-player-body">
            <div class="mini-player-info">
              <div class="mini-track-title" id="mini-track-title">No music playing</div>
              <div class="mini-track-artist" id="mini-track-artist">Select a playlist to start</div>
            </div>
            
            <div class="mini-player-controls">
              <button class="mini-btn mini-btn-prev" id="mini-prev-btn">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M6,18V6H8V18H6M9.5,12L18,6V18L9.5,12Z" />
                </svg>
              </button>
              
              <button class="mini-btn mini-btn-play" id="mini-play-btn">
                <svg viewBox="0 0 24 24" width="24" height="24" id="mini-play-icon">
                  <path fill="currentColor" d="M8,5.14V19.14L19,12.14L8,5.14Z" />
                </svg>
                <svg viewBox="0 0 24 24" width="24" height="24" id="mini-pause-icon" style="display: none;">
                  <path fill="currentColor" d="M14,19H18V5H14M6,19H10V5H6V19Z" />
                </svg>
              </button>
              
              <button class="mini-btn mini-btn-next" id="mini-next-btn">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M16,18H18V6H16M6,18L14.5,12L6,6V18Z" />
                </svg>
              </button>
            </div>
            
            <div class="mini-player-progress">
              <div class="mini-progress-bar" id="mini-progress-bar"></div>
            </div>
            
            <div class="mini-player-volume">
              <span>🔊</span>
              <input type="range" class="mini-volume-slider" id="mini-volume-slider" min="0" max="100" value="30">
              <span id="mini-volume-display">30%</span>
            </div>
          </div>
          
          <div class="mini-player-footer">
            <button class="mini-settings-btn" id="mini-full-settings-btn">Full Settings</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    miniPlayerModal = document.getElementById('mini-music-player-modal');
    setupMiniPlayerEvents();
  }

  // Setup event listeners for mini player
  function setupMiniPlayerEvents() {
    const closeBtn = document.getElementById('mini-player-close');
    const fullSettingsBtn = document.getElementById('mini-full-settings-btn');
    const playBtn = document.getElementById('mini-play-btn');
    const prevBtn = document.getElementById('mini-prev-btn');
    const nextBtn = document.getElementById('mini-next-btn');
    const volumeSlider = document.getElementById('mini-volume-slider');
    const volumeDisplay = document.getElementById('mini-volume-display');

    // Close button
    if (closeBtn) {
      closeBtn.addEventListener('click', closeMiniPlayer);
    }

    // Full settings button - properly navigate to BGM section
    if (fullSettingsBtn) {
      fullSettingsBtn.addEventListener('click', function() {
        closeMiniPlayer();
        
        // Open main settings modal
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
          settingsModal.classList.add('show');
          
          // Navigate to BGM section
          setTimeout(() => {
            // Remove active class from all nav items
            document.querySelectorAll('.settings-nav-item').forEach(item => {
              item.classList.remove('active');
            });
            
            // Hide all sections
            document.querySelectorAll('.settings-section').forEach(section => {
              section.classList.remove('active');
            });
            
            // Activate BGM nav item and section
            const bgmNavItem = document.querySelector('.settings-nav-item[data-section="bgm"]');
            const bgmSection = document.getElementById('bgm-section');
            
            if (bgmNavItem) bgmNavItem.classList.add('active');
            if (bgmSection) bgmSection.classList.add('active');
          }, 100);
        }
      });
    }

    // Volume control
    if (volumeSlider && volumeDisplay) {
      volumeSlider.addEventListener('input', function() {
        const volume = this.value;
        volumeDisplay.textContent = volume + '%';
        
        // Update BGM volume if bgm player exists
        if (window.bgmPlayer && typeof window.bgmPlayer.setVolume === 'function') {
          window.bgmPlayer.setVolume(volume / 100);
        }
        
        // Save to localStorage
        localStorage.setItem('bgmVolume', volume);
      });
    }

    // Control buttons - connect to BGM player if available
    if (playBtn) {
      playBtn.addEventListener('click', function() {
        if (window.bgmPlayer && typeof window.bgmPlayer.toggle === 'function') {
          window.bgmPlayer.toggle();
        }
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function() {
        if (window.bgmPlayer && typeof window.bgmPlayer.previous === 'function') {
          window.bgmPlayer.previous();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function() {
        if (window.bgmPlayer && typeof window.bgmPlayer.next === 'function') {
          window.bgmPlayer.next();
        }
      });
    }

    // Close when clicking outside
    miniPlayerModal.addEventListener('click', function(e) {
      if (e.target === miniPlayerModal) {
        closeMiniPlayer();
      }
    });
  }

  // Open mini player
  function openMiniPlayer() {
    if (!miniPlayerModal) {
      createMiniPlayerModal();
    }
    
    isOpen = true;
    miniPlayerModal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Update initial state
    updateTrackInfo();
    updatePlayButton();
    updateVolume();
  }

  // Close mini player
  function closeMiniPlayer() {
    if (miniPlayerModal) {
      isOpen = false;
      miniPlayerModal.classList.remove('show');
      document.body.style.overflow = '';
    }
  }

  // Update track information
  function updateTrackInfo(title = 'No music playing', artist = 'Select a playlist to start') {
    const titleElement = document.getElementById('mini-track-title');
    const artistElement = document.getElementById('mini-track-artist');
    
    if (titleElement) titleElement.textContent = title;
    if (artistElement) artistElement.textContent = artist;
  }

  // Update play button state
  function updatePlayButton(isPlaying = false) {
    const playIcon = document.getElementById('mini-play-icon');
    const pauseIcon = document.getElementById('mini-pause-icon');
    
    if (playIcon && pauseIcon) {
      if (isPlaying) {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
      } else {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
      }
    }
  }

  // Update volume from settings
  function updateVolume() {
    const volumeSlider = document.getElementById('mini-volume-slider');
    const volumeDisplay = document.getElementById('mini-volume-display');
    const savedVolume = localStorage.getItem('bgmVolume') || '30';
    
    if (volumeSlider) volumeSlider.value = savedVolume;
    if (volumeDisplay) volumeDisplay.textContent = savedVolume + '%';
  }

  // Public API
  window.miniMusicPlayer = {
    open: openMiniPlayer,
    close: closeMiniPlayer,
    updateTrackInfo: updateTrackInfo,
    updatePlayButton: updatePlayButton,
    isOpen: () => isOpen
  };
})();
