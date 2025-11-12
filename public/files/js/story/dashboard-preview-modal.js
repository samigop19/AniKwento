
document.addEventListener('DOMContentLoaded', async function() {
    const previewModal = document.getElementById('previewModal');
    const previewModalClose = document.getElementById('previewModalClose');
    const createStoryModal = document.getElementById('createStoryModal');

    
    const previewMusicSelect = document.getElementById('previewMusicSelect');
    const previewMusicPlayBtn = document.getElementById('previewMusicPlayBtn');
    const playIcon = document.getElementById('playIcon');
    const pauseIcon = document.getElementById('pauseIcon');
    const playBtnText = document.getElementById('playBtnText');

    let previewAudio = null;

    
    console.log('⏳ Preview modal waiting for user settings...');
    await waitForUserSettingsToLoad();
    console.log('✅ User settings ready, initializing music selector');

    
    initializeMusicFromSettings();

    
    async function waitForUserSettingsToLoad() {
        
        if (typeof window.loadUserSettings === 'function') {
            console.log('📥 Loading user settings from database for preview modal...');
            await window.loadUserSettings();
            console.log('✅ User settings loaded:', window.userSettings);
        } else {
            console.warn('⚠️ loadUserSettings function not available, waiting for settings...');
            
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

    
    function initializeMusicFromSettings() {
        if (previewMusicSelect && window.userSettings && window.userSettings.background_music) {
            const savedMusic = window.userSettings.background_music;
            console.log('🎵 Initializing music selector with user setting:', savedMusic);

            
            previewMusicSelect.value = savedMusic;

            
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

    
    async function savePreviewMusicToStorage(musicFileName) {
        try {
            
            const musicSelect = document.getElementById('previewMusicSelect');
            const selectedOption = musicSelect ? musicSelect.options[musicSelect.selectedIndex] : null;
            const musicLabel = selectedOption ? selectedOption.text : musicFileName;

            const musicData = {
                enabled: true,
                fileName: musicFileName,
                volume: 0.5, 
                label: musicLabel
            };

            
            let storyData = {};
            const stored = localStorage.getItem('generatedStoryData');
            if (stored) {
                storyData = JSON.parse(stored);
            }
            storyData.music = musicData;
            localStorage.setItem('generatedStoryData', JSON.stringify(storyData));
            console.log('🎵 Saved music to localStorage:', storyData.music);

            
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

    
    document.addEventListener('stopPreviewMusic', function() {
        console.log('🛑 Stopping preview music...');
        stopMusicAndReset();
    });

    
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

    
    if (previewMusicPlayBtn && previewMusicSelect) {
        previewMusicPlayBtn.addEventListener('click', function() {
            const selectedMusic = previewMusicSelect.value;

            if (!selectedMusic) {
                showMusicNotification('Please select a music track first!', 'warning');
                return;
            }

            
            if (previewAudio && !previewAudio.paused) {
                previewAudio.pause();
                if (playIcon) playIcon.style.display = 'inline';
                if (pauseIcon) pauseIcon.style.display = 'none';
                if (playBtnText) playBtnText.textContent = 'Play';
                return;
            }

            
            if (previewAudio && previewAudio.paused && previewAudio.src.includes(selectedMusic)) {
                previewAudio.play();
                if (playIcon) playIcon.style.display = 'none';
                if (pauseIcon) pauseIcon.style.display = 'inline';
                if (playBtnText) playBtnText.textContent = 'Pause';
                return;
            }

            
            if (previewAudio) {
                previewAudio.pause();
                previewAudio.currentTime = 0;
            }

            
            const musicPath = '../../../public/files/music/' + selectedMusic;
            previewAudio = new Audio(musicPath);

            
            const musicVolume = (window.userSettings && typeof window.userSettings.music_volume === 'number')
                ? window.userSettings.music_volume
                : 0.5;
            previewAudio.volume = musicVolume;
            console.log('🔊 Setting music volume from user settings:', (musicVolume * 100) + '%');

            previewAudio.loop = true;

            
            savePreviewMusicToStorage(selectedMusic);

            
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

            
            previewAudio.addEventListener('ended', function() {
                if (playIcon) playIcon.style.display = 'inline';
                if (pauseIcon) pauseIcon.style.display = 'none';
                if (playBtnText) playBtnText.textContent = 'Play';
            });
        });

        
        previewMusicSelect.addEventListener('change', function() {
            const selectedMusic = this.value;

            
            if (selectedMusic) {
                savePreviewMusicToStorage(selectedMusic);
            }

            
            if (previewAudio && !previewAudio.paused) {
                previewAudio.pause();
                previewAudio.currentTime = 0;
                if (playIcon) playIcon.style.display = 'inline';
                if (pauseIcon) pauseIcon.style.display = 'none';
                if (playBtnText) playBtnText.textContent = 'Play';
            }
        });
    }


    
    function loadExistingImage(imageUrl, scenePrompt = null, narrationText = null) {
        console.log('🖼️ Loading existing image in preview modal...');

        
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

        
        localStorage.setItem('generatedStoryData', JSON.stringify(existingImageStoryData));
        console.log('✅ Existing image data saved to localStorage');

        
        if (typeof window.showPreviewModal === 'function') {
            console.log('🎬 Calling showPreviewModal with existing image...');
            window.showPreviewModal(existingImageStoryData);
        } else {
            console.error('❌ showPreviewModal function not available. Please ensure dashboard-story-generation-enhanced.js is loaded.');
        }
    }

    
    window.loadExistingImageInPreview = loadExistingImage;




    
    function stopMusicAndReset() {
        if (previewAudio && !previewAudio.paused) {
            previewAudio.pause();
            previewAudio.currentTime = 0;
            if (playIcon) playIcon.style.display = 'inline';
            if (pauseIcon) pauseIcon.style.display = 'none';
            if (playBtnText) playBtnText.textContent = 'Play';
        }
    }

    
    if (previewModalClose) {
        previewModalClose.addEventListener('click', function() {
            stopMusicAndReset();
            if (previewModal) {
                previewModal.classList.remove('show');
                previewModal.classList.add('hidden');
            }
        });
    }

    
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

    
    if (previewModal) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.attributeName === 'class') {
                    const classList = previewModal.classList;
                    if (classList.contains('show') && !classList.contains('hidden')) {
                        setTimeout(() => {
                            const retryContainer = document.getElementById('sceneRetryContainer');

                            
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
