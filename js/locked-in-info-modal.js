document.addEventListener('DOMContentLoaded', function() {
    // Define all modals and their corresponding elements
    const infoModals = [
        {
            infoIcon: 'lockedin-mode-info',
            modalOverlay: 'lockedin-info-modal-overlay',
            closeButton: 'lockedin-info-modal-close',
            confirmButton: 'lockedin-info-close-btn'
        },
        {
            infoIcon: 'auto-break-info',
            modalOverlay: 'auto-break-modal-overlay',
            closeButton: 'auto-break-modal-close',
            confirmButton: 'auto-break-close-btn'
        },
        {
            infoIcon: 'auto-pomodoro-info',
            modalOverlay: 'auto-pomodoro-modal-overlay',
            closeButton: 'auto-pomodoro-modal-close',
            confirmButton: 'auto-pomodoro-close-btn'
        },
        {
            infoIcon: 'burnup-tracker-info',
            modalOverlay: 'burnup-tracker-modal-overlay',
            closeButton: 'burnup-tracker-modal-close',
            confirmButton: 'burnup-tracker-close-btn'
        },
        {
            infoIcon: 'tracker-design-info',
            modalOverlay: 'tracker-design-info-modal-overlay',
            closeButton: 'tracker-design-info-modal-close',
            confirmButton: 'tracker-design-info-close-btn'
        }
    ];

    // Set up event listeners for all modals
    infoModals.forEach(modal => {
        const infoIcon = document.getElementById(modal.infoIcon);
        const modalOverlay = document.getElementById(modal.modalOverlay);
        const closeBtn = document.getElementById(modal.closeButton);
        const confirmBtn = document.getElementById(modal.confirmButton);
        
        if (infoIcon && modalOverlay) {
            // Function to open this specific modal
            function openModal() {
                // Close any other open modals first
                infoModals.forEach(m => {
                    const overlay = document.getElementById(m.modalOverlay);
                    if (overlay) {
                        overlay.classList.remove('active');
                    }
                });
                
                // Open this modal
                modalOverlay.classList.add('active');
                document.body.style.overflow = 'hidden'; // Prevent scrolling
            }
            
            // Function to close this specific modal
            function closeModal() {
                modalOverlay.classList.remove('active');
                document.body.style.overflow = ''; // Restore scrolling
            }
            
            // Set up event listeners
            infoIcon.addEventListener('click', openModal);
            
            if (closeBtn) {
                closeBtn.addEventListener('click', closeModal);
            }
            
            if (confirmBtn) {
                confirmBtn.addEventListener('click', closeModal);
            }
            
            // Close when clicking outside modal content
            modalOverlay.addEventListener('click', function(event) {
                if (event.target === modalOverlay) {
                    closeModal();
                }
            });
        }
    });
});
