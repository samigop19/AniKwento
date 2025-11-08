/**
 * Clear Form on Load Script
 * Ensures all input fields are reset to empty/default values on page load
 * Prevents any auto-restore or persistence behavior
 *
 * This script:
 * 1. Clears all form input fields on page load
 * 2. Clears all form input fields when the create story modal is opened
 * 3. Removes any form-related data from localStorage and sessionStorage
 * 4. Disables browser autocomplete/autofill
 * 5. Handles back/forward navigation (pageshow event)
 *
 * Fields that are cleared:
 * - Story prompt textarea (#storyPrompt)
 * - Student character names (#character1Name through #character5Name)
 * - Student character genders (#character1Gender through #character5Gender)
 * - Voice option select (#voiceOption)
 * - Question timing radio buttons (reset to "none")
 * - Question type checkboxes (all unchecked)
 * - Any other text inputs or selects in the create story form
 */

(function() {
    'use strict';

    console.log('🧹 Clear Form Script: Initializing...');

    /**
     * Clear all form inputs immediately on script load (before DOM ready)
     */
    function clearAllFormFields() {
        console.log('🧹 Clearing all form fields...');

        // Clear story prompt textarea
        const storyPrompt = document.getElementById('storyPrompt');
        if (storyPrompt) {
            storyPrompt.value = '';
            console.log('✓ Cleared storyPrompt');
        }

        // Clear all student character fields (supports up to 5 students)
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

        // Clear voice option select
        const voiceOption = document.getElementById('voiceOption');
        if (voiceOption) {
            voiceOption.value = '';
            voiceOption.selectedIndex = 0;
            console.log('✓ Cleared voiceOption');
        }

        // Clear question timing radio buttons (reset to "none")
        const questionTimingRadios = document.querySelectorAll('input[name="questionTiming"]');
        questionTimingRadios.forEach(radio => {
            radio.checked = radio.value === 'none';
        });
        console.log('✓ Reset question timing to "none"');

        // Clear question type checkboxes
        const questionTypeCheckboxes = document.querySelectorAll('.question-type-checkbox');
        questionTypeCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        console.log('✓ Cleared all question type checkboxes');

        // Clear any other text inputs in the create story form
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

    /**
     * Clear any form-related data from storage
     */
    function clearFormStorage() {
        console.log('🧹 Clearing form-related storage...');

        // List of storage keys that might contain form data
        const formStorageKeys = [
            'storyPrompt',
            'studentCharacters',
            'characterNames',
            'voiceSelection',
            'formData',
            'draftStory'
        ];

        // Clear from localStorage
        formStorageKeys.forEach(key => {
            if (localStorage.getItem(key)) {
                localStorage.removeItem(key);
                console.log(`✓ Removed localStorage: ${key}`);
            }
        });

        // Clear from sessionStorage
        formStorageKeys.forEach(key => {
            if (sessionStorage.getItem(key)) {
                sessionStorage.removeItem(key);
                console.log(`✓ Removed sessionStorage: ${key}`);
            }
        });

        console.log('✅ Form storage cleared');
    }

    /**
     * Add autocomplete="off" to prevent browser autofill
     */
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

    /**
     * Clear fields when modal is opened
     */
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

    // Execute immediately (before DOM ready) to clear as early as possible
    if (document.readyState === 'loading') {
        // DOM is still loading, wait for it
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🧹 DOM Ready - executing clear operations...');
            clearFormStorage();
            clearAllFormFields();
            disableAutocomplete();
            setupModalClearHandlers();
        });
    } else {
        // DOM is already loaded
        console.log('🧹 DOM Already Ready - executing clear operations...');
        clearFormStorage();
        clearAllFormFields();
        disableAutocomplete();
        setupModalClearHandlers();
    }

    // Also clear on page show (handles back/forward navigation)
    window.addEventListener('pageshow', function(event) {
        console.log('🧹 Page show event - clearing fields...');
        clearFormStorage();
        clearAllFormFields();
    });

    console.log('✅ Clear Form Script: Initialization complete');
})();
