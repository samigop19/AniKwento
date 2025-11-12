

(function() {
    'use strict';

    console.log('🧹 Clear Form Script: Initializing...');

    
    function clearAllFormFields() {
        console.log('🧹 Clearing all form fields...');

        
        const storyPrompt = document.getElementById('storyPrompt');
        if (storyPrompt) {
            storyPrompt.value = '';
            console.log('✓ Cleared storyPrompt');
        }

        
        for (let i = 1; i <= 5; i++) {
            const nameInput = document.getElementById(`character${i}Name`);
            const genderSelect = document.getElementById(`character${i}Gender`);

            if (nameInput) {
                nameInput.value = '';
                console.log(`✓ Cleared character${i}Name`);
            }

            if (genderSelect) {
                genderSelect.value = '';
                genderSelect.selectedIndex = 0;
                console.log(`✓ Cleared character${i}Gender`);
            }
        }

        
        const voiceOption = document.getElementById('voiceOption');
        if (voiceOption) {
            voiceOption.value = '';
            voiceOption.selectedIndex = 0;
            console.log('✓ Cleared voiceOption');
        }

        
        const questionTimingRadios = document.querySelectorAll('input[name="questionTiming"]');
        questionTimingRadios.forEach(radio => {
            radio.checked = radio.value === 'none';
        });
        console.log('✓ Reset question timing to "none"');

        
        const questionTypeCheckboxes = document.querySelectorAll('.question-type-checkbox');
        questionTypeCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        console.log('✓ Cleared all question type checkboxes');

        
        const createStoryForm = document.getElementById('createStoryForm');
        if (createStoryForm) {
            const allInputs = createStoryForm.querySelectorAll('input[type="text"], textarea');
            allInputs.forEach(input => {
                if (input.value) {
                    input.value = '';
                }
            });

            const allSelects = createStoryForm.querySelectorAll('select');
            allSelects.forEach(select => {
                select.selectedIndex = 0;
            });
        }

        console.log('✅ All form fields cleared successfully');
    }

    
    function clearFormStorage() {
        console.log('🧹 Clearing form-related storage...');

        
        const formStorageKeys = [
            'storyPrompt',
            'studentCharacters',
            'characterNames',
            'voiceSelection',
            'formData',
            'draftStory'
        ];

        
        formStorageKeys.forEach(key => {
            if (localStorage.getItem(key)) {
                localStorage.removeItem(key);
                console.log(`✓ Removed localStorage: ${key}`);
            }
        });

        
        formStorageKeys.forEach(key => {
            if (sessionStorage.getItem(key)) {
                sessionStorage.removeItem(key);
                console.log(`✓ Removed sessionStorage: ${key}`);
            }
        });

        console.log('✅ Form storage cleared');
    }

    
    function disableAutocomplete() {
        console.log('🧹 Disabling autocomplete...');

        const storyPrompt = document.getElementById('storyPrompt');
        if (storyPrompt) {
            storyPrompt.setAttribute('autocomplete', 'off');
        }

        for (let i = 1; i <= 5; i++) {
            const nameInput = document.getElementById(`character${i}Name`);
            if (nameInput) {
                nameInput.setAttribute('autocomplete', 'off');
            }
        }

        console.log('✅ Autocomplete disabled');
    }

    
    function setupModalClearHandlers() {
        const createStoryModal = document.getElementById('createStoryModal');

        if (createStoryModal) {
            createStoryModal.addEventListener('show.bs.modal', function() {
                console.log('🧹 Create Story modal opening - clearing fields...');
                clearAllFormFields();
            });

            console.log('✅ Modal clear handler registered');
        }
    }

    
    if (document.readyState === 'loading') {
        
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🧹 DOM Ready - executing clear operations...');
            clearFormStorage();
            clearAllFormFields();
            disableAutocomplete();
            setupModalClearHandlers();
        });
    } else {
        
        console.log('🧹 DOM Already Ready - executing clear operations...');
        clearFormStorage();
        clearAllFormFields();
        disableAutocomplete();
        setupModalClearHandlers();
    }

    
    window.addEventListener('pageshow', function(event) {
        console.log('🧹 Page show event - clearing fields...');
        clearFormStorage();
        clearAllFormFields();
    });

    console.log('✅ Clear Form Script: Initialization complete');
})();
