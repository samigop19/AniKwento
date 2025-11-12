

(function() {
    'use strict';

    console.log('📊 Theme Character Counter: Initializing...');

    
    function updateCharacterCounter() {
        const storyPrompt = document.getElementById('storyPrompt');
        const charCounter = document.getElementById('themeCharCounter');

        if (!storyPrompt || !charCounter) {
            return;
        }

        const currentLength = storyPrompt.value.length;
        const maxLength = 500;

        
        charCounter.textContent = `${currentLength}/${maxLength}`;

        
        if (currentLength >= maxLength) {
            charCounter.classList.remove('text-muted', 'text-warning');
            charCounter.classList.add('text-danger', 'fw-bold');
        } else if (currentLength >= maxLength * 0.9) { 
            charCounter.classList.remove('text-muted', 'text-danger');
            charCounter.classList.add('text-warning', 'fw-bold');
        } else {
            charCounter.classList.remove('text-warning', 'text-danger', 'fw-bold');
            charCounter.classList.add('text-muted');
        }
    }

    
    function initializeCounter() {
        const storyPrompt = document.getElementById('storyPrompt');

        if (!storyPrompt) {
            console.warn('⚠️ storyPrompt element not found');
            return;
        }

        
        storyPrompt.addEventListener('input', updateCharacterCounter);

        
        updateCharacterCounter();

        console.log('✅ Theme character counter initialized');
    }

    
    function setupModalResetHandler() {
        const createStoryModal = document.getElementById('createStoryModal');

        if (createStoryModal) {
            createStoryModal.addEventListener('show.bs.modal', function() {
                
                setTimeout(updateCharacterCounter, 100);
            });

            console.log('✅ Modal reset handler registered');
        }
    }

    
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
