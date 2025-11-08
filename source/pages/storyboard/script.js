// AniKwento Storyboard Player - Enhanced with UPDATE STORYGEN Backend
// Based on UPDATE STORYGEN's enhanced storyboard functionality

// ============================================================================
// CRITICAL FIX: Event Listener and Timer Tracking System
// This prevents memory leaks by tracking all event listeners and timers
// ============================================================================
const EventListenerRegistry = {
    listeners: [],
    timers: [],
    intervals: [],

    /**
     * Add tracked event listener
     */
    add(target, event, handler, options) {
        target.addEventListener(event, handler, options);
        this.listeners.push({ target, event, handler, options });
        console.log(`📝 Tracked listener: ${event} (Total: ${this.listeners.length})`);
    },

    /**
     * Add tracked timeout
     */
    addTimeout(callback, delay) {
        const id = setTimeout(callback, delay);
        this.timers.push(id);
        console.log(`⏱️  Tracked timeout (Total: ${this.timers.length})`);
        return id;
    },

    /**
     * Add tracked interval
     */
    addInterval(callback, delay) {
        const id = setInterval(callback, delay);
        this.intervals.push(id);
        console.log(`⏱️  Tracked interval (Total: ${this.intervals.length})`);
        return id;
    },

    /**
     * Remove all tracked event listeners and timers
     */
    cleanup() {
        console.log('🧹 EventListenerRegistry cleanup starting...');
        console.log(`   Removing ${this.listeners.length} event listeners`);
        console.log(`   Clearing ${this.timers.length} timeouts`);
        console.log(`   Clearing ${this.intervals.length} intervals`);

        // Remove all event listeners
        this.listeners.forEach(({ target, event, handler, options }) => {
            try {
                target.removeEventListener(event, handler, options);
            } catch (e) {
                console.warn('⚠️  Failed to remove listener:', event, e);
            }
        });
        this.listeners = [];

        // Clear all timeouts
        this.timers.forEach(id => clearTimeout(id));
        this.timers = [];

        // Clear all intervals
        this.intervals.forEach(id => clearInterval(id));
        this.intervals = [];

        console.log('✅ EventListenerRegistry cleanup complete');
    }
};

// Make registry available globally
window.EventListenerRegistry = EventListenerRegistry;

// Global error handlers for better debugging
const errorHandler = function(event) {
    console.error('🚨 Unhandled Promise Rejection:', event.reason);
    console.error('   Promise:', event.promise);
    // Prevent the default browser error logging (which shows as "Unhandled Promise Rejection")
    event.preventDefault();
};

const globalErrorHandler = function(event) {
    console.error('🚨 Global Error:', event.error || event.message);
};

EventListenerRegistry.add(window, 'unhandledrejection', errorHandler);
EventListenerRegistry.add(window, 'error', globalErrorHandler);

// IndexedDB Helper Functions
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
                resolve(getRequest.result?.data || null);
            };

            getRequest.onerror = () => {
                db.close();
                reject(getRequest.error);
            };
        };
    });
}

// Global variables
let currentStory = null;
let currentSceneIndex = 0;
let globalStoryboardPlayer = null;
let backgroundMusicAudio = null; // Background music audio element
let questionBgAudio = null; // Question background music
let correctAnswerAudio = null; // Correct answer sound effect
let wrongAnswerAudio = null; // Wrong answer sound effect

// Initialize storyboard when DOM is ready
const domReadyHandler = async function() {
    try {
        console.log('🎬 AniKwento Storyboard Player initializing with UPDATE STORYGEN backend...');

        // CRITICAL FIX: Clean up any leftover resources from previous page loads
        // This handles cases where beforeunload/pagehide didn't fire properly (especially in Safari)
        console.log('🧹 Pre-initialization cleanup - removing any leftover resources...');
        try {
            // SAFARI FIX: Detect Safari and be extra aggressive with cleanup
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            if (isSafari) {
                console.log('🍎 Safari detected - using aggressive cleanup mode');
            }

            if (typeof cleanupAllAudio === 'function') {
                cleanupAllAudio();
            }

            // SAFARI FIX: Check if sessionStorage has very old data (> 1 hour) and clear it
            // This prevents memory issues from stale data accumulating
            try {
                const sessionTimestamp = sessionStorage.getItem('storyLoadTimestamp');
                if (sessionTimestamp) {
                    const age = Date.now() - parseInt(sessionTimestamp);
                    const oneHour = 60 * 60 * 1000;
                    if (age > oneHour) {
                        console.log('🧹 Clearing stale sessionStorage (over 1 hour old)');
                        sessionStorage.removeItem('currentStory');
                        sessionStorage.removeItem('storyLoadTimestamp');
                    }
                }
                // Set new timestamp
                sessionStorage.setItem('storyLoadTimestamp', Date.now().toString());
            } catch (e) {
                console.warn('⚠️ Could not check sessionStorage age:', e);
            }
        } catch (cleanupError) {
            console.warn('⚠️ Pre-initialization cleanup had errors (this is normal on first load):', cleanupError);
        }

        // CRITICAL: Ensure narration starts paused
        isNarrationPaused = true;
        console.log('✅ Narration pause state initialized: isNarrationPaused =', isNarrationPaused);

        // CRITICAL: Wait for user settings to load from database before initializing
        console.log('⏳ Waiting for user settings to load from database...');
        await waitForUserSettings();
        console.log('✅ User settings loaded:', window.userSettings);

        // MUST wait for story to load before initializing music controls
        await initializeStoryboard();
        initializeMusicControls();
        initializeNarrationVolumeDisplay();
        initializeGamificationAudio();
    } catch (error) {
        console.error('❌ Error during storyboard initialization:', error);
        // Continue execution even if there's an error
    }
};

EventListenerRegistry.add(document, 'DOMContentLoaded', domReadyHandler);

/**
 * Wait for user settings to load from database
 * load-default-settings.js loads settings asynchronously, so we need to wait
 */
async function waitForUserSettings() {
    // Check if loadUserSettings function exists
    if (typeof window.loadUserSettings === 'function') {
        console.log('📥 Loading user settings from database...');
        await window.loadUserSettings();
        console.log('✅ User settings loaded from database');
    } else {
        console.warn('⚠️ loadUserSettings function not available, waiting for settings to populate...');
        // Wait up to 3 seconds for settings to populate
        const maxWaitTime = 3000;
        const startTime = Date.now();
        while (!window.userSettings && (Date.now() - startTime) < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        if (window.userSettings) {
            console.log('✅ User settings populated');
        } else {
            console.warn('⚠️ User settings not loaded after waiting, using defaults');
        }
    }
}

async function initializeStoryboard() {
    // Load story data from IndexedDB or localStorage
    await loadStoredStory();

    // Initialize enhanced features
    initializeEnhancedFeatures();

    // Check if story loaded successfully
    if (currentStory && currentStory.scenes) {
        updateStoryboardWithData(currentStory);
    } else {
        showNoStoryMessage();
    }
}

async function loadStoredStory() {
    try {
        console.log('🔍 Attempting to load story from storage...');

        let storyData = null;
        let storageType = 'none';

        // PRIORITY 1: Try sessionStorage FIRST (used when playing from dashboard)
        try {
            const sessionStoryJson = sessionStorage.getItem('currentStory');
            if (sessionStoryJson) {
                storyData = JSON.parse(sessionStoryJson);
                storageType = 'sessionStorage (from database)';
                console.log('✅ Story loaded from sessionStorage (dashboard playback)');
                console.log('🔍 Story has scenes:', storyData.scenes?.length);
                console.log('🔍 First scene has audioUrls:', storyData.scenes?.[0]?.audioUrls?.length || 0);
            } else {
                console.log('⚠️ No story in sessionStorage');
            }
        } catch (sessionError) {
            console.error('❌ sessionStorage load failed:', sessionError);
        }

        // PRIORITY 2: Try IndexedDB (has audio URLs with unlimited space - used for newly generated stories)
        if (!storyData) {
            console.log('🔍 Trying IndexedDB...');
            try {
                storyData = await loadStoryFromIndexedDB();
                if (storyData) {
                    storageType = 'IndexedDB';
                    console.log('✅ Story loaded from IndexedDB successfully');
                    console.log('🔍 IndexedDB story has scenes:', storyData.scenes?.length);
                    console.log('🔍 First scene has audioUrls:', storyData.scenes?.[0]?.audioUrls?.length || 0);
                } else {
                    console.warn('⚠️ IndexedDB returned null/undefined');
                }
            } catch (idbError) {
                console.error('❌ IndexedDB load failed:', idbError);
            }
        }

        // PRIORITY 3: Try localStorage (backup without audio)
        if (!storyData) {
            console.warn('⚠️ No story in IndexedDB, trying localStorage...');
            const storyDataJson = localStorage.getItem('generatedStoryData');
            if (storyDataJson) {
                storyData = JSON.parse(storyDataJson);
                storageType = 'localStorage (no audio)';
                console.log('✅ Story loaded from localStorage (backup without audio)');
            }
        }

        if (storyData) {
            currentStory = storyData;
            console.log(`📖 Story loaded from ${storageType}`);

            // Debug: Check music data
            console.log('🎵 Music data in loaded story:');
            console.log('   - Has music property:', 'music' in currentStory);
            console.log('   - Music object:', JSON.stringify(currentStory.music, null, 2));

            // Ensure gamification is enabled by default if not specified
            if (currentStory.gamificationEnabled === undefined) {
                currentStory.gamificationEnabled = true;
            }
            console.log('📖 Story loaded:', currentStory);

            // Debug: Check audio URLs in each scene
            console.log('🔍 Audio URL Debug:');
            console.log('   Total Scenes:', currentStory.scenes?.length || 0);
            let scenesWithAudio = 0;
            let totalAudioUrls = 0;
            currentStory.scenes?.forEach((scene, i) => {
                if (scene.audioUrls && scene.audioUrls.length > 0) {
                    scenesWithAudio++;
                    totalAudioUrls += scene.audioUrls.length;
                    console.log(`   Scene ${i + 1}:`, {
                        hasAudioUrls: true,
                        count: scene.audioUrls.length,
                        firstUrlType: typeof scene.audioUrls[0],
                        firstUrlLength: scene.audioUrls[0]?.length || 0,
                        firstUrlPreview: scene.audioUrls[0]?.substring(0, 100) + '...'
                    });
                }
            });
            console.log('   ✓ Scenes with Audio:', scenesWithAudio);
            console.log('   ✓ Total Audio URLs:', totalAudioUrls);
            console.log('   ✓ AudioNarration Module:', typeof AudioNarration !== 'undefined' ? 'Loaded' : 'NOT LOADED');

            if (totalAudioUrls === 0) {
                console.warn('   ⚠️ WARNING: No audio URLs found!');
                console.warn('   Make sure to generate the story with TTS enabled.');
            }
        } else {
            console.log('📖 No stored story found');
        }
    } catch (error) {
        console.error('❌ Error loading stored story:', error);
    }
}

// Update storyboard with loaded story data (UPDATE STORYGEN method)
function updateStoryboardWithData(storyData) {
    console.log('Updating storyboard with data:', storyData);

    // Update story title
    const storyboardTitle = document.getElementById('storyboardTitle');
    if (storyboardTitle && storyData.title) {
        storyboardTitle.textContent = storyData.title;
    }

    // Update scene count and titles in timeline dots
    const timelineDots = document.getElementById('timelineDots');
    if (timelineDots && storyData.scenes) {
        timelineDots.innerHTML = '';
        storyData.scenes.forEach((scene, index) => {
            const button = document.createElement('button');
            button.className = index === 0 ? 'dot active' : 'dot';
            button.setAttribute('data-scene', index + 1);
            button.setAttribute('role', 'tab');
            button.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
            button.setAttribute('aria-controls', `scene-${index + 1}`);
            button.setAttribute('title', scene.title || `Scene ${index + 1}`);
            button.setAttribute('tabindex', index === 0 ? '0' : '-1');

            // Add question indicator if scene has gamification
            if (scene.gamification && scene.gamification.hasQuestion) {
                button.classList.add('has-question');
                button.setAttribute('title', `${scene.title || `Scene ${index + 1}`} - Interactive Question`);
            }

            timelineDots.appendChild(button);
        });
    }

    // Load the first scene
    if (storyData.scenes.length > 0) {
        loadStoryboardScene(storyData.scenes, 1);
    }

    // Show voice indicator if story has voice narration
    if (storyData.selectedVoice && storyData.scenes.some(scene => scene.audioUrls && scene.audioUrls.length > 0)) {
        const voiceIndicator = document.getElementById('voiceIndicator');
        const voiceName = document.getElementById('voiceName');
        if (voiceIndicator && voiceName) {
            voiceName.textContent = `${storyData.selectedVoice} Voice`;
            voiceIndicator.style.display = 'inline-block';
            console.log(`🎤 Voice narration active: ${storyData.selectedVoice}`);
        }
    }

    // Make controls visible and add navigation functionality
    const storyboardPlayer = document.getElementById('storyboardPlayer');
    if (storyboardPlayer) {
        storyboardPlayer.classList.add('controls-visible');
    }

    // Add scene navigation functionality for all scenes
    addSceneNavigation(storyData.scenes);

    // Show after-story quiz button if after-story questions exist
    const afterQuizSection = document.getElementById('afterQuizSection');
    const headerQuizBtn = document.getElementById('headerQuizBtn');
    console.log('🔍 Checking for after-story questions...');
    console.log('   - afterQuizSection element:', afterQuizSection ? 'Found' : 'NOT FOUND');
    console.log('   - headerQuizBtn element:', headerQuizBtn ? 'Found' : 'NOT FOUND');
    console.log('   - storyData.afterStoryQuestions:', storyData.afterStoryQuestions);
    console.log('   - Question count:', storyData.afterStoryQuestions?.length || 0);
    console.log('   - Question timing:', storyData.questionTiming || 'Not set');

    if (storyData.afterStoryQuestions && storyData.afterStoryQuestions.length > 0) {
        // Hide the old quiz section
        if (afterQuizSection) afterQuizSection.style.display = 'none';
        // Show the header quiz button
        if (headerQuizBtn) headerQuizBtn.style.display = 'inline-block';
        console.log('✅ After-story quiz button shown in header (' + storyData.afterStoryQuestions.length + ' questions)');
    } else {
        if (afterQuizSection) afterQuizSection.style.display = 'none';
        if (headerQuizBtn) headerQuizBtn.style.display = 'none';
        console.log('❌ After-story quiz button hidden - no questions found');
    }

    // Clean up any existing player
    if (globalStoryboardPlayer) {
        globalStoryboardPlayer.stopProgress();
        const playPauseBtn = document.getElementById('playPauseBtn');
        if (playPauseBtn) {
            playPauseBtn.replaceWith(playPauseBtn.cloneNode(true));
        }
        globalStoryboardPlayer = null;
    }

    // Force clear any cached time displays
    const currentTimeEl = document.querySelector('.current-time');
    const totalTimeEl = document.querySelector('.total-time');
    if (currentTimeEl) currentTimeEl.textContent = '00:00';
    if (totalTimeEl) totalTimeEl.textContent = '00:00';

    // Debug: Check scenes before passing to player
    console.log('🔍 AUDIO DEBUG - Scenes being passed to player:');
    storyData.scenes?.forEach((scene, i) => {
        console.log(`   Scene ${i + 1}:`, {
            hasAudioUrls: !!scene.audioUrls,
            audioUrlsCount: scene.audioUrls?.length || 0,
            hasNarrationLines: !!scene.narrationLines,
            narrationLinesCount: scene.narrationLines?.length || 0
        });
    });

    // Set up enhanced storyboard player with the data
    globalStoryboardPlayer = new EnhancedStoryboardPlayer('storyboardPlayer', storyData.scenes);
}

// Load specific storyboard scene (UPDATE STORYGEN method)
function loadStoryboardScene(scenes, sceneNumber, elapsedTimeMs = 0) {
    console.log(`Loading scene ${sceneNumber}`, scenes, 'elapsedTime:', elapsedTimeMs);

    if (sceneNumber < 1 || sceneNumber > scenes.length) return;

    const scene = scenes[sceneNumber - 1];

    // CRITICAL FIX: Reset question state at the very beginning of scene load
    // This ensures gamification won't trigger immediately when switching scenes
    if (globalStoryboardPlayer) {
        globalStoryboardPlayer.currentQuestionShown = false;
        console.log('🔄 Reset currentQuestionShown to false for new scene');
    }

    console.log('Loading scene object:', scene);
    console.log('🔍 AUDIO DEBUG - Scene audioUrls:', {
        hasAudioUrls: !!scene.audioUrls,
        audioUrlsIsArray: Array.isArray(scene.audioUrls),
        audioUrlsLength: scene.audioUrls?.length || 0,
        firstAudioUrl: scene.audioUrls?.[0]?.substring(0, 100) + '...' || 'None'
    });

    // Update scene image with transitions
    const storyImage = document.querySelector('.story-image');
    const narrationOverlay = document.querySelector('.narration-text-overlay');

    if (storyImage) {
        // Start fade out transition
        storyImage.classList.add('fade-out');
        if (narrationOverlay) {
            narrationOverlay.classList.add('slide-out');
        }

        setTimeout(() => {
            // Update content after fade out
            if (scene.imageUrl) {
                // Show loading state
                storyImage.innerHTML = `<div class="image-placeholder" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;"><p>Loading ${scene.title || `Scene ${sceneNumber}`}...</p></div>`;

                // Create image with loading and error handling
                const img = new Image();
                img.onload = function() {
                    storyImage.innerHTML = `<img src="${scene.imageUrl}" alt="${scene.title}" class="actual-story-image">`;
                };
                img.onerror = function() {
                    storyImage.innerHTML = `<div class="image-placeholder"><p>${scene.title || `Scene ${sceneNumber}`}</p></div>`;
                };
                img.src = scene.imageUrl;
            } else {
                storyImage.innerHTML = `<div class="image-placeholder"><p>${scene.title || `Scene ${sceneNumber}`}</p></div>`;
            }

            // Update narration - parse and display line by line
            if (narrationOverlay) {
                // Use narrationLines if available (from TTS generation), otherwise parse from narration
                const narrationLines = scene.narrationLines && scene.narrationLines.length > 0
                    ? scene.narrationLines
                    : parseNarrationLines(scene.narration, sceneNumber);

                // Start displaying lines sequentially, synced to elapsed time
                displayNarrationLinesSequentially(narrationOverlay, narrationLines, elapsedTimeMs);
            }

            // Start fade in
            setTimeout(() => {
                storyImage.classList.remove('fade-out');
                storyImage.classList.add('fade-in');
                if (narrationOverlay) {
                    narrationOverlay.classList.remove('slide-out');
                    narrationOverlay.classList.add('slide-in');
                }

                // Clean up classes after transition
                setTimeout(() => {
                    storyImage.classList.remove('fade-in');
                    if (narrationOverlay) {
                        narrationOverlay.classList.remove('slide-in');
                    }
                }, 500);
            }, 50);
        }, 250);
    }

    // CRITICAL FIX: Reset narration variables IMMEDIATELY at the start of scene load
    // This prevents syncNarrationToTime from using stale data during the 250ms transition delay
    console.log('🔄 Resetting narration state at start of loadStoryboardScene');
    currentNarrationLines = null;
    currentNarrationOverlay = null;
    lastLineChangeTimestamp = Date.now();
    narrationTransitioning = false;

    // Initialize audio narration for this scene
    // IMPORTANT: This must happen synchronously to prevent audio from previous scene playing
    if (typeof AudioNarration !== 'undefined') {
        console.log('🎵 Initializing AudioNarration with scene:', {
            sceneNumber: sceneNumber,
            hasAudioUrls: !!scene.audioUrls,
            audioUrlsCount: scene.audioUrls?.length || 0,
            audioUrlsPreview: scene.audioUrls?.slice(0, 2).map(url => url?.substring(0, 50))
        });

        // Stop any currently playing audio immediately before initializing new scene
        AudioNarration.stop();

        // CRITICAL FIX: Initialize AudioNarration FIRST (this clears old callbacks)
        // Then set callbacks AFTER init completes to prevent them from being cleared
        AudioNarration.init(scene).then(() => {
            console.log('✅ AudioNarration initialized, now setting up callbacks');

            // CRITICAL FIX: Start audio playback after init if story is playing
            // This ensures audio starts even after gamification scene transitions
            if (globalStoryboardPlayer && globalStoryboardPlayer.isPlaying && scene.audioUrls && scene.audioUrls.length > 0) {
                console.log('🎵 AUTO-START: Story is playing after init, waiting for initialization to clear...');

                // Wait for isInitializing flag to clear before starting playback
                const waitForInitClear = () => {
                    if (AudioNarration.isInitializing) {
                        console.log('🎵 Still initializing, waiting 50ms...');
                        setTimeout(waitForInitClear, 50);
                    } else {
                        console.log('🎵 Initialization cleared, starting audio for line', currentNarrationIndex || 0);
                        const startLineIndex = currentNarrationIndex || 0;
                        AudioNarration.playLine(startLineIndex).catch(err => {
                            console.warn('⚠️ Failed to auto-start audio after init:', err);
                        });
                    }
                };

                // Start waiting
                waitForInitClear();
            } else {
                console.log('🎵 SKIP AUTO-START: Story not playing or no audio available');
            }

            // Set up callbacks for audio line completion AFTER init
            AudioNarration.onLineComplete = (lineIndex, isLastLine) => {
                console.log(`🔔 Line ${lineIndex + 1} audio completed${isLastLine ? ' (LAST LINE)' : ''}`);

                // Update text display to match the next audio line
                // Audio module handles auto-playing, we just update the UI
                if (!isLastLine && globalStoryboardPlayer && globalStoryboardPlayer.isPlaying) {
                    const nextLineIndex = lineIndex + 1;
                    console.log(`📖 Updating text display for line ${nextLineIndex + 1}...`);

                    // CRITICAL FIX: Update currentNarrationIndex IMMEDIATELY (not in setTimeout)
                    // This prevents syncNarrationToTime from blocking due to stale index
                    currentNarrationIndex = nextLineIndex;

                    // CRITICAL FIX: Update timestamp to prevent flickering
                    lastLineChangeTimestamp = Date.now();

                    // Update narration display with smooth transition
                    if (currentNarrationOverlay && currentNarrationLines[nextLineIndex]) {
                        currentNarrationOverlay.style.transition = 'opacity 0.2s ease-in-out';
                        currentNarrationOverlay.style.opacity = '0';

                        setTimeout(() => {
                            currentNarrationOverlay.innerHTML = `<strong>${currentNarrationLines[nextLineIndex]}</strong>`;

                            // CRITICAL FIX: Wait for DOM to update before fading in to prevent flickering
                            // Use requestAnimationFrame to ensure the content change is rendered before starting fade-in
                            requestAnimationFrame(() => {
                                currentNarrationOverlay.style.opacity = '1';
                            });

                            console.log(`📖 Text updated to line ${nextLineIndex + 1}/${currentNarrationLines.length} (index updated immediately, stability timer reset)`);
                        }, 200);
                    }
                } else if (isLastLine) {
                    // CRITICAL FIX: Update currentNarrationIndex for the last line
                    // This ensures gamification triggers immediately after audio completes
                    const nextLineIndex = lineIndex + 1;
                    currentNarrationIndex = nextLineIndex;
                    console.log(`📖 Last line completed - updated currentNarrationIndex to ${nextLineIndex} to trigger gamification check`);
                }
            };

            // Set up callback for when all lines complete
            AudioNarration.onAllLinesComplete = () => {
                console.log('🎬 ALL NARRATION COMPLETE - Checking for gamification...');

                // CRITICAL: Set audio completion timestamp for scene transition delay
                if (globalStoryboardPlayer) {
                    globalStoryboardPlayer.audioCompletionTimestamp = Date.now();
                    console.log(`⏱️ Audio completion timestamp set: ${globalStoryboardPlayer.audioCompletionTimestamp}`);
                }

                // CRITICAL FIX: Update currentNarrationIndex to ensure it reflects all lines completed
                // This is needed because checkSceneQuestionTiming() checks currentLineIndex > triggerLine
                const totalLines = currentNarrationLines.length;
                currentNarrationIndex = totalLines; // Set to total lines (past the last line)
                console.log(`📖 Updated currentNarrationIndex to ${currentNarrationIndex} (all ${totalLines} lines complete)`);

                // CRITICAL FIX: Ensure question hasn't already been shown before triggering
                // This prevents duplicate triggers when rapidly switching scenes
                if (globalStoryboardPlayer && globalStoryboardPlayer.currentQuestionShown) {
                    console.log('⚠️ Question already shown for this scene, skipping trigger');
                    return;
                }

                // CRITICAL FIX: Check if gamification is enabled globally for the story
                // This was missing and causing gamification to not show
                const gamificationEnabled = currentStory && currentStory.gamificationEnabled !== false;
                console.log('🎮 Gamification checks:', {
                    hasGamification: !!scene.gamification,
                    hasQuestion: scene.gamification?.hasQuestion,
                    gamificationEnabled: gamificationEnabled,
                    hasPlayer: !!globalStoryboardPlayer
                });

                // Trigger gamification if scene has a question AND gamification is enabled
                if (scene.gamification && scene.gamification.hasQuestion && gamificationEnabled && globalStoryboardPlayer) {
                    console.log('🎮🎮🎮 IMMEDIATE GAMIFICATION TRIGGER - ALL NARRATION COMPLETE 🎮🎮🎮');

                    // Pause the story and prevent auto-transition
                    globalStoryboardPlayer.isPlaying = false;
                    globalStoryboardPlayer.isAnimating = false;
                    globalStoryboardPlayer.wasPlayingBeforeQuestion = true;
                    globalStoryboardPlayer.updatePlayPauseButton();

                    // Stop the progress animation to prevent scene transition
                    globalStoryboardPlayer.stopProgress();

                    // CRITICAL: Mark question as shown BEFORE showing it to prevent race conditions
                    globalStoryboardPlayer.currentQuestionShown = true;

                    // Show question IMMEDIATELY - don't wait for checkSceneQuestionTiming()
                    globalStoryboardPlayer.showGamificationQuestion(scene.gamification);
                    console.log('✅ Gamification displayed successfully');
                } else {
                    console.log('⚠️ No gamification to show - one or more conditions failed (check above for details)');
                }
            };
        }).catch(err => {
            console.warn('⚠️ AudioNarration init failed:', err);
        });
    } else {
        console.warn('⚠️ AudioNarration module not loaded!');
    }

    // Handle gamification for this scene
    handleSceneGamification(scene, sceneNumber);

    // Update current scene index
    currentSceneIndex = sceneNumber - 1;

    // Update timeline dots
    updateTimelineDots();
}

// Handle gamification (enhanced from original)
function handleSceneGamification(scene, sceneNumber) {
    const gamificationOverlay = document.getElementById('gamificationOverlay');

    // Note: Gamification questions are now handled automatically by the EnhancedStoryboardPlayer
    // through timing-based checking during progress animation. This prevents glitching
    // and ensures proper pause/resume behavior.

    if (!scene.gamification || !scene.gamification.hasQuestion || !currentStory.gamificationEnabled) {
        // Hide gamification overlay if no question
        if (gamificationOverlay) {
            gamificationOverlay.classList.remove('show');
            gamificationOverlay.classList.add('hidden');
        }
    }
    // Questions will be automatically shown by checkForGamificationQuestion() during progress
}

// Display question (enhanced)
function displayQuestion(questionData) {
    const questionText = document.getElementById('questionText');
    const answerChoices = document.getElementById('answerChoices');
    const gamificationOverlay = document.getElementById('gamificationOverlay');

    if (!questionText || !answerChoices || !gamificationOverlay) {
        console.log('❌ Question UI elements not found');
        return;
    }

    console.log('🎮 Displaying question:', questionData.question);

    // Set question text
    questionText.textContent = questionData.question;

    // Create choice buttons
    answerChoices.innerHTML = '';
    if (questionData.choices && questionData.choices.length > 0) {
        questionData.choices.forEach(choice => {
            const button = document.createElement('button');
            button.className = 'choice-btn';
            button.dataset.choice = choice.letter;
            button.textContent = choice.text;
            button.addEventListener('click', () => handleQuestionAnswer(choice.letter, button, questionData));
            answerChoices.appendChild(button);
        });
    }

    // Show gamification overlay
    gamificationOverlay.classList.remove('hidden');
    gamificationOverlay.classList.add('show');
}

// Handle question answer (enhanced)
function handleQuestionAnswer(selectedAnswer, buttonElement, questionData) {
    const isCorrect = selectedAnswer === questionData.correctAnswer?.letter;
    const feedbackElement = document.getElementById('questionFeedback');
    const allButtons = document.querySelectorAll('#answerChoices .choice-btn');

    console.log(`🎮 Question answered: ${selectedAnswer}, Correct: ${isCorrect}`);
    console.log('🔍 Question data structure:', questionData);

    // Disable all buttons
    allButtons.forEach(btn => {
        btn.classList.add('disabled');
    });

    // Find selected and correct buttons
    const selectedButton = document.querySelector(`[data-choice="${selectedAnswer}"]`);
    const correctButton = questionData.correctAnswer ?
        document.querySelector(`[data-choice="${questionData.correctAnswer.letter}"]`) : null;

    // Animate selected button
    if (selectedButton) {
        selectedButton.classList.add(isCorrect ? 'correct' : 'incorrect');
    }

    // Always show correct answer if different from selection
    if (!isCorrect && correctButton) {
        setTimeout(() => {
            correctButton.classList.add('correct');
        }, 600);
    }

    // Show feedback
    setTimeout(() => {
        if (feedbackElement) {
            const feedbackTextElement = feedbackElement.querySelector('.feedback-text');
            if (feedbackTextElement) {
                if (isCorrect) {
                    feedbackTextElement.textContent = 'Correct! Well done! 🌟';
                    feedbackTextElement.className = 'feedback-text correct';
                } else {
                    const correctAnswer = questionData.correctAnswer;

                    // Better handling of different data structures
                    if (correctAnswer && correctAnswer.letter && correctAnswer.text) {
                        feedbackTextElement.textContent = `Answer: ${correctAnswer.text}`;
                    } else if (correctAnswer && correctAnswer.letter) {
                        // Find the correct answer text from choices
                        const correctChoice = questionData.choices?.find(choice => choice.letter === correctAnswer.letter);
                        const answerText = correctChoice ? correctChoice.text : correctAnswer.letter;
                        feedbackTextElement.textContent = `Answer: ${answerText}`;
                    } else {
                        feedbackTextElement.textContent = 'Try again next time!';
                    }

                    feedbackTextElement.className = 'feedback-text incorrect';
                }
            }
            feedbackElement.classList.remove('hidden');
            feedbackElement.classList.add('show');

            // Auto-continue after showing feedback
            setTimeout(() => {
                hideQuestion();
            }, 2000);
        }
    }, 600);
}

function hideQuestion() {
    const gamificationOverlay = document.getElementById('gamificationOverlay');
    if (gamificationOverlay) {
        gamificationOverlay.classList.remove('show');
        setTimeout(() => {
            gamificationOverlay.classList.add('hidden');
        }, 300);
    }
}

// Add scene navigation functionality (UPDATE STORYGEN method)
function addSceneNavigation(scenes) {
    const timelineDots = document.getElementById('timelineDots');
    if (!timelineDots || !scenes) return;

    // Add click handlers to timeline dots
    const dots = timelineDots.querySelectorAll('.dot');
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            // CRITICAL: Check if avatar is fully loaded before allowing scene switching (only if avatar is being used)
            // Only check if an avatar URL is actually provided (storyteller voice selected)
            if (window.RPMAvatar && window.RPMAvatar.avatarUrl && window.RPMAvatar.avatarUrl.trim() !== '' && !window.RPMAvatar.isFullyLoaded) {
                console.warn('⚠️ Avatar not fully loaded - cannot switch scenes');
                console.log(`   Loading progress: ${window.RPMAvatar.loadingProgress}%`);
                alert('Please wait for the avatar to finish loading before switching scenes.');
                return;
            }

            // CRITICAL: If audio narration is playing, pause it before switching scenes
            if (typeof AudioNarration !== 'undefined' && AudioNarration.isPlaying) {
                console.log('⏸️ Audio narration is playing - pausing before scene switch');
                AudioNarration.pause();
            }

            // CRITICAL: If story is playing, pause it before switching scenes
            if (globalStoryboardPlayer && globalStoryboardPlayer.isPlaying) {
                console.log('⏸️ Story is playing - pausing before scene switch');
                globalStoryboardPlayer.isPlaying = false;
                globalStoryboardPlayer.stopProgress();

                // Pause background music
                if (window.backgroundMusicAudio && !window.backgroundMusicAudio.paused) {
                    window.backgroundMusicAudio.pause();
                    console.log('⏸️ Background music paused during scene switch');
                }

                // Update play/pause button UI
                const playIcon = document.querySelector('#playPauseBtn .play-icon');
                const pauseIcon = document.querySelector('#playPauseBtn .pause-icon');
                const btn = document.getElementById('playPauseBtn');
                if (playIcon) playIcon.style.display = 'inline';
                if (pauseIcon) pauseIcon.style.display = 'none';
                if (btn) btn.setAttribute('aria-pressed', 'false');

                // Set narration paused flag
                if (typeof isNarrationPaused !== 'undefined') {
                    isNarrationPaused = true;
                }
            }

            // CRITICAL: Check if audio just completed (need to wait for delay)
            if (globalStoryboardPlayer && globalStoryboardPlayer.audioCompletionTimestamp !== null) {
                const timeSinceCompletion = Date.now() - globalStoryboardPlayer.audioCompletionTimestamp;
                if (timeSinceCompletion < globalStoryboardPlayer.sceneTransitionDelay) {
                    const remainingDelay = globalStoryboardPlayer.sceneTransitionDelay - timeSinceCompletion;
                    console.warn(`⚠️ Audio just completed - waiting ${remainingDelay}ms before allowing scene switch`);
                    alert(`Please wait ${Math.ceil(remainingDelay / 100) / 10} seconds before switching scenes.`);
                    return;
                }
            }

            console.log(`🎯 Timeline dot clicked for scene ${index + 1}`, {
                dotIndex: index,
                totalDots: dots.length,
                totalScenes: scenes.length,
                globalPlayerExists: !!globalStoryboardPlayer
            });

            // Remove active class from all dots
            dots.forEach(d => d.classList.remove('active'));

            // Add active class to clicked dot
            dot.classList.add('active');

            // Use the global player's jumpToScene method for proper timing
            if (globalStoryboardPlayer && globalStoryboardPlayer.jumpToScene) {
                // Reset any question state before jumping
                globalStoryboardPlayer.currentQuestionShown = false;
                globalStoryboardPlayer.jumpToScene(index);
            } else {
                console.log(`⚠️ Using fallback method for scene ${index + 1}`);
                // Fallback to old method if player not available
                loadStoryboardScene(scenes, index + 1);
            }
        });
    });

    // Add keyboard navigation
    document.addEventListener('keydown', (e) => {
        const activeDot = timelineDots.querySelector('.dot.active');
        if (!activeDot) return;

        // CRITICAL: Check if avatar is fully loaded before allowing keyboard scene navigation
        // Only check if an avatar URL is actually provided (storyteller voice selected)
        if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && window.RPMAvatar && window.RPMAvatar.avatarUrl && window.RPMAvatar.avatarUrl.trim() !== '' && !window.RPMAvatar.isFullyLoaded) {
            console.warn('⚠️ Avatar not fully loaded - cannot navigate scenes with keyboard');
            console.log(`   Loading progress: ${window.RPMAvatar.loadingProgress}%`);
            e.preventDefault();
            return;
        }

        // CRITICAL: Check if audio narration is still playing (for arrow keys only)
        if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && typeof AudioNarration !== 'undefined' && AudioNarration.isPlaying) {
            console.warn('⚠️ Audio narration is still playing - cannot navigate scenes with keyboard');
            e.preventDefault();
            return;
        }

        // CRITICAL: Check if audio just completed (need to wait for delay) (for arrow keys only)
        if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && globalStoryboardPlayer && globalStoryboardPlayer.audioCompletionTimestamp !== null) {
            const timeSinceCompletion = Date.now() - globalStoryboardPlayer.audioCompletionTimestamp;
            if (timeSinceCompletion < globalStoryboardPlayer.sceneTransitionDelay) {
                console.warn(`⚠️ Audio just completed - waiting before allowing keyboard scene navigation`);
                e.preventDefault();
                return;
            }
        }

        const currentIndex = Array.from(dots).indexOf(activeDot);
        let newIndex = currentIndex;

        switch(e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                newIndex = Math.max(0, currentIndex - 1);
                break;
            case 'ArrowRight':
                e.preventDefault();
                newIndex = Math.min(dots.length - 1, currentIndex + 1);
                break;
            case 'Escape':
                e.preventDefault();
                // Escape key functionality (zoom removed)
                break;
            default:
                return;
        }

        if (newIndex !== currentIndex) {
            // Remove active class from all dots
            dots.forEach(d => d.classList.remove('active'));

            // Add active class to new dot
            dots[newIndex].classList.add('active');

            // Load the selected scene
            loadStoryboardScene(scenes, newIndex + 1);
        }
    });
}

// Update timeline dots (UPDATE STORYGEN method)
function updateTimelineDots() {
    const dots = document.querySelectorAll('.dot');
    dots.forEach((dot, index) => {
        const isActive = index === currentSceneIndex;
        const scene = currentStory.scenes[index];

        dot.classList.toggle('active', isActive);
        dot.setAttribute('aria-selected', isActive.toString());
        dot.setAttribute('tabindex', isActive ? '0' : '-1');

        // Add question indicator if scene has gamification
        if (scene && scene.gamification && scene.gamification.hasQuestion) {
            dot.classList.add('has-question');
            const baseTitle = scene.title || `Scene ${index + 1}`;
            dot.setAttribute('title', `${baseTitle} - Interactive Question`);
        } else {
            dot.classList.remove('has-question');
            if (scene) {
                dot.setAttribute('title', scene.title || `Scene ${index + 1}`);
            }
        }
    });
}


// Initialize enhanced features
function initializeEnhancedFeatures() {
    // Enhanced features initialization (zoom functionality removed)
}

function showNoStoryMessage() {
    const blackboardScreen = document.querySelector('.blackboard-screen');
    if (blackboardScreen) {
        blackboardScreen.innerHTML = `
            <div style="text-align: center; color: #E8F5E8; padding: 50px;">
                <h2>No Story Data Found</h2>
                <p>Please generate a story from the dashboard first.</p>
                <button onclick="goBackToDashboard()" style="margin-top: 20px; padding: 10px 20px; background: #4A7C59; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Back to Dashboard
                </button>
            </div>
        `;
    }
}

// Navigation function
function goBackToDashboard() {
    // Stop background music before leaving
    stopBackgroundMusic();

    // CRITICAL: Clear sessionStorage when navigating back to dashboard
    // This ensures old story data doesn't interfere with the dashboard
    console.log('🔄 Navigating back to dashboard - clearing sessionStorage');
    try {
        sessionStorage.removeItem('currentStory');
        console.log('✅ SessionStorage cleared before navigation');
    } catch (e) {
        console.warn('⚠️ Error clearing sessionStorage:', e);
    }

    window.location.href = '/AniKwento/source/pages/dashboard/StoryDashboard.php';
}


// Enhanced StoryboardPlayer class from UPDATE STORYGEN
class EnhancedStoryboardPlayer {
    constructor(containerId, scenes = []) {
        this.containerId = containerId;
        this.scenes = scenes;
        this.currentSceneIndex = 0;
        this.currentTime = 0;
        this.totalDuration = 0;
        this.isPlaying = false;
        this.progressInterval = null;
        this.sceneTiming = [];
        this.totalTimeSet = false;

        // Animation properties for smooth progress
        this.isAnimating = false;
        this.animationFrame = null;
        this.lastUpdateTime = 0;
        this.lastSecondUpdate = -1;

        // Debounce property for play/pause button
        this.lastToggleTime = null;

        // First play tracking for auto-fullscreen
        this.isFirstPlay = true;

        // Fullscreen timeout properties
        this.controlsTimeout = null;
        this.cursorTimeout = null;

        // Gamification properties
        this.currentQuestionShown = false;
        this.wasPlayingBeforeQuestion = false;
        this.currentSceneStartTime = null;
        this.answeredQuestions = new Set(); // Track which scenes had questions answered
        this.currentAttempts = 0; // Track attempts for current question
        this.maxAttempts = 3; // Maximum attempts allowed
        this.blockedChoices = new Set(); // Track which choices are blocked
        this.sceneRealStartTime = null; // Track when current scene actually started (for independent timing)

        // Music fade properties
        this.musicFadingOut = false; // Track if music is fading out at story end

        // Audio completion tracking for scene transition delay
        this.audioCompletionTimestamp = null; // Track when audio last completed
        this.sceneTransitionDelay = 500; // 500ms delay after audio completion before allowing scene change

        this.init();
    }

    async init() {
        // Set initial safe values
        this.currentTime = 0;
        this.totalDuration = 0;
        this.currentSceneIndex = 0;
        this.totalTimeSet = false;

        // Clear answered questions for new story
        this.answeredQuestions = new Set();

        // Clear cached DOM elements for new story
        this.currentTimeEl = null;
        this.totalTimeEl = null;

        if (this.scenes.length > 0) {
            // Calculate scene durations (now async to load audio durations)
            const sceneDurations = await calculateSceneDurations(this.scenes);
            this.sceneTiming = calculateCumulativeTiming(sceneDurations);
            this.totalDuration = this.sceneTiming[this.sceneTiming.length - 1]?.endTime || 0;

            // Debug logging
            console.log('Story initialized with:', {
                scenes: this.scenes.length,
                totalDuration: this.totalDuration,
                totalDurationFormatted: this.formatTime(this.totalDuration),
                sceneTiming: this.sceneTiming
            });

            // Debug scene timing specifically
            this.sceneTiming.forEach((timing, index) => {
                console.log(`Scene ${index + 1} timing:`, {
                    duration: timing.duration,
                    startTime: timing.startTime,
                    endTime: timing.endTime,
                    formattedStart: this.formatTime(timing.startTime),
                    formattedEnd: this.formatTime(timing.endTime)
                });
            });

            // Specifically check scene 9 if it exists
            if (this.scenes.length >= 9) {
                console.log('🔍 Scene 9 data check:', {
                    sceneExists: !!this.scenes[8],
                    timingExists: !!this.sceneTiming[8],
                    sceneData: this.scenes[8],
                    timingData: this.sceneTiming[8]
                });
            }

            // Set initial time display immediately with correct values
            this.setInitialTimeDisplay();
            this.updateProgressBar();

            // IMPORTANT: Load the first scene to display it and initialize AudioNarration properly
            // This ensures Scene 1 is displayed and AudioNarration is initialized with Scene 1's data
            loadStoryboardScene(this.scenes, 1, 0);
            console.log('✅ Initial scene (Scene 1) loaded');
        } else {
            // Set fallback display for no scenes
            this.setInitialTimeDisplay();
        }

        this.bindEvents();
        this.setupFullscreenHandlers();
        this.setupKeyboardHandlers();

        // Initialize button states
        this.initializeButtonStates();
    }


    initializeButtonStates() {
        const playIcon = document.querySelector('#playPauseBtn .play-icon');
        const pauseIcon = document.querySelector('#playPauseBtn .pause-icon');
        const btn = document.getElementById('playPauseBtn');

        // Force initial state shows play icon
        if (playIcon) {
            playIcon.style.display = 'inline';
        }
        if (pauseIcon) {
            pauseIcon.style.display = 'none';
        }
        if (btn) {
            btn.setAttribute('aria-pressed', 'false');
            btn.setAttribute('aria-label', 'Play story');
        }
    }

    setInitialTimeDisplay() {
        const currentTimeEl = document.querySelector('.current-time');
        const totalTimeEl = document.querySelector('.total-time');

        if (currentTimeEl) {
            currentTimeEl.textContent = '00:00';
        }
        if (totalTimeEl) {
            this.totalTimeSet = false;
            totalTimeEl.textContent = this.formatTime(this.totalDuration);
            this.totalTimeSet = true;
        }
    }

    formatTime(timeInMs) {
        const totalSeconds = Math.floor(timeInMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        const minuteStr = minutes.toString().padStart(2, '0');
        const secondStr = seconds.toString().padStart(2, '0');

        return `${minuteStr}:${secondStr}`;
    }

    setupKeyboardHandlers() {
        document.addEventListener('keydown', (e) => {
            const player = document.getElementById(this.containerId);

            switch(e.key) {
                case 'Escape':
                    if (player && player.classList.contains('fullscreen')) {
                        e.preventDefault();
                        this.toggleFullscreen();
                    }
                    break;
                case 'f':
                case 'F':
                    e.preventDefault();
                    this.toggleFullscreen();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.previousScene();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.nextScene();
                    break;
            }
        });

        // Mouse movement for fullscreen control visibility
        document.addEventListener('mousemove', () => this.handleMouseMove());

        // REMOVED: Visibility change handler to allow playback to continue when tab is hidden
        // Story will continue playing in background when user switches tabs
        // document.addEventListener('visibilitychange', () => {
        //     if (document.hidden) {
        //         // Tab is hidden - pause the story if it's playing
        //         if (this.isPlaying) {
        //             console.log('🔄 Tab hidden - pausing story');
        //             this.isPlaying = false;
        //             this.isAnimating = false;
        //             this.stopProgress();
        //             this.updatePlayPauseButton();
        //
        //             // Pause background music
        //             if (window.backgroundMusicAudio && !window.backgroundMusicAudio.paused) {
        //                 window.backgroundMusicAudio.pause();
        //                 console.log('🔄 Background music paused');
        //             }
        //
        //             // Pause narration audio
        //             if (typeof AudioNarration !== 'undefined' && AudioNarration.isPlaying) {
        //                 AudioNarration.pause();
        //                 console.log('🔄 Narration audio paused');
        //             }
        //             if (typeof pauseNarration === 'function') {
        //                 pauseNarration();
        //                 console.log('🔄 Narration state paused');
        //             }
        //         }
        //     }
        //     // Don't auto-resume when tab becomes visible again - user must manually play
        // });
    }

    previousScene() {
        if (this.currentSceneIndex > 0) {
            this.jumpToScene(this.currentSceneIndex - 1);
        }
    }

    nextScene() {
        if (this.currentSceneIndex < this.sceneTiming.length - 1) {
            this.jumpToScene(this.currentSceneIndex + 1);
        }
    }

    setupFullscreenHandlers() {
        const fullscreenBtn = document.getElementById('minimizeBtn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                this.toggleFullscreen();
            });
        }
    }

    toggleFullscreen() {
        const player = document.getElementById(this.containerId);
        const isFullscreen = player.classList.contains('fullscreen');

        if (isFullscreen) {
            // Exit fullscreen with smooth animation
            player.classList.remove('animate-in');
            player.classList.remove('controls-visible', 'show-cursor');

            // Add exit animation class for smoother transition
            player.classList.add('animate-out');

            // Wait for animation to complete before removing fullscreen
            setTimeout(() => {
                player.classList.remove('fullscreen');
                player.classList.remove('animate-out');
            }, 400);
        } else {
            // Enter fullscreen with animation
            player.classList.add('fullscreen');
            player.classList.add('controls-visible', 'show-cursor');

            // Trigger animation after a small delay
            setTimeout(() => {
                player.classList.add('animate-in');
            }, 50);

            // Auto-hide controls after 3 seconds
            setTimeout(() => {
                if (player.classList.contains('fullscreen')) {
                    player.classList.remove('controls-visible', 'show-cursor');
                }
            }, 3000);
        }

        // Update button icons
        const minimizeIcon = document.querySelector('#minimizeBtn .minimize-icon');
        const maximizeIcon = document.querySelector('#minimizeBtn .maximize-icon');
        const btn = document.getElementById('minimizeBtn');

        if (!isFullscreen) {
            if (minimizeIcon) minimizeIcon.style.display = 'none';
            if (maximizeIcon) maximizeIcon.style.display = 'inline';
            if (btn) btn.setAttribute('aria-label', 'Exit fullscreen');
        } else {
            if (minimizeIcon) minimizeIcon.style.display = 'inline';
            if (maximizeIcon) maximizeIcon.style.display = 'none';
            if (btn) btn.setAttribute('aria-label', 'Enter fullscreen');
        }
    }

    showControls() {
        const storyboardPlayer = document.getElementById('storyboardPlayer');
        if (storyboardPlayer) {
            storyboardPlayer.classList.add('controls-visible');
            this.resetControlsTimeout();
        }
    }

    hideControls() {
        const storyboardPlayer = document.getElementById('storyboardPlayer');
        if (storyboardPlayer && storyboardPlayer.classList.contains('fullscreen')) {
            storyboardPlayer.classList.remove('controls-visible', 'show-cursor');
        }
    }

    resetControlsTimeout() {
        const storyboardPlayer = document.getElementById('storyboardPlayer');
        if (storyboardPlayer && storyboardPlayer.classList.contains('fullscreen')) {
            clearTimeout(this.controlsTimeout);
            this.controlsTimeout = setTimeout(() => {
                this.hideControls();
            }, 3000);
        }
    }

    handleMouseMove() {
        const storyboardPlayer = document.getElementById('storyboardPlayer');
        if (storyboardPlayer && storyboardPlayer.classList.contains('fullscreen')) {
            storyboardPlayer.classList.add('show-cursor');
            this.showControls();

            clearTimeout(this.cursorTimeout);
            this.cursorTimeout = setTimeout(() => {
                if (storyboardPlayer && storyboardPlayer.classList.contains('fullscreen')) {
                    storyboardPlayer.classList.remove('show-cursor');
                }
            }, 2000);
        }
    }

    bindEvents() {
        // Play/Pause button
        const playPauseBtn = document.getElementById('playPauseBtn');
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        }

        // Progress bar click and drag - DISABLED (display only)
        const progressBar = document.querySelector('.progress-bar');
        const progressHandle = document.querySelector('.progress-handle');

        if (progressBar) {
            // Disable pointer events on progress bar to prevent interaction
            progressBar.style.cursor = 'default';
            progressBar.style.pointerEvents = 'none';

            if (progressHandle) {
                progressHandle.style.pointerEvents = 'none';
            }
        }
    }

    seekToPercentage(percentage) {
        this.currentTime = (percentage / 100) * this.totalDuration;
        this.updateProgressBar();
        this.updateTimeDisplay();

        // Update scene based on current time
        for (let i = 0; i < this.sceneTiming.length; i++) {
            const timing = this.sceneTiming[i];
            if (this.currentTime >= timing.startTime && this.currentTime < timing.endTime) {
                if (this.currentSceneIndex !== i) {
                    this.jumpToScene(i);
                } else {
                    // Same scene - just sync narration to new time position within scene
                    const elapsedInScene = this.currentTime - timing.startTime;
                    this.sceneRealStartTime = timing.startTime; // Set to scene start time, not adjusted
                    syncNarrationToTime(elapsedInScene);
                    console.log(`⏩ Seeked within scene ${i + 1} to ${Math.round(elapsedInScene/1000)}s`);

                    // Check if seeking to this position should trigger gamification question
                    this.checkSceneQuestionTiming();
                }
                break;
            }
        }
    }

    togglePlayPause() {
        // CRITICAL: Check if avatar is fully loaded before allowing playback (only if avatar is being used)
        // Only check if an avatar URL is actually provided (storyteller voice selected)
        if (window.RPMAvatar && window.RPMAvatar.avatarUrl && window.RPMAvatar.avatarUrl.trim() !== '' && !window.RPMAvatar.isFullyLoaded) {
            console.warn('⚠️ Avatar not fully loaded - cannot start playback');
            console.log(`   Loading progress: ${window.RPMAvatar.loadingProgress}%`);
            alert('Please wait for the avatar to finish loading before playing the story.');
            return;
        }

        // DEBOUNCE: Prevent rapid clicks from causing state desync
        const now = Date.now();
        if (this.lastToggleTime && (now - this.lastToggleTime) < 300) {
            console.log('⚠️ Debouncing play/pause toggle - too rapid');
            return;
        }
        this.lastToggleTime = now;

        // Toggle state
        this.isPlaying = !this.isPlaying;

        const playIcon = document.querySelector('#playPauseBtn .play-icon');
        const pauseIcon = document.querySelector('#playPauseBtn .pause-icon');
        const btn = document.getElementById('playPauseBtn');

        console.log(`🎮 togglePlayPause - New state: ${this.isPlaying ? 'PLAYING' : 'PAUSED'}`);

        if (this.isPlaying) {
            // AUTO-FULLSCREEN: Enter fullscreen on first play
            if (this.isFirstPlay) {
                console.log('🎬 First play detected - entering fullscreen mode automatically');
                const player = document.getElementById(this.containerId);
                if (player && !player.classList.contains('fullscreen')) {
                    this.toggleFullscreen();
                }
                this.isFirstPlay = false;
            }

            // Stop random wave animations when resuming playback
            if (window.RPMAvatar && window.RPMAvatar.isRandomWaveActive) {
                console.log('⏹️ Stopping random wave animations - resuming playback');
                window.RPMAvatar.stopRandomWaveAnimations();
            }

            // Update UI first
            if (playIcon) playIcon.style.display = 'none';
            if (pauseIcon) pauseIcon.style.display = 'inline';
            if (btn) btn.setAttribute('aria-pressed', 'true');

            // CRITICAL FIX: Detect if we're resuming vs starting fresh
            // Check if narration was paused (not if audio exists, because audio might auto-play on scene load)
            const isActuallyResuming = isNarrationPaused === true;

            console.log('🎮 Play state check:', {
                isActuallyResuming,
                isNarrationPaused,
                hasCurrentAudio: !!(typeof AudioNarration !== 'undefined' && AudioNarration.currentAudio),
                audioIsPlaying: typeof AudioNarration !== 'undefined' ? AudioNarration.isPlaying : 'N/A'
            });

            if (isActuallyResuming) {
                console.log('🔄 RESUMING from pause');
                // Set flag to prevent syncNarrationToTime from calling playLine() during resume
                window.justResumed = true;

                // CRITICAL: Keep justResumed flag active until the audio actually starts playing
                // This prevents syncNarrationToTime from interfering during the resume process
                const clearResumeFlag = () => {
                    // Wait for audio to be actually playing before clearing the flag
                    if (typeof AudioNarration !== 'undefined' &&
                        AudioNarration.currentAudio &&
                        !AudioNarration.currentAudio.paused &&
                        AudioNarration.isPlaying) {
                        // Audio is playing - wait 2 more seconds then clear
                        setTimeout(() => {
                            window.justResumed = false;
                            console.log('✅ justResumed flag cleared - audio is playing stably');
                        }, 2000);
                    } else {
                        // Audio not playing yet - check again in 500ms
                        setTimeout(clearResumeFlag, 500);
                    }
                };
                // Start checking after 1 second
                setTimeout(clearResumeFlag, 1000);

                // Resume narration (this calls AudioNarration.resume())
                resumeNarration();
            } else {
                console.log('▶️ FRESH START (not resuming)');
                // For fresh start, unpause the narration system
                isNarrationPaused = false;

                // CRITICAL: Manually start audio if scene has already been loaded
                // This handles the case where scene was loaded before play was pressed
                if (typeof AudioNarration !== 'undefined' && AudioNarration.scene && !AudioNarration.isPlaying) {
                    const scene = currentStory?.scenes[currentSceneIndex];
                    if (scene && AudioNarration.hasAudio(scene)) {
                        console.log('🎵 Starting audio for fresh playback - line:', currentNarrationIndex);
                        AudioNarration.playLine(currentNarrationIndex || 0).catch(err => {
                            console.warn('Failed to start audio on fresh play:', err);
                        });
                    }
                }
            }

            // Start progress timer (this starts the animation loop)
            this.startProgress();

            // Resume background music - but only if not muted
            if (window.backgroundMusicAudio && window.backgroundMusicAudio.paused) {
                // Check if volume is muted (volume is 0)
                const volumeSlider = document.getElementById('volumeSlider');
                const currentVolume = volumeSlider ? parseInt(volumeSlider.value) : (window.backgroundMusicAudio.volume * 100);

                if (currentVolume > 0) {
                    // Not muted - play the music
                    window.backgroundMusicAudio.play().catch(err => console.log('Music play error:', err));
                } else {
                    console.log('🔇 Music is muted - not resuming playback');
                }
            }

            // Note: AudioNarration.resume() is called inside resumeNarration()
            // Don't call it again here to prevent duplicate resume calls
        } else {
            // PAUSED STATE
            console.log('⏸️ Pausing story playback...');

            // Update UI first
            if (playIcon) playIcon.style.display = 'inline';
            if (pauseIcon) pauseIcon.style.display = 'none';
            if (btn) btn.setAttribute('aria-pressed', 'false');

            // Stop progress timer FIRST to prevent race conditions
            this.stopProgress();

            // CRITICAL FIX: Pause background music with explicit logging
            if (window.backgroundMusicAudio) {
                if (!window.backgroundMusicAudio.paused) {
                    console.log('⏸️ Pausing background music...');
                    window.backgroundMusicAudio.pause();
                    console.log('✅ Background music paused:', {
                        paused: window.backgroundMusicAudio.paused,
                        currentTime: window.backgroundMusicAudio.currentTime.toFixed(2) + 's'
                    });
                } else {
                    console.log('⏸️ Background music already paused');
                }
            } else {
                console.log('⏸️ No background music audio element');
            }

            // CRITICAL FIX: Pause narration transitions (this also handles AudioNarration.pause())
            console.log('⏸️ Calling pauseNarration() to pause narration audio...');
            pauseNarration();

            // Trigger wave animation on pause
            if (window.RPMAvatar && window.RPMAvatar.isFullyLoaded) {
                console.log('👋 Triggering wave animation since story is paused');
                window.RPMAvatar.triggerWaveOnPause();
            }

            console.log('✅ Story playback paused - both music and narration should be paused');
        }
    }

    startProgress() {
        this.stopProgress();
        this.lastUpdateTime = performance.now();
        this.isAnimating = true;

        console.log(`🎮 Starting progress from:`, {
            currentTime: this.currentTime,
            currentTimeFormatted: this.formatTime(this.currentTime),
            currentSceneIndex: this.currentSceneIndex,
            sceneRealStartTime: this.sceneRealStartTime,
            totalScenes: this.scenes.length
        });

        // Only set scene start time if not already set (for initial start)
        if (!this.sceneRealStartTime) {
            this.sceneRealStartTime = this.currentTime;
            console.log(`🎮 Scene timer initialized to:`, Math.round(this.sceneRealStartTime/1000));
        } else {
            console.log(`🎮 Scene timer already set to:`, Math.round(this.sceneRealStartTime/1000));
        }

        // Note: Questions will be shown during scene transitions via checkSceneTransition()

        const animate = (currentTime) => {
            if (!this.isAnimating) {
                console.log(`🎮 ANIMATION STOPPED: isAnimating = false`);
                return;
            }

            const deltaTime = currentTime - this.lastUpdateTime;
            this.lastUpdateTime = currentTime;

            // Update current time in milliseconds (like UPDATE STORYGEN)
            this.currentTime += deltaTime;

            // Start fade-out 2 seconds before story ends (if not already fading)
            const fadeOutDuration = 2000; // 2 seconds
            const timeUntilEnd = this.totalDuration - this.currentTime;

            if (timeUntilEnd <= fadeOutDuration && !this.musicFadingOut) {
                this.musicFadingOut = true;
                fadeOutBackgroundMusic();
            }

            if (this.currentTime >= this.totalDuration) {
                this.currentTime = this.totalDuration;
                this.isPlaying = false;
                this.isAnimating = false;
                this.updatePlayPauseButton();
                this.updateProgressBar();
                this.updateTimeDisplay();

                return;
            }

            // Always update progress bar for smooth animation
            this.updateProgressBar();

            // Update time display only when seconds change (use floor for stability)
            const currentSecond = Math.floor(this.currentTime / 1000);
            if (currentSecond !== this.lastSecondUpdate && currentSecond >= 0) {
                this.updateTimeDisplay();
                this.lastSecondUpdate = currentSecond;

                // Sync narration to current time position within scene
                if (this.sceneRealStartTime !== null && this.sceneRealStartTime !== undefined) {
                    const elapsedInScene = this.currentTime - this.sceneRealStartTime;
                    syncNarrationToTime(elapsedInScene);
                }

                // Debug: Log every second to verify time progression
                if (currentSecond % 5 === 0) { // Log every 5 seconds to reduce spam
                    console.log(`🎮 Time progressing: ${currentSecond}s, Scene: ${this.currentSceneIndex + 1}, SceneStartTime: ${this.sceneRealStartTime ? Math.round(this.sceneRealStartTime/1000) : 'null'}`);
                }
            }

            this.checkSceneTransition();

            // Simplified animation debug - only show every 5 seconds
            const animSecond = Math.floor(this.currentTime / 1000);
            if (animSecond % 5 === 0 && animSecond !== this.lastAnimationDebug) {
                console.log(`🎮 ANIMATION: ${animSecond}s - calling question timing`);
                this.lastAnimationDebug = animSecond;
            }

            this.checkSceneQuestionTiming();
            this.checkLastSceneCompletion();

            // Continue animation
            this.animationFrame = requestAnimationFrame(animate);
        };

        this.animationFrame = requestAnimationFrame(animate);
    }

    stopProgress() {
        console.log('🛑 Stopping progress animation at:', {
            currentTime: this.currentTime,
            currentTimeFormatted: this.formatTime(this.currentTime),
            currentSceneIndex: this.currentSceneIndex,
            sceneRealStartTime: this.sceneRealStartTime
        });

        // IMPORTANT: Set isAnimating to false FIRST to stop the animation loop immediately
        this.isAnimating = false;

        // Cancel any pending animation frame
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
            console.log('✅ Animation frame cancelled');
        }

        // Store the current time to ensure it's preserved for resume
        console.log('💾 Current position saved:', {
            time: this.currentTime,
            scene: this.currentSceneIndex + 1
        });

        // Verify the animation is actually stopped
        if (!this.isAnimating && !this.animationFrame) {
            console.log('✅ Progress stopped successfully');
        }
    }

    updateProgressBar() {
        if (this.totalDuration <= 0) return; // Prevent division by zero

        // Ensure currentTime doesn't exceed totalDuration
        const safeCurrentTime = Math.min(this.currentTime, this.totalDuration);
        const percentage = Math.max(0, Math.min(100, (safeCurrentTime / this.totalDuration) * 100));

        const progressFill = document.querySelector('.progress-fill');
        const progressHandle = document.querySelector('.progress-handle');

        if (progressFill) {
            // Use transform instead of width for better performance
            progressFill.style.transform = `scaleX(${percentage / 100})`;
            progressFill.style.transformOrigin = 'left center';
        }

        if (progressHandle) {
            progressHandle.style.left = `${percentage.toFixed(3)}%`;
        }
    }

    updateTimeDisplay() {
        const currentTimeEl = document.querySelector('.current-time');

        if (currentTimeEl) {
            currentTimeEl.textContent = this.formatTime(this.currentTime);
        }
    }

    checkSceneTransition() {
        const newSceneIndex = this.getCurrentSceneIndex();

        if (newSceneIndex !== this.currentSceneIndex) {
            // PREVENT scene transition if audio narration is still playing
            if (typeof AudioNarration !== 'undefined' && AudioNarration.isPlaying) {
                console.log(`🎵 BLOCKING scene transition: Audio narration still playing for scene ${this.currentSceneIndex + 1}`);

                // Hold at the end of the scene until audio completes
                const currentSceneTiming = this.sceneTiming[this.currentSceneIndex];
                if (currentSceneTiming) {
                    this.currentTime = currentSceneTiming.endTime - 50; // Stay 50ms before end
                }
                return; // Block the transition
            }

            // PREVENT scene transition if audio just completed (need 500ms delay)
            if (this.audioCompletionTimestamp !== null) {
                const timeSinceCompletion = Date.now() - this.audioCompletionTimestamp;
                if (timeSinceCompletion < this.sceneTransitionDelay) {
                    console.log(`🎵 BLOCKING scene transition: Audio completed ${timeSinceCompletion}ms ago, waiting ${this.sceneTransitionDelay - timeSinceCompletion}ms more`);

                    // Hold at the end of the scene until delay passes
                    const currentSceneTiming = this.sceneTiming[this.currentSceneIndex];
                    if (currentSceneTiming) {
                        this.currentTime = currentSceneTiming.endTime - 50; // Stay 50ms before end
                    }
                    return; // Block the transition
                }
                // Delay has passed, clear the timestamp and allow transition
                console.log(`✅ Audio completion delay passed (${timeSinceCompletion}ms), allowing scene transition`);
                this.audioCompletionTimestamp = null;
            }

            // PREVENT automatic scene transition if current scene has an unanswered question
            const currentScene = this.scenes[this.currentSceneIndex];
            const gamification = currentScene?.gamification;

            if (gamification && gamification.hasQuestion) {
                const sceneKey = `scene_${this.currentSceneIndex}`;
                const questionAnswered = this.answeredQuestions && this.answeredQuestions[sceneKey];

                if (!questionAnswered) {
                    console.log(`🎮 BLOCKING scene transition: Scene ${this.currentSceneIndex + 1} has unanswered question`);

                    // Pause at the end of the scene and wait for question to be answered
                    const currentSceneTiming = this.sceneTiming[this.currentSceneIndex];
                    if (currentSceneTiming) {
                        // Keep currentTime at scene boundary, don't advance
                        this.currentTime = currentSceneTiming.endTime - 100; // Stay 100ms before end
                    }

                    // Also pause the player if not already paused
                    if (this.isPlaying) {
                        this.isPlaying = false;
                        this.isAnimating = false;
                        this.updatePlayPauseButton();
                    }

                    return; // Block the transition
                }
            }

            // Hide any active question when switching scenes (allow free navigation)
            const overlay = document.getElementById('gamificationOverlay');
            const questionAlreadyShowing = overlay && overlay.classList.contains('show');

            if (questionAlreadyShowing) {
                console.log(`🎮 Question showing, hiding it to allow scene navigation`);
                // Hide the question overlay to allow scene switching
                this.hideGamificationQuestion(false);
            }

            // No question or already answered - advance to next scene
            const oldSceneIndex = this.currentSceneIndex;
            this.currentSceneIndex = newSceneIndex;
            this.currentQuestionShown = false; // Reset for new scene

            // CRITICAL FIX: Set sceneRealStartTime to the scene's scheduled start time, not currentTime
            // This prevents timing drift from animation loop overshoot
            const newSceneTiming = this.sceneTiming[this.currentSceneIndex];
            this.sceneRealStartTime = newSceneTiming ? newSceneTiming.startTime : this.currentTime;
            console.log(`🎬 Scene ${this.currentSceneIndex + 1} real start time: ${Math.round(this.sceneRealStartTime/1000)}s (scheduled), currentTime: ${Math.round(this.currentTime/1000)}s`)

            console.log(`📍 Scene transition: ${oldSceneIndex + 1} → ${this.currentSceneIndex + 1} at story time ${Math.round(this.currentTime/1000)}s (scene timer reset to 0)`);

            // CRITICAL FIX: Reset currentNarrationIndex immediately to prevent race condition
            // loadStoryboardScene() has a 250ms delay before resetting this, which causes
            // checkSceneQuestionTiming() to see the old value and trigger gamification instantly
            currentNarrationIndex = 0;
            console.log('🔄 Reset currentNarrationIndex to 0 for new scene (prevents instant gamification)');

            // CRITICAL FIX: Ensure avatar teaching animation continues during scene transition
            // The avatar should stay in teaching mode during automatic scene transitions
            if (window.RPMAvatar && window.RPMAvatar.isInitialized) {
                console.log('🎭 SCENE TRANSITION: Maintaining teaching animation state');
                window.RPMAvatar.teachingAnimationActive = true;
                window.RPMAvatar.isSpeaking = true;

                // Ensure teaching pose is active before loading new scene
                if (!window.RPMAvatar.poseTransitionActive) {
                    console.log('🎭 SCENE TRANSITION: Forcing teaching pose to stay active');
                    window.RPMAvatar.transitionToTeachingPose();
                }
            }

            // Calculate elapsed time in new scene (should be 0 or small on natural transition)
            const elapsedInNewScene = this.sceneTiming[this.currentSceneIndex]
                ? this.currentTime - this.sceneTiming[this.currentSceneIndex].startTime
                : 0;

            // CRITICAL FIX: Always pass 0 as elapsed time for automatic scene transitions
            // This ensures audio always starts from the beginning of the scene, not partway through
            // The elapsedInNewScene can be several seconds if the animation loop overshoots
            console.log(`🎬 Scene transition: elapsedInNewScene=${elapsedInNewScene}ms (forcing to 0 for fresh audio start)`);
            loadStoryboardScene(this.scenes, this.currentSceneIndex + 1, 0);
        }
    }

    checkSceneQuestionTiming() {
        console.log(`🎮 SIMPLE: checkSceneQuestionTiming called`);
        if (!this.scenes || !this.scenes[this.currentSceneIndex]) {
            console.log(`🎮 EXIT: No scenes`);
            return;
        }

        const currentScene = this.scenes[this.currentSceneIndex];
        const gamification = currentScene.gamification;

        // Get narration lines count for this scene
        const narrationLines = currentScene.narrationLines || [];
        const totalLines = narrationLines.length;
        const currentLineIndex = typeof currentNarrationIndex !== 'undefined' ? currentNarrationIndex : 0;

        console.log(`🎮 TIMING: Scene ${this.currentSceneIndex + 1}`, {
            hasQuestion: gamification ? gamification.hasQuestion : false,
            questionShown: this.currentQuestionShown,
            currentLine: currentLineIndex + 1,
            totalLines: totalLines,
            elapsed: this.sceneRealStartTime ? this.currentTime - this.sceneRealStartTime : 0,
            audioIsPlaying: typeof AudioNarration !== 'undefined' ? AudioNarration.isPlaying : 'N/A',
            audioCurrentLine: typeof AudioNarration !== 'undefined' ? AudioNarration.currentLineIndex : 'N/A'
        });

        // Check if scene has question
        if (gamification && gamification.hasQuestion && !this.currentQuestionShown) {
            console.log(`🎮 PROCESSING: Scene has question`);

            // Trigger question AFTER the last line completes (not when it starts)
            // Use gamification.triggerLine if specified, otherwise default to after last line
            const triggerLine = gamification.triggerLine || (totalLines > 0 ? totalLines - 1 : 5);

            console.log(`🎮 Trigger line: ${triggerLine + 1}, Current line: ${currentLineIndex + 1}`);

            // Trigger when we're on the trigger line AND audio has finished playing
            const audioFinished = typeof AudioNarration === 'undefined' || !AudioNarration.isPlaying;
            console.log(`🎮 Audio finished: ${audioFinished}`);

            if (currentLineIndex >= triggerLine && audioFinished) {
                console.log(`🎮🎮🎮 TRIGGERING QUESTION for Scene ${this.currentSceneIndex + 1}! 🎮🎮🎮`);

                // Pause the story progression when showing question
                this.isPlaying = false;
                this.isAnimating = false;
                this.wasPlayingBeforeQuestion = true;
                this.updatePlayPauseButton();

                // CRITICAL: Mark question as shown BEFORE showing it to prevent race conditions
                this.currentQuestionShown = true;
                this.showGamificationQuestion(gamification);
            }
        }
    }

    checkLastSceneCompletion() {
        // Check if we're on the last scene and it's completed (only for scenes WITHOUT questions)
        const isLastScene = this.currentSceneIndex === this.scenes.length - 1;
        if (!isLastScene) return;

        const currentScene = this.scenes[this.currentSceneIndex];

        // If last scene has a question, it's handled by checkSceneQuestionTiming()
        if (currentScene && currentScene.gamification && currentScene.gamification.hasQuestion) {
            return; // Let checkSceneQuestionTiming() handle it
        }

        // Only handle completion for last scenes WITHOUT questions
        const currentSceneTiming = this.sceneTiming[this.currentSceneIndex];
        if (!currentSceneTiming) return;

        const sceneEndTime = currentSceneTiming.endTime;
        const hasReachedEnd = this.currentTime >= sceneEndTime;

        if (hasReachedEnd) {
            console.log(`🎮 Last scene completed (no question) - story finished`);
            // Story naturally ends for scenes without questions
        }
    }

    getCurrentSceneIndex() {
        for (let i = 0; i < this.sceneTiming.length; i++) {
            if (this.currentTime >= this.sceneTiming[i].startTime &&
                this.currentTime < this.sceneTiming[i].endTime) {
                return i;
            }
        }
        return this.sceneTiming.length - 1; // Last scene
    }

    jumpToScene(sceneIndex, preservePlayState = false) {
        console.log(`🎬 SIMPLE TEST: jumpToScene called for scene ${sceneIndex + 1}`);
        console.log(`🎬 Attempting to jump to scene ${sceneIndex + 1}`, {
            sceneIndex,
            scenesLength: this.scenes.length,
            sceneTimingLength: this.sceneTiming.length,
            isValidIndex: sceneIndex >= 0 && sceneIndex < this.scenes.length,
            preservePlayState
        });

        if (sceneIndex >= 0 && sceneIndex < this.scenes.length) {
            // Check if sceneTiming array has this index
            if (!this.sceneTiming[sceneIndex]) {
                console.error(`❌ Scene timing not found for scene ${sceneIndex + 1}`);
                return;
            }

            // Store the current play state before jumping
            const wasPlaying = this.isPlaying;

            // Close any open question before jumping to new scene (but don't pause the story)
            this.hideGamificationQuestion(false);

            // Clear audio completion timestamp when manually jumping to a scene
            this.audioCompletionTimestamp = null;
            console.log('🔄 Cleared audio completion timestamp for manual scene jump');

            this.currentTime = this.sceneTiming[sceneIndex].startTime;
            this.currentSceneIndex = sceneIndex;
            this.currentQuestionShown = false; // Reset for new scene

            // Clear any answered question status for this scene to allow re-showing questions
            const sceneKey = `scene_${sceneIndex}`;
            this.answeredQuestions.delete(sceneKey);
            this.currentAttempts = 0; // Reset attempts
            this.blockedChoices.clear(); // Clear blocked choices

            // IMPORTANT: Reset scene real start time to current time
            // This ensures the 8-second timer starts fresh when jumping to a scene
            this.sceneRealStartTime = this.currentTime;

            // Reset time tracking to ensure proper display update
            this.lastSecondUpdate = -1;
            this.lastUpdateTime = performance.now();

            // Calculate elapsed time within this scene (should be 0 when jumping to scene start)
            const elapsedInScene = this.currentTime - this.sceneTiming[sceneIndex].startTime;

            // CRITICAL FIX: Reset currentNarrationIndex immediately to prevent race condition
            // loadStoryboardScene() has a 250ms delay before resetting this, which causes
            // checkSceneQuestionTiming() to see the old value and trigger gamification instantly
            currentNarrationIndex = 0;
            console.log('🔄 Reset currentNarrationIndex to 0 for new scene (prevents instant gamification)');

            // CRITICAL FIX: Reset narration sync variables to prevent race conditions
            // Clear old scene's narration data immediately to prevent syncNarrationToTime
            // from using stale data before displayNarrationLinesSequentially runs (after 250ms delay)
            currentNarrationLines = null;
            currentNarrationOverlay = null;
            lastLineChangeTimestamp = Date.now(); // Set to now to block rapid changes
            narrationTransitioning = false;
            console.log('🔄 Cleared narration state variables to prevent stale data during scene transition');

            // Debug logging for timing issues
            console.log(`📍 Jumped to scene ${sceneIndex + 1}:`, {
                startTime: this.sceneTiming[sceneIndex].startTime,
                currentTime: this.currentTime,
                sceneRealStartTime: this.sceneRealStartTime,
                elapsedInScene: elapsedInScene,
                formattedTime: this.formatTime(this.currentTime),
                sceneTiming: this.sceneTiming[sceneIndex],
                wasPlaying,
                preservePlayState
            });

            this.updateProgressBar();
            this.updateTimeDisplay(); // Force immediate time update

            // CRITICAL FIX: Maintain teaching animation when jumping between scenes while playing
            // This ensures the avatar stays in teaching mode during manual scene jumps
            if (wasPlaying && window.RPMAvatar && window.RPMAvatar.isInitialized) {
                console.log('🎭 JUMP SCENE: Maintaining teaching animation state (was playing)');
                window.RPMAvatar.teachingAnimationActive = true;
                window.RPMAvatar.isSpeaking = true;

                // Ensure teaching pose is active before loading new scene
                if (!window.RPMAvatar.poseTransitionActive) {
                    console.log('🎭 JUMP SCENE: Forcing teaching pose to stay active');
                    window.RPMAvatar.transitionToTeachingPose();
                }
            }

            // CRITICAL FIX: Always pause the story BEFORE loading the scene
            // This prevents audio from auto-starting during scene load
            this.isPlaying = false;
            this.isAnimating = false;
            console.log(`🎮 Scene switched - story paused (user can press play to continue)`);
            this.updatePlayPauseButton();

            loadStoryboardScene(this.scenes, sceneIndex + 1, elapsedInScene);

            // Also pause narration to prevent audio from playing automatically
            if (typeof pauseNarration === 'function') {
                pauseNarration();
            }

            // Reset music fade flag when jumping to a scene
            this.musicFadingOut = false;

            // FIXED: Don't auto-play music when switching scenes - keep it paused
            // Music will resume when user presses play button
            if (window.backgroundMusicAudio) {
                // Re-enable loop if it was disabled (from story end)
                window.backgroundMusicAudio.loop = true;

                // Pause the music if it's playing
                if (!window.backgroundMusicAudio.paused) {
                    window.backgroundMusicAudio.pause();
                    console.log('🔇 Background music paused after scene switch');
                }
            }

            // Cancel any existing animation frame
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
                this.animationFrame = null;
            }
            // Don't start progress - story is paused when switching scenes

            // Scene successfully jumped to

        } else {
            console.error(`❌ Cannot jump to scene ${sceneIndex + 1}: Invalid scene index`, {
                sceneIndex,
                scenesLength: this.scenes.length,
                validRange: `0 to ${this.scenes.length - 1}`
            });
        }
    }

    // Gamification questions are now handled during scene transitions in checkSceneTransition()

    showGamificationQuestion(gamification) {
        console.log(`🎮 showGamificationQuestion called with:`, gamification);

        // CRITICAL: Ensure gamification overlay is properly initialized and visible
        const overlay = document.getElementById('gamificationOverlay');
        if (!overlay) {
            console.error('❌ Gamification overlay not found in DOM!');
            return;
        }

        // CRITICAL: Force remove hidden class and add show class immediately
        overlay.classList.remove('hidden');
        overlay.classList.add('show');
        console.log('🎮 Gamification overlay classes:', overlay.className);

        // Clear any lingering animations from previous attempts
        const existingButtons = document.querySelectorAll('.choice-btn');
        existingButtons.forEach(btn => {
            btn.classList.remove('correct', 'incorrect', 'correct-pulse');
        });

        // Store the playing state before pausing
        this.wasPlayingBeforeQuestion = this.isPlaying;

        // Stop narration audio when gamification appears
        if (typeof AudioNarration !== 'undefined') {
            AudioNarration.stop();
            console.log('🎵 Narration audio stopped for gamification');
        }
        if (typeof pauseNarration === 'function') {
            pauseNarration();
            console.log('🎵 Narration paused for gamification');
        }

        // ALWAYS crossfade story background music to question music when question shows
        // (regardless of playing state)
        console.log('🎵 Checking background music state:', {
            exists: !!window.backgroundMusicAudio,
            paused: window.backgroundMusicAudio ? window.backgroundMusicAudio.paused : 'N/A'
        });

        // Crossfade from story music to question music
        crossfadeToQuestionMusic();

        // Pause the story using multiple methods to ensure it stops
        if (this.isPlaying) {
            this.isPlaying = false;
            this.isAnimating = false;

            // Cancel any running animation frames
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
                this.animationFrame = null;
            }

            // Update UI to show paused state
            this.updatePlayPauseButton();

            // Trigger wave animation when paused for gamification
            if (window.RPMAvatar && window.RPMAvatar.isFullyLoaded) {
                console.log('👋 Triggering wave animation - paused for gamification');
                window.RPMAvatar.triggerWaveOnPause();
            }
        }

        const questionText = document.getElementById('questionText');
        const answerChoices = document.getElementById('answerChoices');
        const feedback = document.getElementById('questionFeedback');

        console.log(`🎮 DOM Elements found:`, {
            overlay: !!overlay,
            questionText: !!questionText,
            answerChoices: !!answerChoices,
            feedback: !!feedback
        });

        if (!overlay || !questionText || !answerChoices || !feedback) {
            console.error(`🎮 Missing DOM elements!`, {
                overlay, questionText, answerChoices, feedback
            });
            return;
        }

        // Set question text
        questionText.textContent = gamification.question;

        // Reset attempts and blocked choices for new question (only if this is the first time showing this question)
        if (this.currentAttempts === 0) {
            this.blockedChoices.clear();
        }

        // Create choice buttons
        answerChoices.innerHTML = '';

        console.log(`🎮 FULL gamification object:`, JSON.stringify(gamification, null, 2));
        console.log(`🎮 choices property:`, gamification.choices);
        console.log(`🎮 choices type:`, typeof gamification.choices);
        console.log(`🎮 choices length:`, gamification.choices ? gamification.choices.length : 'undefined');
        console.log(`🎮 Current attempts: ${this.currentAttempts}/${this.maxAttempts}, Blocked choices:`, Array.from(this.blockedChoices));

        if (gamification.choices && Array.isArray(gamification.choices) && gamification.choices.length > 0) {
            console.log(`🎮 Creating ${gamification.choices.length} choice buttons`);
            gamification.choices.forEach((choice, index) => {
                console.log(`🎮 Processing choice ${index}:`, choice);
                const button = document.createElement('button');
                button.className = 'choice-btn';
                button.dataset.choice = choice.letter;
                button.textContent = choice.text;

                // Check if this choice is blocked (previously answered incorrectly)
                if (this.blockedChoices.has(choice.letter)) {
                    button.classList.add('blocked');
                    button.disabled = true;
                    console.log(`🎮 Choice ${choice.letter} is blocked`);
                } else {
                    button.addEventListener('click', () => this.handleAnswerChoice(choice.letter, gamification.correctAnswer, gamification));
                }

                answerChoices.appendChild(button);
                console.log(`🎮 Created choice button: ${choice.letter}) ${choice.text}`);
            });
        } else {
            console.error(`🎮 ERROR - Invalid or missing choices:`, {
                hasChoices: !!gamification.choices,
                isArray: Array.isArray(gamification.choices),
                length: gamification.choices ? gamification.choices.length : 'undefined',
                gamificationKeys: Object.keys(gamification),
                fullGamification: gamification
            });

            // Create default choices as fallback
            console.log(`🎮 Creating fallback choices for testing...`);
            const fallbackChoices = [
                { letter: "A", text: "Option A" },
                { letter: "B", text: "Option B" },
                { letter: "C", text: "Option C" },
                { letter: "D", text: "Option D" }
            ];

            fallbackChoices.forEach((choice, index) => {
                const button = document.createElement('button');
                button.className = 'choice-btn';
                button.dataset.choice = choice.letter;
                button.textContent = choice.text;

                // Check if this choice is blocked
                if (this.blockedChoices.has(choice.letter)) {
                    button.classList.add('blocked');
                    button.disabled = true;
                    console.log(`🎮 Fallback choice ${choice.letter} is blocked`);
                } else {
                    const fallbackGamification = {
                        question: "Test Question",
                        choices: fallbackChoices,
                        correctAnswer: { letter: "B", text: "Option B" },
                        hasQuestion: true
                    };
                    button.addEventListener('click', () => this.handleAnswerChoice(choice.letter, { letter: "B", text: "Option B" }, fallbackGamification));
                }

                answerChoices.appendChild(button);
                console.log(`🎮 Created fallback choice button: ${choice.letter}) ${choice.text}`);
            });
        }

        // Reset feedback
        feedback.classList.add('hidden');
        feedback.classList.remove('show');

        // Show overlay with animation
        console.log(`🎮 Showing gamification overlay for question:`, gamification.question);

        // Make sure overlay is ready to be shown
        overlay.classList.remove('hidden');
        overlay.classList.remove('show'); // Remove any existing show class

        // Force reflow to ensure hidden class is removed
        overlay.offsetHeight;

        // Add show class immediately (no setTimeout to avoid glitches)
        overlay.classList.add('show');

        console.log(`🎮 Overlay shown with classes:`, overlay.className);
        console.log(`🎮 Overlay opacity:`, window.getComputedStyle(overlay).opacity);
        console.log(`🎮 Overlay visibility:`, window.getComputedStyle(overlay).visibility);

        // TTS disabled for gamification questions
        // Users will read questions themselves
    }

    handleAnswerChoice(selectedLetter, correctAnswer, gamificationData) {
        const buttons = document.querySelectorAll('.choice-btn:not(.blocked)');
        const feedback = document.getElementById('questionFeedback');
        const feedbackText = feedback.querySelector('.feedback-text');

        // Increment attempt counter
        this.currentAttempts++;

        console.log(`🎮 Answer attempt ${this.currentAttempts}/${this.maxAttempts}: Selected ${selectedLetter}, Correct is ${correctAnswer.letter}`);

        // Find selected button
        const selectedButton = document.querySelector(`[data-choice="${selectedLetter}"]`);
        const correctButton = document.querySelector(`[data-choice="${correctAnswer.letter}"]`);

        const isCorrect = selectedLetter === correctAnswer.letter;

        if (isCorrect) {
            // CORRECT ANSWER
            console.log(`🎮 Correct answer! Proceeding to next scene.`);

            // Play correct answer sound
            playCorrectAnswerSound();

            // Disable all buttons
            buttons.forEach(btn => {
                btn.classList.add('disabled');
                btn.style.pointerEvents = 'none';
            });

            // Animate selected button as correct with pulsing animation
            if (selectedButton) {
                selectedButton.classList.add('disabled');
                selectedButton.style.pointerEvents = 'none';

                // Start pulsing animation for correct answer
                setTimeout(() => {
                    selectedButton.classList.add('correct-pulse');
                    console.log(`🎮 Started pulsing animation for correct answer - should continue for 3+ seconds`);
                }, 200);
            }

            // Show success feedback for 3 seconds
            setTimeout(() => {
                if (feedbackText) {
                    feedbackText.textContent = `Correct! Well done!`;
                    feedbackText.className = 'feedback-text correct';
                }

                feedback.classList.remove('hidden');
                feedback.classList.add('show');
                console.log(`🎮 Showing success feedback, will wait 3 seconds before next scene`);

                // Continue to next scene after exactly 3 seconds of showing feedback
                setTimeout(() => {
                    console.log(`🎮 3 seconds elapsed, moving to next scene`);

                    // Don't clean up animations yet - let hideGamificationQuestion handle it
                    this.hideGamificationQuestion();
                    this.currentAttempts = 0; // Reset for next question
                    this.blockedChoices.clear(); // Reset blocked choices
                }, 3000); // Exactly 3 seconds from when feedback shows
            }, 400);

        } else {
            // WRONG ANSWER
            console.log(`🎮 Wrong answer. Attempts: ${this.currentAttempts}/${this.maxAttempts}`);

            // Play wrong answer sound
            playWrongAnswerSound();

            // Block this choice for future attempts
            this.blockedChoices.add(selectedLetter);

            // Animate selected button as incorrect
            if (selectedButton) {
                selectedButton.classList.add('incorrect', 'blocked');
                selectedButton.disabled = true;
            }

            if (this.currentAttempts >= this.maxAttempts) {
                // MAX ATTEMPTS REACHED - Show correct answer with enhanced animation
                console.log(`🎮 Max attempts reached (${this.maxAttempts}). Showing correct answer with animation for 3 seconds.`);

                // Disable all buttons including correct answer
                buttons.forEach(btn => {
                    btn.classList.add('disabled');
                    btn.style.pointerEvents = 'none';
                    // Don't mark the correct button as blocked - it will get special treatment
                    if (btn !== correctButton) {
                        btn.classList.add('blocked');
                    }
                });

                // Wait 0.5 seconds after wrong answer, then show correct answer with sound
                setTimeout(() => {
                    // Play correct answer sound after delay
                    playCorrectAnswerSound();

                    // Show correct answer with pulsing animation (NOT CLICKABLE)
                    if (correctButton) {
                        // Clear any existing animation classes first to prevent conflicts
                        correctButton.classList.remove('correct', 'incorrect', 'blocked');
                        correctButton.classList.add('disabled');
                        correctButton.style.pointerEvents = 'none';
                        correctButton.disabled = true; // Extra safety to prevent clicking

                        // Start pulsing animation
                        correctButton.classList.add('correct-pulse');
                        console.log(`🎮 Started pulsing animation for correct answer - NOT CLICKABLE, animation only`);
                    }
                }, 500); // 0.5 second delay

                // Show failure feedback with correct answer
                setTimeout(() => {
                    if (feedbackText) {
                        feedbackText.textContent = `Correct answer: ${correctAnswer.text}`;
                        feedbackText.className = 'feedback-text incorrect';
                    }

                    feedback.classList.remove('hidden');
                    feedback.classList.add('show');
                    console.log(`🎮 Showing feedback, will wait 3 seconds before next scene`);

                    // Continue to next scene after exactly 3 seconds of showing feedback
                    setTimeout(() => {
                        console.log(`🎮 3 seconds elapsed, moving to next scene`);

                        // Don't clean up animations yet - let hideGamificationQuestion handle it
                        this.hideGamificationQuestion();
                        this.currentAttempts = 0; // Reset for next question
                        this.blockedChoices.clear(); // Reset blocked choices
                    }, 3000); // Exactly 3 seconds from when feedback shows
                }, 400);

            } else {
                // WRONG BUT STILL HAS ATTEMPTS - Let them try again
                const remainingAttempts = this.maxAttempts - this.currentAttempts;
                console.log(`🎮 Wrong answer, ${remainingAttempts} attempts remaining. Letting user try again.`);

                // Play wrong answer sound for 2nd and 3rd attempts as well
                playWrongAnswerSound();

                // Disable ALL buttons temporarily during feedback display
                buttons.forEach(btn => {
                    btn.classList.add('disabled');
                    btn.style.pointerEvents = 'none';
                });

                // Show try again feedback with extended delay sequence
                setTimeout(() => {
                    if (feedbackText) {
                        feedbackText.textContent = `Try again!`;
                        feedbackText.className = 'feedback-text incorrect';
                    }

                    feedback.classList.remove('hidden');
                    setTimeout(() => {
                        feedback.classList.add('show');
                        console.log(`🎮 Showing "Try again!" feedback, all buttons disabled temporarily`);

                        // Hide feedback and add extra delay before retry
                        setTimeout(() => {
                            feedback.classList.remove('show');
                            console.log(`🎮 Hiding feedback, waiting additional 1 second before enabling retry`);

                            setTimeout(() => {
                                feedback.classList.add('hidden');

                                // Add additional delay before re-enabling unblocked choices
                                setTimeout(() => {
                                    console.log(`🎮 Re-enabling unblocked choices for retry attempt`);

                                    // Re-enable only unblocked choices
                                    buttons.forEach(btn => {
                                        const choiceLetter = btn.dataset.choice;
                                        if (!this.blockedChoices.has(choiceLetter)) {
                                            btn.classList.remove('disabled');
                                            btn.style.pointerEvents = '';
                                            console.log(`🎮 Re-enabled choice ${choiceLetter}`);
                                        } else {
                                            console.log(`🎮 Choice ${choiceLetter} remains blocked`);
                                        }
                                    });
                                }, 1000); // Extra 1 second delay before retry
                            }, 300);
                        }, 2500); // Show feedback for 2.5 seconds before starting hide sequence
                    }, 50);
                }, 400); // Slightly longer initial delay
            }
        }
    }

    hideGamificationQuestion(pauseAfterHiding = true) {
        const overlay = document.getElementById('gamificationOverlay');
        if (!overlay) return;

        // Check if overlay is actually visible before hiding
        const isVisible = overlay.classList.contains('show');

        if (!isVisible) {
            console.log(`🎮 Overlay already hidden, skipping hide`);
            return;
        }

        console.log(`🎮 Hiding gamification overlay`);

        // Stop TTS if playing
        if (window.GamificationTTS) {
            window.GamificationTTS.cleanup();
        }

        // Crossfade from question music back to story music
        crossfadeToStoryMusic();

        // Hide with animation first
        overlay.classList.remove('show');

        // Clean up animations only after overlay starts hiding
        setTimeout(() => {
            console.log(`🎮 Cleaning up button animations and states`);
            const allButtons = document.querySelectorAll('.choice-btn');
            allButtons.forEach(btn => {
                // Remove all animation and state classes
                btn.classList.remove('correct-pulse', 'correct', 'incorrect', 'disabled', 'blocked');
                btn.style.pointerEvents = '';
                btn.disabled = false;

                // Force a reflow to ensure CSS changes take effect
                btn.offsetHeight;
            });
        }, 200); // Clean up after overlay transition starts
        setTimeout(() => {
            overlay.classList.add('hidden');

            // Reset question state and mark as answered for this scene
            this.currentQuestionShown = false;
            const sceneKey = `scene_${this.currentSceneIndex}`;
            this.answeredQuestions.add(sceneKey);

            // Resume story playback after answering question if it was playing before
            if (isVisible && pauseAfterHiding) {
                console.log('🎮 Question answered - moving to next scene');

                // Check if this was the last scene
                const isLastScene = this.currentSceneIndex === this.scenes.length - 1;
                if (isLastScene) {
                    console.log('🎮 Last scene question answered - finishing story');
                    // Set time to end to complete the story
                    this.currentTime = this.totalDuration;
                    this.isPlaying = false;
                    this.isAnimating = false;
                    this.updatePlayPauseButton();
                    this.updateProgressBar();
                    this.updateTimeDisplay();

                    // Trigger wave animation when story ends
                    if (window.RPMAvatar && window.RPMAvatar.isFullyLoaded) {
                        console.log('👋 Triggering wave animation - story finished');
                        window.RPMAvatar.triggerWaveOnPause();
                    }

                    // Fade out background music when story ends
                    fadeOutBackgroundMusic();
                } else {
                    // Move to next scene immediately after answering question
                    const nextSceneIndex = this.currentSceneIndex + 1;
                    if (nextSceneIndex < this.scenes.length) {
                        this.currentSceneIndex = nextSceneIndex;
                        this.currentTime = this.sceneTiming[nextSceneIndex].startTime;
                        this.sceneRealStartTime = this.currentTime; // Reset scene timer for new scene
                        this.currentQuestionShown = false; // Reset for new scene

                        // CRITICAL FIX: Reset currentNarrationIndex immediately to prevent race condition
                        // loadStoryboardScene() has a 250ms delay before resetting this, which causes
                        // checkSceneQuestionTiming() to see the old value and trigger gamification instantly
                        currentNarrationIndex = 0;
                        console.log('🔄 Reset currentNarrationIndex to 0 for new scene (prevents instant gamification)');

                        // Stop random wave animations when resuming playback
                        if (window.RPMAvatar && window.RPMAvatar.isRandomWaveActive) {
                            console.log('⏹️ Stopping random wave animations - auto-resuming after question');
                            window.RPMAvatar.stopRandomWaveAnimations();
                        }

                        // CRITICAL FIX: Set isPlaying to true BEFORE calling loadStoryboardScene
                        // This ensures that displayNarrationLinesSequentially() will start audio playback
                        // when it's called inside loadStoryboardScene()
                        this.isPlaying = true;
                        this.isAnimating = true;
                        this.wasPlayingBeforeQuestion = true; // Ensure we remember the playing state
                        this.updatePlayPauseButton();
                        this.lastUpdateTime = performance.now();
                        this.lastSecondUpdate = -1;

                        // Load the next scene - audio will automatically start because isPlaying is now true
                        loadStoryboardScene(this.scenes, nextSceneIndex + 1);
                        console.log(`🎮 Advanced to scene ${nextSceneIndex + 1} after answering question (scene timer reset)`);

                        // Start the progress animation
                        this.startProgress();

                        // Audio playback is handled automatically by loadStoryboardScene() -> displayNarrationLinesSequentially()
                        // because we set isPlaying = true before calling loadStoryboardScene()
                        console.log('🎮 Story auto-resumed after answering question - new scene audio will play automatically');
                    }
                }
            }
        }, 300);
    }

    updatePlayPauseButton() {
        const playIcon = document.querySelector('#playPauseBtn .play-icon');
        const pauseIcon = document.querySelector('#playPauseBtn .pause-icon');
        const btn = document.getElementById('playPauseBtn');

        if (this.isPlaying) {
            if (playIcon) playIcon.style.display = 'none';
            if (pauseIcon) pauseIcon.style.display = 'inline';
            if (btn) {
                btn.setAttribute('aria-pressed', 'true');
                btn.setAttribute('aria-label', 'Pause story');
            }
        } else {
            if (playIcon) playIcon.style.display = 'inline';
            if (pauseIcon) pauseIcon.style.display = 'none';
            if (btn) {
                btn.setAttribute('aria-pressed', 'false');
                btn.setAttribute('aria-label', 'Play story');
            }
        }
    }
}

// Parse narration text into 6 lines
function parseNarrationLines(narration, sceneNumber) {
    if (!narration) {
        return [`Scene ${sceneNumber} content`];
    }

    // Check if narration is already formatted with numbered lines (1. 2. 3. etc.)
    const numberedLinesMatch = narration.match(/^\d+\.\s*.+$/gm);

    if (numberedLinesMatch && numberedLinesMatch.length >= 6) {
        // Extract the first 6 numbered lines and remove the numbers
        return numberedLinesMatch.slice(0, 6).map(line => line.replace(/^\d+\.\s*/, '').trim());
    }

    // If not formatted with numbers, try splitting by newlines or sentence breaks
    const lines = narration.split(/[\n\r]+/).filter(line => line.trim().length > 0);

    if (lines.length >= 6) {
        return lines.slice(0, 6);
    } else if (lines.length > 0) {
        // If fewer than 6 lines, return what we have
        return lines;
    }

    // Fallback: split by sentences
    const sentences = narration.split(/[.!?]+/).filter(s => s.trim().length > 0).map(s => s.trim() + '.');
    return sentences.slice(0, 6);
}

// Display narration lines sequentially with timing
let narrationInterval = null;
let narrationFirstTimeout = null; // Track the first transition timeout
let narrationTransitioning = false; // Flag to prevent overlapping transitions
let currentNarrationLines = [];
let currentNarrationIndex = 0;
let currentNarrationOverlay = null;
let isNarrationPaused = true; // START PAUSED - User must click Play to begin
let lastLineChangeTimestamp = 0; // Track when the line last changed to prevent flickering
const SECONDS_PER_LINE = 7; // 7 seconds per line (text displays while audio plays simultaneously)
const LINE_CHANGE_STABILITY_MS = 1500; // Don't allow line changes within 1.5s of last change

// Calculate which narration line should be displayed based on elapsed time in scene
function calculateNarrationLineIndex(elapsedTimeMs, totalLines) {
    if (!totalLines || totalLines === 0) return 0;

    // Try to use AudioNarration's dynamic timing if available
    if (typeof AudioNarration !== 'undefined' && AudioNarration.scene && AudioNarration.audioDurationsLoaded) {
        const lineIndex = AudioNarration.getLineIndexAtTime(elapsedTimeMs);
        return Math.max(0, Math.min(lineIndex, totalLines - 1));
    }

    // Fallback to fixed 6-second intervals
    const elapsedSeconds = elapsedTimeMs / 1000;
    const lineIndex = Math.floor(elapsedSeconds / SECONDS_PER_LINE);
    return Math.max(0, Math.min(lineIndex, totalLines - 1));
}

// Sync narration display to specific time position
function syncNarrationToTime(elapsedTimeMs) {
    if (!currentNarrationLines || currentNarrationLines.length === 0 || !currentNarrationOverlay) {
        return;
    }

    // Skip if paused
    if (isNarrationPaused) {
        return;
    }

    // Skip if already transitioning to prevent overlapping animations
    if (narrationTransitioning) {
        return;
    }

    // CRITICAL FIX: Block sync if audio is initializing (scene transition)
    if (typeof AudioNarration !== 'undefined' && AudioNarration.isInitializing) {
        console.log('🎵 Sync blocked - scene is initializing, preventing interference during transition');
        return;
    }

    // CRITICAL FIX: Block sync if audio is currently resuming to prevent interference
    if (typeof AudioNarration !== 'undefined' && AudioNarration.isResuming) {
        console.log('🎵 Sync blocked - audio is resuming, preventing interference');
        return;
    }

    // CRITICAL FIX: Block sync if we just resumed to prevent line changes
    // This must be checked BEFORE calculating the target line index
    if (window.justResumed) {
        // Don't even calculate line changes - just let the resumed audio play
        return;
    }

    const targetLineIndex = calculateNarrationLineIndex(elapsedTimeMs, currentNarrationLines.length);

    // Only update if line changed
    if (targetLineIndex !== currentNarrationIndex) {
        console.log(`📖 Sync requested: line ${currentNarrationIndex + 1} → ${targetLineIndex + 1} at ${Math.round(elapsedTimeMs/1000)}s`);

        // CRITICAL FIX: Prevent flickering by enforcing stability period after line changes
        // Don't allow line changes within 1.5 seconds of the last change
        const timeSinceLastChange = Date.now() - lastLineChangeTimestamp;
        if (timeSinceLastChange < LINE_CHANGE_STABILITY_MS) {
            console.log(`📖 Sync blocked - stability period active (${timeSinceLastChange}ms < ${LINE_CHANGE_STABILITY_MS}ms)`);
            return;
        }

        // Double-check justResumed flag again before making any changes
        if (window.justResumed) {
            console.log('🎵 Sync blocked - justResumed flag active, allowing resume to complete');
            return;
        }

        // CRITICAL FIX: Don't call playLine if audio is already playing the correct line
        if (typeof AudioNarration !== 'undefined' && AudioNarration.isPlaying) {
            const audioLineIndex = AudioNarration.currentLineIndex;
            if (audioLineIndex === targetLineIndex) {
                console.log('🎵 Sync skipped - audio already playing correct line:', targetLineIndex + 1);
                // Update the text display even if audio is correct, in case text is out of sync
                if (currentNarrationIndex !== targetLineIndex) {
                    currentNarrationIndex = targetLineIndex;
                    if (currentNarrationOverlay && currentNarrationLines[targetLineIndex]) {
                        currentNarrationOverlay.innerHTML = `<strong>${currentNarrationLines[targetLineIndex]}</strong>`;
                        console.log(`📖 Text display synced to match audio line ${targetLineIndex + 1}`);
                    }
                }
                return; // Audio is playing correct line, just sync the text
            }
            // CHANGED: Don't block if trying to sync to a line that audio should be on
            // This allows the text to stay in sync with audio timing
            // Only skip the playLine call if audio is handling transitions automatically
            console.log(`🎵 Audio on line ${audioLineIndex + 1}, syncing text to line ${targetLineIndex + 1}`);
        }

        narrationTransitioning = true;

        // Use smooth transition when line changes
        currentNarrationOverlay.style.transition = 'opacity 0.3s ease-in-out';
        currentNarrationOverlay.style.opacity = '0';

        setTimeout(() => {
            currentNarrationIndex = targetLineIndex;
            currentNarrationOverlay.innerHTML = `<strong>${currentNarrationLines[currentNarrationIndex]}</strong>`;

            // CRITICAL FIX: Wait for DOM to update before fading in to prevent flickering
            // Use requestAnimationFrame to ensure the content change is rendered before starting fade-in
            requestAnimationFrame(() => {
                currentNarrationOverlay.style.opacity = '1';
            });

            // CRITICAL FIX: Update timestamp after line change to prevent flickering
            lastLineChangeTimestamp = Date.now();
            console.log(`📖 Synced to line ${currentNarrationIndex + 1}/${currentNarrationLines.length} - stability timer reset`);

            // CRITICAL FIX: Don't call playLine if we just resumed - audio is already playing/resuming
            const shouldPlayAudio = !window.justResumed;

            // CRITICAL FIX: Don't interrupt audio that's already playing
            // The AudioNarration module has its own auto-play logic that handles line progression
            // syncNarrationToTime should ONLY trigger playLine when seeking/jumping, not during normal playback
            if (shouldPlayAudio && typeof AudioNarration !== 'undefined') {
                const scene = currentStory?.scenes[currentSceneIndex];
                console.log('🎵 Sync - Checking audio for new line:', {
                    lineIndex: currentNarrationIndex,
                    hasScene: !!scene,
                    hasAudioUrls: !!scene?.audioUrls,
                    audioUrlsCount: scene?.audioUrls?.length || 0,
                    audioIsPlaying: AudioNarration.isPlaying,
                    audioCurrentLine: AudioNarration.currentLineIndex
                });

                // CRITICAL FIX: Don't call playLine during normal playback progression
                // AudioNarration.onended handler already handles auto-playing next lines
                // Only call playLine if audio is NOT currently playing (paused or stopped)
                if (scene && AudioNarration.hasAudio(scene)) {
                    // For single-audio scenes, don't play on line transitions (audio is already playing)
                    if (scene.audioUrls.length === 1) {
                        console.log('🎵 Sync - Skipping (single scene audio already playing)');
                    } else if (scene.audioUrls.length > 1) {
                        // CRITICAL FIX: Only play audio if it's NOT currently playing
                        // This prevents interrupting the current narration
                        if (AudioNarration.isPlaying) {
                            console.log(`🎵 Sync - Skipping playLine (audio already playing line ${AudioNarration.currentLineIndex + 1}, will auto-progress to line ${currentNarrationIndex + 1})`);
                        } else {
                            // Audio is paused/stopped - safe to play the new line
                            console.log(`🎵 Sync - Playing audio for line ${currentNarrationIndex + 1} (audio was not playing)`);
                            AudioNarration.playLine(currentNarrationIndex).catch(err => {
                                console.warn('Audio playback failed during sync, continuing with text:', err);
                            });
                        }
                    }
                } else {
                    console.warn('⚠️ Sync - No audio available for line', currentNarrationIndex);
                }
            } else if (window.justResumed) {
                console.log('🎵 Sync - Skipping playLine (justResumed flag is set)');
            }

            // Release the lock after transition completes
            setTimeout(() => {
                narrationTransitioning = false;
            }, 300);
        }, 300);
    }
}

function displayNarrationLinesSequentially(narrationOverlay, lines, startTimeMs = 0) {
    console.log('📖 displayNarrationLinesSequentially called, isNarrationPaused:', isNarrationPaused, 'startTime:', startTimeMs);

    // Clear any existing interval AND timeout to prevent glitches when switching scenes
    if (narrationInterval) {
        clearInterval(narrationInterval);
        narrationInterval = null;
    }
    if (narrationFirstTimeout) {
        clearTimeout(narrationFirstTimeout);
        narrationFirstTimeout = null;
    }
    // Reset transitioning flag
    narrationTransitioning = false;

    // Store references globally so pause/resume can access them
    currentNarrationLines = lines;
    currentNarrationOverlay = narrationOverlay;

    // CRITICAL FIX: For new scenes (startTimeMs < 1000ms), always start at line 0
    // This prevents race conditions where the animation loop has incremented time slightly
    // before displayNarrationLinesSequentially runs, causing wrong line calculation
    // Increased from 500ms to 1000ms to handle slower devices and animation loop delays
    const isNewSceneLoad = startTimeMs < 1000; // Less than 1000ms means fresh scene load
    const startLineIndex = isNewSceneLoad ? 0 : calculateNarrationLineIndex(startTimeMs, lines.length);
    currentNarrationIndex = startLineIndex;

    if (isNewSceneLoad && startTimeMs > 0) {
        console.log(`📖 Forced startLineIndex to 0 (was calculated as ${calculateNarrationLineIndex(startTimeMs, lines.length)}) - fresh scene load detected (startTime: ${startTimeMs}ms)`);
    }

    // Display the appropriate line with smooth fade-in
    if (lines.length > 0) {
        // Reset opacity and set up transition
        narrationOverlay.style.transition = 'opacity 0.3s ease-in-out';
        narrationOverlay.style.opacity = '0';
        narrationOverlay.innerHTML = `<strong>${lines[currentNarrationIndex]}</strong>`;

        // CRITICAL FIX: Set timestamp to prevent flickering during initial display
        lastLineChangeTimestamp = Date.now();

        // CRITICAL FIX: Wait for DOM to update before fading in to prevent flickering
        // Use requestAnimationFrame to ensure the content change is rendered before starting fade-in
        requestAnimationFrame(() => {
            narrationOverlay.style.opacity = '1';
            console.log(`📖 Showing line ${currentNarrationIndex + 1}/${lines.length} (synced to ${Math.round(startTimeMs/1000)}s) - stability timer set`);
        });

        // Play audio immediately when line displays IF story is playing (check globalStoryboardPlayer)
        const shouldPlayAudio = typeof AudioNarration !== 'undefined' &&
                               globalStoryboardPlayer &&
                               globalStoryboardPlayer.isPlaying;

        if (shouldPlayAudio) {
            const scene = currentStory?.scenes[currentSceneIndex];
            console.log('🎵 Playing audio immediately with text:', {
                hasScene: !!scene,
                sceneIndex: currentSceneIndex,
                lineIndex: currentNarrationIndex,
                hasAudioUrls: !!scene?.audioUrls,
                audioUrlsCount: scene?.audioUrls?.length || 0,
                audioNarrationHasAudio: AudioNarration.hasAudio(scene),
                storyIsPlaying: globalStoryboardPlayer?.isPlaying,
                audioIsPlaying: AudioNarration.isPlaying
            });
            if (scene && AudioNarration.hasAudio(scene)) {
                // CRITICAL FIX: Only start audio if it's NOT already playing
                // This prevents interrupting ongoing narration when scenes are loaded
                if (AudioNarration.isPlaying) {
                    console.log('🎵 Audio already playing, skipping playLine to avoid interruption');
                } else if (scene.audioUrls.length === 1 && currentNarrationIndex === 0) {
                    // For single-audio scenes, only play on the first narration line
                    console.log('🎵 Playing single scene audio (full narration)');
                    AudioNarration.playLine(0).catch(err => {
                        console.warn('Audio playback failed, continuing with text:', err);
                    });
                } else if (scene.audioUrls.length > 1) {
                    // Multiple audio files - play the one matching this line immediately
                    console.log(`🎵 Playing audio for line ${currentNarrationIndex + 1}`);
                    AudioNarration.playLine(currentNarrationIndex).catch(err => {
                        console.warn('Audio playback failed, continuing with text:', err);
                    });
                } else if (currentNarrationIndex > 0) {
                    console.log('🎵 Skipping audio - already playing scene audio');
                }
            } else {
                console.warn('⚠️ No audio available for this line');
            }
        }
    }

    // NOTE: Interval/timeout system disabled - syncNarrationToTime() handles all transitions during playback
    // This prevents conflicts between the two systems
    console.log('📖 Narration display initialized. Transitions will be handled by syncNarrationToTime() during playback.');
}

// Function to pause narration (simplified - no intervals to manage)
function pauseNarration() {
    console.log('⏸️ pauseNarration() called - pausing narration state and audio');
    isNarrationPaused = true;

    // CRITICAL FIX: Pause audio narration if available with explicit logging
    if (typeof AudioNarration !== 'undefined' && AudioNarration) {
        console.log('⏸️ Calling AudioNarration.pause() to pause narration audio');
        AudioNarration.pause();

        // Verify the audio is actually paused
        if (AudioNarration.currentAudio) {
            console.log('⏸️ AudioNarration state after pause:', {
                isPlaying: AudioNarration.isPlaying,
                audioPaused: AudioNarration.currentAudio.paused,
                currentTime: AudioNarration.currentAudio.currentTime.toFixed(2) + 's'
            });
        } else {
            console.log('⏸️ No current audio element in AudioNarration');
        }
    } else {
        console.log('⏸️ AudioNarration module not available');
    }
    // syncNarrationToTime will stop updating when paused
}

// Function to resume narration (simplified - syncNarrationToTime handles everything)
function resumeNarration() {
    console.log('▶️ Resuming narration...');

    isNarrationPaused = false;

    // Resume or start audio narration if available
    if (typeof AudioNarration !== 'undefined') {
        const scene = currentStory?.scenes[currentSceneIndex];

        console.log('🎵 resumeNarration - Scene info:', {
            currentSceneIndex,
            sceneNumber: scene?.number,
            hasAudioUrls: !!scene?.audioUrls,
            audioUrlsCount: scene?.audioUrls?.length,
            audioNarrationSceneNumber: AudioNarration.scene?.number,
            currentNarrationIndex,
            hasCurrentAudio: !!AudioNarration.currentAudio,
            isPlaying: AudioNarration.isPlaying
        });

        // Check if we have audio for this scene
        if (scene && AudioNarration.hasAudio(scene)) {
            // Sync currentNarrationIndex to match the audio that should be playing
            currentNarrationIndex = AudioNarration.currentLineIndex;

            // Update the displayed text to match the audio line
            if (currentNarrationOverlay && currentNarrationLines[currentNarrationIndex]) {
                currentNarrationOverlay.innerHTML = `<strong>${currentNarrationLines[currentNarrationIndex]}</strong>`;
                console.log('📖 Synced text display to audio line:', currentNarrationIndex + 1);
            }

            // Resume audio - AudioNarration.resume() will handle both cases:
            // 1. If currentAudio exists: resume from saved position
            // 2. If currentAudio is null: recreate audio and resume from saved position
            console.log('🎵 Calling AudioNarration.resume() for line:', AudioNarration.currentLineIndex);
            AudioNarration.resume();
        }
    }
    // syncNarrationToTime will resume updating via the animation loop
    // Note: justResumed flag is set in togglePlayPause() before this function is called
}

// Calculate duration based on actual audio durations or fallback to 6 seconds per line
async function calculateNarrationDuration(scene) {
    // If scene has audio URLs, use actual audio durations
    if (scene.audioUrls && scene.audioUrls.length > 0 && typeof AudioNarration !== 'undefined') {
        try {
            // Initialize AudioNarration with this scene to load durations
            await AudioNarration.init(scene);
            const totalDuration = AudioNarration.getTotalSceneDuration();
            console.log(`🎵 Scene ${scene.number || '?'} duration from audio: ${(totalDuration / 1000).toFixed(2)}s`);
            return totalDuration;
        } catch (error) {
            console.warn('⚠️ Failed to load audio durations for scene with audio, using fallback:', error);
            // Only use fallback for scenes that HAVE audio but failed to load
            const linesPerScene = scene.narrationLines?.length || 6;
            const fixedDurationMs = linesPerScene * SECONDS_PER_LINE * 1000;
            return fixedDurationMs;
        }
    }

    // For scenes WITHOUT audio, use minimal duration (1 second placeholder)
    // This prevents inflating the total story duration with scenes that don't have audio yet
    console.log(`📏 Scene ${scene.number || '?'} has no audio - using 1s placeholder`);
    return 1000; // 1 second placeholder for scenes without audio
}

// Enhanced scene timing calculator from UPDATE STORYGEN
async function calculateSceneDurations(scenes) {
    if (!scenes || !Array.isArray(scenes)) return [];

    const durationPromises = scenes.map(async (scene, index) => {
        const duration = await calculateNarrationDuration(scene);

        return {
            sceneIndex: index,
            title: scene.title || `Scene ${index + 1}`,
            duration: duration,
            durationSeconds: Math.ceil(duration / 1000),
            startTime: 0, // Will be calculated later
            endTime: 0    // Will be calculated later
        };
    });

    return await Promise.all(durationPromises);
}

// Calculate cumulative timing for all scenes from UPDATE STORYGEN
function calculateCumulativeTiming(sceneDurations) {
    let cumulativeTime = 0;

    return sceneDurations.map(scene => {
        const startTime = cumulativeTime;
        const endTime = cumulativeTime + scene.duration;
        cumulativeTime = endTime;

        return {
            ...scene,
            startTime: startTime,
            endTime: endTime
        };
    });
}


// Music Controls Implementation
function initializeMusicControls() {
    console.log('🎵 Initializing music controls...');
    console.log('🔍 currentStory exists:', !!currentStory);
    console.log('🔍 currentStory.music exists:', !!(currentStory && currentStory.music));
    console.log('🔍 currentStory.music.enabled:', currentStory && currentStory.music ? currentStory.music.enabled : 'N/A');

    if (currentStory) {
        console.log('📖 Full currentStory.music object:', JSON.stringify(currentStory.music, null, 2));
    }

    const volumeBtn = document.getElementById('volumeBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeOnIcon = document.querySelector('.volume-on-icon');
    const volumeOffIcon = document.querySelector('.volume-off-icon');

    // CRITICAL: Initialize volume slider to user settings FIRST as the baseline
    // This ensures the slider always shows the user's preference
    if (volumeSlider && window.userSettings && typeof window.userSettings.music_volume === 'number') {
        const userMusicVolume = Math.round(window.userSettings.music_volume * 100);
        volumeSlider.value = userMusicVolume;
        volumeSlider.style.setProperty('--volume-progress', userMusicVolume + '%');
        console.log('🎵 Set volume slider baseline from user settings:', userMusicVolume + '%');
    }

    let musicData = null;

    // Priority 1: Load music from story data
    if (currentStory && currentStory.music && currentStory.music.fileName) {
        musicData = currentStory.music;
        console.log('🎵 Loading music from story data:', musicData);
    }
    // Priority 2: Fallback to user settings if no music in story
    else if (window.userSettings && window.userSettings.background_music) {
        console.log('🎵 No music in story, loading from user settings:', window.userSettings.background_music);
        musicData = {
            enabled: true,
            fileName: window.userSettings.background_music,
            volume: (window.userSettings.music_volume * 100) || 10  // Convert 0-1 to 0-100
        };
        console.log('🎵 User settings music data:', musicData);
    }
    // Priority 3: Default to adventure.mp3 if no music anywhere
    else {
        console.log('🎵 No music found, defaulting to adventure.mp3');
        musicData = {
            enabled: true,
            fileName: 'adventure.mp3',
            volume: 20  // Default volume 20%
        };
    }

    // Load music from story data or user settings (but don't auto-play)
    if (musicData && musicData.fileName) {
        // Create audio element
        const musicPath = '../../../public/files/music/' + musicData.fileName;
        console.log('🎵 Music path:', musicPath);
        backgroundMusicAudio = new Audio(musicPath);
        backgroundMusicAudio.loop = true;
        backgroundMusicAudio.volume = (musicData.volume || 20) / 100;

        // Add error handler for audio loading
        backgroundMusicAudio.addEventListener('error', (e) => {
            console.warn('⚠️ Background music failed to load:', musicPath, e);
        });

        console.log('🎵 Audio element created with volume:', backgroundMusicAudio.volume);

        // Make it accessible globally for the player
        window.backgroundMusicAudio = backgroundMusicAudio;

        // NOTE: Volume slider is already set to user settings at the start of this function
        // We don't override it here to preserve user preference
        console.log('🎵 Audio element created - volume slider already set to user preference');

        // Don't auto-play - music will start when user clicks play button
        console.log('🎵 Music loaded and ready to play when story starts');
    } else {
        console.warn('⚠️ No music data found in story or user settings');
        console.warn('   - currentStory exists:', !!currentStory);
        console.warn('   - currentStory.music exists:', !!(currentStory && currentStory.music));
        console.warn('   - currentStory.music.enabled:', currentStory && currentStory.music ? currentStory.music.enabled : 'N/A');
        console.warn('   - userSettings.background_music:', window.userSettings?.background_music || 'N/A');
    }

    // Volume button click handler
    if (volumeBtn) {
        volumeBtn.addEventListener('click', function() {
            if (backgroundMusicAudio) {
                if (backgroundMusicAudio.volume > 0) {
                    // Mute
                    backgroundMusicAudio.volume = 0;
                    if (volumeSlider) {
                        volumeSlider.value = 0;
                        volumeSlider.style.setProperty('--volume-progress', '0%');
                        volumeSlider.classList.add('muted');
                    }
                    if (volumeOnIcon) volumeOnIcon.style.display = 'none';
                    if (volumeOffIcon) volumeOffIcon.style.display = 'block';

                    // Pause music when muted
                    if (!backgroundMusicAudio.paused) {
                        backgroundMusicAudio.pause();
                    }
                } else {
                    // Unmute to previous volume or 30%
                    const targetVolume = currentStory && currentStory.music ? (currentStory.music.volume || 30) : 30;
                    backgroundMusicAudio.volume = targetVolume / 100;
                    if (volumeSlider) {
                        volumeSlider.value = targetVolume;
                        volumeSlider.style.setProperty('--volume-progress', targetVolume + '%');
                        volumeSlider.classList.remove('muted');
                    }
                    if (volumeOnIcon) volumeOnIcon.style.display = 'block';
                    if (volumeOffIcon) volumeOffIcon.style.display = 'none';

                    // Resume music when unmuting - only if story is currently playing
                    if (backgroundMusicAudio.paused && globalStoryboardPlayer && globalStoryboardPlayer.isPlaying) {
                        backgroundMusicAudio.play()
                            .then(() => console.log('🎵 Music resumed after unmuting via button (story is playing)'))
                            .catch(err => console.log('Music resume error:', err));
                    } else {
                        console.log('🎵 Volume restored to ' + targetVolume + '% - music will play when story starts');
                    }
                }
            }
        });
    }

    // Volume slider handler
    if (volumeSlider) {
        // Set initial CSS variable for volume slider fill
        volumeSlider.style.setProperty('--volume-progress', volumeSlider.value + '%');

        volumeSlider.addEventListener('input', function() {
            const volume = parseInt(this.value);

            // Update CSS variable for animated fill with smooth transition
            this.style.setProperty('--volume-progress', volume + '%');

            // Note: Narration audio is NOT controlled by volume slider (always at 100%)
            // Only background music is controlled by the slider

            if (backgroundMusicAudio) {
                // Check if we're unmuting (going from 0 to > 0)
                const wasAtZero = backgroundMusicAudio.volume === 0;

                // Smoothly update volume
                backgroundMusicAudio.volume = volume / 100;

                // Update icon and muted class based on volume
                if (volume === 0) {
                    this.classList.add('muted');
                    if (volumeOnIcon) volumeOnIcon.style.display = 'none';
                    if (volumeOffIcon) volumeOffIcon.style.display = 'block';

                    // Pause music when muted
                    if (!backgroundMusicAudio.paused) {
                        backgroundMusicAudio.pause();
                    }
                } else {
                    this.classList.remove('muted');
                    if (volumeOnIcon) volumeOnIcon.style.display = 'block';
                    if (volumeOffIcon) volumeOffIcon.style.display = 'none';

                    // If unmuting AND story is currently playing, resume music
                    if (wasAtZero && backgroundMusicAudio.paused && globalStoryboardPlayer && globalStoryboardPlayer.isPlaying) {
                        backgroundMusicAudio.play()
                            .then(() => console.log('🎵 Music resumed after unmuting via slider (story is playing)'))
                            .catch(err => console.log('Music resume error:', err));
                    } else if (wasAtZero) {
                        console.log('🎵 Volume unmuted but story not playing - music will start when play is pressed');
                    }
                }
            }
        });
    }
}

/**
 * Initialize Narration Volume Display
 * Updates the narration volume display to show the user's saved setting
 */
function initializeNarrationVolumeDisplay() {
    console.log('🎤 Initializing narration volume display...');

    // Get the narration volume display element
    const narrationVolumeValue = document.getElementById('narrationVolumeValue');

    if (!narrationVolumeValue) {
        console.warn('⚠️ Narration volume display element not found');
        return;
    }

    // Get narration volume from user settings
    let narrationVolume = 0.5; // Default to 50%

    if (window.userSettings && typeof window.userSettings.narration_volume === 'number') {
        narrationVolume = Math.max(0, Math.min(1, window.userSettings.narration_volume));
        console.log('🎤 Using user-configured narration volume:', (narrationVolume * 100) + '%');
    } else {
        console.log('🎤 Using default narration volume: 50%');
    }

    // Update the display
    const percentage = Math.round(narrationVolume * 100);
    narrationVolumeValue.textContent = `${percentage}%`;

    console.log('✅ Narration volume display initialized to:', percentage + '%');
}

function playBackgroundMusic() {
    if (backgroundMusicAudio) {
        // Check volume slider to see if user has muted
        const volumeSlider = document.getElementById('volumeSlider');
        const sliderVolume = volumeSlider ? parseInt(volumeSlider.value) : null;

        // Get the target volume - use slider value if available, otherwise use audio element volume
        let targetVolume = backgroundMusicAudio.volume;
        if (sliderVolume !== null) {
            targetVolume = sliderVolume / 100;
        }

        // If target volume is 0 (muted), don't fade in - just stay at 0
        if (targetVolume === 0) {
            console.log('🔇 Music is muted - not playing audio');
            backgroundMusicAudio.volume = 0;
            backgroundMusicAudio.play().catch(err => console.log('Muted play attempt:', err));
            return;
        }

        // Start at 0 volume for fade-in
        backgroundMusicAudio.volume = 0;

        backgroundMusicAudio.play()
            .then(() => {
                console.log('✅ Background music playing, starting fade-in to', (targetVolume * 100) + '%');

                // Fade in over 2 seconds
                const fadeDuration = 2000;
                const fadeInterval = 50;
                const steps = fadeDuration / fadeInterval;
                const volumeStep = targetVolume / steps;
                let currentStep = 0;

                const fadeInInterval = setInterval(() => {
                    currentStep++;
                    const newVolume = Math.min(targetVolume, volumeStep * currentStep);
                    backgroundMusicAudio.volume = newVolume;

                    if (currentStep >= steps) {
                        clearInterval(fadeInInterval);
                        backgroundMusicAudio.volume = targetVolume;
                        console.log('✅ Background music fade-in complete at', (targetVolume * 100) + '% volume');
                    }
                }, fadeInterval);
            })
            .catch(error => {
                console.warn('⚠️ Auto-play blocked by browser. Music will play when user interacts with page.', error);

                // Try to play on first user interaction
                document.addEventListener('click', function playOnInteraction() {
                    if (backgroundMusicAudio && backgroundMusicAudio.paused) {
                        // Check slider again for current volume
                        const volumeSlider = document.getElementById('volumeSlider');
                        const sliderVolume = volumeSlider ? parseInt(volumeSlider.value) : null;
                        const targetVolume = sliderVolume !== null ? sliderVolume / 100 : (backgroundMusicAudio.volume || 0.30);

                        // If muted, don't play
                        if (targetVolume === 0) {
                            console.log('🔇 Music is muted - not playing on interaction');
                            return;
                        }

                        backgroundMusicAudio.volume = 0;

                        backgroundMusicAudio.play()
                            .then(() => {
                                console.log('✅ Background music playing after user interaction, starting fade-in');
                                document.removeEventListener('click', playOnInteraction);

                                // Fade in over 2 seconds
                                const fadeDuration = 2000;
                                const fadeInterval = 50;
                                const steps = fadeDuration / fadeInterval;
                                const volumeStep = targetVolume / steps;
                                let currentStep = 0;

                                const fadeInInterval = setInterval(() => {
                                    currentStep++;
                                    const newVolume = Math.min(targetVolume, volumeStep * currentStep);
                                    backgroundMusicAudio.volume = newVolume;

                                    if (currentStep >= steps) {
                                        clearInterval(fadeInInterval);
                                        backgroundMusicAudio.volume = targetVolume;
                                        console.log('✅ Background music fade-in complete');
                                    }
                                }, fadeInterval);
                            })
                            .catch(err => console.error('❌ Error playing music:', err));
                    }
                }, { once: true });
            });
    }
}

function stopBackgroundMusic() {
    if (backgroundMusicAudio && !backgroundMusicAudio.paused) {
        backgroundMusicAudio.pause();
        backgroundMusicAudio.currentTime = 0;
    }
}

function fadeOutBackgroundMusic() {
    if (!backgroundMusicAudio || backgroundMusicAudio.paused) {
        console.log('🎵 No background music to fade out');
        return;
    }

    // Disable looping to prevent music from restarting
    backgroundMusicAudio.loop = false;
    console.log('🎵 Background music loop disabled');

    // Fade duration: 2 seconds
    const fadeDuration = 2000;

    console.log(`🎵 Fading out background music over ${fadeDuration}ms`);

    const startVolume = backgroundMusicAudio.volume;
    const fadeInterval = 50; // Update every 50ms for smooth fade
    const volumeStep = startVolume / (fadeDuration / fadeInterval);
    let currentVolume = startVolume;

    const fadeIntervalId = setInterval(() => {
        currentVolume -= volumeStep;

        if (currentVolume <= 0) {
            currentVolume = 0;
            backgroundMusicAudio.volume = 0;
            backgroundMusicAudio.pause();
            backgroundMusicAudio.currentTime = 0;
            clearInterval(fadeIntervalId);
            console.log('🎵 Background music fade out complete and stopped');
        } else {
            backgroundMusicAudio.volume = currentVolume;
        }
    }, fadeInterval);
}

// Initialize gamification audio elements
function initializeGamificationAudio() {
    console.log('🔊 Initializing gamification audio...');

    questionBgAudio = document.getElementById('questionBgAudio');
    correctAnswerAudio = document.getElementById('correctAnswerAudio');
    wrongAnswerAudio = document.getElementById('wrongAnswerAudio');

    if (questionBgAudio) {
        questionBgAudio.volume = 0.3; // 30% volume
        questionBgAudio.addEventListener('error', (e) => {
            console.warn('⚠️ Question background audio failed to load:', e);
        });
        questionBgAudio.load(); // Preload the audio
        console.log('✅ Question background audio initialized at 30% volume');
    } else {
        console.error('❌ Question background audio element not found!');
    }

    if (correctAnswerAudio) {
        correctAnswerAudio.volume = 1.0; // 100% volume
        correctAnswerAudio.addEventListener('error', (e) => {
            console.warn('⚠️ Correct answer audio failed to load:', e);
        });
        correctAnswerAudio.load(); // Preload the audio
        console.log('✅ Correct answer audio initialized at 100% volume');
    } else {
        console.error('❌ Correct answer audio element not found!');
    }

    if (wrongAnswerAudio) {
        wrongAnswerAudio.volume = 1.0; // 100% volume
        wrongAnswerAudio.addEventListener('error', (e) => {
            console.warn('⚠️ Wrong answer audio failed to load:', e);
        });
        wrongAnswerAudio.load(); // Preload the audio
        console.log('✅ Wrong answer audio initialized at 100% volume');
    } else {
        console.error('❌ Wrong answer audio element not found!');
    }
}

// Play question background music (direct play without fade)
function playQuestionBgMusic() {
    console.log('🎵 playQuestionBgMusic called');
    if (questionBgAudio) {
        console.log('🎵 Question audio element found, attempting to play...');
        questionBgAudio.currentTime = 0;
        questionBgAudio.loop = true; // Ensure looping is enabled
        questionBgAudio.volume = 0.3; // Set to 30% volume

        const playPromise = questionBgAudio.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    console.log('✅ Question background music playing at', (questionBgAudio.volume * 100) + '% volume');
                })
                .catch(err => {
                    console.error('❌ Question music play error:', err);
                    // Try to play on user interaction if autoplay is blocked
                    document.addEventListener('click', function playOnClick() {
                        questionBgAudio.play()
                            .then(() => {
                                console.log('✅ Question background music playing after user interaction');
                                document.removeEventListener('click', playOnClick);
                            })
                            .catch(e => console.error('❌ Still cannot play question music:', e));
                    }, { once: true });
                });
        }
    } else {
        console.error('❌ Question audio element not found!');
    }
}

// Crossfade from story music to question music
function crossfadeToQuestionMusic() {
    const fadeDuration = 1000; // 1 second crossfade
    const fadeInterval = 50; // Update every 50ms

    console.log('🎵 Starting crossfade to question music');

    // Start question music at 0 volume
    if (questionBgAudio) {
        questionBgAudio.currentTime = 0;
        questionBgAudio.loop = true;
        questionBgAudio.volume = 0;

        questionBgAudio.play()
            .then(() => {
                console.log('✅ Question music started for crossfade');

                // Fade out story music and fade in question music simultaneously
                const storyStartVolume = window.backgroundMusicAudio ? window.backgroundMusicAudio.volume : 0;
                const questionTargetVolume = 0.3; // 30% for question music
                const steps = fadeDuration / fadeInterval;
                const storyVolumeStep = storyStartVolume / steps;
                const questionVolumeStep = questionTargetVolume / steps;

                let currentStep = 0;

                const crossfadeInterval = setInterval(() => {
                    currentStep++;

                    // Fade out story music
                    if (window.backgroundMusicAudio && !window.backgroundMusicAudio.paused) {
                        const newStoryVolume = Math.max(0, storyStartVolume - (storyVolumeStep * currentStep));
                        window.backgroundMusicAudio.volume = newStoryVolume;

                        if (newStoryVolume <= 0) {
                            window.backgroundMusicAudio.pause();
                            console.log('✅ Story music faded out and paused');
                        }
                    }

                    // Fade in question music
                    if (questionBgAudio && !questionBgAudio.paused) {
                        const newQuestionVolume = Math.min(questionTargetVolume, questionVolumeStep * currentStep);
                        questionBgAudio.volume = newQuestionVolume;
                    }

                    if (currentStep >= steps) {
                        clearInterval(crossfadeInterval);
                        console.log('✅ Crossfade to question music complete');
                    }
                }, fadeInterval);
            })
            .catch(err => {
                console.error('❌ Question music crossfade play error:', err);
                // Fallback: just pause story music and try to play question music
                if (window.backgroundMusicAudio && !window.backgroundMusicAudio.paused) {
                    window.backgroundMusicAudio.pause();
                }
                playQuestionBgMusic();
            });
    } else {
        console.error('❌ Question audio not available for crossfade');
        // Fallback: just pause story music
        if (window.backgroundMusicAudio && !window.backgroundMusicAudio.paused) {
            window.backgroundMusicAudio.pause();
        }
    }
}

// Crossfade from question music back to story music
function crossfadeToStoryMusic() {
    const fadeDuration = 1000; // 1 second crossfade
    const fadeInterval = 50; // Update every 50ms

    console.log('🎵 Starting crossfade to story music');

    if (!window.backgroundMusicAudio) {
        console.log('⚠️ No background music to crossfade to');
        stopQuestionBgMusic();
        return;
    }

    // Get the target volume from the volume slider (current user setting)
    const volumeSlider = document.getElementById('volumeSlider');
    const currentVolume = volumeSlider ? parseInt(volumeSlider.value) : (currentStory && currentStory.music ? (currentStory.music.volume || 30) : 30);
    const storyTargetVolume = currentVolume / 100;

    // Start story music at 0 volume if it's paused
    if (window.backgroundMusicAudio.paused) {
        window.backgroundMusicAudio.volume = 0;
        window.backgroundMusicAudio.play()
            .then(() => {
                console.log('✅ Story music started for crossfade');
                performCrossfade();
            })
            .catch(err => {
                console.error('❌ Story music crossfade play error:', err);
                // Fallback: just stop question music
                stopQuestionBgMusic();
            });
    } else {
        performCrossfade();
    }

    function performCrossfade() {
        const questionStartVolume = questionBgAudio ? questionBgAudio.volume : 0;
        const steps = fadeDuration / fadeInterval;
        const questionVolumeStep = questionStartVolume / steps;
        const storyVolumeStep = storyTargetVolume / steps;

        let currentStep = 0;

        const crossfadeInterval = setInterval(() => {
            currentStep++;

            // Fade out question music
            if (questionBgAudio && !questionBgAudio.paused) {
                const newQuestionVolume = Math.max(0, questionStartVolume - (questionVolumeStep * currentStep));
                questionBgAudio.volume = newQuestionVolume;

                if (newQuestionVolume <= 0) {
                    questionBgAudio.pause();
                    questionBgAudio.currentTime = 0;
                    console.log('✅ Question music faded out and stopped');
                }
            }

            // Fade in story music
            if (window.backgroundMusicAudio && !window.backgroundMusicAudio.paused) {
                const newStoryVolume = Math.min(storyTargetVolume, storyVolumeStep * currentStep);
                window.backgroundMusicAudio.volume = newStoryVolume;
            }

            if (currentStep >= steps) {
                clearInterval(crossfadeInterval);
                console.log('✅ Crossfade to story music complete');
            }
        }, fadeInterval);
    }
}

// Stop question background music
function stopQuestionBgMusic() {
    if (questionBgAudio && !questionBgAudio.paused) {
        questionBgAudio.pause();
        questionBgAudio.currentTime = 0;
        console.log('🔇 Question background music stopped');
    }
}

// Play correct answer sound
function playCorrectAnswerSound() {
    console.log('🔊 playCorrectAnswerSound called');
    if (correctAnswerAudio) {
        console.log('🔊 Correct answer audio element found, playing...');
        correctAnswerAudio.currentTime = 0;

        const playPromise = correctAnswerAudio.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => console.log('✅ Correct answer sound playing'))
                .catch(err => {
                    console.error('❌ Correct answer sound play error:', err);
                    console.error('Audio state:', {
                        paused: correctAnswerAudio.paused,
                        currentTime: correctAnswerAudio.currentTime,
                        volume: correctAnswerAudio.volume,
                        src: correctAnswerAudio.src
                    });
                });
        }
    } else {
        console.error('❌ Correct answer audio element not found!');
    }
}

// Play wrong answer sound
function playWrongAnswerSound() {
    console.log('🔊 playWrongAnswerSound called');
    if (wrongAnswerAudio) {
        console.log('🔊 Wrong answer audio element found, playing...');
        wrongAnswerAudio.currentTime = 0;

        const playPromise = wrongAnswerAudio.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => console.log('✅ Wrong answer sound playing'))
                .catch(err => {
                    console.error('❌ Wrong answer sound play error:', err);
                    console.error('Audio state:', {
                        paused: wrongAnswerAudio.paused,
                        currentTime: wrongAnswerAudio.currentTime,
                        volume: wrongAnswerAudio.volume,
                        src: wrongAnswerAudio.src
                    });
                });
        }
    } else {
        console.error('❌ Wrong answer audio element not found!');
    }
}

// Navigate to After Story Quiz
function goToAfterStoryQuiz() {
    console.log('🎯 Navigating to After Story Quiz...');

    // Pause background music before leaving
    if (backgroundMusicAudio) {
        backgroundMusicAudio.pause();
    }

    // Save current story quiz data to localStorage so the quiz page loads the correct story
    if (currentStory) {
        const quizData = {
            storyId: currentStory.id,
            title: currentStory.title,
            afterStoryQuestions: currentStory.afterStoryQuestions || []
        };

        localStorage.setItem('currentStoryQuizData', JSON.stringify(quizData));
        console.log('✅ Saved quiz data for story:', currentStory.title, 'ID:', currentStory.id);
        console.log('   Questions count:', quizData.afterStoryQuestions.length);
    } else {
        console.error('❌ No current story data found!');
    }

    // Navigate to quiz page
    window.location.href = 'AfterStoryQuiz.html';
}

// ============================================================================
// GAMIFICATION TTS MODULE
// ============================================================================

/**
 * Gamification TTS Module
 * Handles automatic text-to-speech for quiz questions and answer choices
 */
const GamificationTTS = {
    currentAudio: null,
    isReading: false,
    currentQuestion: null,
    currentChoices: [],

    /**
     * Initialize TTS (automatic, no buttons needed)
     */
    init() {
        console.log('🎤 Initializing Automatic Gamification TTS...');
        console.log('✅ Gamification TTS initialized - automatic mode');
    },

    /**
     * Set current question data
     */
    setQuestionData(questionText, choices) {
        this.currentQuestion = questionText;
        this.currentChoices = choices || [];
        console.log('🎤 Question data set:', { questionText, choicesCount: choices.length });
    },

    /**
     * Read the question text aloud
     */
    async readQuestion() {
        if (!this.currentQuestion) {
            console.warn('⚠️ No question text to read');
            return;
        }

        console.log('🎤 Reading question:', this.currentQuestion);

        // Stop any currently playing audio
        this.stop();

        try {
            // Use Web Speech API for TTS (browser-native)
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(this.currentQuestion);
                utterance.rate = 0.8; // Slightly slower for clarity
                utterance.pitch = 1.0;
                utterance.volume = 1.0;

                utterance.onstart = () => {
                    this.isReading = true;
                    console.log('🎤 Started reading question');
                };

                utterance.onend = () => {
                    this.isReading = false;
                    console.log('✅ Finished reading question');
                };

                utterance.onerror = (event) => {
                    console.error('❌ TTS error:', event);
                    this.isReading = false;
                };

                window.speechSynthesis.speak(utterance);
            } else {
                console.error('❌ Speech synthesis not supported in this browser');
                alert('Text-to-speech is not supported in your browser.');
            }
        } catch (error) {
            console.error('❌ Error reading question:', error);
            this.isReading = false;
        }
    },

    /**
     * Read all answer choices aloud
     */
    async readChoices() {
        if (!this.currentChoices || this.currentChoices.length === 0) {
            console.warn('⚠️ No choices to read');
            return;
        }

        console.log('🎤 Reading choices:', this.currentChoices);

        // Stop any currently playing audio
        this.stop();

        try {
            if ('speechSynthesis' in window) {
                this.isReading = true;

                // Read choices one by one
                for (let i = 0; i < this.currentChoices.length; i++) {
                    const choice = this.currentChoices[i];
                    const text = `${choice.letter}. ${choice.text}`;

                    await new Promise((resolve) => {
                        const utterance = new SpeechSynthesisUtterance(text);
                        utterance.rate = 0.8;
                        utterance.pitch = 1.0;
                        utterance.volume = 1.0;

                        utterance.onend = () => {
                            console.log(`✅ Finished reading choice ${choice.letter}`);
                            // Small pause between choices
                            setTimeout(resolve, 300);
                        };

                        utterance.onerror = (event) => {
                            console.error(`❌ Error reading choice ${choice.letter}:`, event);
                            resolve();
                        };

                        window.speechSynthesis.speak(utterance);
                        console.log(`🎤 Reading choice ${choice.letter}`);
                    });

                    // Stop if user cancelled
                    if (!this.isReading) {
                        break;
                    }
                }

                this.isReading = false;
                console.log('✅ Finished reading all choices');
            } else {
                console.error('❌ Speech synthesis not supported in this browser');
            }
        } catch (error) {
            console.error('❌ Error reading choices:', error);
            this.isReading = false;
        }
    },

    /**
     * Read question and all choices automatically
     */
    async readQuestionAndChoices() {
        console.log('🎤 Auto-reading question and choices');

        await this.readQuestion();

        // Wait a bit before reading choices
        await new Promise(resolve => setTimeout(resolve, 800));

        if (this.isReading) {
            await this.readChoices();
        }
    },

    /**
     * Stop reading
     */
    stop() {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }

        this.isReading = false;
        console.log('🛑 Stopped TTS');
    },

    /**
     * Clean up on question close
     */
    cleanup() {
        this.stop();
        this.currentQuestion = null;
        this.currentChoices = [];
    }
};

// Initialize Gamification TTS when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => GamificationTTS.init());
} else {
    GamificationTTS.init();
}

// ============================================================================
// VOICE TESTING FUNCTION
// ============================================================================

/**
 * Test voice parsing and narration setup
 */
async function testVoiceParsing() {
    console.log('🎤 Testing Voice Configuration...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Use currentStory (which loaded from IndexedDB with audio URLs)
    // If not available, try loading from IndexedDB directly
    let storyData = currentStory;

    if (!storyData) {
        console.log('🔍 currentStory not available, loading from IndexedDB...');
        try {
            storyData = await loadStoryFromIndexedDB();
            if (!storyData) {
                // Fall back to localStorage (won't have audio)
                const storyDataRaw = localStorage.getItem('generatedStoryData');
                if (storyDataRaw) {
                    storyData = JSON.parse(storyDataRaw);
                    console.warn('⚠️ Loaded from localStorage (no audio URLs)');
                }
            } else {
                console.log('✅ Loaded from IndexedDB (has audio URLs)');
            }
        } catch (error) {
            console.error('❌ Error loading story:', error);
        }
    } else {
        console.log('✅ Using currentStory (already loaded in memory)');
    }

    if (!storyData) {
        alert('❌ No story data found!\n\nPlease generate a story first from the dashboard.');
        console.error('❌ No story data available');
        return;
    }

    try {

        console.log('📊 Story Data:', storyData);
        console.log('🎤 Selected Voice:', storyData.selectedVoice);
        console.log('🎤 Voice ID:', storyData.voiceId);
        console.log('📚 Total Scenes:', storyData.scenes?.length || 0);

        // Check each scene for audio
        let scenesWithAudio = 0;
        let totalAudioUrls = 0;

        if (storyData.scenes) {
            storyData.scenes.forEach((scene, index) => {
                const hasAudio = scene.audioUrls && scene.audioUrls.length > 0;
                const audioCount = scene.audioUrls?.length || 0;

                if (hasAudio) scenesWithAudio++;
                totalAudioUrls += audioCount;

                console.log(`📍 Scene ${index + 1}:`, {
                    title: scene.title,
                    hasAudio: hasAudio,
                    audioUrls: audioCount,
                    narrationLines: scene.narrationLines?.length || 0
                });

                if (hasAudio && scene.audioUrls) {
                    scene.audioUrls.forEach((url, i) => {
                        console.log(`   🔊 Audio ${i + 1}: ${url.substring(0, 100)}...`);
                    });
                }
            });
        }

        // Check AudioNarration module
        const hasAudioNarrationModule = typeof AudioNarration !== 'undefined';
        console.log('🔧 AudioNarration Module Loaded:', hasAudioNarrationModule);

        if (hasAudioNarrationModule) {
            console.log('🔧 AudioNarration State:', {
                isPlaying: AudioNarration.isPlaying,
                currentLineIndex: AudioNarration.currentLineIndex,
                hasCurrentAudio: !!AudioNarration.currentAudio
            });
        }

        // Summary
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 SUMMARY:');
        console.log(`   Voice: ${storyData.selectedVoice || 'Not set'}`);
        console.log(`   Voice ID: ${storyData.voiceId || 'Not set'}`);
        console.log(`   Scenes with audio: ${scenesWithAudio}/${storyData.scenes?.length || 0}`);
        console.log(`   Total audio URLs: ${totalAudioUrls}`);
        console.log(`   AudioNarration loaded: ${hasAudioNarrationModule}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Display result
        const message = `
🎤 VOICE CONFIGURATION TEST

✓ Story Data: Found
✓ Selected Voice: ${storyData.selectedVoice || 'Not set'}
✓ Voice ID: ${storyData.voiceId || 'Not set'}
✓ Total Scenes: ${storyData.scenes?.length || 0}
✓ Scenes with Audio: ${scenesWithAudio}
✓ Total Audio URLs: ${totalAudioUrls}
✓ AudioNarration Module: ${hasAudioNarrationModule ? 'Loaded' : 'Not loaded'}

${totalAudioUrls === 0 ? '\n⚠️ WARNING: No audio URLs found!\nMake sure to generate the story with TTS enabled.' : '✅ Voice narration is configured!'}

Check console for detailed information.
        `;

        alert(message.trim());

    } catch (error) {
        console.error('❌ Error parsing story data:', error);
        alert('❌ Error parsing story data!\n\nCheck console for details.');
    }
}

// Export functions for external use
window.goBackToDashboard = goBackToDashboard;
window.stopBackgroundMusic = stopBackgroundMusic;
window.goToAfterStoryQuiz = goToAfterStoryQuiz;
window.GamificationTTS = GamificationTTS;
window.testVoiceParsing = testVoiceParsing;

// ============================================================================
// CLEANUP ON PAGE UNLOAD - PREVENT MEMORY LEAKS
// ============================================================================

/**
 * Cleanup all audio resources when page is refreshed or closed
 * This prevents memory leaks from accumulating audio objects
 */
function cleanupAllAudio() {
    console.log('🧹 Cleaning up all audio resources before page unload...');

    // CRITICAL FIX: Clean up AudioNarration module first (this has preloaded audio objects)
    if (window.AudioNarration) {
        try {
            console.log('🧹 Stopping and cleaning up AudioNarration module...');
            window.AudioNarration.stop();
            window.AudioNarration.cleanup();
            console.log('✅ AudioNarration module cleaned up');
        } catch (e) {
            console.warn('⚠️ Error cleaning up AudioNarration:', e);
        }
    }

    // Clean up background music
    if (backgroundMusicAudio) {
        try {
            backgroundMusicAudio.pause();
            backgroundMusicAudio.currentTime = 0;
            backgroundMusicAudio.onended = null;
            backgroundMusicAudio.onerror = null;
            backgroundMusicAudio.src = '';
            backgroundMusicAudio.load();
            backgroundMusicAudio = null;
            console.log('✅ Background music cleaned up');
        } catch (e) {
            console.warn('⚠️ Error cleaning up background music:', e);
        }
    }

    // Clean up gamification audio elements (these are DOM elements, just pause them)
    if (questionBgAudio) {
        try {
            questionBgAudio.pause();
            questionBgAudio.currentTime = 0;
            console.log('✅ Question background audio cleaned up');
        } catch (e) {
            console.warn('⚠️ Error cleaning up question audio:', e);
        }
    }

    if (correctAnswerAudio) {
        try {
            correctAnswerAudio.pause();
            correctAnswerAudio.currentTime = 0;
            console.log('✅ Correct answer audio cleaned up');
        } catch (e) {
            console.warn('⚠️ Error cleaning up correct answer audio:', e);
        }
    }

    if (wrongAnswerAudio) {
        try {
            wrongAnswerAudio.pause();
            wrongAnswerAudio.currentTime = 0;
            console.log('✅ Wrong answer audio cleaned up');
        } catch (e) {
            console.warn('⚠️ Error cleaning up wrong answer audio:', e);
        }
    }

    // Clean up storyboard player
    if (globalStoryboardPlayer) {
        try {
            globalStoryboardPlayer.stopProgress();
            console.log('✅ Storyboard player cleaned up');
        } catch (e) {
            console.warn('⚠️ Error cleaning up storyboard player:', e);
        }
    }

    // CRITICAL FIX: Clean up RPM Avatar (Three.js resources)
    if (window.RPMAvatar) {
        try {
            console.log('🧹 Cleaning up RPM Avatar (Three.js resources)...');

            // CRITICAL: Cancel any pending animation frames first
            if (window.RPMAvatar.animationFrameId) {
                cancelAnimationFrame(window.RPMAvatar.animationFrameId);
                window.RPMAvatar.animationFrameId = null;
                console.log('✅ Cancelled main animation frame');
            }
            if (window.RPMAvatar.simpleAnimationFrameId) {
                cancelAnimationFrame(window.RPMAvatar.simpleAnimationFrameId);
                window.RPMAvatar.simpleAnimationFrameId = null;
                console.log('✅ Cancelled simple animation frame');
            }

            // Call cleanup function if available
            if (window.RPMAvatar.cleanup && typeof window.RPMAvatar.cleanup === 'function') {
                window.RPMAvatar.cleanup();
            }

            // Dispose of all objects in scene first
            if (window.RPMAvatar.scene) {
                console.log('🧹 Disposing scene objects...');
                while(window.RPMAvatar.scene.children.length > 0) {
                    const object = window.RPMAvatar.scene.children[0];
                    window.RPMAvatar.scene.remove(object);
                    if (object.geometry) object.geometry.dispose();
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach(mat => mat.dispose());
                        } else {
                            object.material.dispose();
                        }
                    }
                }
                window.RPMAvatar.scene = null;
            }

            // CRITICAL FOR SAFARI: Force context loss BEFORE disposing renderer
            // This ensures WebGL resources are properly released
            if (window.RPMAvatar.renderer) {
                console.log('🧹 Forcing WebGL context loss (Safari memory fix)...');
                try {
                    // Get WebGL context
                    const gl = window.RPMAvatar.renderer.getContext();
                    if (gl) {
                        // Force context loss - CRITICAL for Safari to release GPU memory
                        const loseContextExt = gl.getExtension('WEBGL_lose_context');
                        if (loseContextExt) {
                            loseContextExt.loseContext();
                            console.log('✅ WebGL context lost');
                        }
                    }
                } catch (contextError) {
                    console.warn('⚠️ Could not force context loss:', contextError);
                }

                // Now dispose the renderer
                window.RPMAvatar.renderer.dispose();
                window.RPMAvatar.renderer = null;
                console.log('✅ Three.js renderer disposed');
            }

            // Clear avatar reference
            window.RPMAvatar.avatar = null;
            window.RPMAvatar.isInitialized = false;

            console.log('✅ RPM Avatar resources cleaned up');
        } catch (e) {
            console.warn('⚠️ Error cleaning up RPM Avatar:', e);
        }
    }

    // CRITICAL FIX: Clean up GamificationTTS
    if (window.GamificationTTS && typeof window.GamificationTTS.cleanup === 'function') {
        try {
            console.log('🧹 Cleaning up GamificationTTS...');
            window.GamificationTTS.cleanup();
            console.log('✅ GamificationTTS cleaned up');
        } catch (e) {
            console.warn('⚠️ Error cleaning up GamificationTTS:', e);
        }
    }

    // CRITICAL FIX: Clean up all tracked event listeners and timers
    if (window.EventListenerRegistry) {
        try {
            console.log('🧹 Cleaning up EventListenerRegistry...');
            window.EventListenerRegistry.cleanup();
            console.log('✅ EventListenerRegistry cleaned up');
        } catch (e) {
            console.warn('⚠️ Error cleaning up EventListenerRegistry:', e);
        }
    }

    console.log('✅ All audio, event listeners, timers and 3D resources cleaned up successfully');
}

// CRITICAL FIX: Use the new cleanup wrapper that calls all cleanup functions
function cleanupAllResources() {
    cleanupAllAudio();
    // DON'T clear sessionStorage on page unload/refresh - it should persist
    clearStoryData(false); // Pass false to preserve sessionStorage
    cleanupIndexedDB();
}

// Add event listener for page unload (beforeunload)
window.addEventListener('beforeunload', cleanupAllResources);

// CRITICAL FIX: Also listen to 'pagehide' event for more reliable cleanup
// Some browsers (especially mobile) don't always fire beforeunload on refresh
window.addEventListener('pagehide', cleanupAllResources);

// CRITICAL FIX: Close any open IndexedDB connections on unload
let openIndexedDBConnections = [];

// Track IndexedDB connections for proper cleanup
const originalIndexedDBOpen = indexedDB.open;
indexedDB.open = function(...args) {
    const request = originalIndexedDBOpen.apply(this, args);
    request.onsuccess = function(event) {
        const db = event.target.result;
        openIndexedDBConnections.push(db);
        console.log('📊 IndexedDB connection opened:', db.name, '- Total connections:', openIndexedDBConnections.length);
    };
    return request;
};

// Clean up IndexedDB connections on page unload
function cleanupIndexedDB() {
    console.log('🧹 Closing', openIndexedDBConnections.length, 'IndexedDB connections...');
    openIndexedDBConnections.forEach((db, index) => {
        try {
            if (db && typeof db.close === 'function') {
                db.close();
                console.log('✅ IndexedDB connection', index, 'closed');
            } else {
                console.warn('⚠️ DB connection', index, 'already closed or invalid');
            }
        } catch (e) {
            console.warn('⚠️ Error closing IndexedDB connection:', e);
        }
    });
    openIndexedDBConnections = [];
}

/**
 * CRITICAL FIX: Clear story data from all storage locations
 * @param {boolean} clearSession - Whether to clear sessionStorage (default: false to preserve on refresh)
 */
function clearStoryData(clearSession = false) {
    console.log('🧹 Clearing story data from storage locations...');

    // IMPORTANT: Don't clear sessionStorage on page refresh/unload
    // Only clear it when explicitly navigating back to dashboard
    if (clearSession) {
        try {
            // Clear sessionStorage (used for dashboard playback)
            if (window.sessionStorage) {
                sessionStorage.removeItem('currentStory');
                console.log('✅ Cleared sessionStorage story data');
            }
        } catch (e) {
            console.warn('⚠️ Error clearing sessionStorage:', e);
        }
    } else {
        console.log('ℹ️ Preserving sessionStorage (story will persist on refresh)');
    }

    try {
        // Clear localStorage backup
        if (window.localStorage) {
            localStorage.removeItem('generatedStoryData');
            console.log('✅ Cleared localStorage story data');
        }
    } catch (e) {
        console.warn('⚠️ Error clearing localStorage:', e);
    }

    try {
        // Clear IndexedDB story data
        const request = indexedDB.open('AniKwentoStoryDB', 1);
        request.onsuccess = (event) => {
            const db = event.target.result;
            if (db.objectStoreNames.contains('stories')) {
                const transaction = db.transaction(['stories'], 'readwrite');
                const store = transaction.objectStore('stories');
                store.delete('currentStory');
                console.log('✅ Cleared IndexedDB story data');
            }
            db.close();
        };
        request.onerror = (e) => {
            console.warn('⚠️ Error clearing IndexedDB story data:', e);
        };
    } catch (e) {
        console.warn('⚠️ Error accessing IndexedDB for cleanup:', e);
    }

    console.log('✅ Story data cleanup complete');
}

// These listeners are NOT tracked in EventListenerRegistry because they need to persist
// until the page is actually unloaded (they're the cleanup handlers themselves)
// window.addEventListener('beforeunload', cleanupAllResources); // Already added above
// window.addEventListener('pagehide', cleanupAllResources); // Already added above

// Also cleanup when page visibility changes to hidden for too long
let hiddenTimer;
const visibilityChangeHandler = () => {
    if (document.hidden) {
        // If page is hidden for more than 5 minutes, cleanup to save resources
        hiddenTimer = setTimeout(() => {
            console.log('👁️ Page hidden for 5 minutes - cleaning up audio resources');
            cleanupAllAudio();
            cleanupIndexedDB();
        }, 5 * 60 * 1000); // 5 minutes
    } else {
        // Page became visible again - cancel cleanup timer
        if (hiddenTimer) {
            clearTimeout(hiddenTimer);
            hiddenTimer = null;
        }
    }
};

// Track this visibility change listener (but not the beforeunload/pagehide ones)
EventListenerRegistry.add(document, 'visibilitychange', visibilityChangeHandler);

console.log('✅ Audio cleanup handlers registered (beforeunload + pagehide for reliability)');