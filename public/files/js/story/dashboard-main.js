
let generatedStory = null;


window.generatedStory = generatedStory;


window.testNewIdeas = function() {
    console.log('✅ Test function works!');
    alert('✅ JavaScript is working!');
};


window.testStaticPrompts = function() {
    console.log('🧪 Testing static prompts display...');
    const testPrompts = [
        'Three friends learn colors together.',
        'Four kids count objects in their room.',
        'A group of children explore and discover new things.',
        'Some friends share snacks together.'
    ];

    console.log('🧪 Calling displayPromptSuggestions with test prompts...');
    window.displayPromptSuggestions(testPrompts);
};


console.log('🔍 Dashboard-main.js loaded');


if (typeof window.refreshPromptSuggestions === 'undefined') {
    console.log('🔧 Creating placeholder refreshPromptSuggestions function');
    window.refreshPromptSuggestions = function() {
        console.log('⏳ Placeholder function called, waiting for actual implementation...');
    };
}

console.log('🔍 Testing function availability:');
console.log('🔍 window.refreshPromptSuggestions:', typeof window.refreshPromptSuggestions);
console.log('🔍 window.displayPromptSuggestions:', typeof window.displayPromptSuggestions);


window.refreshPromptSuggestions = async function() {
    console.log('🔄 Refreshing prompt suggestions with AI...');
    
    const refreshBtn = document.querySelector('button[onclick="refreshPromptSuggestions()"]');
    if (refreshBtn) {
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        refreshBtn.disabled = true;
        console.log('🔄 Button state changed to loading');
    }

    try {
        
        console.log('🤖 Generating fresh story prompts using OpenRouter API...');

        
        const storyThemes = window.STORY_THEMES || [
            'Adventure', 'Friendship', 'Courage', 'Mystery', 'Magic', 'Self-discovery', 'Hope', 'Kindness',
            'Teamwork', 'Imagination', 'Nature', 'Family', 'Dreams', 'Bravery', 'Curiosity', 'Honesty'
        ];

        const promptForAI = `Generate exactly 6 story prompts for children's stories. Each prompt MUST specify an EXACT number of characters (2, 3, 4, or 5 children).

Story Themes to use:
${storyThemes.map(theme => `• ${theme}`).join('\n')}

Format each prompt as a simple, complete sentence like these examples:
Two friends discover a magical garden and learn about plants.
Three kids build a treehouse and help each other.
Four children go on a beach adventure and collect seashells.
Five friends solve a puzzle together at school.
Two siblings learn to share their favorite toys.
Three classmates explore the forest and find woodland creatures.

CRITICAL Requirements:
- Each prompt must be exactly ONE simple sentence
- ALWAYS start with a SPECIFIC NUMBER: "Two friends", "Three kids", "Four children", "Five friends", etc.
- NEVER use vague terms like "A group of", "Some kids", "Children" without a number
- Vary the character count across all 6 prompts (use 2, 3, 4, and 5 in different prompts)
- Each character should be identifiable (use terms like "friends", "kids", "children", "siblings", "classmates")
- Select themes from the list above or create similar educational themes
- Focus on activities and adventures appropriate for young children
- Keep language simple and kid-friendly (kindergarten level)
- No complex sentence structures, just one clear sentence per prompt

Session: ${Date.now()}`;

        
        const response = await fetch('/source/handlers/openrouter_completion.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: promptForAI,
                model: 'openai/gpt-4o-mini',
                max_tokens: 200,
                temperature: 0.9
            })
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success || !data.content) {
            throw new Error('Invalid response from backend');
        }

        const aiResponse = data.content;
        
        
        const lines = aiResponse.split('\n').filter(line => {
            const trimmed = line.trim();
            return trimmed.length > 10 && !trimmed.startsWith('Example') && !trimmed.includes(':');
        });
        
        const cleanPrompts = lines.slice(0, 6).map(line => 
            line.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, '').trim()
        );
        
        if (cleanPrompts.length >= 4) {
            console.log('✅ Generated fresh AI prompts:', cleanPrompts);
            displayPromptSuggestions(cleanPrompts);
        } else {
            throw new Error('Not enough prompts generated');
        }
        
    } catch (error) {
        console.warn('⚠️ AI generation failed, using fallback prompts:', error.message);

        
        const fallbackPrompts = [
            'Two friends go on an adventure to find a lost treasure.',
            'Three kids discover the magic of friendship at the playground.',
            'Four children show courage while helping their community.',
            'Five friends solve a mystery in their neighborhood.',
            'Two siblings use their imagination to create magical stories.',
            'Three kids explore nature and learn about kindness.',
            'Four friends work as a team to build something special.',
            'Two classmates go on a journey of self-discovery.',
            'Three children dream about exciting space adventures.',
            'Five friends help their family prepare a surprise party.',
            'Two kids learn about bravery during a camping trip.',
            'Four siblings share their favorite toys and play together.'
        ];

        
        const shuffled = fallbackPrompts.sort(() => 0.5 - Math.random()).slice(0, 6);
        console.log('📝 Using fallback prompts:', shuffled);
        displayPromptSuggestions(shuffled);
    }
    
    
    if (refreshBtn) {
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> New Ideas';
        refreshBtn.disabled = false;
        console.log('🔄 Button restored to normal state');
    }
};


console.log('🔍 After definition - window.refreshPromptSuggestions:', typeof window.refreshPromptSuggestions);

window.displayPromptSuggestions = function(prompts) {
    console.log('🎨 displayPromptSuggestions called with:', prompts);
    
    
    let attempts = 0;
    const maxAttempts = 5;
    
    function tryDisplay() {
        attempts++;
        const suggestionChips = document.getElementById('suggestionChips');
        
        if (!suggestionChips) {
            console.error(`❌ suggestionChips element not found! (attempt ${attempts}/${maxAttempts})`);
            console.log('🔍 Available elements with "suggestion" in ID:');
            const allElements = document.querySelectorAll('[id*="suggestion"]');
            allElements.forEach(el => console.log(`   - ${el.id}:`, el));
            
            if (attempts < maxAttempts) {
                console.log(`⏳ Retrying in 500ms...`);
                setTimeout(tryDisplay, 500);
                return;
            } else {
                console.error('❌ Failed to find suggestionChips after all attempts');
                alert('❌ Could not find suggestion chips container. The modal may not be open.');
                return;
            }
        }
        
        console.log('✅ Found suggestionChips element:', suggestionChips);
        actuallyDisplayPrompts(prompts, suggestionChips);
    }
    
    tryDisplay();
};

function actuallyDisplayPrompts(prompts, suggestionChips) {
    
    const ideaIcon = 'fa fa-lightbulb';
    
    if (prompts && prompts.length > 0) {
        console.log(`✅ Displaying ${prompts.length} prompts`);
        const html = prompts.map((prompt, index) => `
            <button type="button" class="suggestion-chip" onclick="selectPrompt('${prompt.replace(/'/g, "\\'")}')">
                <i class="${ideaIcon}"></i>
                <span>${prompt}</span>
            </button>
        `).join('');
        
        suggestionChips.innerHTML = html;
        console.log('✅ HTML updated successfully');
        console.log('✅ Generated HTML:', html.substring(0, 200) + '...');
    } else {
        console.log('⚠️ No prompts provided, showing no prompts message');
        suggestionChips.innerHTML = '<div class="loading-suggestions">No prompts available</div>';
    }
}

window.selectPrompt = function(promptText) {
    const storyPrompt = document.getElementById('storyPrompt');
    if (storyPrompt) {
        storyPrompt.value = promptText;
        storyPrompt.focus();

        
        const characterCount = extractCharacterCount(promptText);

        if (characterCount > 0) {
            console.log(`📊 Extracted character count: ${characterCount} from prompt: "${promptText}"`);

            
            localStorage.setItem('suggestedCharacterCount', characterCount.toString());
        }
    }
};


function extractCharacterCount(promptText) {
    const text = promptText.toLowerCase();

    
    const numberWords = {
        'two': 2,
        'three': 3,
        'four': 4,
        'five': 5
    };

    
    for (const [word, num] of Object.entries(numberWords)) {
        if (text.startsWith(word + ' ')) {
            return num;
        }
    }

    
    const digitMatch = text.match(/^(\d+)\s/);
    if (digitMatch) {
        const num = parseInt(digitMatch[1]);
        if (num >= 2 && num <= 5) {
            return num;
        }
    }

    return 0; 
}


window.isStorageAvailable = false;
window.storageCheckComplete = false;


function checkBrowserCompatibility() {
    console.log('🔍 Checking browser storage compatibility...');

    return new Promise((resolve) => {
        let hasIndexedDB = false;
        let testCompleted = false;

        
        if (!window.indexedDB) {
            console.warn('❌ IndexedDB not supported');
            window.isStorageAvailable = false;
            window.storageCheckComplete = true;
            disableStoryCreation();
            resolve(false);
            return;
        }

        
        try {
            const testRequest = indexedDB.open('__browser_test__', 1);

            
            const timeout = setTimeout(() => {
                if (!testCompleted) {
                    testCompleted = true;
                    console.warn('❌ IndexedDB test timed out - likely blocked');
                    window.isStorageAvailable = false;
                    window.storageCheckComplete = true;
                    disableStoryCreation();
                    resolve(false);
                }
            }, 2000);

            testRequest.onerror = function(event) {
                clearTimeout(timeout);
                if (!testCompleted) {
                    testCompleted = true;
                    console.warn('❌ IndexedDB is blocked:', event.target.error);
                    window.isStorageAvailable = false;
                    window.storageCheckComplete = true;
                    disableStoryCreation();
                    resolve(false);
                }
            };

            testRequest.onblocked = function() {
                clearTimeout(timeout);
                if (!testCompleted) {
                    testCompleted = true;
                    console.warn('❌ IndexedDB is blocked by browser');
                    window.isStorageAvailable = false;
                    window.storageCheckComplete = true;
                    disableStoryCreation();
                    resolve(false);
                }
            };

            testRequest.onsuccess = function(event) {
                clearTimeout(timeout);
                if (!testCompleted) {
                    testCompleted = true;
                    const db = event.target.result;
                    db.close();
                    
                    indexedDB.deleteDatabase('__browser_test__');
                    console.log('✅ IndexedDB is accessible');
                    window.isStorageAvailable = true;
                    window.storageCheckComplete = true;
                    enableStoryCreation();
                    resolve(true);
                }
            };

            testRequest.onupgradeneeded = function(event) {
                
                const db = event.target.result;
                if (!db.objectStoreNames.contains('test')) {
                    db.createObjectStore('test', { keyPath: 'id' });
                }
            };
        } catch (e) {
            console.warn('❌ IndexedDB error:', e);
            window.isStorageAvailable = false;
            window.storageCheckComplete = true;
            disableStoryCreation();
            resolve(false);
        }
    });
}


function disableStoryCreation() {
    console.warn('🚫 Disabling story creation due to storage issues');

    
    const addNewButton = document.querySelector('.add-new');
    if (addNewButton) {
        addNewButton.style.opacity = '0.5';
        addNewButton.style.cursor = 'not-allowed';
        addNewButton.style.filter = 'grayscale(100%)';

        
        addNewButton.removeAttribute('data-bs-toggle');
        addNewButton.removeAttribute('data-bs-target');

        addNewButton.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            showStorageWarningModal();
        };

        
        const warningBadge = document.createElement('div');
        warningBadge.style.cssText = 'position: absolute; top: 10px; right: 10px; background: #dc3545; color: white; padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;';
        warningBadge.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Disabled';
        addNewButton.style.position = 'relative';
        addNewButton.appendChild(warningBadge);
    }

    
    setTimeout(function() {
        if (typeof notificationSystem !== 'undefined') {
            notificationSystem.error(
                '<strong>Story Creation Disabled</strong><br>' +
                'IndexedDB is blocked. Click the "+" button for instructions.<br>' +
                '<small>For Brave: Enable IndexedDB in Shields settings</small>',
                10000
            );
        }
    }, 1000);
}


function enableStoryCreation() {
    console.log('✅ Story creation enabled');

    const addNewButton = document.querySelector('.add-new');
    if (addNewButton) {
        addNewButton.style.opacity = '1';
        addNewButton.style.cursor = 'pointer';
        addNewButton.style.filter = 'none';
        addNewButton.setAttribute('data-bs-toggle', 'modal');
        addNewButton.setAttribute('data-bs-target', '#createStoryModal');
        addNewButton.onclick = null;
    }
}


function showStorageWarningModal() {
    const modal = document.getElementById('browserWarningModal');
    if (modal) {
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    } else {
        alert('⚠️ Story Creation Disabled\n\n' +
              'IndexedDB is blocked by your browser.\n\n' +
              'For Brave Browser:\n' +
              '1. Click the Brave Shields icon (lion) in the address bar\n' +
              '2. Click "Advanced View"\n' +
              '3. Change "Block Fingerprinting" to "Allow" or "Standard"\n' +
              '4. Refresh this page\n\n' +
              'Or use Safari, Chrome, or Firefox instead.');
    }
}


window.showStorageWarningModal = showStorageWarningModal;

document.addEventListener('DOMContentLoaded', async function() {
    
    await checkBrowserCompatibility();

    
    initializeStudentManagement();

    const volumeRange = document.getElementById('volumeRange');
    const volumeValue = document.querySelector('.volume-value');

    if (volumeRange && volumeValue) {
        function updateVolumeValue(value) {
            volumeValue.textContent = value + '%';
        }
        volumeRange.addEventListener('input', function() {
            updateVolumeValue(this.value);
        });
        volumeRange.addEventListener('change', function() {
            updateVolumeValue(this.value);
        });
        updateVolumeValue(volumeRange.value);
    }

    const questionTypeCheckboxes = document.querySelectorAll('.question-type-checkbox');
    const maxAllowed = 2;
    const questionTimingRadios = document.querySelectorAll('input[name="questionTiming"]');
    const selectionCounter = document.getElementById('selectionCounter');

    console.log('🔍 Found question type checkboxes:', questionTypeCheckboxes.length);
    console.log('🔍 Found question timing radios:', questionTimingRadios.length);

    
    function updateSelectionCounter() {
        const checkedBoxes = document.querySelectorAll('.question-type-checkbox:checked');
        if (selectionCounter) {
            selectionCounter.textContent = `(Select up to 2) - ${checkedBoxes.length}/2 selected`;
        }
    }

    
    function updateQuestionTypesState() {
        const selectedTiming = document.querySelector('input[name="questionTiming"]:checked');
        const timingValue = selectedTiming ? selectedTiming.value : 'none';
        const shouldDisable = timingValue === 'none' || timingValue === 'after';

        console.log('🔍 Selected timing:', timingValue);
        console.log('🔍 Should disable question types:', shouldDisable);

        questionTypeCheckboxes.forEach(checkbox => {
            if (shouldDisable) {
                console.log('✅ Disabling checkbox:', checkbox.id);
                checkbox.disabled = true;
                checkbox.checked = false;
            } else {
                
                const checkedBoxes = document.querySelectorAll('.question-type-checkbox:checked');
                if (!checkbox.checked) {
                    checkbox.disabled = checkedBoxes.length >= maxAllowed;
                } else {
                    checkbox.disabled = false;
                }
                console.log('✅ Checkbox', checkbox.id, 'disabled:', checkbox.disabled);
            }
        });

        
        const questionTypesContainer = document.querySelector('.question-types');
        if (questionTypesContainer) {
            if (shouldDisable) {
                questionTypesContainer.style.opacity = '0.5';
                questionTypesContainer.style.pointerEvents = 'none';
            } else {
                questionTypesContainer.style.opacity = '1';
                questionTypesContainer.style.pointerEvents = 'auto';
            }
        }

        updateSelectionCounter();
    }

    
    questionTimingRadios.forEach(radio => {
        console.log('🔍 Adding listener to radio:', radio.id, 'value:', radio.value);
        radio.addEventListener('change', function() {
            console.log('🔔 Radio changed:', this.value);
            updateQuestionTypesState();
        });
    });

    
    questionTypeCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const selectedTiming = document.querySelector('input[name="questionTiming"]:checked');
            const timingValue = selectedTiming ? selectedTiming.value : 'none';
            const shouldDisable = timingValue === 'none' || timingValue === 'after';

            if (shouldDisable) {
                this.checked = false;
                return;
            }

            const checkedBoxes = document.querySelectorAll('.question-type-checkbox:checked');
            if (checkedBoxes.length > maxAllowed) {
                this.checked = false;
                return;
            }
            questionTypeCheckboxes.forEach(box => {
                if (!box.checked) {
                    box.disabled = checkedBoxes.length >= maxAllowed;
                }
            });
            updateSelectionCounter();
        });
    });

    
    updateQuestionTypesState();

    
    const createStoryModal = document.getElementById('createStoryModal');
    console.log('🔍 createStoryModal element:', createStoryModal);
    
    if (createStoryModal) {
        console.log('✅ Adding event listener to createStoryModal');
        createStoryModal.addEventListener('shown.bs.modal', function() {
            console.log('🚀 Create story modal opened - auto-generating ideas');
            console.log('🔍 window.refreshPromptSuggestions type:', typeof window.refreshPromptSuggestions);
            
            
            if (typeof window.refreshPromptSuggestions === 'function') {
                console.log('✅ Calling refreshPromptSuggestions...');
                window.refreshPromptSuggestions();
            } else {
                console.error('❌ refreshPromptSuggestions is not available!');
                alert('❌ refreshPromptSuggestions function is not available!');
            }
        });
    } else {
        console.error('❌ createStoryModal element not found!');
    }
});

function playStory(imageUrl, title) {
    sessionStorage.setItem('storyImage', imageUrl);
    sessionStorage.setItem('storyTitle', title);
    window.location.href = '../story/StoryPlayer.html';
}


window.playStory = playStory;


let studentCount = 1;
const maxStudents = 5;


function initializeStudentManagement() {
    const addStudentOption = document.getElementById('addStudentOption');
    const addPetOption = document.getElementById('addPetOption');

    if (addStudentOption) {
        addStudentOption.addEventListener('click', function(e) {
            e.preventDefault();
            addCharacterField('student');
        });
        console.log('✅ Add student option initialized');
    }

    if (addPetOption) {
        addPetOption.addEventListener('click', function(e) {
            e.preventDefault();
            addCharacterField('pet');
        });
        console.log('✅ Add pet option initialized');
    }

    
    updateCharacterCount();
}

function addCharacterField(type = 'student') {
    console.log(`🔵 Adding ${type} field, current count:`, studentCount);

    
    const addBtn = document.getElementById('addCharacterDropdown');
    if (addBtn) {
        const dropdownInstance = bootstrap.Dropdown.getInstance(addBtn);
        if (dropdownInstance) {
            dropdownInstance.hide();
        }
    }

    if (studentCount >= maxStudents) {
        if (typeof notificationSystem !== 'undefined') {
            notificationSystem.warning('Maximum of 5 characters allowed.');
        } else {
            alert('Maximum of 5 characters allowed.');
        }
        return;
    }

    studentCount++;
    const grid = document.getElementById('studentsGrid');

    const characterField = document.createElement('div');
    characterField.className = 'col-md-6 student-field';
    characterField.setAttribute('data-student', studentCount);
    characterField.setAttribute('data-character-type', type);

    const characterLabel = type === 'student' ? 'Student' : 'Pet';
    const namePlaceholder = type === 'student' ? 'Student name' : 'Pet name';
    const genderOptions = type === 'student'
        ? `<option value="">Gender</option>
           <option value="boy">Boy</option>
           <option value="girl">Girl</option>`
        : `<option value="">Type</option>
           <option value="dog">Dog</option>
           <option value="cat">Cat</option>
           <option value="rabbit">Rabbit</option>
           <option value="bird">Bird</option>
           <option value="hamster">Hamster</option>`;

    characterField.innerHTML = `
        <div class="student-field-header">
            <label class="form-label fw-semibold mb-0">${characterLabel} ${studentCount}</label>
            <button type="button" class="remove-student-btn" data-remove="${studentCount}" title="Remove ${type}">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <input type="hidden" id="character${studentCount}Type" value="${type}">
        <div class="mb-2">
            <input
                type="text"
                id="character${studentCount}Name"
                class="form-control student-name-input"
                placeholder="${namePlaceholder}"
                maxlength="20"
                autocomplete="off"
            >
        </div>
        <select id="character${studentCount}Gender" class="form-select student-gender-select" autocomplete="off">
            ${genderOptions}
        </select>
    `;

    grid.appendChild(characterField);

    
    const removeBtn = characterField.querySelector('.remove-student-btn');
    if (removeBtn) {
        removeBtn.addEventListener('click', function() {
            removeStudentField(this.closest('.student-field'));
        });
    }

    
    updateAddButtonState();
    updateCharacterCount();

    console.log(`✅ ${characterLabel} field added, new count:`, studentCount);
}

function removeStudentField(fieldElement) {
    const studentNumber = parseInt(fieldElement.getAttribute('data-student'));
    const characterType = fieldElement.getAttribute('data-character-type') || 'student';

    console.log(`🔴 Removing ${characterType} field:`, studentNumber);

    
    if (studentCount <= 1) {
        if (typeof notificationSystem !== 'undefined') {
            notificationSystem.warning('At least one character field must remain. Clear the fields instead.');
        } else {
            alert('At least one character field must remain. Clear the fields instead.');
        }
        return;
    }

    
    fieldElement.style.animation = 'slideOut 0.3s ease-out';

    setTimeout(() => {
        fieldElement.remove();
        studentCount--;

        
        renumberStudentFields();

        
        updateAddButtonState();
        updateCharacterCount();

        console.log(`✅ ${characterType.charAt(0).toUpperCase() + characterType.slice(1)} field removed, new count:`, studentCount);
    }, 300);
}

function renumberStudentFields() {
    const fields = document.querySelectorAll('.student-field');
    studentCount = fields.length;

    fields.forEach((field, index) => {
        const newNumber = index + 1;
        const characterType = field.getAttribute('data-character-type') || 'student';

        
        field.setAttribute('data-student', newNumber);

        
        const label = field.querySelector('label');
        if (label) {
            const characterLabel = characterType === 'student' ? 'Student' : 'Pet';
            label.textContent = `${characterLabel} ${newNumber}`;
        }

        
        const removeBtn = field.querySelector('.remove-student-btn');
        if (removeBtn) {
            removeBtn.setAttribute('data-remove', newNumber);
        }

        
        const nameInput = field.querySelector('input[type="text"]');
        const genderSelect = field.querySelector('select');
        const typeInput = field.querySelector('input[type="hidden"]');

        if (nameInput) {
            nameInput.id = `character${newNumber}Name`;
        }
        if (genderSelect) {
            genderSelect.id = `character${newNumber}Gender`;
        }
        if (typeInput) {
            typeInput.id = `character${newNumber}Type`;
        }
    });

    console.log('✅ Fields renumbered, total count:', studentCount);
}

function updateCharacterCount() {
    const countDisplay = document.getElementById('characterCount');
    if (countDisplay) {
        countDisplay.textContent = `${studentCount}/5`;

        
        if (studentCount >= maxStudents) {
            countDisplay.classList.add('at-max');
        } else {
            countDisplay.classList.remove('at-max');
        }
    }
}

function updateAddButtonState() {
    const addBtn = document.getElementById('addCharacterDropdown');
    if (addBtn) {
        if (studentCount >= maxStudents) {
            
            const dropdownInstance = bootstrap.Dropdown.getInstance(addBtn);
            if (dropdownInstance) {
                dropdownInstance.hide();
            }

            addBtn.disabled = true;
            addBtn.title = 'Maximum characters reached (5)';
            
            addBtn.removeAttribute('data-bs-toggle');
            addBtn.style.cursor = 'not-allowed';
            addBtn.style.opacity = '0.6';
        } else {
            addBtn.disabled = false;
            addBtn.title = 'Add a character';
            
            addBtn.setAttribute('data-bs-toggle', 'dropdown');
            addBtn.style.cursor = 'pointer';
            addBtn.style.opacity = '1';
        }
    }
}


const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateY(0);
        }
        to {
            opacity: 0;
            transform: translateY(-10px);
        }
    }
`;
document.head.appendChild(style);