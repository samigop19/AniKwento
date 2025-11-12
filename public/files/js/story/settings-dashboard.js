

(function() {
    'use strict';

    
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

    
    const addVoiceModal = new bootstrap.Modal(document.getElementById('addVoiceModal'));
    const saveVoiceBtn = document.getElementById('saveVoiceBtn');
    const modalVoiceName = document.getElementById('modalVoiceName');
    const modalVoiceId = document.getElementById('modalVoiceId');
    const modalAvatarUrl = document.getElementById('modalAvatarUrl');

    
    let customVoices = [];

    
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Settings Dashboard initialized');

        
        narrationVolumeRange.style.setProperty('--value', narrationVolumeRange.value + '%');
        musicVolumeRange.style.setProperty('--value', musicVolumeRange.value + '%');

        
        setupEventListeners();

        
        handleQuestionTimingChange();

        
        loadCustomVoices().then(() => {
            
            loadSettings();

            
            updatePreviewPanel();
        });
    });

    
    function setupEventListeners() {
        
        saveBtn.addEventListener('click', saveSettings);

        
        resetBtn.addEventListener('click', resetToDefaults);

        
        narrationVolumeRange.addEventListener('input', function() {
            narrationVolumeValue.textContent = this.value + '%';
            
            this.style.setProperty('--value', this.value + '%');
            updatePreviewPanel();
        });

        musicVolumeRange.addEventListener('input', function() {
            musicVolumeValue.textContent = this.value + '%';
            
            this.style.setProperty('--value', this.value + '%');
            updatePreviewPanel();
        });

        
        voiceSelector.addEventListener('change', updatePreviewPanel);

        
        musicSelector.addEventListener('change', updatePreviewPanel);

        
        questionTimingRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                handleQuestionTimingChange();
                updatePreviewPanel();
            });
        });

        
        const checkboxes = document.querySelectorAll('.question-type');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', handleQuestionTypeChange);
        });

        
        voiceSelector.addEventListener('change', handleVoiceSelectorChange);

        
        saveVoiceBtn.addEventListener('click', handleSaveCustomVoice);

        
        if (deleteVoiceBtn) {
            deleteVoiceBtn.addEventListener('click', handleDeleteCustomVoice);
        }
    }

    
    async function loadCustomVoices() {
        try {
            const response = await fetch('/source/handlers/get_custom_voices.php');
            const data = await response.json();

            if (data.success) {
                customVoices = data.custom_voices || [];
                console.log('Loaded custom voices:', customVoices);

                
                const addVoiceOption = document.getElementById('addVoiceOption');

                
                const existingCustomOptions = voiceSelector.querySelectorAll('option[value^="custom_"]');
                existingCustomOptions.forEach(opt => opt.remove());

                
                customVoices.forEach(voice => {
                    const newOption = document.createElement('option');
                    newOption.value = voice.voice_key;
                    newOption.textContent = voice.voice_name;
                    newOption.dataset.voiceId = voice.voice_id;
                    newOption.dataset.avatarUrl = voice.avatar_url || '';
                    newOption.dataset.previewUrl = voice.preview_url || '';
                    voiceSelector.insertBefore(newOption, addVoiceOption);
                });

                return true;
            } else {
                console.warn('Failed to load custom voices:', data.error);
                return false;
            }
        } catch (error) {
            console.error('Error loading custom voices:', error);
            return false;
        }
    }

    
    function handleVoiceSelectorChange() {
        if (voiceSelector.value === 'add-voice') {
            
            addVoiceModal.show();

            
            const previousValue = voiceSelector.dataset.previousValue || 'Rachel';
            voiceSelector.value = previousValue;
        } else {
            
            voiceSelector.dataset.previousValue = voiceSelector.value;
            updatePreviewPanel();
            updateDeleteButtonVisibility();
        }
    }

    
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

    
    async function handleDeleteCustomVoice() {
        const selectedValue = voiceSelector.value;

        
        if (!selectedValue.startsWith('custom_')) {
            showToast('Cannot delete default voices', 'warning');
            return;
        }

        const selectedOption = voiceSelector.options[voiceSelector.selectedIndex];
        const voiceName = selectedOption.textContent;

        
        if (!confirm(`Are you sure you want to delete the custom voice "${voiceName}"?`)) {
            return;
        }

        try {
            
            const formData = new FormData();
            formData.append('voice_key', selectedValue);

            const response = await fetch('/source/handlers/delete_custom_voice.php', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                
                customVoices = customVoices.filter(v => v.voice_key !== selectedValue);

                
                selectedOption.remove();

                
                voiceSelector.value = 'Rachel';
                voiceSelector.dataset.previousValue = 'Rachel';

                
                updatePreviewPanel();
                updateDeleteButtonVisibility();

                
                showToast('Custom voice deleted successfully!', 'success');

                
                saveSettings();
            } else {
                showToast('Failed to delete custom voice: ' + data.error, 'error');
            }
        } catch (error) {
            console.error('Error deleting custom voice:', error);
            showToast('Error deleting custom voice', 'error');
        }
    }

    
    async function handleSaveCustomVoice() {
        const form = document.getElementById('addVoiceForm');

        
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const name = modalVoiceName.value.trim();
        const voiceId = modalVoiceId.value.trim();
        let avatarUrl = modalAvatarUrl.value.trim();

        
        avatarUrl = ensureLipSyncSupport(avatarUrl);

        
        const customVoice = {
            name: name,
            voiceId: voiceId,
            avatarUrl: avatarUrl,
            value: 'custom_' + Date.now() 
        };

        
        saveVoiceBtn.disabled = true;
        saveVoiceBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating Preview...';

        try {
            
            const previewResult = await generateCustomVoicePreview(voiceId, customVoice.value);

            if (previewResult.success) {
                
                customVoice.previewUrl = previewResult.preview_url;

                showToast('Voice preview generated successfully!', 'success');
            } else {
                
                console.warn('Preview generation failed:', previewResult.error);
                showToast('Voice added but preview generation failed', 'warning');
            }
        } catch (error) {
            console.error('Error generating preview:', error);
            showToast('Voice added but preview generation failed', 'warning');
        }

        
        try {
            const saveFormData = new FormData();
            saveFormData.append('voice_key', customVoice.value);
            saveFormData.append('voice_name', name);
            saveFormData.append('voice_id', voiceId);
            saveFormData.append('avatar_url', avatarUrl);
            saveFormData.append('preview_url', customVoice.previewUrl || '');

            const saveResponse = await fetch('/source/handlers/save_custom_voice.php', {
                method: 'POST',
                body: saveFormData
            });

            const saveData = await saveResponse.json();

            if (saveData.success) {
                
                customVoices.push(customVoice);

                
                const addVoiceOption = document.getElementById('addVoiceOption');
                const newOption = document.createElement('option');
                newOption.value = customVoice.value;
                newOption.textContent = name;
                newOption.dataset.voiceId = voiceId;
                newOption.dataset.avatarUrl = avatarUrl;
                if (customVoice.previewUrl) {
                    newOption.dataset.previewUrl = customVoice.previewUrl;
                }
                voiceSelector.insertBefore(newOption, addVoiceOption);

                
                voiceSelector.value = customVoice.value;
                voiceSelector.dataset.previousValue = customVoice.value;

                
                form.reset();

                
                addVoiceModal.hide();

                
                saveVoiceBtn.disabled = false;
                saveVoiceBtn.innerHTML = '<i class="fas fa-save"></i> Save Voice';

                
                updatePreviewPanel();
                updateDeleteButtonVisibility();

                
                showToast('Custom voice added successfully!', 'success');

                
                saveSettings();
            } else {
                throw new Error(saveData.error || 'Failed to save custom voice');
            }
        } catch (error) {
            console.error('Error saving custom voice:', error);
            showToast('Error saving custom voice: ' + error.message, 'error');

            
            saveVoiceBtn.disabled = false;
            saveVoiceBtn.innerHTML = '<i class="fas fa-save"></i> Save Voice';
        }
    }

    
    async function generateCustomVoicePreview(voiceId, customVoiceKey) {
        try {
            const formData = new FormData();
            formData.append('voice_id', voiceId);
            formData.append('custom_voice_key', customVoiceKey);

            const response = await fetch('/source/handlers/generate_custom_voice_preview.php', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error generating custom voice preview:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    
    function handleQuestionTimingChange() {
        const selectedTiming = document.querySelector('input[name="questionTiming"]:checked');
        const timingValue = selectedTiming ? selectedTiming.value : 'none';
        const shouldDisable = timingValue === 'none' || timingValue === 'after';

        
        const checkboxes = document.querySelectorAll('.question-type');

        checkboxes.forEach(checkbox => {
            const checkboxContainer = checkbox.closest('.custom-checkbox');

            if (shouldDisable) {
                
                checkbox.disabled = true;
                if (checkboxContainer) {
                    checkboxContainer.classList.add('disabled');
                }
            } else {
                
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
                    
                    checkbox.disabled = false;
                    if (checkboxContainer) {
                        checkboxContainer.classList.remove('disabled');
                    }
                }
            }
        });
    }

    
    function handleQuestionTypeChange() {
        const checkedBoxes = document.querySelectorAll('.question-type:checked');
        const maxAllowed = 2;

        if (checkedBoxes.length > maxAllowed) {
            
            this.checked = false;
            showToast('Maximum 2 question types allowed', 'warning');
            return;
        }

        
        const checkboxes = document.querySelectorAll('.question-type');

        
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

    
    function populateSettings(settings) {
        
        if (settings.voice_mode) {
            let voiceValue = settings.voice_mode;

            
            if (voiceValue === 'teacher' || voiceValue === 'ai-cheerful' || voiceValue === 'ai-gentle' || voiceValue === 'ai-engaging') {
                voiceValue = 'Rachel';
            }

            
            
            voiceSelector.value = voiceValue;
            voiceSelector.dataset.previousValue = voiceValue;
        }

        
        if (settings.narration_volume !== undefined) {
            const volumePercent = Math.round(settings.narration_volume * 100);
            narrationVolumeRange.value = volumePercent;
            narrationVolumeValue.textContent = volumePercent + '%';
            
            narrationVolumeRange.style.setProperty('--value', volumePercent + '%');
        }

        
        if (settings.background_music !== undefined) {
            musicSelector.value = settings.background_music;
        }

        
        if (settings.music_volume !== undefined) {
            const musicVolumePercent = Math.round(settings.music_volume * 100);
            musicVolumeRange.value = musicVolumePercent;
            musicVolumeValue.textContent = musicVolumePercent + '%';
            
            musicVolumeRange.style.setProperty('--value', musicVolumePercent + '%');
        }

        
        if (settings.question_timing) {
            const timingRadio = document.getElementById(getQuestionTimingId(settings.question_timing));
            if (timingRadio) {
                timingRadio.checked = true;
            }
        }

        
        if (settings.question_types) {
            let questionTypes = [];
            try {
                questionTypes = typeof settings.question_types === 'string'
                    ? JSON.parse(settings.question_types)
                    : settings.question_types;
            } catch (e) {
                console.error('Error parsing question types:', e);
            }

            
            const checkboxes = document.querySelectorAll('.question-type');
            checkboxes.forEach(cb => cb.checked = false);

            
            questionTypes.forEach(type => {
                const checkbox = document.querySelector(`.question-type[value="${type}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });

            
            handleQuestionTimingChange();
            if (checkboxes.length > 0) {
                handleQuestionTypeChange.call(checkboxes[0]);
            }
        } else {
            
            handleQuestionTimingChange();
        }

        updatePreviewPanel();
        updateDeleteButtonVisibility();
    }

    
    function getQuestionTimingId(timing) {
        const map = {
            'none': 'noneQuestions',
            'during': 'duringStory',
            'after': 'afterStory',
            'both': 'bothTiming'
        };
        return map[timing] || 'afterStory';
    }

    
    async function saveSettings() {
        
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            
            const formData = new FormData();

            
            const selectedVoice = voiceSelector.value;
            formData.append('voice_mode', selectedVoice);

            
            if (selectedVoice.startsWith('custom_')) {
                const selectedOption = voiceSelector.options[voiceSelector.selectedIndex];
                formData.append('custom_voice_name', selectedOption.textContent);
                formData.append('custom_voice_id', selectedOption.dataset.voiceId || '');
                formData.append('custom_avatar_url', selectedOption.dataset.avatarUrl || '');
                formData.append('custom_voice_preview_url', selectedOption.dataset.previewUrl || '');
            } else {
                
                formData.append('custom_voice_name', '');
                formData.append('custom_voice_id', '');
                formData.append('custom_avatar_url', '');
                formData.append('custom_voice_preview_url', '');
            }

            
            const narrationVolume = narrationVolumeRange.value / 100;
            formData.append('narration_volume', narrationVolume);

            const musicVolume = musicVolumeRange.value / 100;
            formData.append('music_volume', musicVolume);

            
            formData.append('background_music', musicSelector.value);

            
            const selectedTiming = document.querySelector('input[name="questionTiming"]:checked');
            formData.append('question_timing', selectedTiming ? selectedTiming.value : 'after');

            
            const checkedTypes = [];
            const checkboxes = document.querySelectorAll('.question-type');
            checkboxes.forEach(cb => {
                if (cb.checked) {
                    checkedTypes.push(cb.value);
                }
            });
            formData.append('question_types', JSON.stringify(checkedTypes));

            
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
            
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Settings';
        }
    }

    
    function resetToDefaults() {
        
        showResetConfirmation();
    }

    
    function showResetConfirmation() {
        
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

        
        setTimeout(() => {
            overlay.classList.add('active');
        }, 10);
    }

    
    window.closeResetModal = function() {
        const overlay = document.querySelector('.reset-modal-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.remove();
            }, 300);
        }
    };

    
    window.confirmReset = function() {
        
        closeResetModal();

        
        voiceSelector.value = 'Rachel';
        voiceSelector.dataset.previousValue = 'Rachel';

        
        narrationVolumeRange.value = 50;
        narrationVolumeValue.textContent = '50%';
        narrationVolumeRange.style.setProperty('--value', '50%');

        
        musicSelector.value = '';

        
        musicVolumeRange.value = 50;
        musicVolumeValue.textContent = '50%';
        musicVolumeRange.style.setProperty('--value', '50%');

        
        const noneQuestionsRadio = document.getElementById('noneQuestions');
        if (noneQuestionsRadio) {
            noneQuestionsRadio.checked = true;
        }

        
        const checkboxes = document.querySelectorAll('.question-type');
        checkboxes.forEach((cb) => {
            cb.checked = false;
            cb.disabled = false;
            const container = cb.closest('.custom-checkbox');
            if (container) {
                container.classList.remove('disabled');
            }
        });

        
        handleQuestionTimingChange();

        updatePreviewPanel();
        updateDeleteButtonVisibility();

        
        showToast('Settings reset to defaults successfully!', 'success');
    };

    
    function updatePreviewPanel() {
        
        const voiceText = voiceSelector.options[voiceSelector.selectedIndex].text;
        document.getElementById('voicePreviewText').textContent = voiceText;

        
        const narrationVolText = 'Narration: ' + narrationVolumeRange.value + '%';
        document.getElementById('narrationVolumePreviewText').textContent = narrationVolText;

        
        const musicText = musicSelector.value
            ? musicSelector.options[musicSelector.selectedIndex].text + ' (' + musicVolumeRange.value + '%)'
            : 'No Music';
        document.getElementById('musicPreviewText').textContent = musicText;

        
        const checkedCount = document.querySelectorAll('.question-type:checked').length;
        const questionText = checkedCount > 0
            ? checkedCount + ' Question Type' + (checkedCount !== 1 ? 's' : '') + ' Selected'
            : 'No Question Types Selected';
        document.getElementById('questionPreviewText').textContent = questionText;
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

    
    function showToast(message, type = 'info') {
        
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

    
    let currentVoicePreview = null;
    let currentMusicPreview = null;
    let isVoicePlaying = false;
    let isMusicPlaying = false;

    // Voice preview file paths (using R2 CDN)
    const VOICE_PREVIEW_PATHS = {
        'Rachel': 'https://anikwento-r2-public.thesamz20.workers.dev/voice-previews/rachel-preview.mp3',
        'Amara': 'https://anikwento-r2-public.thesamz20.workers.dev/voice-previews/amara-preview.mp3',
        'Lily': 'https://anikwento-r2-public.thesamz20.workers.dev/voice-previews/lily-preview.mp3'
    };

    
    const MUSIC_PREVIEW_PATHS = {
        'playful.mp3': '../../../public/files/music/playful.mp3',
        'adventure.mp3': '../../../public/files/music/adventure.mp3',
        'adventure_2.mp3': '../../../public/files/music/adventure_2.mp3',
        'magical.mp3': '../../../public/files/music/magical.mp3'
    };

    
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

        
        let voicePreviewPath = VOICE_PREVIEW_PATHS[selectedVoice];

        
        if (!voicePreviewPath && selectedVoice.startsWith('custom_')) {
            const selectedOption = voiceSelector.options[voiceSelector.selectedIndex];
            voicePreviewPath = selectedOption.dataset.previewUrl;

            if (!voicePreviewPath) {
                showToast('Preview not available for this custom voice', 'info');
                return;
            }
        }

        if (!voicePreviewPath) {
            showToast('Preview not available', 'info');
            return;
        }

        try {
            currentVoicePreview = new Audio(voicePreviewPath);
            currentVoicePreview.volume = narrationVolumeRange.value / 100;

            
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

    
    voiceSelector.addEventListener('change', stopVoicePreview);
    musicSelector.addEventListener('change', stopMusicPreview);

    
    window.stopVoicePreview = stopVoicePreview;
    window.stopMusicPreview = stopMusicPreview;

})();
