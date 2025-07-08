document.addEventListener('DOMContentLoaded', () => {
  const aboutLinkFooter = document.getElementById('about-link-footer');
  const aboutModalOverlay = document.getElementById('about-info-modal-overlay');
  const aboutModalClose = document.getElementById('about-info-modal-close');
  const aboutModalCloseBtn = document.getElementById('about-info-close-btn');

  const openAboutModal = () => {
    if (aboutModalOverlay) {
      aboutModalOverlay.classList.add('active');
    }
  };

  const closeAboutModal = () => {
    if (aboutModalOverlay) {
      aboutModalOverlay.classList.remove('active');
    }
  };

  if (aboutLinkFooter) {
    aboutLinkFooter.addEventListener('click', (e) => {
      e.preventDefault();
      openAboutModal();
    });
  }

  if (aboutModalOverlay) {
    aboutModalOverlay.addEventListener('click', (e) => {
      if (e.target === aboutModalOverlay) {
        closeAboutModal();
      }
    });
  }

  if (aboutModalClose) {
    aboutModalClose.addEventListener('click', closeAboutModal);
  }

  if (aboutModalCloseBtn) {
    aboutModalCloseBtn.addEventListener('click', closeAboutModal);
  }
});