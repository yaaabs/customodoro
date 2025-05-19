(function() {
  // Function to check if background image loaded successfully
  function checkBackgroundImage() {
    // Only run on nature theme
    if (!document.body.classList.contains('theme-nature')) return;
    
    // Create an image to test loading
    const testImg = new Image();
    testImg.src = 'images/Kimi no Na Wa.jpg';
    
    // Log success or failure
    testImg.onload = function() {
      console.log('✓ Background image loaded successfully');
      // Check if actually applied via computed style
      const bodyBg = window.getComputedStyle(document.body).backgroundImage;
      if (bodyBg && bodyBg.includes('Kimi')) {
        console.log('✓ Background image applied in CSS');
      } else {
        console.error('✗ Background image not applied in CSS');
        console.log('Current background:', bodyBg);
      }
    };
    
    testImg.onerror = function() {
      console.error('✗ Failed to load background image');
      console.error('Image path:', testImg.src);
      console.error('Full URL:', new URL(testImg.src, window.location.href).href);
    };
  }
  
  // Check device and browser info
  function logDeviceInfo() {
    console.group('Device Information');
    console.log('User Agent:', navigator.userAgent);
    console.log('Screen Width:', window.innerWidth);
    console.log('Screen Height:', window.innerHeight);
    console.log('Device Pixel Ratio:', window.devicePixelRatio);
    console.log('Platform:', navigator.platform);
    console.groupEnd();
  }
  
  // Run checks after page has fully loaded
  window.addEventListener('load', function() {
    // Wait a moment for all styles to apply
    setTimeout(() => {
      logDeviceInfo();
      checkBackgroundImage();
      
      // Add visual indicator on the page for mobile users
      const theme = localStorage.getItem('siteTheme');
      if (document.body.classList.contains('theme-nature')) {
        const debug = document.createElement('div');
        debug.style.position = 'fixed';
        debug.style.bottom = '10px';
        debug.style.left = '10px';
        debug.style.background = 'rgba(0,0,0,0.7)';
        debug.style.color = 'white';
        debug.style.padding = '5px 10px';
        debug.style.borderRadius = '5px';
        debug.style.fontSize = '12px';
        debug.style.zIndex = '9999';
        debug.textContent = 'Theme: Nature';
        document.body.appendChild(debug);
      }
    }, 1000);
  });
})();
