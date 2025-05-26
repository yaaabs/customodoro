(function() {
  // BGM Player Variables
  let isEnabled = true;
  let isPlaying = false;
  let currentTrack = 0;
  let currentPlaylist = null;
  let audio = new Audio();
  let progressInterval = null;
  let volume = 0.3; // Default volume 30%
  
  // Define playlists with their tracks
  const playlists = {
    'deep-focus': [
      {
        title: 'Clear Skies',
        artist: 'Aqua Scholar',
        src: 'audio/BGM/Deep focus study playlist/Clear Skies - Aqua Scholar.mp3'
      },
      {
        title: 'Gentle Ocean',
        artist: 'Sonic Strokes',
        src: 'audio/BGM/Deep focus study playlist/Gentle Ocean - Sonic Strokes.mp3'
      },
      {
        title: 'Venusian Vespers',
        artist: 'CS',
        src: 'audio/BGM/Deep focus study playlist/CSVenusian Vespers.mp3'
      }
    ],
    'ambient-long': [
      {
        title: 'Lofi Hip-hop Chill Beats',
        artist: 'Various Artists',
        src: 'audio/BGM/Lofi Hip-hop Chill Beats.mp3'
      }
    ]
  };
  
  // DOM Elements
  let bgmToggle, playlistSelector, volumeSlider, volumePercentage;
  let trackTitle, trackArtist, playBtn, pauseIcon, playIcon;
  let prevBtn, nextBtn, progressBar;
  
  // Initialize the BGM player
  function initPlayer() {
    // Get DOM elements
    bgmToggle = document.getElementById('bgm-toggle');
    playlistSelector = document.getElementById('playlist-selector');
    volumeSlider = document.getElementById('bgm-volume-slider');
    volumePercentage = document.getElementById('bgm-volume-percentage');
    trackTitle = document.getElementById('bgm-track-title');
    trackArtist = document.getElementById('bgm-track-artist');
    playBtn = document.getElementById('bgm-play-btn');
    playIcon = document.getElementById('bgm-play-icon');
    pauseIcon = document.getElementById('bgm-pause-icon');
    prevBtn = document.getElementById('bgm-prev-btn');
    nextBtn = document.getElementById('bgm-next-btn');
    progressBar = document.getElementById('bgm-progress-bar');
    
    if (!bgmToggle || !playlistSelector || !playBtn) {
      console.error('BGM Player: Required elements not found');
      return;
    }
    
    // Setup audio event listeners
    setupAudioEvents();
    
    // Load saved settings
    loadSettings();
    
    // Load initial playlist
    if (playlistSelector.value) {
      loadPlaylist(playlistSelector.value);
    }
    
    // Setup event listeners for controls
    setupEventListeners();
    
    console.log('BGM Player initialized');
  }
  
  // Setup audio event listeners
  function setupAudioEvents() {
    audio.addEventListener('ended', () => {
      nextTrack();
    });
    
    audio.addEventListener('error', (e) => {
      console.error('BGM Player: Audio error', e);
      displayMessage('Error playing track');
    });
    
    audio.addEventListener('playing', () => {
      if (playIcon && pauseIcon) {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
      }
    });
    
    audio.addEventListener('pause', () => {
      if (playIcon && pauseIcon) {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
      }
      
      clearInterval(progressInterval);
    });
  }
  
  // Load saved settings
  function loadSettings() {
    // Get BGM enabled setting
    const savedEnabled = localStorage.getItem('bgmEnabled');
    if (savedEnabled !== null) {
      isEnabled = savedEnabled !== 'false';
      if (bgmToggle) {
        bgmToggle.checked = isEnabled;
      }
    }
    
    // Get volume setting
    const savedVolume = localStorage.getItem('bgmVolume');
    if (savedVolume !== null) {
      volume = parseInt(savedVolume) / 100;
      if (volumeSlider) {
        volumeSlider.value = parseInt(savedVolume);
      }
      if (volumePercentage) {
        volumePercentage.textContent = `${savedVolume}%`;
      }
    } else if (volumeSlider) {
      volumeSlider.value = volume * 100;
      if (volumePercentage) {
        volumePercentage.textContent = `${Math.round(volume * 100)}%`;
      }
    }
    
    audio.volume = volume;
    
    // Get saved playlist
    const savedPlaylist = localStorage.getItem('bgmPlaylist');
    if (savedPlaylist && playlistSelector) {
      playlistSelector.value = savedPlaylist;
    }
    
    // Get saved track index
    const savedTrackIndex = localStorage.getItem('bgmTrackIndex');
    if (savedTrackIndex !== null) {
      currentTrack = parseInt(savedTrackIndex);
    }
  }
  
  // Save current state
  function saveState() {
    localStorage.setItem('bgmEnabled', isEnabled);
    localStorage.setItem('bgmVolume', Math.round(volume * 100));
    localStorage.setItem('bgmPlaylist', currentPlaylist || '');
    localStorage.setItem('bgmTrackIndex', currentTrack);
    
    console.log('BGM Player: State saved');
  }
  
  // Setup event listeners
  function setupEventListeners() {
    if (bgmToggle) {
      bgmToggle.addEventListener('change', () => {
        isEnabled = bgmToggle.checked;
        if (!isEnabled && isPlaying) {
          pauseTrack();
        }
        saveState();
      });
    }
    
    if (playlistSelector) {
      playlistSelector.addEventListener('change', () => {
        loadPlaylist(playlistSelector.value);
        saveState();
      });
    }
    
    if (volumeSlider) {
      volumeSlider.addEventListener('input', () => {
        volume = volumeSlider.value / 100;
        audio.volume = volume;
        if (volumePercentage) {
          volumePercentage.textContent = `${volumeSlider.value}%`;
        }
        saveState();
      });
    }
    
    if (playBtn) {
      playBtn.addEventListener('click', togglePlayback);
    }
    
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        prevTrack();
      });
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        nextTrack();
      });
    }
  }
  
  // Load a playlist
  function loadPlaylist(playlistId) {
    if (!playlists[playlistId]) {
      console.error(`BGM Player: Playlist "${playlistId}" not found`);
      return;
    }
    
    // If already playing, pause the current track
    if (isPlaying) {
      pauseTrack();
    }
    
    currentPlaylist = playlistId;
    currentTrack = 0; // Reset to first track when changing playlists
    
    loadTrack();
  }
  
  // Load the current track
  function loadTrack() {
    if (!currentPlaylist || !playlists[currentPlaylist]) return;
    
    const playlist = playlists[currentPlaylist];
    if (currentTrack >= playlist.length) {
      currentTrack = 0; // Loop back to beginning
    }
    
    if (currentTrack < 0) {
      currentTrack = playlist.length - 1; // Go to end
    }
    
    const track = playlist[currentTrack];
    
    // Update UI
    if (trackTitle) {
      trackTitle.textContent = track.title;
    }
    
    if (trackArtist) {
      trackArtist.textContent = track.artist;
    }
    
    // Set up the audio
    audio.src = track.src;
    audio.load();
    
    // Auto-play if was previously playing
    if (isPlaying) {
      playTrack();
    }
    
    saveState();
  }
  
  // Toggle between play and pause
  function togglePlayback() {
    if (!isEnabled) {
      alert('Please enable background music first');
      return;
    }
    
    if (!currentPlaylist) {
      // If no playlist is selected yet, use the current selection
      if (playlistSelector) {
        loadPlaylist(playlistSelector.value);
      } else {
        console.error('BGM Player: No playlist selected');
        return;
      }
    }
    
    if (isPlaying) {
      pauseTrack();
    } else {
      playTrack();
    }
  }
  
  // Play the current track
  function playTrack() {
    if (!isEnabled) return;
    
    try {
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            isPlaying = true;
            startProgressTracking();
            updatePlayButtonState();
          })
          .catch(error => {
            console.error('BGM Player: Playback error', error);
            isPlaying = false;
            updatePlayButtonState();
          });
      }
    } catch (error) {
      console.error('BGM Player: Playback error', error);
      isPlaying = false;
      updatePlayButtonState();
    }
  }
  
  // Pause the current track
  function pauseTrack() {
    audio.pause();
    isPlaying = false;
    stopProgressTracking();
    updatePlayButtonState();
  }
  
  // Go to next track
  function nextTrack() {
    currentTrack++;
    loadTrack();
  }
  
  // Go to previous track
  function prevTrack() {
    currentTrack--;
    loadTrack();
  }
  
  // Update the play button state
  function updatePlayButtonState() {
    if (!playBtn || !playIcon || !pauseIcon) return;
    
    if (isPlaying) {
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
    } else {
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
    }
  }
  
  // Start tracking progress for progress bar
  function startProgressTracking() {
    stopProgressTracking();
    
    progressInterval = setInterval(() => {
      if (!progressBar || !audio.duration) return;
      
      const progress = (audio.currentTime / audio.duration) * 100;
      progressBar.style.width = `${progress}%`;
    }, 1000);
  }
  
  // Stop tracking progress
  function stopProgressTracking() {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
  }
  
  // Display a message in the track info
  function displayMessage(message) {
    const originalTitle = trackTitle ? trackTitle.textContent : '';
    const originalArtist = trackArtist ? trackArtist.textContent : '';
    
    if (trackTitle) {
      trackTitle.textContent = message;
    }
    
    if (trackArtist) {
      trackArtist.textContent = '';
    }
    
    // Restore original text after 3 seconds
    setTimeout(() => {
      if (trackTitle) {
        trackTitle.textContent = originalTitle;
      }
      
      if (trackArtist) {
        trackArtist.textContent = originalArtist;
      }
    }, 3000);
  }
  
  // Initialize on DOM content loaded
  document.addEventListener('DOMContentLoaded', initPlayer);
  
  // Public API
  window.bgmPlayer = {
    play: playTrack,
    pause: pauseTrack,
    next: nextTrack,
    prev: prevTrack,
    toggle: togglePlayback,
    setVolume: (newVolume) => {
      volume = newVolume / 100;
      audio.volume = volume;
      
      if (volumeSlider) {
        volumeSlider.value = newVolume;
      }
      
      if (volumePercentage) {
        volumePercentage.textContent = `${newVolume}%`;
      }
      
      saveState();
    },
    setEnabled: (enabled) => {
      isEnabled = enabled;
      if (bgmToggle) {
        bgmToggle.checked = enabled;
      }
      
      if (!enabled && isPlaying) {
        pauseTrack();
      }
      
      saveState();
    },
    isPlaying: () => isPlaying,
    isEnabled: () => isEnabled,
    saveState: saveState
  };
})();