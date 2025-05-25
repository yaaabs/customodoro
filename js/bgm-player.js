(function() {
  // BGM Player configuration and state
  const bgm = {
    isPlaying: false,
    currentTrack: 0,
    playlists: {
      'deep-focus': [
        {
          title: 'Focus Study 1',
          artist: 'Deep Focus',
          src: 'audio/BGM/Deep focus study playlist/track1.mp3'
        },
        {
          title: 'Focus Study 2',
          artist: 'Deep Focus',
          src: 'audio/BGM/Deep focus study playlist/track2.mp3'
        },
        {
          title: 'Focus Study 3',
          artist: 'Deep Focus',
          src: 'audio/BGM/Deep focus study playlist/track3.mp3'
        }
      ],
      'ambient-long': [
        {
          title: 'Ambient Long Session',
          artist: 'Focus Ambient',
          src: 'audio/BGM/ambient_playlist.mp3'
        }
      ]
    },
    selectedPlaylist: 'deep-focus',
    audio: new Audio(),
    volume: 0.3,
    enabled: true,
    progressInterval: null
  };
  
  // DOM Elements
  const playBtn = document.getElementById('bgm-play-btn');
  const playIcon = document.getElementById('bgm-play-icon');
  const pauseIcon = document.getElementById('bgm-pause-icon');
  const prevBtn = document.getElementById('bgm-prev-btn');
  const nextBtn = document.getElementById('bgm-next-btn');
  const trackTitle = document.getElementById('bgm-track-title');
  const trackArtist = document.getElementById('bgm-track-artist');
  const progressBar = document.getElementById('bgm-progress-bar');
  const volumeSlider = document.getElementById('bgm-volume-slider');
  const volumePercentage = document.getElementById('bgm-volume-percentage');
  const playlistSelector = document.getElementById('playlist-selector');
  const bgmToggle = document.getElementById('bgm-toggle');
  
  // Initialize audio settings
  function initBgmSettings() {
    // Load settings from localStorage
    bgm.volume = parseFloat(localStorage.getItem('bgm_volume') || 0.6); // Changed default to 0.6 (60%)
    bgm.enabled = localStorage.getItem('bgm_enabled') !== 'false';
    bgm.selectedPlaylist = localStorage.getItem('bgm_playlist') || 'deep-focus';
    
    // Update UI elements
    if (volumeSlider) {
      volumeSlider.value = Math.round(bgm.volume * 100);
    }
    if (volumePercentage) {
      volumePercentage.textContent = Math.round(bgm.volume * 100) + '%';
    }
    if (playlistSelector) {
      playlistSelector.value = bgm.selectedPlaylist;
    }
    if (bgmToggle) {
      bgmToggle.checked = bgm.enabled;
    }
    
    // Apply volume to audio
    bgm.audio.volume = bgm.volume;
    
    // Load selected playlist
    loadCurrentTrack();
    updateTrackDisplay();
  }
  
  // Check if audio files exist
  function checkAudioExists(src, callback) {
    fetch(src, { method: 'HEAD' })
      .then(response => {
        if (response.ok) {
          callback(true);
        } else {
          callback(false);
        }
      })
      .catch(() => callback(false));
  }
  
  // Update track information display
  function updateTrackInfo() {
    const playlist = bgm.playlists[bgm.selectedPlaylist];
    
    if (!playlist || !playlist[bgm.currentTrack]) {
      if (trackTitle) trackTitle.textContent = 'Select a playlist';
      if (trackArtist) trackArtist.textContent = 'and press play';
      return;
    }
    
    const track = playlist[bgm.currentTrack];
    if (trackTitle) trackTitle.textContent = track.title;
    if (trackArtist) trackArtist.textContent = track.artist;
  }
  
  // Handle play button click
  function togglePlay() {
    if (!bgm.enabled) return;
    
    if (bgm.isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  }
  
  // Play the current track
  function playAudio() {
    const playlist = bgm.playlists[bgm.selectedPlaylist];
    if (!playlist || !playlist[bgm.currentTrack]) return;
    
    const track = playlist[bgm.currentTrack];
    
    // Check if the audio source needs to be changed
    const currentSrc = bgm.audio.src ? new URL(bgm.audio.src).pathname : '';
    const newSrc = new URL(track.src, window.location.href).pathname;
    
    if (currentSrc !== newSrc) {
      bgm.audio.src = track.src;
      bgm.audio.load(); // Explicitly load the audio
    }
    
    // Play the audio with error handling
    const playPromise = bgm.audio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        bgm.isPlaying = true;
        updatePlayPauseButton();
        updateTrackInfo();
        startProgressUpdate();
      }).catch(error => {
        console.error('Error playing audio:', error);
        showToast('Error playing audio. Click play again or try a different track.');
      });
    }
  }
  
  // Pause the current track
  function pauseAudio() {
    bgm.audio.pause();
    bgm.isPlaying = false;
    updatePlayPauseButton();
    stopProgressUpdate();
  }
  
  // Stop audio completely
  function stopAudio() {
    bgm.audio.pause();
    bgm.audio.currentTime = 0;
    bgm.isPlaying = false;
    updatePlayPauseButton();
    stopProgressUpdate();
    
    if (progressBar) progressBar.style.width = '0%';
  }
  
  // Update play/pause button appearance
  function updatePlayPauseButton() {
    if (playIcon && pauseIcon) {
      playIcon.style.display = bgm.isPlaying ? 'none' : 'block';
      pauseIcon.style.display = bgm.isPlaying ? 'block' : 'none';
    }
  }
  
  // Start updating progress bar
  function startProgressUpdate() {
    // Clear any existing interval first
    stopProgressUpdate();
    
    bgm.progressInterval = setInterval(() => {
      if (bgm.audio.duration && progressBar) {
        const progress = (bgm.audio.currentTime / bgm.audio.duration) * 100;
        progressBar.style.width = `${progress}%`;
      }
    }, 100);
  }
  
  // Stop updating progress bar
  function stopProgressUpdate() {
    if (bgm.progressInterval) {
      clearInterval(bgm.progressInterval);
      bgm.progressInterval = null;
    }
  }
  
  // Handle track end event
  function handleTrackEnd() {
    const playlist = bgm.playlists[bgm.selectedPlaylist];
    
    // Check if there are more tracks in the playlist
    if (bgm.currentTrack < playlist.length - 1) {
      // Move to the next track
      bgm.currentTrack++;
      playAudio();
    } else {
      // Restart from the first track
      bgm.currentTrack = 0;
      playAudio();
    }
  }
  
  // Play next track
  function playNextTrack() {
    if (!bgm.enabled) return;
    
    const playlist = bgm.playlists[bgm.selectedPlaylist];
    if (!playlist) return;
    
    // Move to the next track or loop back to first
    bgm.currentTrack = (bgm.currentTrack + 1) % playlist.length;
    
    // If currently playing, start the new track
    if (bgm.isPlaying) {
      stopAudio();
      playAudio();
    } else {
      updateTrackInfo();
    }
  }
  
  // Play previous track
  function playPrevTrack() {
    if (!bgm.enabled) return;
    
    const playlist = bgm.playlists[bgm.selectedPlaylist];
    if (!playlist) return;
    
    // Move to previous track or loop to last
    bgm.currentTrack = (bgm.currentTrack - 1 + playlist.length) % playlist.length;
    
    // If currently playing, start the new track
    if (bgm.isPlaying) {
      stopAudio();
      playAudio();
    } else {
      updateTrackInfo();
    }
  }
  
  // Change the selected playlist
  function changePlaylist(playlistId) {
    // Check if playlist exists
    if (!bgm.playlists[playlistId]) return;
    
    // Save the selection
    bgm.selectedPlaylist = playlistId;
    localStorage.setItem('bgm_playlist', playlistId);
    
    // Reset to first track
    bgm.currentTrack = 0;
    
    // If currently playing, restart with new playlist
    if (bgm.isPlaying) {
      stopAudio();
      playAudio();
    } else {
      updateTrackInfo();
    }
  }
  
  // Update BGM volume
  function updateBgmVolume(value) {
    // Convert to a decimal between 0 and 1
    const volumeValue = value / 100;
    
    // Update state and localStorage
    bgm.volume = volumeValue;
    localStorage.setItem('bgm_volume', volumeValue);
    
    // Apply to audio element
    bgm.audio.volume = volumeValue;
    
    // Update percentage display
    if (volumePercentage) {
      volumePercentage.textContent = value + '%';
    }
  }
  
  // Toggle BGM enabled/disabled
  function toggleBgmEnabled(enabled) {
    bgm.enabled = enabled;
    localStorage.setItem('bgm_enabled', enabled);
    
    if (!enabled && bgm.isPlaying) {
      pauseAudio();
    }
  }
  
  // Show toast notification
  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
  
  // Seek within the track when clicking on progress bar
  function setupProgressBarEvents() {
    if (!progressBar) return;
    
    // Get the parent element
    const progressContainer = progressBar.parentElement;
    if (!progressContainer) return;
    
    progressContainer.addEventListener('click', (e) => {
      // Only seek if there's a valid duration
      if (!bgm.audio.duration) return;
      
      // Calculate click position as a percentage
      const rect = progressContainer.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      
      // Set audio position
      bgm.audio.currentTime = pos * bgm.audio.duration;
      
      // Update progress bar
      progressBar.style.width = `${pos * 100}%`;
    });
  }
  
  // Save the current BGM player state
  function saveState() {
    localStorage.setItem('bgm_was_playing', bgm.isPlaying);
    localStorage.setItem('bgm_current_track', bgm.currentTrack);
    localStorage.setItem('bgm_current_time', bgm.audio.currentTime);
    localStorage.setItem('bgm_volume', bgm.volume);
    localStorage.setItem('bgm_playlist', bgm.selectedPlaylist);
    localStorage.setItem('bgm_enabled', bgm.enabled);
  }
  
  // Set up event listeners
  function setupEventListeners() {
    if (playBtn) {
      playBtn.addEventListener('click', togglePlay);
    }
    
    if (prevBtn) {
      prevBtn.addEventListener('click', playPrevTrack);
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', playNextTrack);
    }
    
    if (volumeSlider) {
      volumeSlider.addEventListener('input', function() {
        updateBgmVolume(this.value);
      });
    }
    
    if (playlistSelector) {
      playlistSelector.addEventListener('change', function() {
        changePlaylist(this.value);
      });
    }
    
    if (bgmToggle) {
      bgmToggle.addEventListener('change', function() {
        toggleBgmEnabled(this.checked);
      });
    }
    
    // Set up progress bar interaction
    setupProgressBarEvents();
  }
  
  // Function to handle page unload or settings closure
  function handlePageUnload() {
    // Pause the audio and clean up
    if (bgm.isPlaying) {
      pauseAudio();
    }
    
    // Clear intervals
    stopProgressUpdate();
    
    // Save current state to localStorage
    saveState();
  }
  
  // Initialize the BGM player
  function initBgmPlayer() {
    // Load settings
    initBgmSettings();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load previous track position if any
    const savedTrack = parseInt(localStorage.getItem('bgm_current_track') || '0');
    const savedTime = parseFloat(localStorage.getItem('bgm_current_time') || '0');
    
    if (!isNaN(savedTrack) && savedTrack < bgm.playlists[bgm.selectedPlaylist].length) {
      bgm.currentTrack = savedTrack;
    }
    
    // Update track info display
    updateTrackInfo();
    
        // Set up the audio position
        if (!isNaN(savedTime) && savedTime > 0) {
          const track = bgm.playlists[bgm.selectedPlaylist][bgm.currentTrack];
          if (track) {
            bgm.audio.src = track.src;
            bgm.audio.currentTime = savedTime;
          }
        }
        
        // Set up audio event listeners
        bgm.audio.addEventListener('ended', handleTrackEnd);
      }
      
      // Initialize when DOM is ready
      document.addEventListener('DOMContentLoaded', initBgmPlayer);
      
      // Save state when page is unloaded
      window.addEventListener('beforeunload', handlePageUnload);
    })();
