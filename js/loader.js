// Modern Shapes Loader Implementation
document.addEventListener('DOMContentLoaded', function() {
  // Remove any existing loaders first to avoid duplicates
  const existingLoader = document.querySelector('.page-loader');
  if (existingLoader) {
    existingLoader.parentNode.removeChild(existingLoader);
  }
  
  // Create a fresh loader and append to body
  const loader = document.createElement('div');
  loader.className = 'page-loader';
  
  loader.innerHTML = `
    <div class="shapes-loader"></div>
    <div class="loader-text">Loading...</div>
  `;
  
  // Make sure it's the first child of the body for consistent placement
  if (document.body.firstChild) {
    document.body.insertBefore(loader, document.body.firstChild);
  } else {
    document.body.appendChild(loader);
  }
  
  // Set a small timeout to make sure the loader shows for at least a moment
  // (even if the page loads very quickly)
  setTimeout(function() {
    // Add page-loaded class to trigger the fadeout animation
    document.body.classList.add('page-loaded');
    
    // Remove the loader entirely after the animation completes
    setTimeout(function() {
      const loader = document.querySelector('.page-loader');
      if (loader && loader.parentNode) {
        loader.parentNode.removeChild(loader);
      }
    }, 500); // Match the CSS transition duration
  }, 800);
});

// Also handle transitions between pages by showing loader again when navigating
document.addEventListener('click', function(e) {
  // Check if this is a navigation link
  if (e.target.tagName === 'A' && e.target.hostname === window.location.hostname) {
    // Don't show loader for hash links (scrolling on same page)
    if (e.target.hash && e.target.pathname === window.location.pathname) {
      return;
    }
    
    // Show loader again before navigating
    document.body.classList.remove('page-loaded');
  }
});
