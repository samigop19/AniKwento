/**
 * Theme Character Counter
 * Adds real-time character counting to the story prompt textarea
 * Maximum allowed: 500 characters
 */

(function() {
    'use strict';

    console.log('📊 Theme Character Counter: Initializing...');

    /**
     * Update the character counter display
     */
    function updateCharacterCounter() {
        const storyPrompt = document.getElementById('storyPrompt');
        const charCounter = document.getElementById('themeCharCounter');

        if (!storyPrompt || !charCounter) {
            return;
        }

        const currentLength = storyPrompt.value.length;
        const maxLength = 500;

        // Update counter text
        charCounter.textContent = `${currentLength}/${maxLength}`;

        // Change color based on character count
        if (currentLength >= maxLength) {
            charCounter.classList.remove('text-muted', 'text-warning');
            charCounter.classList.add('text-danger', 'fw-bold');
        } else if (currentLength >= maxLength * 0.9) { // 90% threshold
            charCounter.classList.remove('text-muted', 'text-danger');
            charCounter.classList.add('text-warning', 'fw-bold');
        } else {
            charCounter.classList.remove('text-warning', 'text-danger', 'fw-bold');
            charCounter.classList.add('text-muted');
        }
    }

    /**
     * Initialize the character counter
     */
    function initializeCounter() {
        const storyPrompt = document.getElementById('storyPrompt');

        if (!storyPrompt) {
            console.warn('⚠️ storyPrompt element not found');
            return;
        }

        // Add event listener for input events
        storyPrompt.addEventListener('input', updateCharacterCounter);

        // Initial update
        updateCharacterCounter();

        console.log('✅ Theme character counter initialized');
    }

    /**
     * Reset the counter when modal opens
     */
    function setupModalResetHandler() {
        const createStoryModal = document.getElementById('createStoryModal');

        if (createStoryModal) {
            createStoryModal.addEventListener('show.bs.modal', function() {
                // Reset counter to 0/500
                setTimeout(updateCharacterCounter, 100);
            });

            console.log('✅ Modal reset handler registered');
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initializeCounter();
            setupModalResetHandler();
        });
    } else {
        initializeCounter();
        setupModalResetHandler();
    }

    console.log('✅ Theme Character Counter: Initialization complete');
})();
