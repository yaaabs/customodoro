document.addEventListener('DOMContentLoaded', function() {
    // Get modal elements
    const focusInfoIcon = document.getElementById('focus-mode-info');
    const focusInfoModal = document.getElementById('focus-info-modal-overlay');
    const closeModalBtn = document.getElementById('focus-info-modal-close');
    const closeBtn = document.getElementById('focus-info-close-btn');
    
    // Function to open modal
    function openFocusInfoModal() {
        focusInfoModal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
    }
    
    // Function to close modal
    function closeFocusInfoModal() {
        focusInfoModal.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    }
    
    // Event listeners
    focusInfoIcon.addEventListener('click', openFocusInfoModal);
    closeModalBtn.addEventListener('click', closeFocusInfoModal);
    closeBtn.addEventListener('click', closeFocusInfoModal);
    
    // Close modal when clicking outside of modal content
    focusInfoModal.addEventListener('click', function(event) {
        if (event.target === focusInfoModal) {
            closeFocusInfoModal();
        }
    });
});
