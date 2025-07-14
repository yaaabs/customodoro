// Update Modal Logic for Customodoro
(function() {
  const modalVersion = 'v2.3.2';
  const seenVersion = localStorage.getItem('seenModalVersion');
  const overlay = document.getElementById('update-modal-overlay');
  const closeBtn = document.getElementById('update-modal-close');
  const gotItBtn = document.getElementById('update-modal-gotit-btn');

  function showModal() {
    if (!overlay) return;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  function hideModal() {
    if (!overlay) return;
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Only show if not seen for this version
  if (seenVersion !== modalVersion && overlay) {
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
})();
