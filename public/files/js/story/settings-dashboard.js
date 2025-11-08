/**
 * Settings Dashboard JavaScript
 * Handles loading, saving, and managing user story settings
 */

(function() {
    'use strict';

    // DOM Elements
    const saveBtn = document.getElementById('saveSettingsBtn');
    const resetBtn = document.getElementById('resetSettingsBtn');
    const voiceSelector = document.getElementById('voiceSelector');
    const deleteVoiceBtn = document.getElementById('deleteVoiceBtn');
    const narrationVolumeRange = document.getElementById('narrationVolumeRange');
    const narrationVolumeValue = document.getElementById('narrationVolumeValue');
    const musicSelector = document.getElementById('musicSelector');
    const musicVolumeRange = document.getElementById('musicVolumeRange');
    const musicVolumeValue = document.getElementById('musicVolumeValue');
    const questionTimingRadios = document.querySelectorAll('input[name="questionTiming"]');
    const questionTypeCheckboxes = document.querySelectorAll('.question-type');

    // Add Voice Modal Elements
    const addVoiceModal = new bootstrap.Modal(document.getElementById('addVoiceModal'));
    const saveVoiceBtn = document.getElementById('saveVoiceBtn');
    const modalVoiceName = document.getElementById('modalVoiceName');
    const modalVoiceId = document.getElementById('modalVoiceId');
    const modalAvatarUrl = document.getElementById('modalAvatarUrl');

    // Store custom voices
    let customVoices = [];

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Settings Dashboard initialized');

        // Initialize slider CSS variables with current values
        narrationVolumeRange.style.setProperty('--value', narrationVolumeRange.value + '%');
        musicVolumeRange.style.setProperty('--value', musicVolumeRange.value + '%');

        // Setup event listeners
        setupEventListeners();

        // Initialize question timing state (call this before loading settings)
        handleQuestionTimingChange();

        // Load existing settings
        loadSettings();

        // Initialize preview panel
        updatePreviewPanel();
    });

    /**
     * Setup all event listeners
     */
    function setupEventListeners() {
        // Save button
        saveBtn.addEventListener('click', saveSettings);

        // Reset button
        resetBtn.addEventListener('click', resetToDefaults);

        // Volume sliders
        narrationVolumeRange.addEventListener('input', function() {
            narrationVolumeValue.textContent = this.value + '%';
            // Update CSS variable for slider animation
            this.style.setProperty('--value', this.value + '%');
            updatePreviewPanel();
        });

        musicVolumeRange.addEventListener('input', function() {
            musicVolumeValue.textContent = this.value + '%';
            // Update CSS variable for slider animation
            this.style.setProperty('--value', this.value + '%');
            updatePreviewPanel();
        });

        // Voice selector
        voiceSelector.addEventListener('change', updatePreviewPanel);

        // Music selector
        musicSelector.addEventListener('change', updatePreviewPanel);

        // Question timing radios
        questionTimingRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                handleQuestionTimingChange();
                updatePreviewPanel();
            });
        });

        // Question type checkboxes (limit to 2)
        const checkboxes = document.querySelectorAll('.question-type');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', handleQuestionTypeChange);
        });

        // Voice selector - handle "Add Voice" option
        voiceSelector.addEventListener('change', handleVoiceSelectorChange);

        // Save voice button in modal
        saveVoiceBtn.addEventListener('click', handleSaveCustomVoice);

        // Delete voice button
        if (deleteVoiceBtn) {
            deleteVoiceBtn.addEventListener('click', handleDeleteCustomVoice);
        }
    }

    /**
     * Handle voice selector change - show modal for "Add Voice"
     */
    function handleVoiceSelectorChange() {
        if (voiceSelector.value === 'add-voice') {
            // Show the modal
            addVoiceModal.show();

            // Reset to previous selection temporarily
            const previousValue = voiceSelector.dataset.previousValue || 'Rachel';
            voiceSelector.value = previousValue;
        } else {
            // Store current value as previous
            voiceSelector.dataset.previousValue = voiceSelector.value;
            updatePreviewPanel();
            updateDeleteButtonVisibility();
        }
    }

    /**
     * Update delete button visibility based on selected voice
     */
    function updateDeleteButtonVisibility() {
        if (!deleteVoiceBtn) return;

        const selectedValue = voiceSelector.value;
        const isCustomVoice = selectedValue.startsWith('custom_');

        if (isCustomVoice) {
            deleteVoiceBtn.style.display = 'inline-block';
        } else {
            deleteVoiceBtn.style.display = 'none';
        }
    }

    /**
     * Handle deleting a custom voice
     */
    function handleDeleteCustomVoice() {
        const selectedValue = voiceSelector.value;

        // Only allow deleting custom voices
        if (!selectedValue.startsWith('custom_')) {
            showToast('Cannot delete default voices', 'warning');
            return;
        }

        const selectedOption = voiceSelector.options[voiceSelector.selectedIndex];
        const voiceName = selectedOption.textContent;

        // Confirm deletion
        if (!confirm(`Are you sure you want to delete the custom voice "${voiceName}"?`)) {
            return;
        }

        // Remove from custom voices array
        customVoices = customVoices.filter(v => v.value !== selectedValue);

        // Remove option from dropdown
        selectedOption.remove();

        // Select default voice
        voiceSelector.value = 'Rachel';
        voiceSelector.dataset.previousValue = 'Rachel';

        // Update UI
        updatePreviewPanel();
        updateDeleteButtonVisibility();

        // Show success message
        showToast('Custom voice deleted successfully!', 'success');

        // Save settings to clear from database
        saveSettings();
    }

    /**
     * Handle saving custom voice from modal
     */
    function handleSaveCustomVoice() {
        const form = document.getElementById('addVoiceForm');

        // Validate form
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const name = modalVoiceName.value.trim();
        const voiceId = modalVoiceId.value.trim();
        let avatarUrl = modalAvatarUrl.value.trim();

        // Automatically add lip sync support to avatar URL if not present
        avatarUrl = ensureLipSyncSupport(avatarUrl);

        // Create custom voice object
        const customVoice = {
            name: name,
            voiceId: voiceId,
            avatarUrl: avatarUrl,
            value: 'custom_' + Date.now() // Unique identifier
        };

        // Add to custom voices array
        customVoices.push(customVoice);

        // Add option to dropdown (before "Add Voice" option)
        const addVoiceOption = document.getElementById('addVoiceOption');
        const newOption = document.createElement('option');
        newOption.value = customVoice.value;
        newOption.textContent = name;
        newOption.dataset.voiceId = voiceId;
        newOption.dataset.avatarUrl = avatarUrl;
        voiceSelector.insertBefore(newOption, addVoiceOption);

        // Select the new voice
        voiceSelector.value = customVoice.value;
        voiceSelector.dataset.previousValue = customVoice.value;

        // Clear form
        form.reset();

        // Close modal
        addVoiceModal.hide();

        // Update preview
        updatePreviewPanel();
        updateDeleteButtonVisibility();

        // Show success message
        showToast('Custom voice added successfully!', 'success');

        // Save settings to database immediately
        saveSettings();
    }

    /**
     * Handle question timing change - disable question types if "No Questions" or "After the Story" is selected
     */
    function handleQuestionTimingChange() {
        const selectedTiming = document.querySelector('input[name="questionTiming"]:checked');
        const timingValue = selectedTiming ? selectedTiming.value : 'none';
        const shouldDisable = timingValue === 'none' || timingValue === 'after';

        // Requery to ensure we have the latest elements (in case DOM wasn't ready earlier)
        const checkboxes = document.querySelectorAll('.question-type');

        checkboxes.forEach(checkbox => {
            const checkboxContainer = checkbox.closest('.custom-checkbox');

            if (shouldDisable) {
                // Disable all question type checkboxes when "No Questions" or "After" is selected
                checkbox.disabled = true;
                if (checkboxContainer) {
                    checkboxContainer.classList.add('disabled');
                }
            } else {
                // Re-enable based on the 2-selection limit for 'during' and 'both'
                const checkedBoxes = document.querySelectorAll('.question-type:checked');
                const maxAllowed = 2;

                if (!checkbox.checked) {
                    checkbox.disabled = checkedBoxes.length >= maxAllowed;
                    if (checkboxContainer) {
                        if (checkedBoxes.length >= maxAllowed) {
                            checkboxContainer.classList.add('disabled');
                        } else {
                            checkboxContainer.classList.remove('disabled');
                        }
                    }
                } else {
                    // Checked boxes should always be enabled (not disabled)
                    checkbox.disabled = false;
                    if (checkboxContainer) {
                        checkboxContainer.classList.remove('disabled');
                    }
                }
            }
        });
    }

    /**
     * Handle question type checkbox changes (max 2 selections)
     */
    function handleQuestionTypeChange() {
        const checkedBoxes = document.querySelectorAll('.question-type:checked');
        const maxAllowed = 2;

        if (checkedBoxes.length > maxAllowed) {
            // Uncheck the current checkbox that exceeded the limit
            this.checked = false;
            showToast('Maximum 2 question types allowed', 'warning');
            return;
        }

        // Requery to ensure we have the latest elements
        const checkboxes = document.querySelectorAll('.question-type');

        // Enable/disable unchecked boxes based on limit
        checkboxes.forEach(checkbox => {
            const checkboxContainer = checkbox.closest('.custom-checkbox');
            if (!checkbox.checked) {
                checkbox.disabled = checkedBoxes.length >= maxAllowed;
                if (checkboxContainer) {
                    if (checkedBoxes.length >= maxAllowed) {
                        checkboxContainer.classList.add('disabled');
                    } else {
                        checkboxContainer.classList.remove('disabled');
                    }
                }
            }
        });

        updatePreviewPanel();
    }

    /**
     * Load settings from server
     */
    async function loadSettings() {
        try {
            const response = await fetch('/source/handlers/get_settings.php');
            const data = await response.json();

            if (data.success) {
                populateSettings(data.settings);
                console.log('Settings loaded successfully', data.settings);
            } else {
                console.error('Failed to load settings:', data.error);
                showToast('Failed to load settings', 'error');
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            showToast('Error loading settings', 'error');
        }
    }

    /**
     * Populate UI with settings data
     */
    function populateSettings(settings) {
        // Voice mode
        if (settings.voice_mode) {
            let voiceValue = settings.voice_mode;

            // Map old voice_mode values to actual voice names
            if (voiceValue === 'teacher' || voiceValue === 'ai-cheerful' || voiceValue === 'ai-gentle' || voiceValue === 'ai-engaging') {
                voiceValue = 'Rachel';
            }

            // Check if it's a custom voice
            if (voiceValue.startsWith('custom_') && settings.custom_voice_id && settings.custom_voice_name) {
                // Add the custom voice to the dropdown if it doesn't exist
                let existingOption = voiceSelector.querySelector(`option[value="${voiceValue}"]`);

                if (!existingOption) {
                    // Ensure avatar URL has lip sync support
                    const enhancedAvatarUrl = ensureLipSyncSupport(settings.custom_avatar_url || '');

                    // Create and add the custom voice option
                    const addVoiceOption = document.getElementById('addVoiceOption');
                    const newOption = document.createElement('option');
                    newOption.value = voiceValue;
                    newOption.textContent = settings.custom_voice_name;
                    newOption.dataset.voiceId = settings.custom_voice_id;
                    newOption.dataset.avatarUrl = enhancedAvatarUrl;
                    voiceSelector.insertBefore(newOption, addVoiceOption);

                    // Add to custom voices array
                    customVoices.push({
                        name: settings.custom_voice_name,
                        voiceId: settings.custom_voice_id,
                        avatarUrl: enhancedAvatarUrl,
                        value: voiceValue
                    });
                }
            }

            voiceSelector.value = voiceValue;
            voiceSelector.dataset.previousValue = voiceValue;
        }

        // Narration volume
        if (settings.narration_volume !== undefined) {
            const volumePercent = Math.round(settings.narration_volume * 100);
            narrationVolumeRange.value = volumePercent;
            narrationVolumeValue.textContent = volumePercent + '%';
            // Update CSS variable for slider animation
            narrationVolumeRange.style.setProperty('--value', volumePercent + '%');
        }

        // Background music
        if (settings.background_music !== undefined) {
            musicSelector.value = settings.background_music;
        }

        // Music volume
        if (settings.music_volume !== undefined) {
            const musicVolumePercent = Math.round(settings.music_volume * 100);
            musicVolumeRange.value = musicVolumePercent;
            musicVolumeValue.textContent = musicVolumePercent + '%';
            // Update CSS variable for slider animation
            musicVolumeRange.style.setProperty('--value', musicVolumePercent + '%');
        }

        // Question timing
        if (settings.question_timing) {
            const timingRadio = document.getElementById(getQuestionTimingId(settings.question_timing));
            if (timingRadio) {
                timingRadio.checked = true;
            }
        }

        // Question types
        if (settings.question_types) {
            let questionTypes = [];
            try {
                questionTypes = typeof settings.question_types === 'string'
                    ? JSON.parse(settings.question_types)
                    : settings.question_types;
            } catch (e) {
                console.error('Error parsing question types:', e);
            }

            // Uncheck all first
            const checkboxes = document.querySelectorAll('.question-type');
            checkboxes.forEach(cb => cb.checked = false);

            // Check the saved types
            questionTypes.forEach(type => {
                const checkbox = document.querySelector(`.question-type[value="${type}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });

            // Update disabled state based on both timing and selection count
            handleQuestionTimingChange();
            if (checkboxes.length > 0) {
                handleQuestionTypeChange.call(checkboxes[0]);
            }
        } else {
            // No saved question types, still check timing to disable if needed
            handleQuestionTimingChange();
        }

        updatePreviewPanel();
        updateDeleteButtonVisibility();
    }

    /**
     * Get radio button ID from question timing value
     */
    function getQuestionTimingId(timing) {
        const map = {
            'none': 'noneQuestions',
            'during': 'duringStory',
            'after': 'afterStory',
            'both': 'bothTiming'
        };
        return map[timing] || 'afterStory';
    }

    /**
     * Save settings to server
     */
    async function saveSettings() {
        // Disable button during save
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            // Gather form data
            const formData = new FormData();

            // Voice settings
            const selectedVoice = voiceSelector.value;
            formData.append('voice_mode', selectedVoice);

            // If a custom voice is selected, include its details
            if (selectedVoice.startsWith('custom_')) {
                const selectedOption = voiceSelector.options[voiceSelector.selectedIndex];
                formData.append('custom_voice_name', selectedOption.textContent);
                formData.append('custom_voice_id', selectedOption.dataset.voiceId || '');
                formData.append('custom_avatar_url', selectedOption.dataset.avatarUrl || '');
            } else {
                // Clear custom voice fields for non-custom voices
                formData.append('custom_voice_name', '');
                formData.append('custom_voice_id', '');
                formData.append('custom_avatar_url', '');
            }

            // Volume settings (convert percentage to 0-1 range)
            const narrationVolume = narrationVolumeRange.value / 100;
            formData.append('narration_volume', narrationVolume);

            const musicVolume = musicVolumeRange.value / 100;
            formData.append('music_volume', musicVolume);

            // Music selection
            formData.append('background_music', musicSelector.value);

            // Question timing
            const selectedTiming = document.querySelector('input[name="questionTiming"]:checked');
            formData.append('question_timing', selectedTiming ? selectedTiming.value : 'after');

            // Question types (collect checked checkboxes)
            const checkedTypes = [];
            const checkboxes = document.querySelectorAll('.question-type');
            checkboxes.forEach(cb => {
                if (cb.checked) {
                    checkedTypes.push(cb.value);
                }
            });
            formData.append('question_types', JSON.stringify(checkedTypes));

            // Send to server
            const response = await fetch('/source/handlers/save_settings.php', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                showToast('Settings saved successfully!', 'success');
                console.log('Settings saved:', data.settings);
            } else {
                showToast('Failed to save settings: ' + data.error, 'error');
                console.error('Save failed:', data.error);
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            showToast('Error saving settings', 'error');
        } finally {
            // Re-enable button
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Settings';
        }
    }

    /**
     * Reset settings to defaults
     */
    function resetToDefaults() {
        // Create custom confirmation modal with better design
        showResetConfirmation();
    }

    /**
     * Show simple confirmation modal for reset
     */
    function showResetConfirmation() {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'reset-modal-overlay';
        overlay.innerHTML = `
            <div class="reset-modal">
                <h3 class="reset-modal-title">Reset to Default Settings?</h3>
                <p class="reset-modal-message">
                    This will reset all your settings to their default values.
                </p>
                <div class="reset-modal-actions">
                    <button class="reset-modal-btn reset-modal-btn-cancel" onclick="closeResetModal()">
                        Cancel
                    </button>
                    <button class="reset-modal-btn reset-modal-btn-confirm" onclick="confirmReset()">
                        Yes, Reset
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Show modal
        setTimeout(() => {
            overlay.classList.add('active');
        }, 10);
    }

    /**
     * Close reset confirmation modal
     */
    window.closeResetModal = function() {
        const overlay = document.querySelector('.reset-modal-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.remove();
            }, 300);
        }
    };

    /**
     * Confirm and execute reset
     */
    window.confirmReset = function() {
        // Close modal
        closeResetModal();

        // Reset all fields to defaults
        voiceSelector.value = 'Rachel';
        voiceSelector.dataset.previousValue = 'Rachel';

        // Voice narration at 50%
        narrationVolumeRange.value = 50;
        narrationVolumeValue.textContent = '50%';
        narrationVolumeRange.style.setProperty('--value', '50%');

        // No music selected
        musicSelector.value = '';

        // Music volume at 50%
        musicVolumeRange.value = 50;
        musicVolumeValue.textContent = '50%';
        musicVolumeRange.style.setProperty('--value', '50%');

        // Reset question timing to "none" (no questions)
        const noneQuestionsRadio = document.getElementById('noneQuestions');
        if (noneQuestionsRadio) {
            noneQuestionsRadio.checked = true;
        }

        // Reset question types (uncheck all)
        const checkboxes = document.querySelectorAll('.question-type');
        checkboxes.forEach((cb) => {
            cb.checked = false;
            cb.disabled = false;
            const container = cb.closest('.custom-checkbox');
            if (container) {
                container.classList.remove('disabled');
            }
        });

        // Update disabled state based on timing (should disable all since we reset to "none")
        handleQuestionTimingChange();

        updatePreviewPanel();
        updateDeleteButtonVisibility();

        // Show success notification
        showToast('Settings reset to defaults successfully!', 'success');
    };

    /**
     * Update the preview panel with current selections
     */
    function updatePreviewPanel() {
        // Voice preview
        const voiceText = voiceSelector.options[voiceSelector.selectedIndex].text;
        document.getElementById('voicePreviewText').textContent = voiceText;

        // Narration volume preview
        const narrationVolText = 'Narration: ' + narrationVolumeRange.value + '%';
        document.getElementById('narrationVolumePreviewText').textContent = narrationVolText;

        // Music preview
        const musicText = musicSelector.value
            ? musicSelector.options[musicSelector.selectedIndex].text + ' (' + musicVolumeRange.value + '%)'
            : 'No Music';
        document.getElementById('musicPreviewText').textContent = musicText;

        // Question types preview
        const checkedCount = document.querySelectorAll('.question-type:checked').length;
        const questionText = checkedCount > 0
            ? checkedCount + ' Question Type' + (checkedCount !== 1 ? 's' : '') + ' Selected'
            : 'No Question Types Selected';
        document.getElementById('questionPreviewText').textContent = questionText;
    }

    /**
     * Ensure avatar URL has lip sync support morphTargets
     */
    function ensureLipSyncSupport(avatarUrl) {
        if (!avatarUrl) return avatarUrl;

        // Check if it's a ReadyPlayerMe URL
        if (!avatarUrl.includes('readyplayer.me')) {
            return avatarUrl;
        }

        // Check if morphTargets parameter already exists
        if (avatarUrl.includes('morphTargets')) {
            return avatarUrl;
        }

        // Add morphTargets parameter for lip sync support
        const separator = avatarUrl.includes('?') ? '&' : '?';
        const enhancedUrl = avatarUrl + separator + 'morphTargets=ARKit,Oculus Visemes';

        console.log('✅ Added lip sync support to avatar URL');
        return enhancedUrl;
    }

    /**
     * Show notification using the notification system
     */
    function showToast(message, type = 'info') {
        // Use the global notification system from notification-system.js
        if (typeof notificationSystem !== 'undefined') {
            switch(type) {
                case 'success':
                    notificationSystem.success(message);
                    break;
                case 'error':
                    notificationSystem.error(message);
                    break;
                case 'warning':
                    notificationSystem.warning(message);
                    break;
                default:
                    notificationSystem.info(message);
            }
        }
    }

    // Audio preview functionality
    let currentVoicePreview = null;
    let currentMusicPreview = null;
    let isVoicePlaying = false;
    let isMusicPlaying = false;

    // Voice preview file paths
    const VOICE_PREVIEW_PATHS = {
        'Rachel': '../../../public/files/voice-previews/rachel-preview.mp3',
        'Amara': '../../../public/files/voice-previews/amara-preview.mp3',
        'Lily': '../../../public/files/voice-previews/lily-preview.mp3',
        'Rod': '../../../public/files/voice-previews/rod-preview.mp3',
        'Aaron': '../../../public/files/voice-previews/aaron-preview.mp3'
    };

    // Music preview file paths
    const MUSIC_PREVIEW_PATHS = {
        'playful.mp3': '../../../public/files/music/playful.mp3',
        'adventure.mp3': '../../../public/files/music/adventure.mp3',
        'adventure_2.mp3': '../../../public/files/music/adventure_2.mp3',
        'magical.mp3': '../../../public/files/music/magical.mp3'
    };

    // Make functions globally available for inline onclick handlers
    window.previewVoice = function() {
        const selectedVoice = voiceSelector.value;
        const previewBtn = document.querySelector('.voice-selection .preview-voice-btn');

        if (isVoicePlaying) {
            stopVoicePreview();
            return;
        }

        if (!selectedVoice || selectedVoice === 'add-voice') {
            showToast('Please select a voice first', 'warning');
            return;
        }

        const voicePreviewPath = VOICE_PREVIEW_PATHS[selectedVoice];

        if (!voicePreviewPath) {
            // For custom voices
            showToast('Preview not available for custom voices', 'info');
            return;
        }

        try {
            currentVoicePreview = new Audio(voicePreviewPath);
            currentVoicePreview.volume = narrationVolumeRange.value / 100;

            // Update volume when slider changes during preview
            const volumeUpdateHandler = () => {
                if (currentVoicePreview) {
                    currentVoicePreview.volume = narrationVolumeRange.value / 100;
                }
            };
            narrationVolumeRange.addEventListener('input', volumeUpdateHandler);

            currentVoicePreview.addEventListener('ended', () => {
                narrationVolumeRange.removeEventListener('input', volumeUpdateHandler);
                stopVoicePreview();
            }, { once: true });

            currentVoicePreview.addEventListener('error', (e) => {
                console.error('Voice preview error:', e);
                narrationVolumeRange.removeEventListener('input', volumeUpdateHandler);
                stopVoicePreview();
                showToast('Failed to play voice preview', 'error');
            }, { once: true });

            currentVoicePreview.play();
            isVoicePlaying = true;

            // Update button state
            if (previewBtn) {
                previewBtn.classList.add('playing');
                previewBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Preview<div class="preview-indicator"></div>';
            }

            console.log('Playing voice preview:', selectedVoice);
        } catch (error) {
            console.error('Error playing voice preview:', error);
            stopVoicePreview();
            showToast('Error playing voice preview', 'error');
        }
    };

    function stopVoicePreview() {
        if (currentVoicePreview) {
            currentVoicePreview.pause();
            currentVoicePreview.currentTime = 0;
            currentVoicePreview = null;
        }

        isVoicePlaying = false;

        const previewBtn = document.querySelector('.voice-selection .preview-voice-btn');
        if (previewBtn) {
            previewBtn.classList.remove('playing');
            previewBtn.innerHTML = '<i class="fas fa-play"></i> Preview Voice<div class="preview-indicator"></div>';
        }
    }

    window.previewMusic = function() {
        const selectedMusic = musicSelector.value;
        const previewBtn = document.querySelector('.music-selection .preview-voice-btn');

        if (isMusicPlaying) {
            stopMusicPreview();
            return;
        }

        if (!selectedMusic) {
            showToast('Please select background music first', 'warning');
            return;
        }

        const musicPreviewPath = MUSIC_PREVIEW_PATHS[selectedMusic];

        if (!musicPreviewPath) {
            showToast('Preview not available for this music', 'info');
            return;
        }

        try {
            currentMusicPreview = new Audio(musicPreviewPath);
            currentMusicPreview.volume = musicVolumeRange.value / 100;
            currentMusicPreview.loop = false;

            // Update volume when slider changes during preview
            const volumeUpdateHandler = () => {
                if (currentMusicPreview) {
                    currentMusicPreview.volume = musicVolumeRange.value / 100;
                }
            };
            musicVolumeRange.addEventListener('input', volumeUpdateHandler);

            currentMusicPreview.addEventListener('ended', () => {
                musicVolumeRange.removeEventListener('input', volumeUpdateHandler);
                stopMusicPreview();
            }, { once: true });

            currentMusicPreview.addEventListener('error', (e) => {
                console.error('Music preview error:', e);
                musicVolumeRange.removeEventListener('input', volumeUpdateHandler);
                stopMusicPreview();
                showToast('Failed to play music preview', 'error');
            }, { once: true });

            currentMusicPreview.play();
            isMusicPlaying = true;

            // Update button state
            if (previewBtn) {
                previewBtn.classList.add('playing');
                previewBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Preview<div class="preview-indicator"></div>';
            }

            console.log('Playing music preview:', selectedMusic);
        } catch (error) {
            console.error('Error playing music preview:', error);
            stopMusicPreview();
            showToast('Error playing music preview', 'error');
        }
    };

    function stopMusicPreview() {
        if (currentMusicPreview) {
            currentMusicPreview.pause();
            currentMusicPreview.currentTime = 0;
            currentMusicPreview = null;
        }

        isMusicPlaying = false;

        const previewBtn = document.querySelector('.music-selection .preview-voice-btn');
        if (previewBtn) {
            previewBtn.classList.remove('playing');
            previewBtn.innerHTML = '<i class="fas fa-play"></i> Preview Music<div class="preview-indicator"></div>';
        }
    }

    // Stop any playing previews when voice or music selection changes
    voiceSelector.addEventListener('change', stopVoicePreview);
    musicSelector.addEventListener('change', stopMusicPreview);

    // Make stop functions available globally for cleanup
    window.stopVoicePreview = stopVoicePreview;
    window.stopMusicPreview = stopMusicPreview;

})();
