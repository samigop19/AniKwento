
document.addEventListener('DOMContentLoaded', function() {
    console.log('Character validation script loaded');
    
    const character1Name = document.getElementById('character1Name');
    const character1Gender = document.getElementById('character1Gender');
    const character2Name = document.getElementById('character2Name');
    const character2Gender = document.getElementById('character2Gender');

    
    function formatNameToProperCase(name) {
        if (!name || typeof name !== 'string') return name;
        return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    }

    
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

    
    function validateCharacter(nameInput, genderSelect) {
        const hasName = nameInput.value.trim() !== '';
        
        if (hasName) {
            
            genderSelect.setAttribute('required', 'required');
            genderSelect.style.borderColor = genderSelect.value ? '' : '#dc3545';
        } else {
            
            genderSelect.removeAttribute('required');
            genderSelect.style.borderColor = '';
        }
    }

    
    function showValidationFeedback(element, isValid) {
        element.style.borderColor = isValid ? '' : '#dc3545';
    }

    
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

    
    window.validateCharacterInputs = function() {
        let isValid = true;
        let hasAnyValidationErrors = false;

        
        if (character1Name && character1Gender) {
            const hasName1 = character1Name.value.trim() !== '';
            if (hasName1 && !character1Gender.value) {
                showValidationFeedback(character1Gender, false);
                isValid = false;
                hasAnyValidationErrors = true;
            }
        }

        
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
    
    
    const createBtn = document.querySelector('.btn.create-btn');
    console.log('Create button found:', createBtn);
    if (createBtn) {
        createBtn.addEventListener('click', function(e) {
            
            
            window.validateCharacterInputs();
        }, false);
    }
});