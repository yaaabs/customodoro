/**
 * Utility for managing deferred CSS loading
 */

// Track which CSS files have already been loaded
const loadedStyles = new Set();

/**
 * Load a CSS file if it's not already loaded
 * @param {string} styleName - The name of the CSS file without extension
 */
function loadCSSFile(styleName) {
  if (loadedStyles.has(styleName)) {
    return; // Already loaded
  }
  
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `css/${styleName}.css`;
  document.head.appendChild(link);
  loadedStyles.add(styleName);
}

/**
 * Load multiple CSS files if they're not already loaded
 * @param {string[]} styleNames - Array of CSS file names without extension
 */
function loadCSSFiles(styleNames) {
  if (!Array.isArray(styleNames)) {
    return;
  }
  
  styleNames.forEach(style => loadCSSFile(style));
}

// Helper function for settings modal
function loadSettingsStyles() {
  loadCSSFiles(['settings', 'theme-uploader']);
}

// Add event listeners for UI elements that need deferred CSS
document.addEventListener('DOMContentLoaded', function() {
  // Load deferred styles after initial render
  setTimeout(() => {
    loadCSSFiles(['settings', 'theme-uploader', 'burnup-tracker']);
  }, 100);
  
  // Add listeners for any UI elements that might need immediate CSS loading
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', loadSettingsStyles);
  }
});

// Make functions available globally
window.loadCSSFile = loadCSSFile;
window.loadCSSFiles = loadCSSFiles;
window.loadSettingsStyles = loadSettingsStyles;

/**
 * Load CSS file with media attribute for deferred loading
 * @param {string} href - The href of the CSS file to load
 */
export function loadDeferredCSS(href) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.media = 'print';
  link.onload = () => { link.media = 'all'; };
  document.head.appendChild(link);
}

/**
 * Defer loading of a CSS file by adding it to the document head with media="print"
 * @param {string} href - The href of the CSS file to load
 */
export function deferCSS(href) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.media = 'print';
  link.onload = () => { link.media = 'all'; };
  document.head.appendChild(link);
}
