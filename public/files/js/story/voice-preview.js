

(function() {
    let currentPreviewAudio = null;
    let isPlaying = false;

    
    const PREVIEW_TEXT = "Once upon a time, in a magical land filled with wonder, two curious children discovered an amazing adventure waiting just for them.";

    
    const R2_VOICE_PREVIEW_BASE = 'https:

    
    const VOICE_CACHE_FILES = {
        'Rachel': 'rachel-preview.mp3',
        'Amara': 'amara-preview.mp3',
        'Lily': 'lily-preview.mp3'
    };

    
    document.addEventListener('DOMContentLoaded', function() {
        const voiceSelect = document.getElementById('voiceOption');
        const previewBtn = document.getElementById('voicePreviewBtn');
        const previewIcon = document.getElementById('voicePreviewIcon');
        const previewText = document.getElementById('voicePreviewText');

        
        if (voiceSelect) {
            voiceSelect.addEventListener('change', function() {
                if (this.value && previewBtn) {
                    previewBtn.style.display = 'inline-block';
                    stopPreview(); 
                }
            });
        }

        
        if (previewBtn) {
            previewBtn.addEventListener('click', async function() {
                const selectedVoice = voiceSelect.value;

                if (!selectedVoice) {
                    alert('Please select a voice first');
                    return;
                }

                if (isPlaying) {
                    
                    stopPreview();
                } else {
                    
                    await playPreview(selectedVoice);
                }
            });
        }
    });

    async function playPreview(voiceName) {
        const previewBtn = document.getElementById('voicePreviewBtn');
        const previewIcon = document.getElementById('voicePreviewIcon');
        const previewText = document.getElementById('voicePreviewText');
        const voiceSelect = document.getElementById('voiceOption');

        try {
            
            if (previewIcon) {
                previewIcon.className = 'fas fa-spinner fa-spin';
            }
            if (previewText) {
                previewText.textContent = 'Loading...';
            }
            if (previewBtn) {
                previewBtn.disabled = true;
            }

            console.log(`🎤 Loading preview for ${voiceName} voice...`);

            let audioSource = null;

            
            if (voiceName.startsWith('custom_')) {
                
                const selectedOption = voiceSelect.options[voiceSelect.selectedIndex];
                const customPreviewUrl = selectedOption ? selectedOption.dataset.previewUrl : null;

                if (customPreviewUrl) {
                    console.log(`✅ Using custom voice preview URL`);
                    audioSource = customPreviewUrl;
                } else {
                    console.log(`⚠️ No preview URL found for custom voice`);
                    throw new Error('Preview not available for this custom voice');
                }
            } else {
                
                const cacheFile = VOICE_CACHE_FILES[voiceName];

                if (cacheFile) {
                    
                    const r2Url = R2_VOICE_PREVIEW_BASE + cacheFile;

                    try {
                        
                        const response = await fetch(r2Url);

                        if (response.ok) {
                            console.log(`✅ Loading cached preview for ${voiceName} from R2`);
                            audioSource = r2Url;
                        } else {
                            console.log(`⚠️ Cached file not found on R2, generating new preview...`);
                            audioSource = await generateAndCachePreview(voiceName, cacheFile);
                        }
                    } catch (fetchError) {
                        console.log(`⚠️ R2 fetch failed, generating new preview...`);
                        audioSource = await generateAndCachePreview(voiceName, cacheFile);
                    }
                } else {
                    
                    if (typeof TTSIntegration === 'undefined') {
                        throw new Error('TTS Integration not loaded');
                    }
                    audioSource = await TTSIntegration.generateSpeech(PREVIEW_TEXT, voiceName);
                }
            }

            
            currentPreviewAudio = new Audio();
            currentPreviewAudio.src = audioSource;
            currentPreviewAudio.volume = 0.8;

            currentPreviewAudio.addEventListener('ended', () => {
                stopPreview();
            }, { once: true });

            currentPreviewAudio.addEventListener('error', (e) => {
                console.error('Preview playback error:', e);
                stopPreview();
                alert('Failed to play voice preview. Please try again.');
            }, { once: true });

            await currentPreviewAudio.play();
            isPlaying = true;

            
            if (previewIcon) {
                previewIcon.className = 'fas fa-stop';
            }
            if (previewText) {
                previewText.textContent = 'Stop';
            }
            if (previewBtn) {
                previewBtn.disabled = false;
            }

            console.log(`✅ Playing ${voiceName} voice preview`);

        } catch (error) {
            console.error('❌ Voice preview error:', error);
            stopPreview();

            
            if (typeof notificationSystem !== 'undefined') {
                notificationSystem.error('Failed to load voice preview. Please check your API key and try again.');
            } else {
                alert('Failed to load voice preview. Please check your API key and try again.');
            }
        }
    }

    async function generateAndCachePreview(voiceName, cachePath) {
        console.log(`🔄 Generating preview for ${voiceName} and caching...`);

        
        if (typeof TTSIntegration === 'undefined') {
            throw new Error('TTS Integration not loaded');
        }

        const audioDataUrl = await TTSIntegration.generateSpeech(PREVIEW_TEXT, voiceName);

        
        try {
            
            const response = await fetch(audioDataUrl);
            const blob = await response.blob();

            
            const formData = new FormData();
            formData.append('audio', blob, VOICE_CACHE_FILES[voiceName]);
            formData.append('voice_name', voiceName);

            
            await fetch('/source/handlers/save_voice_preview.php', {
                method: 'POST',
                body: formData
            });

            console.log(`💾 Preview cached successfully for ${voiceName}`);

            
            return cachePath;
        } catch (saveError) {
            console.warn('⚠️ Could not cache preview to server, using data URL:', saveError);
            
            return audioDataUrl;
        }
    }

    function stopPreview() {
        if (currentPreviewAudio) {
            currentPreviewAudio.pause();
            currentPreviewAudio.currentTime = 0;
            currentPreviewAudio = null;
        }

        isPlaying = false;

        
        const previewIcon = document.getElementById('voicePreviewIcon');
        const previewText = document.getElementById('voicePreviewText');
        const previewBtn = document.getElementById('voicePreviewBtn');

        if (previewIcon) {
            previewIcon.className = 'fas fa-play';
        }
        if (previewText) {
            previewText.textContent = 'Preview';
        }
        if (previewBtn) {
            previewBtn.disabled = false;
        }

        console.log('⏹️ Voice preview stopped');
    }

    
    window.stopVoicePreview = stopPreview;
})();
