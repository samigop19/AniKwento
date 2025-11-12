// Preview Modal Script for StoryDashboard
document.addEventListener('DOMContentLoaded', async function() {
    const previewModal = document.getElementById('previewModal');
    const previewModalClose = document.getElementById('previewModalClose');
    const createStoryModal = document.getElementById('createStoryModal');

    // Music controls
    const previewMusicSelect = document.getElementById('previewMusicSelect');
    const previewMusicPlayBtn = document.getElementById('previewMusicPlayBtn');
    const playIcon = document.getElementById('playIcon');
    const pauseIcon = document.getElementById('pauseIcon');
    const playBtnText = document.getElementById('playBtnText');

    let previewAudio = null;

    // CRITICAL: Wait for user settings to load from database before initializing music
    console.log('⏳ Preview modal waiting for user settings...');
    await waitForUserSettingsToLoad();
    console.log('✅ User settings ready, initializing music selector');

    // Initialize music selector with user settings on page load
    initializeMusicFromSettings();

    /**
     * Wait for user settings to load from database
     * load-default-settings.js loads settings asynchronously, so we need to wait
     */
    async function waitForUserSettingsToLoad() {
        // Check if loadUserSettings function exists (from load-default-settings.js)
        if (typeof window.loadUserSettings === 'function') {
            console.log('📥 Loading user settings from database for preview modal...');
            await window.loadUserSettings();
            console.log('✅ User settings loaded:', window.userSettings);
        } else {
            console.warn('⚠️ loadUserSettings function not available, waiting for settings...');
            // Wait up to 3 seconds for settings to populate
            const maxWaitTime = 3000;
            const startTime = Date.now();
            while (!window.userSettings && (Date.now() - startTime) < maxWaitTime) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            if (window.userSettings) {
                console.log('✅ User settings available:', window.userSettings);
            } else {
                console.warn('⚠️ User settings not loaded after waiting');
            }
        }
    }

    /**
     * Initialize music selector with user settings from SettingsDashboard
     */
    function initializeMusicFromSettings() {
        if (previewMusicSelect && window.userSettings && window.userSettings.background_music) {
            const savedMusic = window.userSettings.background_music;
            console.log('🎵 Initializing music selector with user setting:', savedMusic);

            // Set the music selector to the saved value
            previewMusicSelect.value = savedMusic;

            // Save to storage to ensure consistency
            if (savedMusic) {
                savePreviewMusicToStorage(savedMusic);
            }

            console.log('✅ Music selector initialized from user settings');
        } else {
            console.log('ℹ️ No user music settings found or music selector not available');
            console.log('   - previewMusicSelect:', !!previewMusicSelect);
            console.log('   - window.userSettings:', window.userSettings);
        }
    }

    // Function to save selected music to both localStorage and IndexedDB
    async function savePreviewMusicToStorage(musicFileName) {
        try {
            // Get music label from select option
            const musicSelect = document.getElementById('previewMusicSelect');
            const selectedOption = musicSelect ? musicSelect.options[musicSelect.selectedIndex] : null;
            const musicLabel = selectedOption ? selectedOption.text : musicFileName;

            const musicData = {
                enabled: true,
                fileName: musicFileName,
                volume: 0.5, // Default volume 50% (as decimal 0-1)
                label: musicLabel
            };

            // 1. Update localStorage
            let storyData = {};
            const stored = localStorage.getItem('generatedStoryData');
            if (stored) {
                storyData = JSON.parse(stored);
            }
            storyData.music = musicData;
            localStorage.setItem('generatedStoryData', JSON.stringify(storyData));
            console.log('🎵 Saved music to localStorage:', storyData.music);

            // 2. Update IndexedDB (primary storage with audio URLs)
            try {
                const idbStoryData = await loadStoryFromIndexedDB();
                if (idbStoryData) {
                    idbStoryData.music = musicData;
                    await saveStoryToIndexedDB(idbStoryData);
                    console.log('🎵 Saved music to IndexedDB:', musicData);
                } else {
                    console.warn('⚠️ No story in IndexedDB to update with music');
                }
            } catch (idbError) {
                console.error('❌ Error saving music to IndexedDB:', idbError);
            }
        } catch (error) {
            console.error('Error saving music to storage:', error);
        }
    }

    // Helper function to load story from IndexedDB
    async function loadStoryFromIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('AniKwentoStoryDB', 1);

            request.onerror = () => reject(request.error);

            request.onsuccess = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains('stories')) {
                    db.close();
                    resolve(null);
                    return;
                }

                const transaction = db.transaction(['stories'], 'readonly');
                const store = transaction.objectStore('stories');
                const getRequest = store.get('currentStory');

                getRequest.onsuccess = () => {
                    db.close();
                    resolve(getRequest.result ? getRequest.result.data : null);
                };

                getRequest.onerror = () => {
                    db.close();
                    reject(getRequest.error);
                };
            };
        });
    }

    // Helper function to save story to IndexedDB
    async function saveStoryToIndexedDB(storyData) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('AniKwentoStoryDB', 1);

            request.onerror = () => reject(request.error);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('stories')) {
                    db.createObjectStore('stories', { keyPath: 'id' });
                }
            };

            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['stories'], 'readwrite');
                const store = transaction.objectStore('stories');

                const storyRecord = {
                    id: 'currentStory',
                    data: storyData,
                    timestamp: Date.now()
                };

                const putRequest = store.put(storyRecord);

                putRequest.onsuccess = () => {
                    db.close();
                    resolve();
                };

                putRequest.onerror = () => {
                    db.close();
                    reject(putRequest.error);
                };
            };
        });
    }

    // Listen for stop preview music event
    document.addEventListener('stopPreviewMusic', function() {
        console.log('🛑 Stopping preview music...');
        stopMusicAndReset();
    });

    // Music notification function
    function showMusicNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = 'music-notification';

        const iconMap = {
            'warning': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
            'error': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
            'info': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
        };

        const colorMap = {
            'warning': '#FFC553',
            'error': '#E74C3C',
            'info': '#3498DB'
        };

        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="color: ${colorMap[type]};">
                    ${iconMap[type]}
                </div>
                <span style="flex: 1;">${message}</span>
            </div>
        `;

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, rgba(128, 27, 50, 0.95), rgba(151, 37, 66, 0.95));
            color: white;
            padding: 14px 18px;
            border-radius: 10px;
            border: 2px solid ${colorMap[type]};
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            font-weight: 500;
            z-index: 10005;
            min-width: 300px;
            max-width: 400px;
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 10);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // Handle music play/pause
    if (previewMusicPlayBtn && previewMusicSelect) {
        previewMusicPlayBtn.addEventListener('click', function() {
            const selectedMusic = previewMusicSelect.value;

            if (!selectedMusic) {
                showMusicNotification('Please select a music track first!', 'warning');
                return;
            }

            // If audio exists and is playing, pause it
            if (previewAudio && !previewAudio.paused) {
                previewAudio.pause();
                if (playIcon) playIcon.style.display = 'inline';
                if (pauseIcon) pauseIcon.style.display = 'none';
                if (playBtnText) playBtnText.textContent = 'Play';
                return;
            }

            // If audio exists and is paused, resume it
            if (previewAudio && previewAudio.paused && previewAudio.src.includes(selectedMusic)) {
                previewAudio.play();
                if (playIcon) playIcon.style.display = 'none';
                if (pauseIcon) pauseIcon.style.display = 'inline';
                if (playBtnText) playBtnText.textContent = 'Pause';
                return;
            }

            // Stop existing audio if playing different track
            if (previewAudio) {
                previewAudio.pause();
                previewAudio.currentTime = 0;
            }

            // Create new audio element
            const musicPath = '../../../public/files/music/' + selectedMusic;
            previewAudio = new Audio(musicPath);

            // Use user settings music volume if available, otherwise default to 50%
            const musicVolume = (window.userSettings && typeof window.userSettings.music_volume === 'number')
                ? window.userSettings.music_volume
                : 0.5;
            previewAudio.volume = musicVolume;
            console.log('🔊 Setting music volume from user settings:', (musicVolume * 100) + '%');

            previewAudio.loop = true;

            // Save selected music to localStorage for storyboard
            savePreviewMusicToStorage(selectedMusic);

            // Play the music
            previewAudio.play()
                .then(() => {
                    if (playIcon) playIcon.style.display = 'none';
                    if (pauseIcon) pauseIcon.style.display = 'inline';
                    if (playBtnText) playBtnText.textContent = 'Pause';
                })
                .catch(error => {
                    console.error('Error playing music:', error);
                    showMusicNotification('Error playing music. Please try again.', 'error');
                });

            // Handle audio end (if not looping)
            previewAudio.addEventListener('ended', function() {
                if (playIcon) playIcon.style.display = 'inline';
                if (pauseIcon) pauseIcon.style.display = 'none';
                if (playBtnText) playBtnText.textContent = 'Play';
            });
        });

        // Handle music selection change
        previewMusicSelect.addEventListener('change', function() {
            const selectedMusic = this.value;

            // Save the selected music immediately when changed
            if (selectedMusic) {
                savePreviewMusicToStorage(selectedMusic);
            }

            // Stop current music when changing selection
            if (previewAudio && !previewAudio.paused) {
                previewAudio.pause();
                previewAudio.currentTime = 0;
                if (playIcon) playIcon.style.display = 'inline';
                if (pauseIcon) pauseIcon.style.display = 'none';
                if (playBtnText) playBtnText.textContent = 'Play';
            }
        });
    }


    // Function to load existing image in preview modal
    function loadExistingImage(imageUrl, scenePrompt = null, narrationText = null) {
        console.log('🖼️ Loading existing image in preview modal...');

        // Create story data with existing image
        const existingImageStoryData = {
            title: "Preview with Existing Image",
            setting: "Custom scene preview",
            scenes: [
                {
                    number: 1,
                    title: "Scene 1",
                    narration: narrationText || "This is a preview of your existing image. Click 'Recreate' to regenerate it.",
                    imageUrl: imageUrl,
                    scenePrompt: scenePrompt || "Educational scene, children's book illustration style, colorful and engaging",
                    gamification: null
                }
            ],
            music: {
                enabled: false,
                fileName: null,
                volume: 0.5
            }
        };

        // Save to localStorage
        localStorage.setItem('generatedStoryData', JSON.stringify(existingImageStoryData));
        console.log('✅ Existing image data saved to localStorage');

        // Call showPreviewModal from dashboard-story-generation-enhanced.js
        if (typeof window.showPreviewModal === 'function') {
            console.log('🎬 Calling showPreviewModal with existing image...');
            window.showPreviewModal(existingImageStoryData);
        } else {
            console.error('❌ showPreviewModal function not available. Please ensure dashboard-story-generation-enhanced.js is loaded.');
        }
    }

    // Export function to window for external use
    window.loadExistingImageInPreview = loadExistingImage;




    // Function to stop music and reset UI
    function stopMusicAndReset() {
        if (previewAudio && !previewAudio.paused) {
            previewAudio.pause();
            previewAudio.currentTime = 0;
            if (playIcon) playIcon.style.display = 'inline';
            if (pauseIcon) pauseIcon.style.display = 'none';
            if (playBtnText) playBtnText.textContent = 'Play';
        }
    }

    // Close preview modal
    if (previewModalClose) {
        previewModalClose.addEventListener('click', function() {
            stopMusicAndReset();
            if (previewModal) {
                previewModal.classList.remove('show');
                previewModal.classList.add('hidden');
            }
        });
    }

    // Close preview modal when clicking overlay
    const previewModalOverlay = document.querySelector('.preview-modal-overlay');
    if (previewModalOverlay) {
        previewModalOverlay.addEventListener('click', function() {
            stopMusicAndReset();
            if (previewModal) {
                previewModal.classList.remove('show');
                previewModal.classList.add('hidden');
            }
        });
    }

    // Ensure recreate button is visible when preview modal opens with story data
    if (previewModal) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.attributeName === 'class') {
                    const classList = previewModal.classList;
                    if (classList.contains('show') && !classList.contains('hidden')) {
                        setTimeout(() => {
                            const retryContainer = document.getElementById('sceneRetryContainer');

                            // Ensure recreate button is visible if story has images
                            if (retryContainer) {
                                const storedData = localStorage.getItem('generatedStoryData');
                                if (storedData) {
                                    try {
                                        const storyData = JSON.parse(storedData);
                                        if (storyData.scenes && storyData.scenes.length > 0 && storyData.scenes[0].imageUrl) {
                                            if (retryContainer.style.display === 'none') {
                                                retryContainer.style.display = 'block';
                                            }
                                        }
                                    } catch (e) {
                                        console.error('Error checking stored story data:', e);
                                    }
                                }
                            }
                        }, 100);
                    }
                }
            });
        });
        observer.observe(previewModal, { attributes: true });
    }
});
