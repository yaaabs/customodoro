/**
 * Theme Manager - Handles custom theme uploads and management
 * For FocusKaya Timer Application
 */

(function() {
  // DOM Elements
  let fileInput;
  let uploadContainer;
  let imagePreviewContainer;
  let imagePreview;
  let imageDetails;
  let previewBtn;
  let removeBtn;
  let themeSelector;
  let themeUploader;
  
  // Constants
  const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
  const CUSTOM_THEME_STORAGE_KEY = 'customThemeBackground';
  
  // Color Theme Management
  let colorThemeSelector;
  let colorOptions;
  let customColorInput;
  let customColorHex;
  let colorPreviewIndicator;
  let colorPreviewBtn;
  let colorPreviewBtnMobile; // Add this for mobile
  let colorResetBtn;
  let selectedColor = '#A53860';
  
  // Color Theme Constants
  const COLOR_THEME_STORAGE_KEY = 'colorThemeBackground';
  const DEFAULT_COLOR = '#A53860';
  
  // Initialize on document load
  document.addEventListener('DOMContentLoaded', () => {
    initThemeManager();
  });
  
  // Initialize theme manager elements and events
  function initThemeManager() {
    // Find DOM elements
    fileInput = document.getElementById('custom-theme-upload');
    uploadContainer = document.querySelector('.upload-container');
    imagePreviewContainer = document.querySelector('.image-preview-container');
    imagePreview = document.querySelector('.image-preview');
    imageDetails = document.querySelector('.image-details');
    previewBtn = document.querySelector('.preview-btn');
    removeBtn = document.querySelector('.remove-btn');
    themeSelector = document.getElementById('theme-selector');
    themeUploader = document.querySelector('.theme-uploader');
    
    // If elements don't exist, we're not on a page with the theme settings
    if (!fileInput || !themeSelector) return;
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize color theme
    initColorTheme();
    
    // Check if we have a saved custom theme
    checkForSavedCustomTheme();
    
    // Update UI based on currently selected theme
    updateThemeUploaderVisibility();
    
    // Add observer for settings modal visibility
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            if (settingsModal.classList.contains('show')) {
              setTimeout(updateColorThemeVisibility, 100);
            }
          }
        });
      });
      observer.observe(settingsModal, { attributes: true });
    }
  }
  
  // Set up event listeners
  function setupEventListeners() {
    // File input change
    fileInput.addEventListener('change', handleFileSelect);
    
    // Upload container click to trigger file input
    uploadContainer.addEventListener('click', () => {
      fileInput.click();
    });
    
    // Drag and drop events
    uploadContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadContainer.classList.add('drag-over');
    });
    
    uploadContainer.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadContainer.classList.remove('drag-over');
    });
    
    uploadContainer.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadContainer.classList.remove('drag-over');
      
      if (e.dataTransfer.files.length) {
        handleFile(e.dataTransfer.files[0]);
      }
    });
    
    // Preview button
    if (previewBtn) {
      previewBtn.addEventListener('click', previewCustomTheme);
    }
    
    // Remove button
    if (removeBtn) {
      removeBtn.addEventListener('click', removeCustomTheme);
    }
    
    // Theme selector change
    if (themeSelector) {
      themeSelector.addEventListener('change', updateThemeUploaderVisibility);
      
      // Also add a direct event listener specifically for color theme visibility
      themeSelector.addEventListener('change', function() {
        setTimeout(updateColorThemeVisibility, 50);
      });
    }
  }
  
  // Update theme uploader visibility based on selected theme
  function updateThemeUploaderVisibility() {
    if (!themeSelector || !themeUploader) return;
    
    if (themeSelector.value === 'custom') {
      themeUploader.classList.add('show');
    } else {
      themeUploader.classList.remove('show');
    }
    
    // Update color theme visibility
    updateColorThemeVisibility();
  }
  
  // Handle file selection from input
  function handleFileSelect(e) {
    if (e.target.files.length) {
      handleFile(e.target.files[0]);
    }
  }
  
  // Process the selected file
  function handleFile(file) {
    // Validate file is an image
    if (!file.type.match('image.*')) {
      showToast('Please select an image file (JPEG, PNG, etc.)');
      return;
    }
    
    // Check file size
    if (file.size > MAX_IMAGE_SIZE) {
      showToast(`Image is too large. Maximum size is ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`);
      return;
    }
    
    // Create a FileReader to read the image
    const reader = new FileReader();
    
    // Set up the FileReader onload event
    reader.onload = function(e) {
      // Display image preview
      displayImagePreview(e.target.result, file);
      
      // Save image to localStorage
      saveCustomTheme(e.target.result);
    };
    
    // Read the image file as a data URL
    reader.readAsDataURL(file);
  }
  
  // Display image preview with file info
  function displayImagePreview(dataUrl, file) {
    if (!imagePreview || !imagePreviewContainer || !imageDetails) return;
    
    // Set the image source
    imagePreview.src = dataUrl;
    
    // Show the image preview container
    imagePreviewContainer.classList.add('show');
    
    // Format file size
    const size = formatFileSize(file.size);
    
    // Update image details
    imageDetails.textContent = `${file.name} (${size})`;
    
    // Show success message
    showToast('Image uploaded successfully! Click "Preview" to see it as a theme.');
  }
  
  // Format file size for display
  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }
  
  // Save custom theme to localStorage
  function saveCustomTheme(dataUrl) {
    try {
      localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, dataUrl);
      console.log('Custom theme saved successfully');
    } catch (error) {
      console.error('Error saving custom theme:', error);
      
      // If it's a quota exceeded error, notify the user
      if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        showToast('Image is too large to save. Please try a smaller image or clear some browser storage.');
        
        // Clear the preview
        removeCustomTheme();
      }
    }
  }
  
  // Check if we have a saved custom theme
  function checkForSavedCustomTheme() {
    const savedTheme = localStorage.getItem(CUSTOM_THEME_STORAGE_KEY);
    
    if (savedTheme) {
      // We have a saved custom theme
      if (imagePreview && imagePreviewContainer) {
        // Display the saved image in the preview
        imagePreview.src = savedTheme;
        imagePreviewContainer.classList.add('show');
        
        // Update image details
        if (imageDetails) {
          const size = estimateBase64Size(savedTheme);
          imageDetails.textContent = `Saved custom theme (${size})`;
        }
      }
    }
  }
  
  // Estimate the size of a base64 string
  function estimateBase64Size(base64String) {
    // Remove the data:image/[type];base64, part
    const base64WithoutHeader = base64String.split(',')[1];
    
    // Each Base64 digit represents 6 bits, so 4 digits = 3 bytes
    const sizeInBytes = (base64WithoutHeader.length * 3) / 4;
    
    return formatFileSize(sizeInBytes);
  }
  
  // Preview the custom theme
  function previewCustomTheme() {
    const savedTheme = localStorage.getItem(CUSTOM_THEME_STORAGE_KEY);
    
    if (savedTheme) {
      // Set the theme to custom
      if (themeSelector) {
        themeSelector.value = 'custom';
        
        // Trigger a change event to update any listeners
        const event = new Event('change');
        themeSelector.dispatchEvent(event);
      }
      
      // Apply the custom theme
      applyCustomTheme();
      
      showToast('Custom theme applied. Click "Save changes" to keep it.');
    } else {
      showToast('No custom theme available. Please upload an image first.');
    }
  }
  
  // Remove the custom theme
  function removeCustomTheme() {
    // Remove from localStorage
    localStorage.removeItem(CUSTOM_THEME_STORAGE_KEY);
    
    // Clear the preview
    if (imagePreview) {
      imagePreview.src = '';
    }
    
    // Hide the preview container
    if (imagePreviewContainer) {
      imagePreviewContainer.classList.remove('show');
    }
    
    // If the current theme is custom, switch to light theme
    if (document.body.classList.contains('theme-custom')) {
      // Set the theme to light
      if (themeSelector) {
        themeSelector.value = 'light';
        
        // Trigger a change event to update any listeners
        const event = new Event('change');
        themeSelector.dispatchEvent(event);
      }
      
      // Apply the light theme
      document.body.classList.remove('theme-custom');
      document.body.classList.add('theme-light');
      document.body.style.backgroundImage = '';
    }
    
    showToast('Custom theme removed.');
  }
  
  // Apply the custom theme
  function applyCustomTheme() {
    const savedTheme = localStorage.getItem(CUSTOM_THEME_STORAGE_KEY);
    
    if (savedTheme) {
      // Remove any existing theme classes
      document.body.classList.remove('theme-default', 'theme-dark', 'theme-light', 'theme-nature', 'theme-rain', 'theme-color');
      
      // Clear any CSS custom properties
      document.documentElement.style.removeProperty('--color-theme-bg');
      
      // Add custom theme class
      document.body.classList.add('theme-custom');
      
      // Set the background image
      document.body.style.backgroundImage = `url(${savedTheme})`;
    }
  }
  
  // Color Theme Management
  // Initialize color theme elements
  function initColorTheme() {
    colorThemeSelector = document.querySelector('.color-theme-selector');
    colorOptions = document.querySelectorAll('.color-option');
    customColorInput = document.getElementById('custom-color-input');
    customColorHex = document.getElementById('custom-color-hex');
    colorPreviewIndicator = document.getElementById('color-preview-indicator');
    colorPreviewBtn = document.getElementById('color-preview-btn');
    colorPreviewBtnMobile = document.getElementById('color-preview-btn-mobile'); // Add this for mobile
    colorResetBtn = document.getElementById('color-reset-btn');
    
    if (!colorThemeSelector) return;
    
    // Setup color theme event listeners
    setupColorThemeListeners();
    
    // Load saved color theme
    loadSavedColorTheme();
    
    // Initialize color preview indicator with current color
    if (colorPreviewIndicator && selectedColor) {
      colorPreviewIndicator.style.backgroundColor = selectedColor;
      colorPreviewIndicator.style.setProperty('--current-color', selectedColor);
    }
    
    // Initialize custom color input with current color
    if (customColorInput && selectedColor) {
      customColorInput.value = selectedColor;
    }
    
    // Initialize hex input with current color
    if (customColorHex && selectedColor) {
      customColorHex.value = selectedColor.replace('#', '').toUpperCase();
    }
  }
  
  // Setup color theme event listeners
  function setupColorThemeListeners() {
    // Predefined color options
    colorOptions.forEach(option => {
      option.addEventListener('click', () => {
        const color = option.dataset.color;
        selectColor(color);
      });
    });
    
    // Custom color input
    if (customColorInput) {
      // Handle input events (typing)
      customColorInput.addEventListener('input', (e) => {
        const color = e.target.value;
        selectColor(color);
        // Update hex input and color preview indicator in real-time
        if (customColorHex) {
          customColorHex.value = color.replace('#', '').toUpperCase();
        }
        if (colorPreviewIndicator) {
          colorPreviewIndicator.style.backgroundColor = color;
          colorPreviewIndicator.style.setProperty('--current-color', color);
        }
      });
      
      // Handle paste events
      customColorInput.addEventListener('paste', (e) => {
        setTimeout(() => {
          const color = e.target.value;
          selectColor(color);
          // Update hex input and color preview indicator after paste
          if (customColorHex) {
            customColorHex.value = color.replace('#', '').toUpperCase();
          }
          if (colorPreviewIndicator) {
            colorPreviewIndicator.style.backgroundColor = color;
            colorPreviewIndicator.style.setProperty('--current-color', color);
          }
        }, 10);
      });
      
      // Handle focus events
      customColorInput.addEventListener('focus', (e) => {
        // Update color preview indicator on focus
        if (colorPreviewIndicator) {
          colorPreviewIndicator.style.backgroundColor = e.target.value || selectedColor;
          colorPreviewIndicator.style.setProperty('--current-color', e.target.value || selectedColor);
        }
      });
      
      // Handle blur events with validation
      customColorInput.addEventListener('blur', (e) => {
        // Validate hex color format
        const color = e.target.value;
        if (color && !isValidHexColor(color)) {
          showToast('Invalid hex color format. Please use #RRGGBB format.');
          e.target.focus();
        }
      });
    }
    
    // Custom hex input
    if (customColorHex) {
      // Add validation styling
      customColorHex.addEventListener('input', (e) => {
        // Clean the input value (remove # if present)
        let value = e.target.value.replace('#', '');
        e.target.value = value.toUpperCase();
        
        // Create full hex color for validation
        const fullHex = '#' + value;
        
        // Add validation classes
        if (value.length === 6 && isValidHexColor(fullHex)) {
          e.target.classList.remove('invalid');
          e.target.classList.add('valid');
          selectColor(fullHex);
          if (customColorInput) {
            customColorInput.value = fullHex;
          }
          if (colorPreviewIndicator) {
            colorPreviewIndicator.style.backgroundColor = fullHex;
            colorPreviewIndicator.style.setProperty('--current-color', fullHex);
          }
        } else {
          e.target.classList.remove('valid');
          e.target.classList.add('invalid');
        }
      });
      
      customColorHex.addEventListener('paste', (e) => {
        setTimeout(() => {
          let value = e.target.value.replace('#', '');
          e.target.value = value.toUpperCase();
          
          const fullHex = '#' + value;
          if (value.length === 6 && isValidHexColor(fullHex)) {
            e.target.classList.remove('invalid');
            e.target.classList.add('valid');
            selectColor(fullHex);
            if (customColorInput) {
              customColorInput.value = fullHex;
            }
            if (colorPreviewIndicator) {
              colorPreviewIndicator.style.backgroundColor = fullHex;
              colorPreviewIndicator.style.setProperty('--current-color', fullHex);
            }
          } else {
            e.target.classList.remove('valid');
            e.target.classList.add('invalid');
          }
        }, 10);
      });
      
      customColorHex.addEventListener('blur', (e) => {
        let value = e.target.value.replace('#', '');
        const fullHex = '#' + value;
        
        if (value && value.length === 6 && !isValidHexColor(fullHex)) {
          showToast('Invalid hex color format. Please use RRGGBB format.');
          e.target.focus();
        } else {
          e.target.classList.remove('invalid', 'valid');
        }
      });
    }
    
    // Preview button (desktop)
    if (colorPreviewBtn) {
      colorPreviewBtn.addEventListener('click', () => {
        applyColorTheme(selectedColor);
        showToast('Color theme applied!');
      });
    }
    // Preview button (mobile)
    if (colorPreviewBtnMobile) {
      colorPreviewBtnMobile.addEventListener('click', () => {
        // Get value from hex input
        const hexInput = document.getElementById('custom-color-hex');
        let color = hexInput ? hexInput.value : selectedColor;
        if (color && !color.startsWith('#')) color = '#' + color;
        if (isValidHexColor(color)) {
          selectColor(color);
          applyColorTheme(color);
          showToast('Color theme applied!');
        } else {
          showToast('Invalid HEX code. Use format RRGGBB.');
        }
      });
    }
    
    // Reset button
    if (colorResetBtn) {
      colorResetBtn.addEventListener('click', () => {
        resetColorTheme();
      });
    }
  }
  
  // Select a color (either from palette or custom)
  function selectColor(color) {
    selectedColor = color;
    
    // Update visual selection
    colorOptions.forEach(option => {
      option.classList.remove('selected');
      if (option.dataset.color === color) {
        option.classList.add('selected');
      }
    });
    
    // Update custom color input
    if (customColorInput) {
      customColorInput.value = color;
    }
    
    // Update hex input
    if (customColorHex) {
      customColorHex.value = color.replace('#', '').toUpperCase();
    }
    
    // Update color preview indicator
    if (colorPreviewIndicator) {
      colorPreviewIndicator.style.backgroundColor = color;
      colorPreviewIndicator.style.setProperty('--current-color', color);
    }
    
    // Save to localStorage
    localStorage.setItem(COLOR_THEME_STORAGE_KEY, color);
  }
  
  // Apply color theme
  function applyColorTheme(color) {
    if (!color) color = selectedColor;
    
    // Remove other theme classes - ensure proper cleanup
    document.body.classList.remove('theme-default', 'theme-dark', 'theme-light', 'theme-yourname', 'theme-custom', 'theme-rain');
    
    // Clear any existing background images and CSS properties
    document.body.style.backgroundImage = '';
    document.documentElement.style.removeProperty('--color-theme-bg');
    
    // Clear any existing overlays or pseudo-elements
    const existingOverlay = document.querySelector('.theme-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
    // Add color theme class
    document.body.classList.add('theme-color');
    
    // Set CSS custom property for the color
    document.documentElement.style.setProperty('--color-theme-bg', color);
    
    // Update theme selector
    if (themeSelector) {
      themeSelector.value = 'color';
    }
    
    // Save theme preference
    localStorage.setItem('siteTheme', 'color');
    localStorage.setItem(COLOR_THEME_STORAGE_KEY, color);
    
    // Update color theme visibility
    updateColorThemeVisibility();
    
    console.log('Color theme applied:', color);
  }
  
  // Reset color theme to default
  function resetColorTheme() {
    selectColor(DEFAULT_COLOR);
    applyColorTheme(DEFAULT_COLOR);
    showToast('Color theme reset to default!');
  }
  
  // Load saved color theme
  function loadSavedColorTheme() {
    const savedColor = localStorage.getItem(COLOR_THEME_STORAGE_KEY);
    if (savedColor) {
      selectColor(savedColor);
    } else {
      selectColor(DEFAULT_COLOR);
    }
  }
  
  // Update color theme selector visibility
  function updateColorThemeVisibility() {
    if (!colorThemeSelector) {
      console.warn('Color theme selector not found');
      return;
    }
    
    if (themeSelector && themeSelector.value === 'color') {
      colorThemeSelector.style.display = 'block';
      colorThemeSelector.classList.add('show');
      console.log('Color theme selector shown');
    } else {
      colorThemeSelector.style.display = 'none';
      colorThemeSelector.classList.remove('show');
      console.log('Color theme selector hidden');
    }
  }
  
  // Show toast notification
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
  
  // Validate hex color format
  function isValidHexColor(color) {
    // Check if it's a valid hex color (3 or 6 digits)
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  }

  // Add this function to ensure info icons work properly even when CSS loading is deferred

  // Function to ensure info icons are properly styled
  function fixInfoIconStyles() {
    // Get all info icons
    const infoIcons = document.querySelectorAll('.info-icon');
    
    // Make sure each icon's parent has proper positioning
    infoIcons.forEach(icon => {
      const parent = icon.parentElement;
      if (parent && parent.classList.contains('settings-label')) {
        // Ensure proper positioning context
        if (window.getComputedStyle(parent).position === 'static') {
          parent.style.position = 'relative';
        }
        
        // Ensure proper display
        if (window.getComputedStyle(parent).display === 'block') {
          parent.style.display = 'flex';
          parent.style.alignItems = 'center';
        }
      }
    });
  }

  // Run this when settings are opened
  document.addEventListener('DOMContentLoaded', function() {
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', function() {
        // Short delay to ensure settings modal is open
        setTimeout(fixInfoIconStyles, 300);
      });
    }
    
    // Also run when deferred CSS is loaded
    if (typeof loadDeferredCSS === 'function') {
      const originalLoadDeferredCSS = loadDeferredCSS;
      window.loadDeferredCSS = function() {
        originalLoadDeferredCSS.apply(this, arguments);
        // Fix icons after CSS loads
        setTimeout(fixInfoIconStyles, 200);
      };
    }
  });
  
  // Make functions available globally
  window.themeManager = {
    applyCustomTheme,
    removeCustomTheme,
    previewCustomTheme
  };
  window.colorTheme = {
    applyColorTheme,
    resetColorTheme,
    selectColor,
    updateColorThemeVisibility,
    // Test function for debugging
    testColorThemeVisibility: function() {
      console.log('Theme selector value:', themeSelector ? themeSelector.value : 'not found');
      console.log('Color theme selector element:', colorThemeSelector);
      updateColorThemeVisibility();
    }
  };
})();
