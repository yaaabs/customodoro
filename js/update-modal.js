// Update Modal Logic for Customodoro
(function() {
  const modalVersion = 'v2.8.18';
  const seenVersion = localStorage.getItem('seenModalVersion');
  
  // Set modal as muted by default if not already set
  if (localStorage.getItem('updateModalMuted') === null) {
    localStorage.setItem('updateModalMuted', 'true');
  }
  
  const modalMuted = localStorage.getItem('updateModalMuted') === 'true';
  const overlay = document.getElementById('update-modal-overlay');
  const closeBtn = document.getElementById('update-modal-close');
  const gotItBtn = document.getElementById('update-modal-gotit-btn');

  function showModal() {
    if (!overlay) return;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
  }
  
  function hideModal() {
    if (!overlay) return;
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
  }

  // Check if modal should show
  if (!modalMuted && seenVersion !== modalVersion && overlay) {
    setTimeout(showModal, 350); // Soft fade-in after page load
    localStorage.setItem('seenModalVersion', modalVersion);
  }

  // Dismiss logic
  [closeBtn, gotItBtn].forEach(btn => {
    if (btn) btn.addEventListener('click', hideModal);
  });

  // Dismiss on overlay click (not modal)
  if (overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) hideModal();
    });
  }

  // Global functions to control the modal
  window.muteUpdateModal = function() {
    localStorage.setItem('updateModalMuted', 'true');
    console.log('✅ Update modal muted. Use unmuteUpdateModal() to enable again.');
  };

  window.unmuteUpdateModal = function() {
    localStorage.setItem('updateModalMuted', 'false');
    console.log('✅ Update modal unmuted. It will show for new versions.');
  };

  window.showUpdateModal = function() {
    showModal();
    console.log('✅ Update modal shown manually.');
  };

  window.getUpdateModalStatus = function() {
    const muted = localStorage.getItem('updateModalMuted') === 'true';
    console.log(`Update Modal Status: ${muted ? 'MUTED' : 'ACTIVE'}`);
    console.log(`Current Version: ${modalVersion}`);
    console.log(`Last Seen Version: ${seenVersion || 'None'}`);
    return { muted, currentVersion: modalVersion, lastSeenVersion: seenVersion };
  };
})();
