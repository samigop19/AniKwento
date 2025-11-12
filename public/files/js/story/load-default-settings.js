

(function() {
    'use strict';

    
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

    
    window.customVoices = [];

    
    async function loadCustomVoices() {
        try {
            console.log('📥 Loading custom voices...');

            const response = await fetch('/source/handlers/get_custom_voices.php');
            const data = await response.json();

            if (data.success) {
                window.customVoices = data.custom_voices || [];
                console.log('✅ Custom voices loaded:', window.customVoices);
                return true;
            } else {
                console.warn('⚠️ No custom voices found');
                return false;
            }
        } catch (error) {
            console.error('❌ Error loading custom voices:', error);
            return false;
        }
    }

    
    async function loadUserSettings() {
        try {
            console.log('📥 Loading user default settings...');

            
            await loadCustomVoices();

            const response = await fetch('/source/handlers/get_settings.php');
            const data = await response.json();

            if (data.success && data.settings) {
                
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

    
    function applySettingsToModal() {
        console.log('🎨 Applying default settings to story creation modal...');

        
        applyVoiceSettings();

        
        applyQuestionSettings();

        
        

        console.log('✅ Default settings applied to modal');
    }

    
    function ensureLipSyncSupport(avatarUrl) {
        if (!avatarUrl) return avatarUrl;

        
        if (!avatarUrl.includes('readyplayer.me')) {
            return avatarUrl;
        }

        
        if (avatarUrl.includes('morphTargets')) {
            return avatarUrl;
        }

        
        const separator = avatarUrl.includes('?') ? '&' : '?';
        const enhancedUrl = avatarUrl + separator + 'morphTargets=ARKit,Oculus Visemes';

        console.log('✅ Added lip sync support to avatar URL');
        return enhancedUrl;
    }

    
    function applyVoiceSettings() {
        const voiceSelect = document.getElementById('voiceOption');
        if (!voiceSelect) {
            console.warn('⚠️ Voice selector not found in modal');
            return;
        }

        
        const existingCustomOptions = voiceSelect.querySelectorAll('option[value^="custom_"]');
        existingCustomOptions.forEach(opt => opt.remove());

        
        if (window.customVoices && window.customVoices.length > 0) {
            window.customVoices.forEach(voice => {
                const customOption = document.createElement('option');
                customOption.value = voice.voice_key;
                customOption.textContent = voice.voice_name + ' - Custom Storyteller';
                customOption.setAttribute('data-voice-id', voice.voice_id);

                
                if (voice.avatar_url) {
                    const enhancedAvatarUrl = ensureLipSyncSupport(voice.avatar_url);
                    customOption.setAttribute('data-avatar-url', enhancedAvatarUrl);
                }

                
                if (voice.preview_url) {
                    customOption.setAttribute('data-preview-url', voice.preview_url);
                }

                voiceSelect.appendChild(customOption);
            });
        }

        
        const voiceValue = mapVoiceMode(window.userSettings.voice_mode);

        
        if (voiceValue.startsWith('custom_')) {
            
            if (voiceSelect.querySelector(`option[value="${voiceValue}"]`)) {
                voiceSelect.value = voiceValue;
                console.log('✅ Custom voice applied:', voiceValue);
            } else {
                
                voiceSelect.value = 'Rachel';
                console.warn('⚠️ Custom voice not found, using default');
            }
        } else {
            
            if (voiceSelect.querySelector(`option[value="${voiceValue}"]`)) {
                voiceSelect.value = voiceValue;
                console.log('✅ Default voice applied:', voiceValue);
            }
        }

        
        voiceSelect.dispatchEvent(new Event('change'));
    }

    
    function mapVoiceMode(voiceMode) {
        
        const voiceMap = {
            'teacher': 'Rachel',
            'ai-cheerful': 'Amara',
            'ai-gentle': 'Lily',
            'ai-engaging': 'Rachel',
            'custom': 'custom'
        };

        return voiceMap[voiceMode] || voiceMode || 'Rachel';
    }

    
    function applyQuestionSettings() {
        
        const timingRadio = getQuestionTimingRadio(window.userSettings.question_timing);
        if (timingRadio) {
            timingRadio.checked = true;
            console.log('✅ Question timing applied:', window.userSettings.question_timing);
        }

        
        if (window.userSettings.question_types.length > 0) {
            
            const allCheckboxes = document.querySelectorAll('.question-type-checkbox');
            allCheckboxes.forEach(cb => cb.checked = false);

            
            window.userSettings.question_types.forEach(typeValue => {
                const checkbox = document.getElementById(typeValue);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });

            console.log('✅ Question types applied:', window.userSettings.question_types);

            
            updateQuestionTypeCounter();
        }
    }

    
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

    
    function updateQuestionTypeCounter() {
        const counter = document.getElementById('selectionCounter');
        if (counter) {
            const checkedCount = document.querySelectorAll('.question-type-checkbox:checked').length;
            counter.textContent = `(Select up to 2) - ${checkedCount}/2 selected`;
        }
    }

    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadUserSettings);
    } else {
        
        loadUserSettings();
    }

    
    const createStoryModal = document.getElementById('createStoryModal');
    if (createStoryModal) {
        createStoryModal.addEventListener('show.bs.modal', function() {
            console.log('📋 Story creation modal opened - reloading settings...');
            loadUserSettings();
        });
    }

    
    window.loadUserSettings = loadUserSettings;
    window.getUserSettings = function() {
        return window.userSettings;
    };

})();
