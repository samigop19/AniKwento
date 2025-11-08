/**
 * Load Default Settings for Story Dashboard
 * This script loads user's default settings and applies them to the story creation modal
 */

(function() {
    'use strict';

    // Global storage for user settings
    window.userSettings = {
        voice_mode: 'Rachel',
        custom_voice_id: null,
        custom_voice_name: null,
        custom_avatar_url: null,
        narration_volume: 0.5,
        background_music: '',
        music_volume: 0.1,
        question_timing: 'none',
        question_types: []
    };

    /**
     * Load user settings from server
     */
    async function loadUserSettings() {
        try {
            console.log('📥 Loading user default settings...');

            const response = await fetch('/source/handlers/get_settings.php');
            const data = await response.json();

            if (data.success && data.settings) {
                // Store settings globally
                window.userSettings = {
                    voice_mode: data.settings.voice_mode || 'Rachel',
                    custom_voice_id: data.settings.custom_voice_id,
                    custom_voice_name: data.settings.custom_voice_name,
                    custom_avatar_url: data.settings.custom_avatar_url,
                    narration_volume: parseFloat(data.settings.narration_volume) || 0.5,
                    background_music: data.settings.background_music || '',
                    music_volume: parseFloat(data.settings.music_volume) || 0.1,
                    question_timing: data.settings.question_timing || 'none',
                    question_types: parseQuestionTypes(data.settings.question_types)
                };

                console.log('✅ User settings loaded:', window.userSettings);

                // Apply settings to story creation modal
                applySettingsToModal();

                return true;
            } else {
                console.warn('⚠️ Using default settings');
                applySettingsToModal();
                return false;
            }
        } catch (error) {
            console.error('❌ Error loading user settings:', error);
            applySettingsToModal();
            return false;
        }
    }

    /**
     * Parse question types from JSON string or array
     */
    function parseQuestionTypes(questionTypes) {
        if (!questionTypes) return [];

        if (typeof questionTypes === 'string') {
            try {
                return JSON.parse(questionTypes);
            } catch (e) {
                console.error('Error parsing question types:', e);
                return [];
            }
        }

        return Array.isArray(questionTypes) ? questionTypes : [];
    }

    /**
     * Apply loaded settings to story creation modal
     */
    function applySettingsToModal() {
        console.log('🎨 Applying default settings to story creation modal...');

        // Apply voice selection
        applyVoiceSettings();

        // Apply question settings
        applyQuestionSettings();

        // Note: Music settings are not currently in the story modal,
        // but we keep them in userSettings for future use

        console.log('✅ Default settings applied to modal');
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
     * Apply voice settings to modal
     */
    function applyVoiceSettings() {
        const voiceSelect = document.getElementById('voiceOption');
        if (!voiceSelect) {
            console.warn('⚠️ Voice selector not found in modal');
            return;
        }

        // Check if custom voice is configured
        if (window.userSettings.custom_voice_id && window.userSettings.custom_voice_name) {
            // Add custom voice option if it doesn't exist
            let customOption = voiceSelect.querySelector('option[value="custom"]');
            if (!customOption) {
                customOption = document.createElement('option');
                customOption.value = 'custom';
                customOption.setAttribute('data-voice-id', window.userSettings.custom_voice_id);

                // Ensure avatar URL has lip sync support
                if (window.userSettings.custom_avatar_url) {
                    const enhancedAvatarUrl = ensureLipSyncSupport(window.userSettings.custom_avatar_url);
                    customOption.setAttribute('data-avatar-url', enhancedAvatarUrl);
                }
                voiceSelect.appendChild(customOption);
            }

            // Update custom option text
            customOption.textContent = window.userSettings.custom_voice_name + ' - Custom Storyteller';

            // Select custom voice
            voiceSelect.value = 'custom';
            console.log('✅ Custom voice applied:', window.userSettings.custom_voice_name);
        } else {
            // Select default voice
            const voiceValue = mapVoiceMode(window.userSettings.voice_mode);
            if (voiceSelect.querySelector(`option[value="${voiceValue}"]`)) {
                voiceSelect.value = voiceValue;
                console.log('✅ Default voice applied:', voiceValue);
            }
        }

        // Trigger change event to update UI
        voiceSelect.dispatchEvent(new Event('change'));
    }

    /**
     * Map voice_mode to actual voice option value
     */
    function mapVoiceMode(voiceMode) {
        // Map old voice mode values to actual voices
        const voiceMap = {
            'teacher': 'Rachel',
            'ai-cheerful': 'Amara',
            'ai-gentle': 'Lily',
            'ai-engaging': 'Rachel',
            'custom': 'custom'
        };

        return voiceMap[voiceMode] || voiceMode || 'Rachel';
    }

    /**
     * Apply question settings to modal
     */
    function applyQuestionSettings() {
        // Apply question timing
        const timingRadio = getQuestionTimingRadio(window.userSettings.question_timing);
        if (timingRadio) {
            timingRadio.checked = true;
            console.log('✅ Question timing applied:', window.userSettings.question_timing);
        }

        // Apply question types
        if (window.userSettings.question_types.length > 0) {
            // Uncheck all first
            const allCheckboxes = document.querySelectorAll('.question-type-checkbox');
            allCheckboxes.forEach(cb => cb.checked = false);

            // Check the saved types
            window.userSettings.question_types.forEach(typeValue => {
                const checkbox = document.getElementById(typeValue);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });

            console.log('✅ Question types applied:', window.userSettings.question_types);

            // Update the selection counter if it exists
            updateQuestionTypeCounter();
        }
    }

    /**
     * Get question timing radio button element
     */
    function getQuestionTimingRadio(timing) {
        const radioMap = {
            'none': 'noneQuestions',
            'during': 'duringStory',
            'after': 'afterStory',
            'both': 'bothTiming'
        };

        const radioId = radioMap[timing];
        return radioId ? document.getElementById(radioId) : null;
    }

    /**
     * Update question type counter display
     */
    function updateQuestionTypeCounter() {
        const counter = document.getElementById('selectionCounter');
        if (counter) {
            const checkedCount = document.querySelectorAll('.question-type-checkbox:checked').length;
            counter.textContent = `(Select up to 2) - ${checkedCount}/2 selected`;
        }
    }

    /**
     * Initialize on DOM ready
     */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadUserSettings);
    } else {
        // DOM already loaded
        loadUserSettings();
    }

    /**
     * Also reload settings when the create story modal is opened
     * This ensures fresh settings if the user just changed them
     */
    const createStoryModal = document.getElementById('createStoryModal');
    if (createStoryModal) {
        createStoryModal.addEventListener('show.bs.modal', function() {
            console.log('📋 Story creation modal opened - reloading settings...');
            loadUserSettings();
        });
    }

    // Export for external use
    window.loadUserSettings = loadUserSettings;
    window.getUserSettings = function() {
        return window.userSettings;
    };

})();
