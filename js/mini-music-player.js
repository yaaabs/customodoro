(function() {
  let miniPlayerModal;
  let isOpen = false;
  let syncInterval = null;

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
              
              <button class="mini-btn mini-btn-shuffle" id="mini-shuffle-btn" aria-pressed="false" title="Shuffle">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M17,3L22,8L17,13V10H14.82C14.4,9.84 14.03,9.61 13.71,9.29L10.29,5.87C9.39,4.97 8.23,4.5 7,4.5C4.79,4.5 3,6.29 3,8.5C3,10.71 4.79,12.5 7,12.5C8.23,12.5 9.39,12.03 10.29,11.13L13.71,7.71C14.03,7.39 14.4,7.16 14.82,7H17V3M7,6.5C8.38,6.5 9.5,7.62 9.5,9C9.5,10.38 8.38,11.5 7,11.5C5.62,11.5 4.5,10.38 4.5,9C4.5,7.62 5.62,6.5 7,6.5M17,21V17H14.82C14.4,17.16 14.03,17.39 13.71,17.71L10.29,21.13C9.39,22.03 8.23,22.5 7,22.5C4.79,22.5 3,20.71 3,18.5C3,16.29 4.79,14.5 7,14.5C8.23,14.5 9.39,14.97 10.29,15.87L13.71,19.29C14.03,19.61 14.4,19.84 14.82,20H17V17L22,21L17,25V21Z" />
                </svg>
              </button>
            </div>
            
            <div class="mini-player-progress-container">
              <div class="mini-player-progress" id="mini-progress">
                <div class="mini-progress-bar" id="mini-progress-bar"></div>
              </div>
              <div class="mini-player-time">
                <span id="mini-current-time">0:00</span> / <span id="mini-total-time">0:00</span>
              </div>
            </div>
            
            <div class="mini-player-volume">
              <div class="mini-volume-label">Music Volume</div>
              <div class="mini-volume-container">
                <input type="range" class="mini-volume-slider" id="mini-volume-slider" min="0" max="100" value="30">
                <span id="mini-volume-display">30%</span>
              </div>
            </div>
          </div>
          
          <div class="mini-player-footer">
            <button class="mini-settings-btn" id="mini-full-settings-btn">Full Settings</button>
            <button class="mini-close-btn" id="mini-footer-close-btn">Close</button>
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
    const footerCloseBtn = document.getElementById('mini-footer-close-btn');
    const fullSettingsBtn = document.getElementById('mini-full-settings-btn');
    const playBtn = document.getElementById('mini-play-btn');
    const prevBtn = document.getElementById('mini-prev-btn');
    const nextBtn = document.getElementById('mini-next-btn');
    const shuffleBtn = document.getElementById('mini-shuffle-btn');
    const volumeSlider = document.getElementById('mini-volume-slider');
    const volumeDisplay = document.getElementById('mini-volume-display');
    const miniProgressBar = document.querySelector('.mini-player-progress');

    // Close button
    if (closeBtn) {
      closeBtn.addEventListener('click', closeMiniPlayer);
    }
    
    if (footerCloseBtn) {
      footerCloseBtn.addEventListener('click', closeMiniPlayer);
    }

    // Full settings button - navigate to BGM section
    if (fullSettingsBtn) {
      fullSettingsBtn.addEventListener('click', function() {
        closeMiniPlayer();
        
        // Open main settings modal
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
          settingsModal.classList.add('show');
          
          // Navigate to BGM section
          setTimeout(() => {
            const navItems = document.querySelectorAll('.settings-nav-item');
            const bgmNavItem = document.querySelector('.settings-nav-item[data-section="bgm"]');
            const bgmSection = document.getElementById('bgm-section');
            
            // Remove active from all nav items and sections
            navItems.forEach(item => item.classList.remove('active'));
            document.querySelectorAll('.settings-section').forEach(section => {
              section.classList.remove('active');
            });
            
            // Activate BGM section
            if (bgmNavItem) bgmNavItem.classList.add('active');
            if (bgmSection) bgmSection.classList.add('active');
          }, 100);
        }
      });
    }

    // Volume control with real-time sync
    if (volumeSlider && volumeDisplay) {
      volumeSlider.addEventListener('input', function() {
        const volume = parseInt(this.value);
        volumeDisplay.textContent = volume + '%';
        
        // Update BGM player volume and save to localStorage
        if (window.bgmPlayer && typeof window.bgmPlayer.setVolume === 'function') {
          window.bgmPlayer.setVolume(volume);
        }
      });
    }

    // Control buttons with BGM player integration
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

      // Add double click to skip back 10 seconds
      prevBtn.addEventListener('dblclick', function() {
        if (window.bgmPlayer && typeof window.bgmPlayer.seek === 'function') {
          const currentTime = window.bgmPlayer.getCurrentTime() || 0;
          window.bgmPlayer.seek(Math.max(0, currentTime - 10));
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function() {
        if (window.bgmPlayer && typeof window.bgmPlayer.next === 'function') {
          window.bgmPlayer.next();
        }
      });

      // Add double click to skip forward 10 seconds
      nextBtn.addEventListener('dblclick', function() {
        if (window.bgmPlayer && typeof window.bgmPlayer.seek === 'function') {
          const currentTime = window.bgmPlayer.getCurrentTime() || 0;
          const duration = window.bgmPlayer.getDuration() || 0;
          window.bgmPlayer.seek(Math.min(duration, currentTime + 10));
        }
      });
    }
    
    // Add shuffle button functionality
    if (shuffleBtn) {
      // Set initial state based on BGM player
      if (window.bgmPlayer && typeof window.bgmPlayer.isShuffleMode === 'function') {
        const isShuffleOn = window.bgmPlayer.isShuffleMode();
        shuffleBtn.classList.toggle('active', isShuffleOn);
        shuffleBtn.setAttribute('aria-pressed', isShuffleOn);
      }
      
      shuffleBtn.addEventListener('click', function() {
        if (window.bgmPlayer && typeof window.bgmPlayer.toggleShuffle === 'function') {
          window.bgmPlayer.toggleShuffle();
          
          // Update button state
          const isShuffleOn = window.bgmPlayer.isShuffleMode();
          shuffleBtn.classList.toggle('active', isShuffleOn);
          shuffleBtn.setAttribute('aria-pressed', isShuffleOn);
        }
      });
    }

    // Click on progress bar to seek
    if (miniProgressBar) {
      miniProgressBar.addEventListener('click', function(e) {
        if (window.bgmPlayer && typeof window.bgmPlayer.getDuration === 'function') {
          const rect = miniProgressBar.getBoundingClientRect();
          const clickPosition = (e.clientX - rect.left) / rect.width;
          const seekTime = clickPosition * window.bgmPlayer.getDuration();
          
          if (window.bgmPlayer && typeof window.bgmPlayer.seek === 'function') {
            window.bgmPlayer.seek(seekTime);
          }
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

  // Start real-time sync with BGM player
  function startSync() {
    if (syncInterval) clearInterval(syncInterval);
    
    syncInterval = setInterval(() => {
      if (isOpen && window.bgmPlayer) {
        syncWithBGMPlayer();
      }
    }, 500); // More frequent updates for smoother UI
  }

  // Stop sync
  function stopSync() {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }
  }

  // Format time in MM:SS
  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  // Sync mini player state with main BGM player
  function syncWithBGMPlayer() {
    if (!window.bgmPlayer) return;

    // Update play button state
    const isPlaying = window.bgmPlayer.isPlaying();
    updatePlayButton(isPlaying);

    // Update track info if available
    const currentTrack = window.bgmPlayer.getCurrentTrack();
    if (currentTrack) {
      updateTrackInfo(currentTrack.title, currentTrack.artist);
    } else {
      updateTrackInfo('No music playing', 'Select a playlist to start');
    }

    // Update volume
    const currentVolume = window.bgmPlayer.getVolume();
    if (currentVolume !== undefined) {
      const volumeSlider = document.getElementById('mini-volume-slider');
      const volumeDisplay = document.getElementById('mini-volume-display');
      if (volumeSlider && volumeSlider.value != currentVolume) {
        volumeSlider.value = currentVolume;
      }
      if (volumeDisplay) {
        volumeDisplay.textContent = Math.round(currentVolume) + '%';
      }
    }

    // Update progress bar if available
    const progress = window.bgmPlayer.getProgress();
    if (progress !== undefined) {
      const progressBar = document.getElementById('mini-progress-bar');
      if (progressBar) {
        progressBar.style.width = progress + '%';
      }
    }
    
    // Update time displays
    const currentTime = window.bgmPlayer.getCurrentTime();
    const totalTime = window.bgmPlayer.getDuration();
    
    const currentTimeEl = document.getElementById('mini-current-time');
    const totalTimeEl = document.getElementById('mini-total-time');
    
    if (currentTimeEl) {
      currentTimeEl.textContent = formatTime(currentTime);
    }
    
    if (totalTimeEl) {
      totalTimeEl.textContent = formatTime(totalTime);
    }
    
    // Update shuffle button state
    if (typeof window.bgmPlayer.isShuffleMode === 'function') {
      const isShuffleOn = window.bgmPlayer.isShuffleMode();
      const shuffleBtn = document.getElementById('mini-shuffle-btn');
      if (shuffleBtn) {
        shuffleBtn.classList.toggle('active', isShuffleOn);
        shuffleBtn.setAttribute('aria-pressed', isShuffleOn);
      }
    }
    
    // Update enabled/disabled state
    const isBGMEnabled = window.bgmPlayer.isBGMEnabled();
    const miniPlayerBody = document.querySelector('.mini-player-body');
    const controls = document.querySelectorAll('.mini-btn, .mini-volume-slider');
    
    if (miniPlayerBody) {
      miniPlayerBody.style.opacity = isBGMEnabled ? '1' : '0.6';
    }
    
    controls.forEach(control => {
      control.disabled = !isBGMEnabled;
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
    
    // Update initial state and start sync
    updateInitialState();
    startSync();
  }

  // Close mini player
  function closeMiniPlayer() {
    if (miniPlayerModal) {
      isOpen = false;
      miniPlayerModal.classList.remove('show');
      document.body.style.overflow = '';
      stopSync();
    }
  }

  // Update initial state when opening
  function updateInitialState() {
    if (window.bgmPlayer) {
      // Get current state from BGM player
      const isPlaying = window.bgmPlayer.isPlaying();
      const currentTrack = window.bgmPlayer.getCurrentTrack();
      const volume = window.bgmPlayer.getVolume() || 30;
      const currentTime = window.bgmPlayer.getCurrentTime() || 0;
      const totalTime = window.bgmPlayer.getDuration() || 0;
      const isBGMEnabled = window.bgmPlayer.isBGMEnabled();
      const isShuffleOn = typeof window.bgmPlayer.isShuffleMode === 'function' ? 
                        window.bgmPlayer.isShuffleMode() : false;

      // Update UI
      updatePlayButton(isPlaying);
      
      if (currentTrack) {
        updateTrackInfo(currentTrack.title, currentTrack.artist);
      } else {
        updateTrackInfo('No music playing', 'Select a playlist to start');
      }
      
      updateVolumeDisplay(volume);
      
      const currentTimeEl = document.getElementById('mini-current-time');
      const totalTimeEl = document.getElementById('mini-total-time');
      
      if (currentTimeEl) currentTimeEl.textContent = formatTime(currentTime);
      if (totalTimeEl) totalTimeEl.textContent = formatTime(totalTime);
      
      // Set enabled/disabled state
      const miniPlayerBody = document.querySelector('.mini-player-body');
      const controls = document.querySelectorAll('.mini-btn, .mini-volume-slider');
      
      if (miniPlayerBody) {
        miniPlayerBody.style.opacity = isBGMEnabled ? '1' : '0.6';
      }
      
      controls.forEach(control => {
        control.disabled = !isBGMEnabled;
      });
      
      // Update shuffle button state
      const shuffleBtn = document.getElementById('mini-shuffle-btn');
      if (shuffleBtn) {
        shuffleBtn.classList.toggle('active', isShuffleOn);
        shuffleBtn.setAttribute('aria-pressed', isShuffleOn);
      }
    } else {
      // BGM player not available
      updateTrackInfo('BGM Player not available', 'Please check settings');
      updatePlayButton(false);
      updateVolumeDisplay(30);
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

  // Update volume display
  function updateVolumeDisplay(volume) {
    const volumeSlider = document.getElementById('mini-volume-slider');
    const volumeDisplay = document.getElementById('mini-volume-display');
    
    if (volumeSlider) volumeSlider.value = volume;
    if (volumeDisplay) volumeDisplay.textContent = Math.round(volume) + '%';
  }

  // Public API
  window.miniMusicPlayer = {
    open: openMiniPlayer,
    close: closeMiniPlayer,
    updateTrackInfo: updateTrackInfo,
    updatePlayButton: updatePlayButton,
    isOpen: () => isOpen,
    sync: syncWithBGMPlayer
  };
})();
