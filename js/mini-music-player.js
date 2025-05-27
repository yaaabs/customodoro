(function() {
  let miniPlayerModal, miniPlayerOverlay;
  
  // Initialize mini music player
  function initMiniPlayer() {
    createMiniPlayerModal();
    setupEventListeners();
  }
  
  // Create the mini player modal HTML
  function createMiniPlayerModal() {
    const modalHTML = `
      <div class="mini-music-modal" id="mini-music-modal">
        <div class="mini-music-content">
          <div class="mini-music-header">
            <h3 class="mini-music-title">Music Player</h3>
            <button class="mini-music-close" id="mini-music-close">&times;</button>
          </div>
          
          <div class="mini-music-body">
            <div class="mini-track-info">
              <div class="mini-track-title" id="mini-track-title">Select a playlist</div>
              <div class="mini-track-artist" id="mini-track-artist">and press play</div>
            </div>
            
            <div class="mini-controls">
              <button class="mini-btn mini-btn-prev" id="mini-prev-btn">
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path fill="currentColor" d="M6,18V6H8V18H6M9.5,12L18,6V18L9.5,12Z" />
                </svg>
              </button>
              
              <button class="mini-btn mini-btn-play" id="mini-play-btn">
                <svg viewBox="0 0 24 24" width="32" height="32" id="mini-play-icon">
                  <path fill="currentColor" d="M8,5.14V19.14L19,12.14L8,5.14Z" />
                </svg>
                <svg viewBox="0 0 24 24" width="32" height="32" id="mini-pause-icon" style="display: none;">
                  <path fill="currentColor" d="M14,19H18V5H14M6,19H10V5H6V19Z" />
                </svg>
              </button>
              
              <button class="mini-btn mini-btn-next" id="mini-next-btn">
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path fill="currentColor" d="M16,18H18V6H16M6,18L14.5,12L6,6V18Z" />
                </svg>
              </button>
            </div>
            
            <div class="mini-settings-row">
              <div class="mini-settings-label">Enable Music</div>
              <label class="mini-toggle-switch">
                <input type="checkbox" id="mini-bgm-toggle" checked>
                <span class="mini-slider-toggle"></span>
              </label>
            </div>
            
            <div class="mini-settings-row">
              <div class="mini-settings-label">Playlist</div>
              <select class="mini-select" id="mini-playlist-selector">
                <option value="deep-focus">Deep Focus Study</option>
                <option value="ambient-long">Ambient Playlist (Long)</option>
              </select>
            </div>
            
            <div class="mini-settings-row">
              <div class="mini-settings-label">Volume</div>
              <div class="mini-volume-container">
                <input type="range" class="mini-volume-slider" id="mini-volume-slider" min="0" max="100" value="30">
                <div class="mini-volume-percentage" id="mini-volume-percentage">30%</div>
              </div>
            </div>
            
            <div class="mini-progress-container">
              <div class="mini-progress-bar" id="mini-progress-bar"></div>
            </div>
          </div>
          
          <div class="mini-music-footer">
            <button class="mini-settings-btn" id="mini-open-settings">Full Settings</button>
            <button class="mini-close-btn" id="mini-close-btn">Close</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    miniPlayerModal = document.getElementById('mini-music-modal');
  }
  
  // Setup event listeners
  function setupEventListeners() {
    const closeBtn = document.getElementById('mini-music-close');
    const closeBtnFooter = document.getElementById('mini-close-btn');
    const settingsBtn = document.getElementById('mini-open-settings');
    
    // Close buttons
    closeBtn.addEventListener('click', closeMiniPlayer);
    closeBtnFooter.addEventListener('click', closeMiniPlayer);
    
    // Settings button - opens main settings to music section
    settingsBtn.addEventListener('click', function() {
      closeMiniPlayer();
      // Open main settings modal to music section
      const settingsModal = document.getElementById('settings-modal');
      const musicSection = document.querySelector('[data-section="bgm"]');
      if (settingsModal && musicSection) {
        settingsModal.classList.add('show');
        // Switch to music section
        document.querySelectorAll('.settings-nav-item').forEach(item => item.classList.remove('active'));
        document.querySelectorAll('.settings-section').forEach(section => section.classList.remove('active'));
        musicSection.classList.add('active');
        document.querySelector('[data-section="bgm"]').classList.add('active');
      }
    });
    
    // Connect controls to BGM player
    document.getElementById('mini-play-btn').addEventListener('click', function() {
      if (window.bgmPlayer) {
        window.bgmPlayer.toggle();
        updatePlayButton();
      }
    });
    
    document.getElementById('mini-prev-btn').addEventListener('click', function() {
      if (window.bgmPlayer) {
        window.bgmPlayer.prev();
      }
    });
    
    document.getElementById('mini-next-btn').addEventListener('click', function() {
      if (window.bgmPlayer) {
        window.bgmPlayer.next();
      }
    });
    
    // Sync with main BGM controls
    document.getElementById('mini-bgm-toggle').addEventListener('change', function() {
      const mainToggle = document.getElementById('bgm-toggle');
      if (mainToggle) {
        mainToggle.checked = this.checked;
        mainToggle.dispatchEvent(new Event('change'));
      }
    });
    
    document.getElementById('mini-playlist-selector').addEventListener('change', function() {
      const mainSelector = document.getElementById('playlist-selector');
      if (mainSelector) {
        mainSelector.value = this.value;
        mainSelector.dispatchEvent(new Event('change'));
      }
    });
    
    document.getElementById('mini-volume-slider').addEventListener('input', function() {
      const mainSlider = document.getElementById('bgm-volume-slider');
      if (mainSlider) {
        mainSlider.value = this.value;
        mainSlider.dispatchEvent(new Event('input'));
      }
      document.getElementById('mini-volume-percentage').textContent = this.value + '%';
    });
    
    // Close when clicking outside
    miniPlayerModal.addEventListener('click', function(e) {
      if (e.target === miniPlayerModal) {
        closeMiniPlayer();
      }
    });
    
    // Sync initial values
    syncWithMainControls();
  }
  
  // Open mini player
  function openMiniPlayer() {
    if (miniPlayerModal) {
      miniPlayerModal.classList.add('show');
      syncWithMainControls();
      updatePlayButton();
    }
  }
  
  // Close mini player
  function closeMiniPlayer() {
    if (miniPlayerModal) {
      miniPlayerModal.classList.remove('show');
    }
  }
  
  // Sync with main BGM controls
  function syncWithMainControls() {
    const mainToggle = document.getElementById('bgm-toggle');
    const mainPlaylist = document.getElementById('playlist-selector');
    const mainVolume = document.getElementById('bgm-volume-slider');
    
    if (mainToggle) {
      document.getElementById('mini-bgm-toggle').checked = mainToggle.checked;
    }
    
    if (mainPlaylist) {
      document.getElementById('mini-playlist-selector').value = mainPlaylist.value;
    }
    
    if (mainVolume) {
      document.getElementById('mini-volume-slider').value = mainVolume.value;
      document.getElementById('mini-volume-percentage').textContent = mainVolume.value + '%';
    }
  }
  
  // Update play button state
  function updatePlayButton() {
    const playIcon = document.getElementById('mini-play-icon');
    const pauseIcon = document.getElementById('mini-pause-icon');
    
    if (window.bgmPlayer && window.bgmPlayer.isPlaying()) {
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
    } else {
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
    }
  }
  
  // Update track info
  function updateTrackInfo(title, artist) {
    const titleEl = document.getElementById('mini-track-title');
    const artistEl = document.getElementById('mini-track-artist');
    
    if (titleEl) titleEl.textContent = title;
    if (artistEl) artistEl.textContent = artist;
  }
  
  // Initialize when DOM is loaded
  document.addEventListener('DOMContentLoaded', initMiniPlayer);
  
  // Public API
  window.miniMusicPlayer = {
    open: openMiniPlayer,
    close: closeMiniPlayer,
    updateTrackInfo: updateTrackInfo,
    updatePlayButton: updatePlayButton
  };
})();
