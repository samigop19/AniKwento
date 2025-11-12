

const AudioNarration = {
    currentAudio: null,
    audioQueue: [],
    preloadedAudios: [], 
    isPlaying: false,
    isResuming: false, 
    isTransitioningLines: false, 
    isInitializing: false, 
    currentLineIndex: 0,
    scene: null,
    audioDurations: [], 
    audioDurationsLoaded: false,
    LINE_DURATION_MS: 7000, 
    onLineComplete: null, 
    onAllLinesComplete: null, 
    cleanupTimeouts: [], 
    savedAudioPosition: 0, 
    lastPlayLineCall: 0, 
    DEBOUNCE_DELAY: 100, 

    
    async init(scene) {
        
        this.isInitializing = true;
        console.log('🔒 isInitializing = true - blocking external interference during scene init');

        
        this.stop();
        this.cleanup();

        
        this.scene = scene;
        this.currentLineIndex = 0;
        this.isPlaying = false;
        this.audioDurations = [];
        this.audioDurationsLoaded = false;
        this.preloadedAudios = [];
        this.preloadingComplete = false; 
        this.savedAudioPosition = 0; 

        
        this.onLineComplete = null;
        this.onAllLinesComplete = null;

        console.log('🎵 AudioNarration initialized for scene:', scene.number);
        console.log('   - Has audioUrls:', !!scene.audioUrls);
        console.log('   - AudioUrls count:', scene.audioUrls?.length || 0);
        console.log('   - Narration lines:', scene.narrationLines?.length || 0);
        console.log('   - Has viseme data:', !!scene.visemeDataArray);
        console.log('   - Viseme data count:', scene.visemeDataArray?.length || 0);
        console.log('   - Saved audio position reset to:', this.savedAudioPosition);

        
        
        if (scene.audioUrls && scene.audioUrls.length > 0) {
            console.log('⏳ Starting audio preload - please wait...');
            await this.preloadAllAudio();
            await this.loadAudioDurations();
            this.preloadingComplete = true;
            console.log('✅ All audio preloading complete - ready for playback');
        } else {
            this.preloadingComplete = true;
        }

        
        
        
        setTimeout(() => {
            this.isInitializing = false;
            console.log('🔓 isInitializing = false - scene init complete, audio playback allowed');
        }, 100); 
    },

    
    async preloadAllAudio() {
        if (!this.scene || !this.scene.audioUrls || this.scene.audioUrls.length === 0) {
            return;
        }

        
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        const maxPreload = isSafari ? 3 : this.scene.audioUrls.length; 
        const audioCount = Math.min(maxPreload, this.scene.audioUrls.length);

        console.log(`🔄 Preloading ${audioCount} of ${this.scene.audioUrls.length} audio files${isSafari ? ' (Safari memory optimization)' : ''}...`);

        const preloadPromises = this.scene.audioUrls.slice(0, audioCount).map((audioUrl, index) => {
            return new Promise((resolve) => {
                const audio = new Audio();
                audio.preload = 'auto';
                
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

                
                audio.load();
            });
        });

        
        const preloadedArray = await Promise.all(preloadPromises);
        this.preloadedAudios = new Array(this.scene.audioUrls.length).fill(null);
        preloadedArray.forEach((audio, index) => {
            this.preloadedAudios[index] = audio;
        });

        console.log(`✅ ${audioCount} audio files preloaded successfully${isSafari ? ' (remaining will load on-demand)' : ''}`);
    },

    
    cleanup() {
        
        this.cleanupTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        this.cleanupTimeouts = [];

        
        if (this.preloadedAudios && this.preloadedAudios.length > 0) {
            console.log('🧹 Cleaning up', this.preloadedAudios.length, 'preloaded audio objects...');
            this.preloadedAudios.forEach((audio, index) => {
                if (audio) {
                    try {
                        
                        audio.pause();
                        
                        audio.onended = null;
                        audio.onerror = null;
                        audio.oncanplaythrough = null;
                        audio.onplay = null;
                        audio.onpause = null;
                        audio.onloadedmetadata = null;
                        audio.oncanplay = null;
                        
                        audio.src = '';
                        audio.load();
                    } catch (e) {
                        console.warn(`⚠️ Error cleaning up audio ${index}:`, e);
                    }
                }
            });
            
            this.preloadedAudios = [];
            console.log('✅ All preloaded audio objects cleaned up');
        }
    },

    
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

    
    getTotalSceneDuration() {
        
        if (this.audioDurationsLoaded && this.audioDurations.length > 0) {
            const totalDuration = this.audioDurations.reduce((sum, duration) => sum + duration, 0);
            console.log('📊 Total scene duration from audio:', (totalDuration / 1000).toFixed(2) + 's');
            return totalDuration;
        }

        
        const lineCount = this.scene?.narrationLines?.length || 6;
        return lineCount * this.LINE_DURATION_MS;
    },

    
    getLineStartTimes() {
        const lineCount = this.scene?.narrationLines?.length || 6;

        
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

        
        return Array.from({ length: lineCount }, (_, i) => i * this.LINE_DURATION_MS);
    },

    
    getLineIndexAtTime(elapsedTimeMs) {
        const lineCount = this.scene?.narrationLines?.length || 6;

        
        if (this.audioDurationsLoaded && this.audioDurations.length > 0) {
            let cumulativeTime = 0;

            for (let i = 0; i < lineCount; i++) {
                const lineDuration = this.audioDurations[i] || this.LINE_DURATION_MS;
                cumulativeTime += lineDuration;

                if (elapsedTimeMs < cumulativeTime) {
                    return i;
                }
            }

            return lineCount - 1; 
        }

        
        const lineIndex = Math.floor(elapsedTimeMs / this.LINE_DURATION_MS);
        return Math.min(lineIndex, lineCount - 1);
    },

    
    async playLine(lineIndex) {
        if (!this.scene || !this.scene.audioUrls || !this.scene.audioUrls[lineIndex]) {
            console.log('⚠️ No audio available for line', lineIndex);
            return Promise.resolve();
        }

        
        if (this.isInitializing) {
            console.log('⚠️ Scene is initializing, blocking playLine call to prevent audio timing issues');
            return Promise.resolve();
        }

        
        
        if (this.isResuming) {
            console.log('⚠️ Currently resuming audio, skipping playLine call to prevent restart');
            return Promise.resolve();
        }

        
        
        if (!this.preloadingComplete) {
            console.log('⏳ Waiting for audio preloading to complete before playing line', lineIndex + 1);
            
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

        
        
        const now = Date.now();
        const timeSinceLastCall = now - this.lastPlayLineCall;
        if (this.currentLineIndex === lineIndex && timeSinceLastCall < this.DEBOUNCE_DELAY) {
            console.log(`⚠️ Debounced duplicate playLine(${lineIndex + 1}) call (${timeSinceLastCall}ms since last call)`);
            return Promise.resolve();
        }
        this.lastPlayLineCall = now;

        
        
        if (this.currentAudio && this.currentLineIndex === lineIndex && this.isPlaying) {
            
            if (!this.currentAudio.paused && !this.currentAudio.ended) {
                console.log(`⚠️ Already playing line ${lineIndex + 1}, skipping duplicate play call`);
                return Promise.resolve();
            }
        }

        
        
        const isResumingSameLine = this.currentAudio &&
                                    this.currentLineIndex === lineIndex &&
                                    !this.isPlaying &&
                                    this.currentAudio.paused;

        if (isResumingSameLine) {
            console.log(`▶️ Resuming line ${lineIndex + 1} from position ${this.currentAudio.currentTime.toFixed(2)}s`);
            this.isPlaying = true;

            
            
            if (window.RPMAvatar && window.RPMAvatar.isInitialized) {
                console.log('🎭 Restoring teaching pose and lip-sync for resume (same line)');

                
                window.RPMAvatar.isSpeaking = true;
                window.RPMAvatar.teachingAnimationActive = true;

                
                
                if (!window.RPMAvatar.poseTransitionActive) {
                    console.log('🎬 Transitioning back to teaching pose on resume');
                    window.RPMAvatar.transitionToTeachingPose();
                }

                
                const visemeData = this.scene.visemeDataArray && this.scene.visemeDataArray[lineIndex]
                    ? this.scene.visemeDataArray[lineIndex]
                    : null;

                console.log('🎭 Re-syncing avatar lip-sync for resume');
                
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

        
        
        const isLineTransition = this.currentAudio && this.currentLineIndex !== lineIndex;
        if (isLineTransition) {
            console.log(`🔄 Transitioning from line ${this.currentLineIndex + 1} to line ${lineIndex + 1}`);

            
            this.isTransitioningLines = true;

            
            if (this.currentAudio && !this.currentAudio.paused) {
                this.currentAudio.pause();
            }
            
        }

        const audioUrl = this.scene.audioUrls[lineIndex];
        const narrationPreview = this.scene.narrationLines?.[lineIndex]
            ? this.scene.narrationLines[lineIndex].substring(0, 50) + '...'
            : (this.scene.narration ? this.scene.narration.substring(0, 50) + '...' : 'No text');

        
        console.log(`🎵 ========== PLAYING AUDIO ==========`);
        console.log(`🎵 Scene: ${this.scene.number || 'unknown'}`);
        console.log(`🎵 Line: ${lineIndex + 1} of ${this.scene.audioUrls.length}`);
        console.log(`🎵 Audio URL: ${audioUrl.substring(audioUrl.lastIndexOf('/') + 1)}`);
        console.log(`🎵 Narration: ${narrationPreview}`);
        console.log(`🎵 ===================================`);

        return new Promise((resolve, reject) => {
            try {
                
                let audio;
                if (this.preloadedAudios[lineIndex]) {
                    console.log(`🔄 Using preloaded audio for line ${lineIndex + 1}`);
                    audio = this.preloadedAudios[lineIndex];

                    
                    
                    console.log(`🔧 PRE-CHECK: Audio currentTime = ${audio.currentTime.toFixed(3)}s, paused = ${audio.paused}, ended = ${audio.ended}`);

                    
                    audio.currentTime = 0;

                    
                    if (!audio.paused) {
                        audio.pause();
                    }

                    
                    audio.currentTime = 0;

                    console.log(`🔧 POST-RESET: Audio currentTime = ${audio.currentTime.toFixed(3)}s (should be 0)`);
                } else {
                    console.log(`🎧 Creating new Audio object for line ${lineIndex + 1}...`);
                    audio = new Audio();
                    audio.preload = 'auto';
                    
                    audio.crossOrigin = 'anonymous';
                    audio.src = audioUrl;
                    
                }

                const volume = this.getVolume();
                audio.volume = volume;

                this.currentAudio = audio;
                this.currentLineIndex = lineIndex;
                this.isPlaying = true;
                this.savedAudioPosition = 0; 

                
                
                
                

                console.log(`🔊 Audio configured - Volume: ${volume}, Line: ${lineIndex + 1}`);

                
                
                if (window.RPMAvatar && window.RPMAvatar.isInitialized) {
                    console.log('🎭 Ensuring teaching animation is active before audio sync');
                    window.RPMAvatar.isSpeaking = true;
                    window.RPMAvatar.teachingAnimationActive = true;
                }

                
                console.log('🔍 Avatar sync check:', {
                    hasRPMAvatar: !!window.RPMAvatar,
                    isInitialized: window.RPMAvatar?.isInitialized,
                    hasScene: !!this.scene,
                    hasVisemeDataArray: !!this.scene?.visemeDataArray,
                    visemeArrayLength: this.scene?.visemeDataArray?.length || 0
                });

                if (window.RPMAvatar && window.RPMAvatar.isInitialized) {
                    
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

                
                
                audio.onended = null;
                audio.onerror = null;
                audio.onplay = null;

                
                audio.onended = () => {
                    console.log(`✅ Audio finished for line ${lineIndex + 1}`);

                    
                    const totalLines = this.scene?.narrationLines?.length || 0;
                    const isLastLine = lineIndex >= totalLines - 1;

                    if (!isLastLine) {
                        
                        
                        this.isTransitioningLines = true;
                        console.log('🔄 Setting isTransitioningLines = true (line ending, next line starting)');

                        
                        
                        if (window.RPMAvatar && window.RPMAvatar.isInitialized) {
                            console.log('🎭 LINE TRANSITION: Maintaining teaching animation');
                            window.RPMAvatar.teachingAnimationActive = true;
                            window.RPMAvatar.isSpeaking = true;
                        }

                        this.isPlaying = false;

                        
                        const nextLineIndex = lineIndex + 1;
                        console.log(`🔄 Auto-playing next line: ${nextLineIndex + 1}`);

                        
                        if (this.onLineComplete) {
                            this.onLineComplete(lineIndex, false);
                        }

                        
                        this.playLine(nextLineIndex).catch(err => {
                            console.error('❌ Failed to auto-play next line:', err);
                            
                            this.isTransitioningLines = false;
                        });
                    } else {
                        
                        this.isPlaying = false;
                        
                        console.log('🎬 Last narration line complete');

                        if (this.onLineComplete) {
                            this.onLineComplete(lineIndex, true);
                        }

                        
                        
                        if (this.onAllLinesComplete) {
                            console.log('🎬 Last line audio finished - waiting 3 seconds before triggering completion to show final line');
                            const completionTimeout = setTimeout(() => {
                                console.log('🎬 All narration lines complete - triggering callback after delay');
                                this.onAllLinesComplete();
                            }, 3000); 

                            
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

                
                
                const ensureReadyAndPlay = () => {
                    
                    if (this.preloadedAudios[lineIndex] && audio.readyState >= 3) {
                        console.log('🎬 Audio already buffered, playing immediately...');

                        
                        
                        if (audio.currentTime !== 0) {
                            console.log(`🔧 FINAL RESET: Forcing audio position from ${audio.currentTime.toFixed(2)}s to 0s before play()`);
                            audio.currentTime = 0;
                        }

                        audio.play()
                            .then(() => {
                                console.log(`▶️ Audio playback started for line ${lineIndex + 1}`);
                                
                                
                                this.isTransitioningLines = false;
                                console.log('✅ Transition complete - audio playing');
                            })
                            .catch(err => {
                                console.error('❌ Failed to play audio:', err);
                                this.isPlaying = false;
                                this.isTransitioningLines = false; 
                                reject(err);
                            });
                    } else {
                        
                        console.log('🎬 Waiting for audio to buffer...');
                        const onCanPlay = () => {
                            console.log(`✅ Audio buffered for line ${lineIndex + 1}, starting playback...`);
                            audio.removeEventListener('canplaythrough', onCanPlay);

                            
                            
                            if (audio.currentTime !== 0) {
                                console.log(`🔧 FINAL RESET: Forcing audio position from ${audio.currentTime.toFixed(2)}s to 0s before play()`);
                                audio.currentTime = 0;
                            }

                            audio.play()
                                .then(() => {
                                    console.log(`▶️ Audio playback started for line ${lineIndex + 1}`);
                                    
                                    
                                    this.isTransitioningLines = false;
                                    console.log('✅ Transition complete - audio playing');
                                })
                                .catch(err => {
                                    console.error('❌ Failed to play audio:', err);
                                    this.isPlaying = false;
                                    this.isTransitioningLines = false; 
                                    reject(err);
                                });
                        };

                        audio.addEventListener('canplaythrough', onCanPlay, { once: true });

                        
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

    
    pause() {
        console.log('⏸️ AudioNarration.pause() called');

        
        this.syncPlaybackState();

        
        
        if (this.currentAudio) {
            try {
                
                this.savedAudioPosition = this.currentAudio.currentTime;

                
                
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
                
                this.isPlaying = false;
            }
        } else {
            
            this.isPlaying = false;
            console.log('⏸️ No current audio element to pause');
        }
    },

    
    resume() {
        
        this.syncPlaybackState();

        
        if (this.isResuming) {
            console.log('⚠️ Already resuming audio, skipping duplicate resume call');
            return;
        }

        if (this.currentAudio && this.currentAudio.paused && !this.isPlaying) {
            
            this.isResuming = true;
            console.log('▶️ Resuming audio from paused state at position:', this.savedAudioPosition.toFixed(2) + 's');
            console.log('   Current line index:', this.currentLineIndex, '  Audio element:', this.currentAudio ? 'exists' : 'null');

            
            if (this.savedAudioPosition > 0) {
                try {
                    this.currentAudio.currentTime = this.savedAudioPosition;
                    console.log('✅ Restored audio position to:', this.currentAudio.currentTime.toFixed(2) + 's');
                } catch (err) {
                    console.warn('⚠️ Could not restore audio position:', err);
                }
            }

            
            
            if (window.RPMAvatar && window.RPMAvatar.isInitialized) {
                console.log('🎭 RESUME: Restoring avatar state');

                
                if (window.RPMAvatar.isIdleAnimationActive) {
                    console.log('🛑 Stopping idle animation before resume');
                    window.RPMAvatar.stopIdleAnimation();
                }

                
                window.RPMAvatar.isSpeaking = true;
                window.RPMAvatar.teachingAnimationActive = true;
                console.log('✅ Set isSpeaking=true, teachingAnimationActive=true');

                
                
                console.log('🎬 Forcing transition to teaching pose on resume');
                
                if (window.RPMAvatar.poseTransitionActive) {
                    console.log('⚠️ Transition was active - clearing and restarting');
                    window.RPMAvatar.poseTransitionActive = false;
                }
                window.RPMAvatar.transitionToTeachingPose();

                
                
                const visemeData = this.scene.visemeDataArray && this.scene.visemeDataArray[this.currentLineIndex]
                    ? this.scene.visemeDataArray[this.currentLineIndex]
                    : null;

                console.log('🎭 Re-syncing avatar with audio for resume');
                window.RPMAvatar.syncWithAudio(this.currentAudio, visemeData);
            }

            
            this.isPlaying = true;

            this.currentAudio.play()
                .then(() => {
                    console.log('✅ Audio resumed successfully');
                    
                    
                    setTimeout(() => {
                        this.isResuming = false;
                        console.log('✅ isResuming flag cleared after successful resume');
                    }, 500); 
                })
                .catch(err => {
                    console.error('❌ Failed to resume audio:', err);
                    this.isPlaying = false;
                    this.isResuming = false; 
                });
        } else {
            if (!this.currentAudio) {
                console.log('⚠️ No current audio to resume - need to recreate audio element');
                
                if (this.scene && this.scene.audioUrls && this.scene.audioUrls[this.currentLineIndex]) {
                    console.log('🔄 Recreating audio element for line', this.currentLineIndex + 1);
                    this.recreateAndResumeAudio();
                }
            } else if (!this.currentAudio.paused) {
                console.log('⚠️ Audio is already playing - skipping resume');
                this.isPlaying = true; 
            } else if (this.isPlaying) {
                console.log('⚠️ isPlaying already true - state may be out of sync');
            }
        }
    },

    
    recreateAndResumeAudio() {
        
        this.isResuming = true;

        const lineIndex = this.currentLineIndex;
        const audioUrl = this.scene.audioUrls[lineIndex];

        console.log('🔄 Recreating audio for line', lineIndex + 1, 'at position:', this.savedAudioPosition.toFixed(2) + 's');

        
        let audio;
        if (this.preloadedAudios[lineIndex]) {
            audio = this.preloadedAudios[lineIndex];
            console.log('📦 Using preloaded audio element');
        } else {
            audio = new Audio();
            audio.preload = 'auto';
            
            audio.crossOrigin = 'anonymous';
            audio.src = audioUrl;
            console.log('🆕 Creating new audio element');
        }

        const volume = this.getVolume();
        audio.volume = volume;

        this.currentAudio = audio;

        
        if (window.RPMAvatar && window.RPMAvatar.isInitialized) {
            
            const visemeData = this.scene.visemeDataArray && this.scene.visemeDataArray[lineIndex]
                ? this.scene.visemeDataArray[lineIndex]
                : null;

            console.log('🎭 Syncing avatar lip-sync during audio recreation');
            console.log(`   Line ${lineIndex + 1} has viseme data:`, !!visemeData);

            window.RPMAvatar.syncWithAudio(audio, visemeData);
        } else {
            console.warn('⚠️ Cannot sync avatar - RPMAvatar not available during recreation');
        }

        
        audio.onended = null;
        audio.onerror = null;

        audio.onended = () => {
            console.log(`✅ Audio finished for line ${lineIndex + 1}`);
            this.isPlaying = false;
            this.savedAudioPosition = 0; 

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

        
        const playWhenReady = () => {
            if (audio.readyState >= 2) { 
                console.log('✅ Audio ready, restoring position and playing');

                
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
                        
                        setTimeout(() => {
                            this.isResuming = false;
                            console.log('✅ isResuming flag cleared after recreateAndResumeAudio');
                        }, 200); 
                        console.log(`▶️ Audio resumed from saved position`);
                    })
                    .catch(err => {
                        console.error('❌ Failed to play audio:', err);
                        this.isPlaying = false;
                        this.isResuming = false; 
                    });
            } else {
                console.log('⏳ Waiting for audio to buffer...');
                audio.addEventListener('canplay', () => {
                    console.log('✅ Audio buffered, restoring position and playing');

                    
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
                            
                            setTimeout(() => {
                                this.isResuming = false;
                                console.log('✅ isResuming flag cleared after recreateAndResumeAudio (canplay path)');
                            }, 200); 
                            console.log(`▶️ Audio resumed from saved position`);
                        })
                        .catch(err => {
                            console.error('❌ Failed to play audio:', err);
                            this.isPlaying = false;
                            this.isResuming = false; 
                        });
                }, { once: true });

                audio.load();
            }
        };

        playWhenReady();
    },

    
    stop() {
        this.stopCurrentAudio();
        this.cleanup();
        console.log('⏹️ Audio stopped completely');
    },

    
    updateVolumeDisplay(volume) {
        const volumeValueElement = document.getElementById('narrationVolumeValue');
        if (volumeValueElement) {
            const percentage = Math.round(volume * 100);
            volumeValueElement.textContent = `${percentage}%`;
        }
    },

    
    getVolume() {
        let volume;

        
        if (window.userSettings && typeof window.userSettings.narration_volume === 'number') {
            volume = Math.max(0, Math.min(1, window.userSettings.narration_volume));
            console.log('🔊 Using user-configured narration volume:', (volume * 100) + '%');
        } else {
            
            volume = 1.0;
            console.log('🔊 Using default narration volume: 100%');
        }

        
        this.updateVolumeDisplay(volume);

        return volume;
    },

    
    setVolume(volume) {
        if (this.currentAudio) {
            this.currentAudio.volume = volume;
        }
        
        this.updateVolumeDisplay(volume);
    },

    
    hasAudio(scene) {
        return scene && scene.audioUrls && scene.audioUrls.length > 0;
    },

    
    async getLineDuration(lineIndex) {
        if (!this.scene || !this.scene.audioUrls || !this.scene.audioUrls[lineIndex]) {
            return 0;
        }

        return new Promise((resolve) => {
            const audio = new Audio();
            
            audio.crossOrigin = 'anonymous';
            audio.src = this.scene.audioUrls[lineIndex];

            const cleanup = () => {
                
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
                const duration = audio.duration * 1000; 
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


window.AudioNarration = AudioNarration;



window.addEventListener('beforeunload', () => {
    console.log('🧹 Page unloading - cleaning up audio resources...');
    if (window.AudioNarration) {
        window.AudioNarration.stop();
        window.AudioNarration.cleanup();
    }
});









