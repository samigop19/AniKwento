/**
 * Storyboard Audio Narration Module
 * Handles synchronized audio playback with narration lines
 */

const AudioNarration = {
    currentAudio: null,
    audioQueue: [],
    preloadedAudios: [], // Store preloaded Audio objects
    isPlaying: false,
    isResuming: false, // Flag to prevent interference during resume operation
    isTransitioningLines: false, // Flag to indicate we're transitioning between narration lines
    isInitializing: false, // Flag to prevent interference during scene initialization
    currentLineIndex: 0,
    scene: null,
    audioDurations: [], // Store duration for each audio line in ms
    audioDurationsLoaded: false,
    LINE_DURATION_MS: 7000, // 7 seconds per line (text + audio play simultaneously)
    onLineComplete: null, // Callback when a line audio finishes
    onAllLinesComplete: null, // Callback when all lines in scene finish
    cleanupTimeouts: [], // Store timeout IDs for cleanup
    savedAudioPosition: 0, // Store the audio position when paused for proper resume
    lastPlayLineCall: 0, // Timestamp of last playLine call for debouncing
    DEBOUNCE_DELAY: 100, // Minimum ms between playLine calls for same line

    /**
     * Initialize audio narration for a scene
     * @param {Object} scene - Scene object with audioUrls, narrationLines, and visemeDataArray
     */
    async init(scene) {
        // CRITICAL: Set initializing flag to prevent interference from animation loop
        this.isInitializing = true;
        console.log('🔒 isInitializing = true - blocking external interference during scene init');

        // IMPORTANT: Stop and clean up any existing audio first to prevent audio overlap
        this.stop();
        this.cleanup();

        // Reset all state
        this.scene = scene;
        this.currentLineIndex = 0;
        this.isPlaying = false;
        this.audioDurations = [];
        this.audioDurationsLoaded = false;
        this.preloadedAudios = [];
        this.preloadingComplete = false; // Track preloading status
        this.savedAudioPosition = 0; // Reset saved position for new scene

        // CRITICAL FIX: Clear any existing callbacks to prevent stale triggers
        this.onLineComplete = null;
        this.onAllLinesComplete = null;

        console.log('🎵 AudioNarration initialized for scene:', scene.number);
        console.log('   - Has audioUrls:', !!scene.audioUrls);
        console.log('   - AudioUrls count:', scene.audioUrls?.length || 0);
        console.log('   - Narration lines:', scene.narrationLines?.length || 0);
        console.log('   - Has viseme data:', !!scene.visemeDataArray);
        console.log('   - Viseme data count:', scene.visemeDataArray?.length || 0);
        console.log('   - Saved audio position reset to:', this.savedAudioPosition);

        // CRITICAL: Preload and load audio durations for this scene
        // This ensures all audio is ready before playback starts
        if (scene.audioUrls && scene.audioUrls.length > 0) {
            console.log('⏳ Starting audio preload - please wait...');
            await this.preloadAllAudio();
            await this.loadAudioDurations();
            this.preloadingComplete = true;
            console.log('✅ All audio preloading complete - ready for playback');
        } else {
            this.preloadingComplete = true;
        }

        // CRITICAL FIX: Clear initializing flag immediately after preloading completes
        // This allows audio to start playing right away from the .then() callback in loadStoryboardScene
        // We add a small delay (100ms) to ensure displayNarrationLinesSequentially has started
        setTimeout(() => {
            this.isInitializing = false;
            console.log('🔓 isInitializing = false - scene init complete, audio playback allowed');
        }, 100); // Reduced from 2000ms to 100ms to allow immediate playback
    },

    /**
     * Preload all audio files for the scene to prevent stuttering
     * SAFARI OPTIMIZATION: Preload only first 3 audio files to reduce memory usage
     * @returns {Promise<void>}
     */
    async preloadAllAudio() {
        if (!this.scene || !this.scene.audioUrls || this.scene.audioUrls.length === 0) {
            return;
        }

        // SAFARI FIX: Detect if we're on Safari and limit preloading
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        const maxPreload = isSafari ? 3 : this.scene.audioUrls.length; // Safari: only preload first 3 lines
        const audioCount = Math.min(maxPreload, this.scene.audioUrls.length);

        console.log(`🔄 Preloading ${audioCount} of ${this.scene.audioUrls.length} audio files${isSafari ? ' (Safari memory optimization)' : ''}...`);

        const preloadPromises = this.scene.audioUrls.slice(0, audioCount).map((audioUrl, index) => {
            return new Promise((resolve) => {
                const audio = new Audio();
                audio.preload = 'auto';
                // CRITICAL FIX: Add crossOrigin for Cloudflare R2 CORS support
                audio.crossOrigin = 'anonymous';
                audio.src = audioUrl;

                const onCanPlayThrough = () => {
                    console.log(`✅ Preloaded audio ${index + 1}/${audioCount}`);
                    cleanup();
                    resolve(audio);
                };

                const onError = (e) => {
                    console.warn(`⚠️ Failed to preload audio ${index + 1}:`, e);
                    cleanup();
                    resolve(null);
                };

                const cleanup = () => {
                    audio.removeEventListener('canplaythrough', onCanPlayThrough);
                    audio.removeEventListener('error', onError);
                };

                audio.addEventListener('canplaythrough', onCanPlayThrough, { once: true });
                audio.addEventListener('error', onError, { once: true });

                // Start loading
                audio.load();
            });
        });

        // Create array with preloaded audios at the beginning and nulls for the rest
        const preloadedArray = await Promise.all(preloadPromises);
        this.preloadedAudios = new Array(this.scene.audioUrls.length).fill(null);
        preloadedArray.forEach((audio, index) => {
            this.preloadedAudios[index] = audio;
        });

        console.log(`✅ ${audioCount} audio files preloaded successfully${isSafari ? ' (remaining will load on-demand)' : ''}`);
    },

    /**
     * Cleanup timeouts and intervals
     */
    cleanup() {
        // Clear all pending timeouts
        this.cleanupTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        this.cleanupTimeouts = [];

        // CRITICAL FIX: Properly dispose of all preloaded audio objects to prevent memory leaks
        if (this.preloadedAudios && this.preloadedAudios.length > 0) {
            console.log('🧹 Cleaning up', this.preloadedAudios.length, 'preloaded audio objects...');
            this.preloadedAudios.forEach((audio, index) => {
                if (audio) {
                    try {
                        // Pause audio
                        audio.pause();
                        // Remove all event listeners
                        audio.onended = null;
                        audio.onerror = null;
                        audio.oncanplaythrough = null;
                        audio.onplay = null;
                        audio.onpause = null;
                        audio.onloadedmetadata = null;
                        audio.oncanplay = null;
                        // Reset source to free resources
                        audio.src = '';
                        audio.load();
                    } catch (e) {
                        console.warn(`⚠️ Error cleaning up audio ${index}:`, e);
                    }
                }
            });
            // Clear the array
            this.preloadedAudios = [];
            console.log('✅ All preloaded audio objects cleaned up');
        }
    },

    /**
     * Load durations for all audio files in the current scene
     * @returns {Promise<void>}
     */
    async loadAudioDurations() {
        if (!this.scene || !this.scene.audioUrls || this.scene.audioUrls.length === 0) {
            return;
        }

        console.log('🎵 Loading audio durations for', this.scene.audioUrls.length, 'audio files...');

        const durationPromises = this.scene.audioUrls.map((audioUrl, index) => {
            return this.getLineDuration(index);
        });

        this.audioDurations = await Promise.all(durationPromises);
        this.audioDurationsLoaded = true;

        console.log('✅ Audio durations loaded:', this.audioDurations.map((d, i) =>
            `Line ${i + 1}: ${(d / 1000).toFixed(2)}s`
        ).join(', '));
    },

    /**
     * Get total duration for all narration lines in the scene
     * Uses actual audio durations if loaded, otherwise falls back to fixed duration
     * @returns {number} Total duration in milliseconds
     */
    getTotalSceneDuration() {
        // Use actual audio durations if available
        if (this.audioDurationsLoaded && this.audioDurations.length > 0) {
            const totalDuration = this.audioDurations.reduce((sum, duration) => sum + duration, 0);
            console.log('📊 Total scene duration from audio:', (totalDuration / 1000).toFixed(2) + 's');
            return totalDuration;
        }

        // Fallback to fixed duration per line
        const lineCount = this.scene?.narrationLines?.length || 6;
        return lineCount * this.LINE_DURATION_MS;
    },

    /**
     * Get cumulative time offsets for each line (when each line should start)
     * Uses actual audio durations if loaded, otherwise falls back to fixed duration
     * @returns {Array<number>} Array of start times in milliseconds
     */
    getLineStartTimes() {
        const lineCount = this.scene?.narrationLines?.length || 6;

        // Use actual audio durations if available
        if (this.audioDurationsLoaded && this.audioDurations.length > 0) {
            const startTimes = [];
            let cumulativeTime = 0;

            for (let i = 0; i < lineCount; i++) {
                startTimes.push(cumulativeTime);
                cumulativeTime += this.audioDurations[i] || this.LINE_DURATION_MS;
            }

            console.log('📊 Line start times:', startTimes.map((t, i) =>
                `Line ${i + 1}: ${(t / 1000).toFixed(2)}s`
            ).join(', '));
            return startTimes;
        }

        // Fallback to fixed 7-second intervals
        return Array.from({ length: lineCount }, (_, i) => i * this.LINE_DURATION_MS);
    },

    /**
     * Get the line index that should be displayed at a given elapsed time
     * Uses actual audio durations if loaded, otherwise falls back to fixed duration
     * @param {number} elapsedTimeMs - Elapsed time in the scene in milliseconds
     * @returns {number} Line index (0-based)
     */
    getLineIndexAtTime(elapsedTimeMs) {
        const lineCount = this.scene?.narrationLines?.length || 6;

        // Use actual audio durations if available
        if (this.audioDurationsLoaded && this.audioDurations.length > 0) {
            let cumulativeTime = 0;

            for (let i = 0; i < lineCount; i++) {
                const lineDuration = this.audioDurations[i] || this.LINE_DURATION_MS;
                cumulativeTime += lineDuration;

                if (elapsedTimeMs < cumulativeTime) {
                    return i;
                }
            }

            return lineCount - 1; // Last line
        }

        // Fallback to fixed duration calculation
        const lineIndex = Math.floor(elapsedTimeMs / this.LINE_DURATION_MS);
        return Math.min(lineIndex, lineCount - 1);
    },

    /**
     * Play audio for a specific narration line
     * @param {number} lineIndex - Index of the narration line
     * @returns {Promise} - Resolves when audio finishes
     */
    async playLine(lineIndex) {
        if (!this.scene || !this.scene.audioUrls || !this.scene.audioUrls[lineIndex]) {
            console.log('⚠️ No audio available for line', lineIndex);
            return Promise.resolve();
        }

        // CRITICAL FIX: Block playLine during scene initialization to prevent timing issues
        if (this.isInitializing) {
            console.log('⚠️ Scene is initializing, blocking playLine call to prevent audio timing issues');
            return Promise.resolve();
        }

        // CRITICAL FIX: Don't interfere if we're currently resuming audio
        // This prevents race conditions between resume() and playLine() calls
        if (this.isResuming) {
            console.log('⚠️ Currently resuming audio, skipping playLine call to prevent restart');
            return Promise.resolve();
        }

        // CRITICAL: Ensure all audio is preloaded before starting playback
        // This prevents stuttering and ensures smooth transitions
        if (!this.preloadingComplete) {
            console.log('⏳ Waiting for audio preloading to complete before playing line', lineIndex + 1);
            // Wait for preloading to complete (with timeout)
            let waitCount = 0;
            while (!this.preloadingComplete && waitCount < 100) {
                await new Promise(resolve => setTimeout(resolve, 100));
                waitCount++;
            }
            if (!this.preloadingComplete) {
                console.warn('⚠️ Preloading timeout - proceeding anyway');
            } else {
                console.log('✅ Preloading complete - starting playback');
            }
        }

        // CRITICAL FIX: Debounce rapid playLine calls to prevent audio restarts
        // Check if this is a duplicate call within the debounce window
        const now = Date.now();
        const timeSinceLastCall = now - this.lastPlayLineCall;
        if (this.currentLineIndex === lineIndex && timeSinceLastCall < this.DEBOUNCE_DELAY) {
            console.log(`⚠️ Debounced duplicate playLine(${lineIndex + 1}) call (${timeSinceLastCall}ms since last call)`);
            return Promise.resolve();
        }
        this.lastPlayLineCall = now;

        // IMPORTANT: Check if we're already playing this exact line
        // Prevent duplicate play calls that cause stuttering
        if (this.currentAudio && this.currentLineIndex === lineIndex && this.isPlaying) {
            // CRITICAL FIX: Also verify audio element is actually playing (not just paused/ended)
            if (!this.currentAudio.paused && !this.currentAudio.ended) {
                console.log(`⚠️ Already playing line ${lineIndex + 1}, skipping duplicate play call`);
                return Promise.resolve();
            }
        }

        // CRITICAL FIX: Check if we're resuming the same audio that was paused
        // If so, don't reset currentTime - just resume from where it was
        const isResumingSameLine = this.currentAudio &&
                                    this.currentLineIndex === lineIndex &&
                                    !this.isPlaying &&
                                    this.currentAudio.paused;

        if (isResumingSameLine) {
            console.log(`▶️ Resuming line ${lineIndex + 1} from position ${this.currentAudio.currentTime.toFixed(2)}s`);
            this.isPlaying = true;

            // CRITICAL FIX: Restore teaching pose and avatar state when resuming
            // This ensures the teaching animation continues from where it was paused
            if (window.RPMAvatar && window.RPMAvatar.isInitialized) {
                console.log('🎭 Restoring teaching pose and lip-sync for resume (same line)');

                // Restore speaking and teaching state
                window.RPMAvatar.isSpeaking = true;
                window.RPMAvatar.teachingAnimationActive = true;

                // CRITICAL: Transition to teaching pose if not already transitioning
                // This ensures the avatar returns to the teaching position
                if (!window.RPMAvatar.poseTransitionActive) {
                    console.log('🎬 Transitioning back to teaching pose on resume');
                    window.RPMAvatar.transitionToTeachingPose();
                }

                // Get viseme data for this line if available
                const visemeData = this.scene.visemeDataArray && this.scene.visemeDataArray[lineIndex]
                    ? this.scene.visemeDataArray[lineIndex]
                    : null;

                console.log('🎭 Re-syncing avatar lip-sync for resume');
                // Re-sync with the same audio element - this will restore the lip sync state
                window.RPMAvatar.syncWithAudio(this.currentAudio, visemeData);
            }

            return this.currentAudio.play()
                .then(() => {
                    console.log(`✅ Resumed line ${lineIndex + 1} successfully`);
                })
                .catch(err => {
                    console.error('❌ Failed to resume audio:', err);
                    this.isPlaying = false;
                    throw err;
                });
        }

        // CRITICAL FIX: Only stop audio if switching lines, but don't cleanup lip sync
        // This prevents lip sync from restarting when transitioning between lines
        const isLineTransition = this.currentAudio && this.currentLineIndex !== lineIndex;
        if (isLineTransition) {
            console.log(`🔄 Transitioning from line ${this.currentLineIndex + 1} to line ${lineIndex + 1}`);

            // CRITICAL FIX: Set transition flag BEFORE pausing to prevent avatar from going idle
            this.isTransitioningLines = true;

            // Pause current audio without full cleanup
            if (this.currentAudio && !this.currentAudio.paused) {
                this.currentAudio.pause();
            }
            // Note: We don't call stopCurrentAudio() here to preserve lip sync state
        }

        const audioUrl = this.scene.audioUrls[lineIndex];
        const narrationPreview = this.scene.narrationLines?.[lineIndex]
            ? this.scene.narrationLines[lineIndex].substring(0, 50) + '...'
            : (this.scene.narration ? this.scene.narration.substring(0, 50) + '...' : 'No text');

        // DIAGNOSTIC: Log scene and audio info to verify correct audio is being used
        console.log(`🎵 ========== PLAYING AUDIO ==========`);
        console.log(`🎵 Scene: ${this.scene.number || 'unknown'}`);
        console.log(`🎵 Line: ${lineIndex + 1} of ${this.scene.audioUrls.length}`);
        console.log(`🎵 Audio URL: ${audioUrl.substring(audioUrl.lastIndexOf('/') + 1)}`);
        console.log(`🎵 Narration: ${narrationPreview}`);
        console.log(`🎵 ===================================`);

        return new Promise((resolve, reject) => {
            try {
                // Use preloaded audio if available, otherwise create new
                let audio;
                if (this.preloadedAudios[lineIndex]) {
                    console.log(`🔄 Using preloaded audio for line ${lineIndex + 1}`);
                    audio = this.preloadedAudios[lineIndex];

                    // CRITICAL FIX: AGGRESSIVELY reset audio element to ensure fresh playback
                    // Reset currentTime MULTIPLE times to handle any race conditions
                    console.log(`🔧 PRE-CHECK: Audio currentTime = ${audio.currentTime.toFixed(3)}s, paused = ${audio.paused}, ended = ${audio.ended}`);

                    // First reset
                    audio.currentTime = 0;

                    // Ensure audio is paused before resetting
                    if (!audio.paused) {
                        audio.pause();
                    }

                    // Second reset after pause
                    audio.currentTime = 0;

                    console.log(`🔧 POST-RESET: Audio currentTime = ${audio.currentTime.toFixed(3)}s (should be 0)`);
                } else {
                    console.log(`🎧 Creating new Audio object for line ${lineIndex + 1}...`);
                    audio = new Audio();
                    audio.preload = 'auto';
                    // CRITICAL FIX: Add crossOrigin for Cloudflare R2 CORS support
                    audio.crossOrigin = 'anonymous';
                    audio.src = audioUrl;
                    // New audio elements start at currentTime = 0 by default
                }

                const volume = this.getVolume();
                audio.volume = volume;

                this.currentAudio = audio;
                this.currentLineIndex = lineIndex;
                this.isPlaying = true;
                this.savedAudioPosition = 0; // Reset saved position for new line

                // CRITICAL FIX: DON'T clear transition flag here - it's too early!
                // The flag will be cleared when audio actually starts playing (in onplay handler)
                // Keeping it true ensures RPMAvatar knows we're still transitioning
                // this.isTransitioningLines = false; // REMOVED - causes premature idle pose

                console.log(`🔊 Audio configured - Volume: ${volume}, Line: ${lineIndex + 1}`);

                // CRITICAL: Ensure avatar is in teaching mode before syncing audio
                // This guarantees the teaching pose is active for every narration line
                if (window.RPMAvatar && window.RPMAvatar.isInitialized) {
                    console.log('🎭 Ensuring teaching animation is active before audio sync');
                    window.RPMAvatar.isSpeaking = true;
                    window.RPMAvatar.teachingAnimationActive = true;
                }

                // Sync avatar lip-sync with audio (if RPMAvatar is available)
                console.log('🔍 Avatar sync check:', {
                    hasRPMAvatar: !!window.RPMAvatar,
                    isInitialized: window.RPMAvatar?.isInitialized,
                    hasScene: !!this.scene,
                    hasVisemeDataArray: !!this.scene?.visemeDataArray,
                    visemeArrayLength: this.scene?.visemeDataArray?.length || 0
                });

                if (window.RPMAvatar && window.RPMAvatar.isInitialized) {
                    // Get viseme data for this line if available
                    const visemeData = this.scene.visemeDataArray && this.scene.visemeDataArray[lineIndex]
                        ? this.scene.visemeDataArray[lineIndex]
                        : null;

                    console.log(`🎭 Line ${lineIndex} viseme data:`, {
                        hasVisemeData: !!visemeData,
                        visemeLength: visemeData?.length || 0,
                        firstViseme: visemeData?.[0]
                    });

                    if (visemeData) {
                        console.log('🎭 Syncing avatar lip-sync with audio and viseme data');
                        console.log(`   📊 Viseme data contains ${visemeData.length} phonemes`);
                    } else {
                        console.log('🎭 Syncing avatar lip-sync with audio (no viseme data, using fallback)');
                    }

                    console.log('🎭 About to call RPMAvatar.syncWithAudio...');
                    window.RPMAvatar.syncWithAudio(audio, visemeData);
                    console.log('🎭 RPMAvatar.syncWithAudio called successfully');
                } else {
                    console.warn('⚠️ Cannot sync avatar - RPMAvatar not available or not initialized');
                }

                // Remove any existing listeners to prevent stacking
                // This ensures only one handler is attached, preventing duplicate playback
                audio.onended = null;
                audio.onerror = null;
                audio.onplay = null;

                // Set up event listeners using properties (only one listener per event)
                audio.onended = () => {
                    console.log(`✅ Audio finished for line ${lineIndex + 1}`);

                    // Check if there are more lines
                    const totalLines = this.scene?.narrationLines?.length || 0;
                    const isLastLine = lineIndex >= totalLines - 1;

                    if (!isLastLine) {
                        // CRITICAL FIX: Set transition flag BEFORE changing isPlaying
                        // This prevents avatar from thinking narration has ended
                        this.isTransitioningLines = true;
                        console.log('🔄 Setting isTransitioningLines = true (line ending, next line starting)');

                        // CRITICAL FIX: Keep teaching animation active during line transition
                        // Ensure avatar stays in teaching mode while transitioning between lines
                        if (window.RPMAvatar && window.RPMAvatar.isInitialized) {
                            console.log('🎭 LINE TRANSITION: Maintaining teaching animation');
                            window.RPMAvatar.teachingAnimationActive = true;
                            window.RPMAvatar.isSpeaking = true;
                        }

                        this.isPlaying = false;

                        // Automatically play the next line
                        const nextLineIndex = lineIndex + 1;
                        console.log(`🔄 Auto-playing next line: ${nextLineIndex + 1}`);

                        // Call onLineComplete callback
                        if (this.onLineComplete) {
                            this.onLineComplete(lineIndex, false);
                        }

                        // Play next line immediately to prevent gaps
                        this.playLine(nextLineIndex).catch(err => {
                            console.error('❌ Failed to auto-play next line:', err);
                            // CRITICAL FIX: Clear transition flag on error
                            this.isTransitioningLines = false;
                        });
                    } else {
                        // Last line finished - this is NOT a transition
                        this.isPlaying = false;
                        // Last line finished
                        console.log('🎬 Last narration line complete');

                        if (this.onLineComplete) {
                            this.onLineComplete(lineIndex, true);
                        }

                        // FIXED: Add delay before triggering completion to ensure last line is visible
                        // This gives users time to read the final narration line
                        if (this.onAllLinesComplete) {
                            console.log('🎬 Last line audio finished - waiting 3 seconds before triggering completion to show final line');
                            const completionTimeout = setTimeout(() => {
                                console.log('🎬 All narration lines complete - triggering callback after delay');
                                this.onAllLinesComplete();
                            }, 3000); // 3 second delay to show the last line

                            // Store timeout for cleanup
                            this.cleanupTimeouts.push(completionTimeout);
                        }
                    }

                    resolve();
                };

                audio.onerror = (e) => {
                    console.error(`❌ Audio playback error for line ${lineIndex + 1}:`, e);
                    this.isPlaying = false;
                    reject(e);
                };

                // Wait for audio to be ready before playing
                // This prevents stuttering from trying to play unbuffered audio
                const ensureReadyAndPlay = () => {
                    // For preloaded audio that's already ready, play immediately
                    if (this.preloadedAudios[lineIndex] && audio.readyState >= 3) {
                        console.log('🎬 Audio already buffered, playing immediately...');

                        // CRITICAL FIX: Reset currentTime to 0 immediately before play()
                        // This ensures the audio ALWAYS starts from the beginning, even if timing was set elsewhere
                        if (audio.currentTime !== 0) {
                            console.log(`🔧 FINAL RESET: Forcing audio position from ${audio.currentTime.toFixed(2)}s to 0s before play()`);
                            audio.currentTime = 0;
                        }

                        audio.play()
                            .then(() => {
                                console.log(`▶️ Audio playback started for line ${lineIndex + 1}`);
                                // CRITICAL FIX: Clear transition flag AFTER audio starts playing
                                // This ensures RPMAvatar sees the flag during the critical transition period
                                this.isTransitioningLines = false;
                                console.log('✅ Transition complete - audio playing');
                            })
                            .catch(err => {
                                console.error('❌ Failed to play audio:', err);
                                this.isPlaying = false;
                                this.isTransitioningLines = false; // Clear flag on error too
                                reject(err);
                            });
                    } else {
                        // For new audio or not-yet-ready audio, wait for canplaythrough
                        console.log('🎬 Waiting for audio to buffer...');
                        const onCanPlay = () => {
                            console.log(`✅ Audio buffered for line ${lineIndex + 1}, starting playback...`);
                            audio.removeEventListener('canplaythrough', onCanPlay);

                            // CRITICAL FIX: Reset currentTime to 0 immediately before play()
                            // This ensures the audio ALWAYS starts from the beginning, even if timing was set elsewhere
                            if (audio.currentTime !== 0) {
                                console.log(`🔧 FINAL RESET: Forcing audio position from ${audio.currentTime.toFixed(2)}s to 0s before play()`);
                                audio.currentTime = 0;
                            }

                            audio.play()
                                .then(() => {
                                    console.log(`▶️ Audio playback started for line ${lineIndex + 1}`);
                                    // CRITICAL FIX: Clear transition flag AFTER audio starts playing
                                    // This ensures RPMAvatar sees the flag during the critical transition period
                                    this.isTransitioningLines = false;
                                    console.log('✅ Transition complete - audio playing');
                                })
                                .catch(err => {
                                    console.error('❌ Failed to play audio:', err);
                                    this.isPlaying = false;
                                    this.isTransitioningLines = false; // Clear flag on error too
                                    reject(err);
                                });
                        };

                        audio.addEventListener('canplaythrough', onCanPlay, { once: true });

                        // Start loading if not already loaded
                        if (audio.readyState < 3) {
                            audio.load();
                        }
                    }
                };

                ensureReadyAndPlay();

            } catch (error) {
                console.error('❌ Error setting up audio:', error);
                this.isPlaying = false;
                reject(error);
            }
        });
    },

    /**
     * Stop only the current audio without resetting entire state
     */
    stopCurrentAudio() {
        if (this.currentAudio) {
            try {
                this.currentAudio.pause();
                this.currentAudio.currentTime = 0;
                this.currentAudio.onended = null;
                this.currentAudio.onerror = null;
            } catch (e) {
                console.warn('Error stopping current audio:', e);
            }
            this.currentAudio = null;
            this.isPlaying = false;
        }
    },

    /**
     * Verify and sync isPlaying state with actual audio element state
     * This prevents desync when rapid play/pause occurs
     */
    syncPlaybackState() {
        if (this.currentAudio) {
            const actuallyPlaying = !this.currentAudio.paused && !this.currentAudio.ended;
            if (this.isPlaying !== actuallyPlaying) {
                console.log(`⚠️ State desync detected! isPlaying: ${this.isPlaying}, actual: ${actuallyPlaying} - syncing`);
                this.isPlaying = actuallyPlaying;
            }
        } else if (this.isPlaying) {
            console.log('⚠️ isPlaying=true but no currentAudio - syncing to false');
            this.isPlaying = false;
        }
    },

    /**
     * Pause currently playing audio
     */
    pause() {
        console.log('⏸️ AudioNarration.pause() called');

        // First sync state to ensure we have accurate info
        this.syncPlaybackState();

        // CRITICAL FIX: Always try to pause the audio, regardless of the paused state
        // This ensures audio stops even if the state is out of sync
        if (this.currentAudio) {
            try {
                // Save the current playback position before pausing
                this.savedAudioPosition = this.currentAudio.currentTime;

                // CRITICAL: Always call pause(), even if already paused
                // This ensures the audio element is definitely in paused state
                this.currentAudio.pause();
                this.isPlaying = false;

                console.log('⏸️ Narration audio paused at position:', this.savedAudioPosition.toFixed(2) + 's');
                console.log('⏸️ Audio element state after pause:', {
                    paused: this.currentAudio.paused,
                    currentTime: this.currentAudio.currentTime.toFixed(2),
                    duration: this.currentAudio.duration.toFixed(2),
                    ended: this.currentAudio.ended
                });
            } catch (err) {
                console.error('❌ Error pausing narration audio:', err);
                // Force state to paused even on error
                this.isPlaying = false;
            }
        } else {
            // No audio element - just update state
            this.isPlaying = false;
            console.log('⏸️ No current audio element to pause');
        }
    },

    /**
     * Resume paused audio
     */
    resume() {
        // First sync state to ensure we have accurate info
        this.syncPlaybackState();

        // CRITICAL FIX: Don't resume if already resuming to prevent restart race conditions
        if (this.isResuming) {
            console.log('⚠️ Already resuming audio, skipping duplicate resume call');
            return;
        }

        if (this.currentAudio && this.currentAudio.paused && !this.isPlaying) {
            // CRITICAL FIX: Set isResuming flag to prevent syncNarrationToTime() interference
            this.isResuming = true;
            console.log('▶️ Resuming audio from paused state at position:', this.savedAudioPosition.toFixed(2) + 's');
            console.log('   Current line index:', this.currentLineIndex, '  Audio element:', this.currentAudio ? 'exists' : 'null');

            // Restore the saved playback position immediately (no delay needed)
            if (this.savedAudioPosition > 0) {
                try {
                    this.currentAudio.currentTime = this.savedAudioPosition;
                    console.log('✅ Restored audio position to:', this.currentAudio.currentTime.toFixed(2) + 's');
                } catch (err) {
                    console.warn('⚠️ Could not restore audio position:', err);
                }
            }

            // CRITICAL FIX: Resume lip-sync and ensure teaching animation is active
            // Mark as speaking again and ensure teaching pose is applied BEFORE playing audio
            if (window.RPMAvatar && window.RPMAvatar.isInitialized) {
                console.log('🎭 RESUME: Restoring avatar state');

                // STEP 1: Stop any idle animation immediately
                if (window.RPMAvatar.isIdleAnimationActive) {
                    console.log('🛑 Stopping idle animation before resume');
                    window.RPMAvatar.stopIdleAnimation();
                }

                // STEP 2: Set speaking and teaching flags
                window.RPMAvatar.isSpeaking = true;
                window.RPMAvatar.teachingAnimationActive = true;
                console.log('✅ Set isSpeaking=true, teachingAnimationActive=true');

                // STEP 3: Force transition to teaching pose (even if already transitioning)
                // We need to ensure the teaching pose is active when resuming
                console.log('🎬 Forcing transition to teaching pose on resume');
                // Temporarily clear the transition flag if it's stuck
                if (window.RPMAvatar.poseTransitionActive) {
                    console.log('⚠️ Transition was active - clearing and restarting');
                    window.RPMAvatar.poseTransitionActive = false;
                }
                window.RPMAvatar.transitionToTeachingPose();

                // STEP 4: Re-sync audio with avatar to re-establish lip-sync connection
                // Without this, the audio analyzer won't be reconnected and lip-sync won't work
                const visemeData = this.scene.visemeDataArray && this.scene.visemeDataArray[this.currentLineIndex]
                    ? this.scene.visemeDataArray[this.currentLineIndex]
                    : null;

                console.log('🎭 Re-syncing avatar with audio for resume');
                window.RPMAvatar.syncWithAudio(this.currentAudio, visemeData);
            }

            // CRITICAL: Set isPlaying BEFORE calling play() to prevent race conditions
            this.isPlaying = true;

            this.currentAudio.play()
                .then(() => {
                    console.log('✅ Audio resumed successfully');
                    // CRITICAL FIX: Clear isResuming flag after successful play
                    // Keep it active for a bit longer to prevent syncNarrationToTime interference
                    setTimeout(() => {
                        this.isResuming = false;
                        console.log('✅ isResuming flag cleared after successful resume');
                    }, 500); // Increased from 200ms to 500ms for more stability
                })
                .catch(err => {
                    console.error('❌ Failed to resume audio:', err);
                    this.isPlaying = false;
                    this.isResuming = false; // CRITICAL FIX: Clear flag on error too
                });
        } else {
            if (!this.currentAudio) {
                console.log('⚠️ No current audio to resume - need to recreate audio element');
                // If audio element is lost (e.g., after tab switch), recreate it
                if (this.scene && this.scene.audioUrls && this.scene.audioUrls[this.currentLineIndex]) {
                    console.log('🔄 Recreating audio element for line', this.currentLineIndex + 1);
                    this.recreateAndResumeAudio();
                }
            } else if (!this.currentAudio.paused) {
                console.log('⚠️ Audio is already playing - skipping resume');
                this.isPlaying = true; // Sync state with reality
            } else if (this.isPlaying) {
                console.log('⚠️ isPlaying already true - state may be out of sync');
            }
        }
    },

    /**
     * Recreate audio element and resume from saved position
     * Used when audio element is lost (e.g., after tab switch)
     */
    recreateAndResumeAudio() {
        // CRITICAL FIX: Set isResuming flag to prevent interference
        this.isResuming = true;

        const lineIndex = this.currentLineIndex;
        const audioUrl = this.scene.audioUrls[lineIndex];

        console.log('🔄 Recreating audio for line', lineIndex + 1, 'at position:', this.savedAudioPosition.toFixed(2) + 's');

        // Use preloaded audio if available, otherwise create new
        let audio;
        if (this.preloadedAudios[lineIndex]) {
            audio = this.preloadedAudios[lineIndex];
            console.log('📦 Using preloaded audio element');
        } else {
            audio = new Audio();
            audio.preload = 'auto';
            // CRITICAL FIX: Add crossOrigin for Cloudflare R2 CORS support
            audio.crossOrigin = 'anonymous';
            audio.src = audioUrl;
            console.log('🆕 Creating new audio element');
        }

        const volume = this.getVolume();
        audio.volume = volume;

        this.currentAudio = audio;

        // Sync avatar lip-sync with audio (if RPMAvatar is available)
        if (window.RPMAvatar && window.RPMAvatar.isInitialized) {
            // Get viseme data for this line if available
            const visemeData = this.scene.visemeDataArray && this.scene.visemeDataArray[lineIndex]
                ? this.scene.visemeDataArray[lineIndex]
                : null;

            console.log('🎭 Syncing avatar lip-sync during audio recreation');
            console.log(`   Line ${lineIndex + 1} has viseme data:`, !!visemeData);

            window.RPMAvatar.syncWithAudio(audio, visemeData);
        } else {
            console.warn('⚠️ Cannot sync avatar - RPMAvatar not available during recreation');
        }

        // Set up event handlers
        audio.onended = null;
        audio.onerror = null;

        audio.onended = () => {
            console.log(`✅ Audio finished for line ${lineIndex + 1}`);
            this.isPlaying = false;
            this.savedAudioPosition = 0; // Reset saved position

            const totalLines = this.scene?.narrationLines?.length || 0;
            const isLastLine = lineIndex >= totalLines - 1;

            if (!isLastLine) {
                const nextLineIndex = lineIndex + 1;
                console.log(`🔄 Auto-playing next line: ${nextLineIndex + 1}`);

                if (this.onLineComplete) {
                    this.onLineComplete(lineIndex, false);
                }

                this.playLine(nextLineIndex).catch(err => {
                    console.error('❌ Failed to auto-play next line:', err);
                });
            } else {
                console.log('🎬 Last narration line complete');

                if (this.onLineComplete) {
                    this.onLineComplete(lineIndex, true);
                }

                if (this.onAllLinesComplete) {
                    console.log('🎬 All narration lines complete - triggering callback');
                    this.onAllLinesComplete();
                }
            }
        };

        audio.onerror = (e) => {
            console.error(`❌ Audio playback error for line ${lineIndex + 1}:`, e);
            this.isPlaying = false;
        };

        // Wait for audio to be ready, then restore position and play
        const playWhenReady = () => {
            if (audio.readyState >= 2) { // HAVE_CURRENT_DATA or better
                console.log('✅ Audio ready, restoring position and playing');

                // Restore saved position
                if (this.savedAudioPosition > 0) {
                    try {
                        audio.currentTime = this.savedAudioPosition;
                        console.log('✅ Position restored to:', audio.currentTime.toFixed(2) + 's');
                    } catch (err) {
                        console.warn('⚠️ Could not restore position:', err);
                    }
                }

                // Play
                audio.play()
                    .then(() => {
                        this.isPlaying = true;
                        // CRITICAL FIX: Clear isResuming flag after successful resume
                        setTimeout(() => {
                            this.isResuming = false;
                            console.log('✅ isResuming flag cleared after recreateAndResumeAudio');
                        }, 200); // Reduced from 2000ms to 200ms to match resume() function
                        console.log(`▶️ Audio resumed from saved position`);
                    })
                    .catch(err => {
                        console.error('❌ Failed to play audio:', err);
                        this.isPlaying = false;
                        this.isResuming = false; // Clear flag on error
                    });
            } else {
                console.log('⏳ Waiting for audio to buffer...');
                audio.addEventListener('canplay', () => {
                    console.log('✅ Audio buffered, restoring position and playing');

                    // Restore saved position
                    if (this.savedAudioPosition > 0) {
                        try {
                            audio.currentTime = this.savedAudioPosition;
                            console.log('✅ Position restored to:', audio.currentTime.toFixed(2) + 's');
                        } catch (err) {
                            console.warn('⚠️ Could not restore position:', err);
                        }
                    }

                    audio.play()
                        .then(() => {
                            this.isPlaying = true;
                            // CRITICAL FIX: Clear isResuming flag after successful resume
                            setTimeout(() => {
                                this.isResuming = false;
                                console.log('✅ isResuming flag cleared after recreateAndResumeAudio (canplay path)');
                            }, 200); // Reduced from 2000ms to 200ms to match resume() function
                            console.log(`▶️ Audio resumed from saved position`);
                        })
                        .catch(err => {
                            console.error('❌ Failed to play audio:', err);
                            this.isPlaying = false;
                            this.isResuming = false; // Clear flag on error
                        });
                }, { once: true });

                audio.load();
            }
        };

        playWhenReady();
    },

    /**
     * Stop and cleanup current audio completely
     */
    stop() {
        this.stopCurrentAudio();
        this.cleanup();
        console.log('⏹️ Audio stopped completely');
    },

    /**
     * Update the narration volume display in the UI
     * @param {number} volume - Volume (0-1)
     */
    updateVolumeDisplay(volume) {
        const volumeValueElement = document.getElementById('narrationVolumeValue');
        if (volumeValueElement) {
            const percentage = Math.round(volume * 100);
            volumeValueElement.textContent = `${percentage}%`;
        }
    },

    /**
     * Get current volume from user settings or storyboard player
     * Checks user settings first, then falls back to 100% volume
     * @returns {number} Volume (0-1)
     */
    getVolume() {
        let volume;

        // Check if user settings specify a narration volume
        if (window.userSettings && typeof window.userSettings.narration_volume === 'number') {
            volume = Math.max(0, Math.min(1, window.userSettings.narration_volume));
            console.log('🔊 Using user-configured narration volume:', (volume * 100) + '%');
        } else {
            // Fallback to 100% volume if no settings
            volume = 1.0;
            console.log('🔊 Using default narration volume: 100%');
        }

        // Update the UI display
        this.updateVolumeDisplay(volume);

        return volume;
    },

    /**
     * Set volume for current audio
     * @param {number} volume - Volume (0-1)
     */
    setVolume(volume) {
        if (this.currentAudio) {
            this.currentAudio.volume = volume;
        }
        // Update the UI display
        this.updateVolumeDisplay(volume);
    },

    /**
     * Check if audio is available for scene
     * @param {Object} scene - Scene object
     * @returns {boolean}
     */
    hasAudio(scene) {
        return scene && scene.audioUrls && scene.audioUrls.length > 0;
    },

    /**
     * Get audio duration for a line
     * @param {number} lineIndex - Line index
     * @returns {Promise<number>} Duration in milliseconds
     */
    async getLineDuration(lineIndex) {
        if (!this.scene || !this.scene.audioUrls || !this.scene.audioUrls[lineIndex]) {
            return 0;
        }

        return new Promise((resolve) => {
            const audio = new Audio();
            // CRITICAL FIX: Add crossOrigin for Cloudflare R2 CORS support
            audio.crossOrigin = 'anonymous';
            audio.src = this.scene.audioUrls[lineIndex];

            const cleanup = () => {
                // CRITICAL FIX: Properly dispose of the audio object after getting duration
                try {
                    audio.pause();
                    audio.onloadedmetadata = null;
                    audio.onerror = null;
                    audio.src = '';
                    audio.load();
                } catch (e) {
                    console.warn('⚠️ Error cleaning up duration audio:', e);
                }
            };

            audio.addEventListener('loadedmetadata', () => {
                const duration = audio.duration * 1000; // Convert to ms
                cleanup();
                resolve(duration);
            }, { once: true });

            audio.addEventListener('error', () => {
                cleanup();
                resolve(0);
            }, { once: true });
        });
    }
};

// Make available globally
window.AudioNarration = AudioNarration;

// CRITICAL FIX: Add cleanup on page unload to prevent memory leaks
// This ensures all audio resources are properly released when the page is refreshed or closed
window.addEventListener('beforeunload', () => {
    console.log('🧹 Page unloading - cleaning up audio resources...');
    if (window.AudioNarration) {
        window.AudioNarration.stop();
        window.AudioNarration.cleanup();
    }
});

// REMOVED: Visibility change handler to allow audio to continue when tab is hidden
// Users want the story to continue playing when switching tabs
// document.addEventListener('visibilitychange', () => {
//     if (document.hidden && window.AudioNarration && window.AudioNarration.isPlaying) {
//         console.log('👁️ Page hidden - pausing audio to save resources');
//         window.AudioNarration.pause();
//     }
// });
