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
    
    if (!bgmToggle || !playlistSelector) {
      console.log('BGM Player: Some elements not found, will try again later');
      return false;
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
    
    // Mark as initialized
    window.bgmPlayer.isInitialized = true;
    
    console.log('BGM Player initialized');
    return true;
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
      isPlaying = true;
      updatePlayButtonState();
      notifyMiniPlayer();
    });
    
    audio.addEventListener('pause', () => {
      isPlaying = false;
      stopProgressTracking();
      updatePlayButtonState();
      notifyMiniPlayer();
    });

    audio.addEventListener('timeupdate', () => {
      notifyMiniPlayer();
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
    
    // Notify mini player of track change
    notifyMiniPlayer();
    
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

  // Get current track info
  function getCurrentTrack() {
    if (!currentPlaylist || !playlists[currentPlaylist]) return null;
    
    const playlist = playlists[currentPlaylist];
    if (currentTrack < 0 || currentTrack >= playlist.length) return null;
    
    return playlist[currentTrack];
  }

  // Get current volume as percentage
  function getVolume() {
    return Math.round(volume * 100);
  }

  // Get playback progress as percentage
  function getProgress() {
    if (!audio.duration) return 0;
    return (audio.currentTime / audio.duration) * 100;
  }

  // Notify mini player of state changes
  function notifyMiniPlayer() {
    if (window.miniMusicPlayer && typeof window.miniMusicPlayer.sync === 'function') {
      window.miniMusicPlayer.sync();
    }
  }

  // Refresh UI elements (useful when switching between pages)
  function refreshUI() {
    updatePlayButtonState();
    
    if (volumeSlider) {
      volumeSlider.value = Math.round(volume * 100);
    }
    
    if (volumePercentage) {
      volumePercentage.textContent = `${Math.round(volume * 100)}%`;
    }
    
    const track = getCurrentTrack();
    if (track) {
      if (trackTitle) trackTitle.textContent = track.title;
      if (trackArtist) trackArtist.textContent = track.artist;
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
    
    // Also update mini player if it exists
    if (window.miniMusicPlayer) {
      window.miniMusicPlayer.updateTrackInfo(message, '');
    }
    
    // Restore original text after 3 seconds
    setTimeout(() => {
      if (trackTitle) {
        trackTitle.textContent = originalTitle;
      }
      
      if (trackArtist) {
        trackArtist.textContent = originalArtist;
      }
      
      // Restore mini player info too
      if (window.miniMusicPlayer) {
        window.miniMusicPlayer.updateTrackInfo(originalTitle, originalArtist);
      }
    }, 3000);
  }
  
  // Initialize on DOM content loaded
  document.addEventListener('DOMContentLoaded', initPlayer);
  
  // Public API
  window.bgmPlayer = {
    init: initPlayer,
    play: playTrack,
    pause: pauseTrack,
    next: nextTrack,
    prev: prevTrack,
    previous: prevTrack,
    toggle: togglePlayback,
    getCurrentTrack: getCurrentTrack,
    getVolume: getVolume,
    getProgress: getProgress,
    refreshUI: refreshUI,
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
      notifyMiniPlayer();
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
    isInitialized: false,
    saveState: saveState
  };
})();