// Character validation and name formatting
document.addEventListener('DOMContentLoaded', function() {
    console.log('Character validation script loaded');
    
    const character1Name = document.getElementById('character1Name');
    const character1Gender = document.getElementById('character1Gender');
    const character2Name = document.getElementById('character2Name');
    const character2Gender = document.getElementById('character2Gender');

    // Function to format names to proper case (capitalize first letter, lowercase the rest)
    function formatNameToProperCase(name) {
        if (!name || typeof name !== 'string') return name;
        return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    }

    // Function to auto-format name as user types
    function autoFormatName(inputElement) {
        if (inputElement && inputElement.value) {
            const formattedName = formatNameToProperCase(inputElement.value.trim());
            if (formattedName !== inputElement.value) {
                const cursorPosition = inputElement.selectionStart;
                inputElement.value = formattedName;
                inputElement.setSelectionRange(cursorPosition, cursorPosition);
            }
        }
    }

    // Function to validate character inputs
    function validateCharacter(nameInput, genderSelect) {
        const hasName = nameInput.value.trim() !== '';
        
        if (hasName) {
            // If name is entered, gender is required
            genderSelect.setAttribute('required', 'required');
            genderSelect.style.borderColor = genderSelect.value ? '' : '#dc3545';
        } else {
            // If no name, gender is not required
            genderSelect.removeAttribute('required');
            genderSelect.style.borderColor = '';
        }
    }

    // Function to show validation visual feedback only
    function showValidationFeedback(element, isValid) {
        element.style.borderColor = isValid ? '' : '#dc3545';
    }

    // Add event listeners for Character 1
    if (character1Name && character1Gender) {
        character1Name.addEventListener('input', function() {
            autoFormatName(this);
            validateCharacter(character1Name, character1Gender);
            
            const isValid = !this.value.trim() || character1Gender.value;
            showValidationFeedback(character1Gender, isValid);
        });

        character1Gender.addEventListener('change', function() {
            const isValid = !character1Name.value.trim() || this.value;
            showValidationFeedback(this, isValid);
        });
    }

    // Add event listeners for Character 2
    if (character2Name && character2Gender) {
        character2Name.addEventListener('input', function() {
            autoFormatName(this);
            validateCharacter(character2Name, character2Gender);
            
            const isValid = !this.value.trim() || character2Gender.value;
            showValidationFeedback(character2Gender, isValid);
        });

        character2Gender.addEventListener('change', function() {
            const isValid = !character2Name.value.trim() || this.value;
            showValidationFeedback(this, isValid);
        });
    }

    // Create a validation function that can be called by other scripts
    window.validateCharacterInputs = function() {
        let isValid = true;
        let hasAnyValidationErrors = false;

        // Check Character 1 - only validate if name is entered
        if (character1Name && character1Gender) {
            const hasName1 = character1Name.value.trim() !== '';
            if (hasName1 && !character1Gender.value) {
                showValidationFeedback(character1Gender, false);
                isValid = false;
                hasAnyValidationErrors = true;
            }
        }

        // Check Character 2 - only validate if name is entered
        if (character2Name && character2Gender) {
            const hasName2 = character2Name.value.trim() !== '';
            if (hasName2 && !character2Gender.value) {
                showValidationFeedback(character2Gender, false);
                isValid = false;
                hasAnyValidationErrors = true;
            }
        }

        if (!isValid && hasAnyValidationErrors) {
            console.log('Character validation failed');
            // Check if notificationSystem exists before using it
            if (typeof notificationSystem !== 'undefined') {
                notificationSystem.error('Please select gender for all students with names.');
            } else {
                alert('Please select gender for all students with names.');
            }
            return false;
        }
        
        console.log('Character validation passed');
        return true;
    };
    
    // Also add a passive listener that doesn't interfere with other handlers
    const createBtn = document.querySelector('.btn.create-btn');
    console.log('Create button found:', createBtn);
    if (createBtn) {
        createBtn.addEventListener('click', function(e) {
            // Just validate and show feedback, don't prevent anything
            // The story generator will call window.validateCharacterInputs() if it needs to
            window.validateCharacterInputs();
        }, false);
    }
});