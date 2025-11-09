/**
 * Voice Preview Module
 * Handles preview playback of storyteller voices
 */

(function() {
    let currentPreviewAudio = null;
    let isPlaying = false;

    // Sample text for voice preview
    const PREVIEW_TEXT = "Once upon a time, in a magical land filled with wonder, two curious children discovered an amazing adventure waiting just for them.";

    // R2 CDN base URL for voice previews
    const R2_VOICE_PREVIEW_BASE = 'https://anikwento-r2-public.thesamz20.workers.dev/voice-previews/';

    // Voice ID to filename mapping
    const VOICE_CACHE_FILES = {
        'Rachel': 'rachel-preview.mp3',
        'Amara': 'amara-preview.mp3',
        'Lily': 'lily-preview.mp3'
    };

    // Voice preview functionality
    document.addEventListener('DOMContentLoaded', function() {
        const voiceSelect = document.getElementById('voiceOption');
        const previewBtn = document.getElementById('voicePreviewBtn');
        const previewIcon = document.getElementById('voicePreviewIcon');
        const previewText = document.getElementById('voicePreviewText');

        // Show preview button when voice is selected
        if (voiceSelect) {
            voiceSelect.addEventListener('change', function() {
                if (this.value && previewBtn) {
                    previewBtn.style.display = 'inline-block';
                    stopPreview(); // Stop any playing preview when changing voice
                }
            });
        }

        // Handle preview button click
        if (previewBtn) {
            previewBtn.addEventListener('click', async function() {
                const selectedVoice = voiceSelect.value;

                if (!selectedVoice) {
                    alert('Please select a voice first');
                    return;
                }

                if (isPlaying) {
                    // Stop preview
                    stopPreview();
                } else {
                    // Play preview
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
            // Update button to loading state
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

            // Check if this is a custom voice (starts with 'custom_')
            if (voiceName.startsWith('custom_')) {
                // Get the selected option to access preview URL
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
                // Handle default voices
                const cacheFile = VOICE_CACHE_FILES[voiceName];

                if (cacheFile) {
                    // Use R2 CDN URL for voice previews
                    const r2Url = R2_VOICE_PREVIEW_BASE + cacheFile;

                    try {
                        // Check if cached file exists on R2
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
                    // No cache file defined, generate on-the-fly
                    if (typeof TTSIntegration === 'undefined') {
                        throw new Error('TTS Integration not loaded');
                    }
                    audioSource = await TTSIntegration.generateSpeech(PREVIEW_TEXT, voiceName);
                }
            }

            // Create and play audio
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

            // Update button to stop state
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

            // Show user-friendly error message
            if (typeof notificationSystem !== 'undefined') {
                notificationSystem.error('Failed to load voice preview. Please check your API key and try again.');
            } else {
                alert('Failed to load voice preview. Please check your API key and try again.');
            }
        }
    }

    async function generateAndCachePreview(voiceName, cachePath) {
        console.log(`🔄 Generating preview for ${voiceName} and caching...`);

        // Generate preview audio using TTS Integration
        if (typeof TTSIntegration === 'undefined') {
            throw new Error('TTS Integration not loaded');
        }

        const audioDataUrl = await TTSIntegration.generateSpeech(PREVIEW_TEXT, voiceName);

        // Try to save to server cache
        try {
            // Convert base64 to blob
            const response = await fetch(audioDataUrl);
            const blob = await response.blob();

            // Create form data to send to server
            const formData = new FormData();
            formData.append('audio', blob, VOICE_CACHE_FILES[voiceName]);
            formData.append('voice_name', voiceName);

            // Send to server to save
            await fetch('/source/handlers/save_voice_preview.php', {
                method: 'POST',
                body: formData
            });

            console.log(`💾 Preview cached successfully for ${voiceName}`);

            // Return the cache path for immediate use
            return cachePath;
        } catch (saveError) {
            console.warn('⚠️ Could not cache preview to server, using data URL:', saveError);
            // Return the data URL if caching fails
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

        // Reset button to play state
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

    // Make stopPreview available globally for cleanup
    window.stopVoicePreview = stopPreview;
})();
