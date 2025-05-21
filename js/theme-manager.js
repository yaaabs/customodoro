/**
 * Theme Manager - Handles theme selection and custom themes
 * For FocusKaya Timer Application
 */

(function() {
  let customThemeImage = null;
  
  // Initialize on document ready
  document.addEventListener('DOMContentLoaded', function() {
    // Set up theme selector
    const themeSelector = document.getElementById('theme-selector');
    if (themeSelector) {
      themeSelector.addEventListener('change', function() {
        const selectedTheme = themeSelector.value;
        applyTheme(selectedTheme);
      });
    }
    
    // Initialize focus mode toggle
    initFocusModeToggle();
    
    // Set up custom theme upload
    setupCustomThemeUpload();
  });
  
  // Initialize focus mode toggle functionality
  function initFocusModeToggle() {
    const focusModeToggle = document.getElementById('focus-mode-toggle');
    
    if (focusModeToggle) {
      // Set initial state from localStorage
      const isFocusModeEnabled = localStorage.getItem('focusModeEnabled') !== 'false';
      focusModeToggle.checked = isFocusModeEnabled;
      
      // Add change event listener
      focusModeToggle.addEventListener('change', function() {
        const isEnabled = focusModeToggle.checked;
        localStorage.setItem('focusModeEnabled', isEnabled);
        
        // Update focus mode if the global object exists
        if (window.focusMode && typeof window.focusMode.setEnabled === 'function') {
          window.focusMode.setEnabled(isEnabled);
        }
        
        console.log('Focus Mode setting changed:', isEnabled);
      });
    }
    
    // Add focus mode toggle to theme section if it doesn't exist
    const themeSection = document.getElementById('theme-section');
    if (themeSection && !document.getElementById('focus-mode-toggle')) {
      const firstRow = themeSection.querySelector('.settings-row');
      
      if (firstRow) {
        const focusModeRow = document.createElement('div');
        focusModeRow.className = 'settings-row';
        focusModeRow.innerHTML = `
          <div class="settings-label">Focus Mode (hide distractions during timer)</div>
          <label class="toggle-switch">
            <input type="checkbox" id="focus-mode-toggle" ${isFocusModeEnabled ? 'checked' : ''}>
            <span class="slider-toggle"></span>
          </label>
        `;
        
        firstRow.parentNode.insertBefore(focusModeRow, firstRow.nextSibling);
        
        // Add event listener to the newly created toggle
        const newToggle = document.getElementById('focus-mode-toggle');
        if (newToggle) {
          newToggle.addEventListener('change', function() {
            const isEnabled = newToggle.checked;
            localStorage.setItem('focusModeEnabled', isEnabled);
            
            if (window.focusMode && typeof window.focusMode.setEnabled === 'function') {
              window.focusMode.setEnabled(isEnabled);
            }
          });
        }
      }
    }
  }
  
  // Set up custom theme file upload
  function setupCustomThemeUpload() {
    const fileInput = document.getElementById('custom-theme-upload');
    const imagePreview = document.querySelector('.image-preview');
    const imageDetails = document.querySelector('.image-details');
    const previewBtn = document.querySelector('.preview-btn');
    const removeBtn = document.querySelector('.remove-btn');
    const uploadContainer = document.querySelector('.upload-container');
    
    if (!fileInput || !imagePreview || !imageDetails) return;
    
    // Check for saved custom theme
    const savedCustomTheme = localStorage.getItem('customThemeBackground');
    if (savedCustomTheme) {
      imagePreview.src = savedCustomTheme;
      imagePreview.style.display = 'block';
      
      if (imageDetails) {
        imageDetails.textContent = 'Saved custom theme';
      }
      
      // Show preview actions
      document.querySelector('.image-actions').style.display = 'flex';
    }
    
    // Handle file selection
    fileInput.addEventListener('change', function(e) {
      if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        
        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
          alert('File size exceeds 2MB limit. Please choose a smaller image.');
          fileInput.value = '';
          return;
        }
        
        // Read and display the file
        const reader = new FileReader();
        reader.onload = function(e) {
          imagePreview.src = e.target.result;
          imagePreview.style.display = 'block';
          customThemeImage = e.target.result;
          
          if (imageDetails) {
            imageDetails.textContent = `${file.name} (${Math.round(file.size / 1024)}KB)`;
          }
          
          // Show preview actions
          document.querySelector('.image-actions').style.display = 'flex';
        };
        reader.readAsDataURL(file);
      }
    });
    
    // Handle drag and drop
    if (uploadContainer) {
      uploadContainer.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadContainer.classList.add('drag-over');
      });
      
      uploadContainer.addEventListener('dragleave', function() {
        uploadContainer.classList.remove('drag-over');
      });
      
      uploadContainer.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadContainer.classList.remove('drag-over');
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          fileInput.files = e.dataTransfer.files;
          const event = new Event('change');
          fileInput.dispatchEvent(event);
        }
      });
      
      uploadContainer.addEventListener('click', function() {
        fileInput.click();
      });
    }
    
    // Preview button functionality
    if (previewBtn) {
      previewBtn.addEventListener('click', function() {
        if (customThemeImage || savedCustomTheme) {
          document.body.classList.remove('theme-light', 'theme-dark', 'theme-yourname');
          document.body.classList.add('theme-custom');
          document.body.style.backgroundImage = `url(${customThemeImage || savedCustomTheme})`;
          
          // Select custom theme in dropdown
          const themeSelector = document.getElementById('theme-selector');
          if (themeSelector) {
            themeSelector.value = 'custom';
          }
        }
      });
    }
    
    // Remove button functionality
    if (removeBtn) {
      removeBtn.addEventListener('click', function() {
        // Clear preview
        imagePreview.src = '';
        imagePreview.style.display = 'none';
        fileInput.value = '';
        customThemeImage = null;
        
        if (imageDetails) {
          imageDetails.textContent = 'No image selected';
        }
        
        // Hide preview actions
        document.querySelector('.image-actions').style.display = 'none';
        
        // Remove from localStorage
        localStorage.removeItem('customThemeBackground');
        
        // Reset to light theme
        document.body.classList.remove('theme-custom');
        document.body.classList.add('theme-light');
        document.body.style.backgroundImage = '';
        
        // Update theme selector
        const themeSelector = document.getElementById('theme-selector');
        if (themeSelector) {
          themeSelector.value = 'light';
        }
        
        // Update localStorage
        localStorage.setItem('siteTheme', 'light');
      });
    }
  }
  
  // Function to apply selected theme - should be available globally
  window.applyTheme = function(themeName) {
    // Remove any previous theme classes
    document.body.classList.remove('theme-light', 'theme-dark', 'theme-yourname', 'theme-custom');
    
    // Reset background image
    document.body.style.backgroundImage = '';
    
    // Apply the selected theme
    if (themeName === 'custom' && (customThemeImage || localStorage.getItem('customThemeBackground'))) {
      // Apply custom theme
      document.body.classList.add('theme-custom');
      document.body.style.backgroundImage = `url(${customThemeImage || localStorage.getItem('customThemeBackground')})`;
      
      // Save custom theme to localStorage if it's new
      if (customThemeImage) {
        localStorage.setItem('customThemeBackground', customThemeImage);
      }
    } else if (themeName === 'yourname') {
      // Apply Kimi no Na wa theme
      document.body.classList.add('theme-yourname');
    } else {
      // Apply standard themes
      document.body.classList.add(`theme-${themeName}`);
    }
    
    // Save theme preference
    localStorage.setItem('siteTheme', themeName);
    
    // Also preserve the mode class (focus-mode, short-break-mode, etc.)
    if (document.body.classList.contains('focus-mode')) {
      // Nothing to do, focus-mode is already there
    } else if (document.body.classList.contains('short-break-mode')) {
      // Make sure short-break-mode stays
    } else if (document.body.classList.contains('long-break-mode')) {
      // Make sure long-break-mode stays
    } else if (document.body.classList.contains('reverse-mode')) {
      // Make sure reverse-mode stays
    }
  };
  
  // Initial theme application
  const savedTheme = localStorage.getItem('siteTheme') || 'light';
  window.applyTheme(savedTheme);
})();
