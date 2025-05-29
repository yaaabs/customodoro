(function() {
  // DOM Elements
  let audio = new Audio();
  let playlistSelector, bgmToggle, volumeSlider, volumePercentage;
  let trackTitleElement, trackArtistElement;
  let playBtn, prevBtn, nextBtn, playIcon, pauseIcon;
  let progressBar, progressContainer, currentTimeElement, totalTimeElement;
  let shuffleBtn; // Shuffle button element

  // State
  let currentPlaylist = null;
  let currentTrackIndex = 0;
  let playlists = {}; // To be populated
  let isPlaying = false;
  let isBGMEnabled = true; // Default to true, synced with localStorage
  let isShuffleMode = false; // Shuffle state
  let originalPlaylist = []; // Store original playlist order

  // Initialize BGM Player
  function init() {
    // Get DOM elements
    playlistSelector = document.getElementById('playlist-selector');
    bgmToggle = document.getElementById('bgm-toggle');
    volumeSlider = document.getElementById('bgm-volume-slider');
    volumePercentage = document.getElementById('bgm-volume-percentage');
    
    trackTitleElement = document.getElementById('bgm-track-title');
    trackArtistElement = document.getElementById('bgm-track-artist');
    
    playBtn = document.getElementById('bgm-play-btn');
    prevBtn = document.getElementById('bgm-prev-btn');
    nextBtn = document.getElementById('bgm-next-btn');
    playIcon = document.getElementById('bgm-play-icon');
    pauseIcon = document.getElementById('bgm-pause-icon');
    
    progressBar = document.getElementById('bgm-progress-bar');
    progressContainer = document.getElementById('bgm-progress-container');
    currentTimeElement = document.getElementById('bgm-current-time');
    totalTimeElement = document.getElementById('bgm-total-time');
    shuffleBtn = document.getElementById('bgm-shuffle-btn'); // New shuffle button

    // Load playlists with the actual audio files
    playlists = {
      'deep-focus': [
        { title: 'Clear Skies', artist: 'Aqua Scholar', src: 'audio/BGM/Deep focus study playlist/Clear Skies - Aqua Scholar.mp3' },
        { title: 'Gentle Ocean', artist: 'Sonic Strokes', src: 'audio/BGM/Deep focus study playlist/Gentle Ocean - Sonic Strokes.mp3' },
        { title: 'SVenusian Vespers', artist: 'Nahh Chill', src: 'audio/BGM/Deep focus study playlist/SVenusian Vespers.mp3' }
      ],
      'ambient-long': [
        { title: 'Lofi Hip-hop Chill Beats', artist: 'Various Artists', src: 'audio/BGM/Lofi Hip-hop Chill Beats.mp3' }
      ],
      'smile-demons': [
        {
          title: 'Anaheim',
          artist: 'NIKI',
          src: 'audio/BGM/Si all my demons have your smile pala to eh/Anaheim.mp3'
        },
        {
          title: 'Autumn',
          artist: 'NIKI',
          src: 'audio/BGM/Si all my demons have your smile pala to eh/Autumn.mp3'
        },
        {
          title: 'Backburner',
          artist: 'NIKI',
          src: 'audio/BGM/Si all my demons have your smile pala to eh/Backburner.mp3'
        },
        {
          title: 'Before',
          artist: 'NIKI',
          src: 'audio/BGM/Si all my demons have your smile pala to eh/Before.mp3'
        },
        {
          title: 'Chilly',
          artist: 'NIKI',
          src: 'audio/BGM/Si all my demons have your smile pala to eh/Chilly.mp3'
        },
        {
          title: 'Every Summertime',
          artist: 'NIKI',
          src: 'audio/BGM/Si all my demons have your smile pala to eh/Every Summertime.mp3'
        },
        {
          title: 'Facebook Friends',
          artist: 'NIKI',
          src: 'audio/BGM/Si all my demons have your smile pala to eh/Facebook Friends.mp3'
        },
        {
          title: 'Hallway Weather',
          artist: 'NIKI',
          src: 'audio/BGM/Si all my demons have your smile pala to eh/Hallway Weather.mp3'
        },
        {
          title: 'High School in Jakarta',
          artist: 'NIKI',
          src: 'audio/BGM/Si all my demons have your smile pala to eh/High School in Jakarta.mp3'
        },
        {
          title: 'I Like U',
          artist: 'NIKI',
          src: 'audio/BGM/Si all my demons have your smile pala to eh/I Like U.mp3'
        },
        {
          title: 'Indigo',
          artist: '88rising; NIKI',
          src: 'audio/BGM/Si all my demons have your smile pala to eh/Indigo.mp3'
        },
        {
          title: 'La La Lost You - Acoustic',
          artist: 'NIKI Acoustic Sessions Vol. 1',
          src: 'audio/BGM/Si all my demons have your smile pala to eh/La La Lost You - Acoustic.mp3'
        },
        {
          title: 'La La Lost You',
          artist: '88rising; NIKI',
          src: 'audio/BGM/Si all my demons have your smile pala to eh/La La Lost You.mp3'
        },
        {
          title: 'Lose',
          artist: 'NIKI',
          src: 'audio/BGM/Si all my demons have your smile pala to eh/Lose.mp3'
        },
        {
          title: 'lowkey',
          artist: 'NIKI',
          src: 'audio/BGM/Si all my demons have your smile pala to eh/lowkey.mp3'
        },
        {
          title: 'Newsflash!',
          artist: 'NIKI',
          src: 'audio/BGM/Si all my demons have your smile pala to eh/Newsflash!.mp3'
        },
        {
          title: 'Oceans & Engines',
          artist: 'NIKI',
          src: 'audio/BGM/Si all my demons have your smile pala to eh/Oceans & Engines.mp3'
        },
        {
          title: 'Plot Twist',
          artist: 'NIKI',
          src: 'audio/BGM/Si all my demons have your smile pala to eh/Plot Twist.mp3'
        },
        {
          title: 'See U Never',
          artist: 'NIKI',
          src: 'audio/BGM/Si all my demons have your smile pala to eh/See U Never.mp3'
        },
        {
          title: 'Selene',
          artist: 'NIKI',
          src: 'audio/BGM/Si all my demons have your smile pala to eh/Selene.mp3'
        },
        {
          title: 'Split',
          artist: '88rising; NIKI',
          src: 'audio/BGM/Si all my demons have your smile pala to eh/Split.mp3'
        },
        {
          title: 'Take A Chance With Me',
          artist: 'NIKI',
          src: 'audio/BGM/Si all my demons have your smile pala to eh/Take A Chance With Me.mp3'
        },
        {
          title: 'urs',
          artist: 'NIKI',
          src: 'audio/BGM/Si all my demons have your smile pala to eh/urs.mp3'
        },
        {
          title: 'Vintage',
          artist: 'NIKI',
          src: 'audio/BGM/Si all my demons have your smile pala to eh/Vintage.mp3'
        }
      ]
    };

    // Load settings from localStorage
    loadSettings();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initial UI update
    updateTrackDisplay();
    updatePlayButtonIcon(); // Ensure correct icon on load
    updateVolumeDisplay();

    // Set initial BGM enabled state
    setBGMEnabled(bgmToggle.checked);

    console.log('BGM Player Initialized');
    window.bgmPlayer.isInitialized = true;
  }

  // Load settings from localStorage
  function loadSettings() {
    const savedPlaylist = localStorage.getItem('bgmPlaylist') || 'deep-focus';
    const savedVolume = parseInt(localStorage.getItem('bgmVolume')) || 30;
    const savedBGMEnabled = localStorage.getItem('bgmEnabled') !== 'false'; // Defaults to true if not set
    const savedShuffleMode = localStorage.getItem('bgmShuffle') === 'true'; // Load shuffle setting

    if (playlistSelector) playlistSelector.value = savedPlaylist;
    if (volumeSlider) volumeSlider.value = savedVolume;
    if (bgmToggle) bgmToggle.checked = savedBGMEnabled;
    if (shuffleBtn) {
      shuffleBtn.classList.toggle('active', savedShuffleMode);
      shuffleBtn.setAttribute('aria-pressed', savedShuffleMode);
    }
    
    currentPlaylist = playlists[savedPlaylist];
    audio.volume = savedVolume / 100;
    isBGMEnabled = savedBGMEnabled;
    isShuffleMode = savedShuffleMode;
  }

  // Set up event listeners
  function setupEventListeners() {
    // Playlist selector
    if (playlistSelector) {
      playlistSelector.addEventListener('change', function() {
        currentPlaylist = playlists[this.value];
        currentTrackIndex = 0;
        localStorage.setItem('bgmPlaylist', this.value);
        loadTrack(currentTrackIndex);
        if (isPlaying) playAudio(); // If it was playing, continue with new playlist
      });
    }

    // BGM toggle
    if (bgmToggle) {
      bgmToggle.addEventListener('change', function() {
        setBGMEnabled(this.checked);
        localStorage.setItem('bgmEnabled', this.checked);
      });
    }

    // Volume slider
    if (volumeSlider) {
      volumeSlider.addEventListener('input', function() {
        const volume = parseInt(this.value);
        audio.volume = volume / 100;
        localStorage.setItem('bgmVolume', volume);
        updateVolumeDisplay();
      });
    }

    // Control buttons
    if (playBtn) playBtn.addEventListener('click', togglePlayPause);
    if (prevBtn) prevBtn.addEventListener('click', previousTrack);
    if (nextBtn) nextBtn.addEventListener('click', nextTrack);

    // Shuffle button
    if (shuffleBtn) {
      shuffleBtn.addEventListener('click', toggleShuffle);
    }

    // Audio events
    audio.addEventListener('loadedmetadata', function() {
      updateTrackDisplay();
      // Update duration display when metadata is loaded
      if (totalTimeElement) {
        totalTimeElement.textContent = formatTime(audio.duration);
      }
    });
    
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', nextTrackAuto);
    
    // Play/pause state change events
    audio.addEventListener('play', function() {
      isPlaying = true;
      updatePlayButtonIcon();
      // Sync with mini player if open
      if (window.miniMusicPlayer && typeof window.miniMusicPlayer.sync === 'function') {
        window.miniMusicPlayer.sync();
      }
    });
    
    audio.addEventListener('pause', function() {
      isPlaying = false;
      updatePlayButtonIcon();
      // Sync with mini player if open
      if (window.miniMusicPlayer && typeof window.miniMusicPlayer.sync === 'function') {
        window.miniMusicPlayer.sync();
      }
    });

    // Click on progress bar to seek
    if (progressContainer) {
      progressContainer.addEventListener('click', function(e) {
        if (!currentPlaylist || !audio.duration) return;
        
        const rect = progressContainer.getBoundingClientRect();
        const clickPosition = (e.clientX - rect.left) / rect.width;
        audio.currentTime = clickPosition * audio.duration;
      });
    }

    // Add autoplay functionality - when track ends, play next track
    if (audio) {
      audio.addEventListener('ended', function() {
        console.log('Track ended, auto-advancing to next track');
        nextTrack();
        // Auto-play the next track
        if (currentPlaylist && currentTrackIndex < currentPlaylist.length) {
          setTimeout(() => {
            playAudio();
          }, 500); // Small delay for smooth transition
        }
      });

      // Add error handling for failed track loads
      audio.addEventListener('error', function(e) {
        console.error('Error loading track:', e);
        // Try to skip to next track if current one fails
        nextTrack();
        if (currentPlaylist && currentTrackIndex < currentPlaylist.length) {
          setTimeout(() => {
            playAudio();
          }, 1000);
        }
      });
    }
  }

  // Enable/disable BGM
  function setBGMEnabled(enabled) {
    isBGMEnabled = enabled;
    const bgmPlayerEl = document.querySelector('.bgm-player');
    
    if (bgmPlayerEl) {
      if (enabled) {
        // Enable player
        bgmPlayerEl.classList.remove('disabled');
      } else {
        // Disable player and stop audio if playing
        bgmPlayerEl.classList.add('disabled');
        if (isPlaying) {
          pauseAudio();
        }
      }
    }
    
    // Update controls
    if (playBtn) playBtn.disabled = !enabled;
    if (prevBtn) prevBtn.disabled = !enabled;
    if (nextBtn) nextBtn.disabled = !enabled;
    if (playlistSelector) playlistSelector.disabled = !enabled;
    if (volumeSlider) volumeSlider.disabled = !enabled;
    
    // Sync with mini player if it's open
    if (window.miniMusicPlayer && typeof window.miniMusicPlayer.sync === 'function') {
      window.miniMusicPlayer.sync();
    }
  }

  // Load a track
  function loadTrack(index) {
    if (!currentPlaylist || index < 0 || index >= currentPlaylist.length) {
      if (trackTitleElement) trackTitleElement.textContent = 'Select a playlist';
      if (trackArtistElement) trackArtistElement.textContent = 'and press play';
      if (currentTimeElement) currentTimeElement.textContent = '0:00';
      if (totalTimeElement) totalTimeElement.textContent = '0:00';
      if (progressBar) progressBar.style.width = '0%';
      return;
    }
    
    currentTrackIndex = index;
    const track = currentPlaylist[currentTrackIndex];
    audio.src = track.src;
    
    // Update display elements
    if (trackTitleElement) trackTitleElement.textContent = track.title;
    if (trackArtistElement) trackArtistElement.textContent = track.artist;
    if (currentTimeElement) currentTimeElement.textContent = '0:00';
    if (totalTimeElement) totalTimeElement.textContent = '0:00';
    if (progressBar) progressBar.style.width = '0%';
    
    // Once metadata is loaded, the loadedmetadata event will update the duration
  }

  // Play audio
  function playAudio() {
    if (!isBGMEnabled || !currentPlaylist) return;
    
    if (!audio.src && currentPlaylist.length > 0) {
      loadTrack(0);
    }
    
    if (audio.src) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(_ => {
          // The play() Promise is successfully resolved
          isPlaying = true;
          updatePlayButtonIcon();
        }).catch(error => {
          console.error('Error playing audio:', error);
          isPlaying = false;
          updatePlayButtonIcon();
        });
      }
    }
  }

  // Pause audio
  function pauseAudio() {
    audio.pause();
    isPlaying = false;
    updatePlayButtonIcon();
  }

  // Toggle play/pause
  function togglePlayPause() {
    if (!isBGMEnabled) return;
    
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  }

  // Previous track
  function previousTrack() {
    if (!isBGMEnabled || !currentPlaylist) return;
    
    let newIndex = currentTrackIndex - 1;
    if (newIndex < 0) {
      newIndex = currentPlaylist.length - 1;
    }
    
    loadTrack(newIndex);
    
    // If it was playing, continue playing the new track
    if (isPlaying) {
      playAudio();
    }
  }

  // Next track
  function nextTrack() {
    if (!isBGMEnabled || !currentPlaylist) return;
    
    let newIndex = currentTrackIndex + 1;
    if (newIndex >= currentPlaylist.length) {
      newIndex = 0;
    }
    
    loadTrack(newIndex);
    
    // If it was playing, continue playing the new track
    if (isPlaying) {
      playAudio();
    }
  }

  // Auto play next track when current one ends
  function nextTrackAuto() {
    nextTrack();
  }

  // Update track display
  function updateTrackDisplay() {
    if (!currentPlaylist || currentTrackIndex >= currentPlaylist.length) {
      if (trackTitleElement) trackTitleElement.textContent = 'Select a playlist';
      if (trackArtistElement) trackArtistElement.textContent = 'and press play';
      return;
    }
    
    const track = currentPlaylist[currentTrackIndex];
    if (trackTitleElement) trackTitleElement.textContent = track.title;
    if (trackArtistElement) trackArtistElement.textContent = track.artist;
  }

  // Update play/pause button icon
  function updatePlayButtonIcon() {
    if (!playIcon || !pauseIcon) return;
    
    if (isPlaying) {
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
    } else {
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
    }
  }

  // Update volume display
  function updateVolumeDisplay() {
    if (volumePercentage && volumeSlider) {
      volumePercentage.textContent = volumeSlider.value + '%';
    }
  }

  // Update progress bar and time display
  function updateProgress() {
    // Update progress bar
    if (progressBar && audio.duration) {
      const progress = (audio.currentTime / audio.duration) * 100;
      progressBar.style.width = progress + '%';
    }
    
    // Update current time display
    if (currentTimeElement) {
      currentTimeElement.textContent = formatTime(audio.currentTime);
    }
    
    // Update total time if needed (in case it wasn't available initially)
    if (totalTimeElement && audio.duration && totalTimeElement.textContent === '0:00') {
      totalTimeElement.textContent = formatTime(audio.duration);
    }
  }

  // Format time in MM:SS
  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  // Toggle shuffle mode
  function toggleShuffle() {
    isShuffleMode = !isShuffleMode;
    
    // Update UI if button exists
    const shuffleBtn = document.getElementById('bgm-shuffle-btn');
    if (shuffleBtn) {
      shuffleBtn.classList.toggle('active', isShuffleMode);
      shuffleBtn.setAttribute('aria-pressed', isShuffleMode);
    }
    
    // If we're currently in a playlist
    if (currentPlaylist.length > 0) {
      // Remember the current track
      const currentTrack = currentPlaylist[currentTrackIndex];
      const wasPlaying = isPlaying;
      
      if (isShuffleMode) {
        // Turn shuffle on - store original order if not already stored
        if (originalPlaylist.length === 0) {
          originalPlaylist = [...currentPlaylist];
        }
        
        // Create a new shuffled playlist
        const newShuffledPlaylist = [...originalPlaylist];
        shuffleArray(newShuffledPlaylist);
        
        // If we have a current track playing, make sure it stays as the current track
        if (currentTrack) {
          // Find its position in the new shuffled array
          const newIndex = newShuffledPlaylist.findIndex(track => 
            track.src === currentTrack.src);
          
          if (newIndex !== -1) {
            currentTrackIndex = newIndex;
          } else {
            // If for some reason we can't find the track, reset to first track
            currentTrackIndex = 0;
            console.warn("Could not find current track in shuffled playlist");
          }
        }
        
        currentPlaylist = newShuffledPlaylist;
        
      } else {
        // Turn shuffle off - restore original order
        if (originalPlaylist.length > 0) {
          // Find the current track's position in the original playlist
          if (currentTrack) {
            const originalIndex = originalPlaylist.findIndex(track => 
              track.src === currentTrack.src);
            
            currentPlaylist = [...originalPlaylist];
            
            if (originalIndex !== -1) {
              currentTrackIndex = originalIndex;
            } else {
              // Safety check - this shouldn't happen but just in case
              currentTrackIndex = 0;
              console.warn("Could not find current track in original playlist");
            }
          } else {
            currentPlaylist = [...originalPlaylist];
            currentTrackIndex = 0;
          }
        }
      }
      
      // Update the display
      updateTrackDisplay();
      
      // Resume playback if it was playing
      if (wasPlaying && !isPlaying) {
        play();
      }
    }
    
    // Save the setting
    saveSettings();
    
    console.log(`Shuffle mode ${isShuffleMode ? 'enabled' : 'disabled'}`);
  }
  
  // Use Fisher-Yates shuffle algorithm for better randomization
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // Replace the shufflePlaylist function with a call to our shuffleArray function
  function shufflePlaylist() {
    shuffleArray(currentPlaylist);
  }

  // Load a playlist
  function loadPlaylist(playlistName) {
    if (!playlists[playlistName]) {
      console.error(`Playlist '${playlistName}' not found`);
      return;
    }
    
    currentPlaylistName = playlistName;
    originalPlaylist = [...playlists[playlistName]]; // Store original order
    currentPlaylist = [...originalPlaylist]; // Create a copy to manipulate
    
    if (isShuffleMode) {
      shuffleArray(currentPlaylist);
    }
    
    currentTrackIndex = 0;
    updateTrackDisplay();
    
    // Preload first track
    audio.src = currentPlaylist[0].src;
    audio.load();
    
    // Save to settings
    saveSettings();
  }

  // Play track with better error handling
  function play() {
    if (!isBGMEnabled || currentPlaylist.length === 0) return;
    
    try {
      if (!currentPlaylist[currentTrackIndex]) {
        console.warn("Invalid track index, resetting to 0");
        currentTrackIndex = 0;
        if (!currentPlaylist[currentTrackIndex]) {
          console.error("No tracks available to play");
          return;
        }
      }
      
      audio.src = currentPlaylist[currentTrackIndex].src;
      audio.load();
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          isPlaying = true;
          updatePlayButton();
          updateTrackDisplay();
          startProgressUpdates();
          console.log(`Playing: ${currentPlaylist[currentTrackIndex].title}`);
        }).catch(error => {
          console.error('Audio playback failed:', error);
          isPlaying = false;
          updatePlayButton();
        });
      }
      
    } catch (error) {
      console.error('Failed to play audio:', error);
      isPlaying = false;
      updatePlayButton();
    }
  }

  // Public API
  window.bgmPlayer = {
    init: init,
    toggle: togglePlayPause,
    play: playAudio,
    pause: pauseAudio,
    next: nextTrack,
    previous: previousTrack,
    isPlaying: function() { return isPlaying; },
    isBGMEnabled: function() { return isBGMEnabled; },
    getVolume: function() { 
      return parseInt(volumeSlider ? volumeSlider.value : 30); 
    },
    setVolume: function(volume) {
      if (volumeSlider) volumeSlider.value = volume;
      if (volumePercentage) volumePercentage.textContent = volume + '%';
      audio.volume = volume / 100;
      localStorage.setItem('bgmVolume', volume);
    },
    getCurrentTrack: function() {
      if (!currentPlaylist || currentTrackIndex >= currentPlaylist.length) return null;
      return currentPlaylist[currentTrackIndex];
    },
    getProgress: function() {
      if (!audio.duration) return 0;
      return (audio.currentTime / audio.duration) * 100;
    },
    getCurrentTime: function() {
      return audio.currentTime || 0;
    },
    getDuration: function() {
      return audio.duration || 0;
    },
    seek: function(time) {
      if (audio.duration && time >= 0 && time <= audio.duration) {
        audio.currentTime = time;
      }
    },
    setBGMEnabled: setBGMEnabled,
    isInitialized: false,
    toggleShuffle: toggleShuffle,
    isShuffleMode: function() { return isShuffleMode; }
  };

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure DOM is fully loaded
    setTimeout(init, 100);
  });
})();