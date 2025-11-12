






const EventListenerRegistry = {
    listeners: [],
    timers: [],
    intervals: [],

    
    add(target, event, handler, options) {
        target.addEventListener(event, handler, options);
        this.listeners.push({ target, event, handler, options });
        console.log(`📝 Tracked listener: ${event} (Total: ${this.listeners.length})`);
    },

    
    addTimeout(callback, delay) {
        const id = setTimeout(callback, delay);
        this.timers.push(id);
        console.log(`⏱️  Tracked timeout (Total: ${this.timers.length})`);
        return id;
    },

    
    addInterval(callback, delay) {
        const id = setInterval(callback, delay);
        this.intervals.push(id);
        console.log(`⏱️  Tracked interval (Total: ${this.intervals.length})`);
        return id;
    },

    
    cleanup() {
        console.log('🧹 EventListenerRegistry cleanup starting...');
        console.log(`   Removing ${this.listeners.length} event listeners`);
        console.log(`   Clearing ${this.timers.length} timeouts`);
        console.log(`   Clearing ${this.intervals.length} intervals`);

        
        this.listeners.forEach(({ target, event, handler, options }) => {
            try {
                target.removeEventListener(event, handler, options);
            } catch (e) {
                console.warn('⚠️  Failed to remove listener:', event, e);
            }
        });
        this.listeners = [];

        
        this.timers.forEach(id => clearTimeout(id));
        this.timers = [];

        
        this.intervals.forEach(id => clearInterval(id));
        this.intervals = [];

        console.log('✅ EventListenerRegistry cleanup complete');
    }
};


window.EventListenerRegistry = EventListenerRegistry;


const errorHandler = function(event) {
    console.error('🚨 Unhandled Promise Rejection:', event.reason);
    console.error('   Promise:', event.promise);
    
    event.preventDefault();
};

const globalErrorHandler = function(event) {
    console.error('🚨 Global Error:', event.error || event.message);
};

EventListenerRegistry.add(window, 'unhandledrejection', errorHandler);
EventListenerRegistry.add(window, 'error', globalErrorHandler);


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


let currentStory = null;
let currentSceneIndex = 0;
let globalStoryboardPlayer = null;
let backgroundMusicAudio = null; 
let questionBgAudio = null; 
let correctAnswerAudio = null; 
let wrongAnswerAudio = null; 


const domReadyHandler = async function() {
    try {
        console.log('🎬 AniKwento Storyboard Player initializing with UPDATE STORYGEN backend...');

        
        
        console.log('🧹 Pre-initialization cleanup - removing any leftover resources...');
        try {
            
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            if (isSafari) {
                console.log('🍎 Safari detected - using aggressive cleanup mode');
            }

            if (typeof cleanupAllAudio === 'function') {
                cleanupAllAudio();
            }

            
            
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
                
                sessionStorage.setItem('storyLoadTimestamp', Date.now().toString());
            } catch (e) {
                console.warn('⚠️ Could not check sessionStorage age:', e);
            }
        } catch (cleanupError) {
            console.warn('⚠️ Pre-initialization cleanup had errors (this is normal on first load):', cleanupError);
        }

        
        isNarrationPaused = true;
        console.log('✅ Narration pause state initialized: isNarrationPaused =', isNarrationPaused);

        
        console.log('⏳ Waiting for user settings to load from database...');
        await waitForUserSettings();
        console.log('✅ User settings loaded:', window.userSettings);

        
        await initializeStoryboard();
        initializeMusicControls();
        initializeNarrationVolumeDisplay();
        initializeGamificationAudio();
    } catch (error) {
        console.error('❌ Error during storyboard initialization:', error);
        
    }
};

EventListenerRegistry.add(document, 'DOMContentLoaded', domReadyHandler);


async function waitForUserSettings() {
    
    if (typeof window.loadUserSettings === 'function') {
        console.log('📥 Loading user settings from database...');
        await window.loadUserSettings();
        console.log('✅ User settings loaded from database');
    } else {
        console.warn('⚠️ loadUserSettings function not available, waiting for settings to populate...');
        
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
    
    await loadStoredStory();

    
    initializeEnhancedFeatures();

    
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

        
        try {
            const sessionStoryJson = sessionStorage.getItem('currentStory');
            if (sessionStoryJson) {
                storyData = JSON.parse(sessionStoryJson);
                storageType = 'sessionStorage (from database)';
                console.log('✅ Story loaded from sessionStorage (dashboard playback)');
                console.log('🔍 Story has scenes:', storyData.scenes?.length);
                console.log('🔍 First scene has audioUrls:', storyData.scenes?.[0]?.audioUrls?.length || 0);
                console.log('🔍 First scene has imageUrl:', !!storyData.scenes?.[0]?.imageUrl);
                console.log('🔍 Story data structure:', {
                    id: storyData.id,
                    title: storyData.title,
                    scenesCount: storyData.scenes?.length,
                    firstScene: {
                        number: storyData.scenes?.[0]?.number,
                        hasImageUrl: !!storyData.scenes?.[0]?.imageUrl,
                        imageUrlPreview: storyData.scenes?.[0]?.imageUrl?.substring(0, 60),
                        hasAudioUrls: !!storyData.scenes?.[0]?.audioUrls,
                        audioUrlsCount: storyData.scenes?.[0]?.audioUrls?.length,
                        audioUrlPreview: storyData.scenes?.[0]?.audioUrls?.[0]?.substring(0, 60)
                    }
                });
            } else {
                console.log('⚠️ No story in sessionStorage');
            }
        } catch (sessionError) {
            console.error('❌ sessionStorage load failed:', sessionError);
        }

        
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

            
            console.log('🎵 Music data in loaded story:');
            console.log('   - Has music property:', 'music' in currentStory);
            console.log('   - Music object:', JSON.stringify(currentStory.music, null, 2));

            
            if (currentStory.gamificationEnabled === undefined) {
                currentStory.gamificationEnabled = true;
            }
            console.log('📖 Story loaded:', currentStory);

            
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


function updateStoryboardWithData(storyData) {
    console.log('📊 Updating storyboard with data:', storyData);
    console.log('📊 Scene data check:', {
        totalScenes: storyData.scenes?.length || 0,
        scenesWithImages: storyData.scenes?.filter(s => s.imageUrl).length || 0,
        scenesWithAudio: storyData.scenes?.filter(s => s.audioUrls?.length > 0).length || 0
    });

    
    const storyboardTitle = document.getElementById('storyboardTitle');
    if (storyboardTitle && storyData.title) {
        storyboardTitle.textContent = storyData.title;
    }

    
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

            
            if (scene.gamification && scene.gamification.hasQuestion) {
                button.classList.add('has-question');
                button.setAttribute('title', `${scene.title || `Scene ${index + 1}`} - Interactive Question`);
            }

            timelineDots.appendChild(button);
        });
    }

    
    if (storyData.scenes.length > 0) {
        loadStoryboardScene(storyData.scenes, 1);
    }

    
    if (storyData.selectedVoice && storyData.scenes.some(scene => scene.audioUrls && scene.audioUrls.length > 0)) {
        const voiceIndicator = document.getElementById('voiceIndicator');
        const voiceName = document.getElementById('voiceName');
        if (voiceIndicator && voiceName) {
            voiceName.textContent = `${storyData.selectedVoice} Voice`;
            voiceIndicator.style.display = 'inline-block';
            console.log(`🎤 Voice narration active: ${storyData.selectedVoice}`);
        }
    }

    
    const storyboardPlayer = document.getElementById('storyboardPlayer');
    if (storyboardPlayer) {
        storyboardPlayer.classList.add('controls-visible');
    }

    
    addSceneNavigation(storyData.scenes);

    
    const afterQuizSection = document.getElementById('afterQuizSection');
    const headerQuizBtn = document.getElementById('headerQuizBtn');
    console.log('🔍 Checking for after-story questions...');
    console.log('   - afterQuizSection element:', afterQuizSection ? 'Found' : 'NOT FOUND');
    console.log('   - headerQuizBtn element:', headerQuizBtn ? 'Found' : 'NOT FOUND');
    console.log('   - storyData.afterStoryQuestions:', storyData.afterStoryQuestions);
    console.log('   - Question count:', storyData.afterStoryQuestions?.length || 0);
    console.log('   - Question timing:', storyData.questionTiming || 'Not set');

    if (storyData.afterStoryQuestions && storyData.afterStoryQuestions.length > 0) {
        
        if (afterQuizSection) afterQuizSection.style.display = 'none';
        
        if (headerQuizBtn) headerQuizBtn.style.display = 'inline-block';
        console.log('✅ After-story quiz button shown in header (' + storyData.afterStoryQuestions.length + ' questions)');
    } else {
        if (afterQuizSection) afterQuizSection.style.display = 'none';
        if (headerQuizBtn) headerQuizBtn.style.display = 'none';
        console.log('❌ After-story quiz button hidden - no questions found');
    }

    
    if (globalStoryboardPlayer) {
        globalStoryboardPlayer.stopProgress();
        const playPauseBtn = document.getElementById('playPauseBtn');
        if (playPauseBtn) {
            playPauseBtn.replaceWith(playPauseBtn.cloneNode(true));
        }
        globalStoryboardPlayer = null;
    }

    
    const currentTimeEl = document.querySelector('.current-time');
    const totalTimeEl = document.querySelector('.total-time');
    if (currentTimeEl) currentTimeEl.textContent = '00:00';
    if (totalTimeEl) totalTimeEl.textContent = '00:00';

    
    console.log('🔍 AUDIO DEBUG - Scenes being passed to player:');
    storyData.scenes?.forEach((scene, i) => {
        console.log(`   Scene ${i + 1}:`, {
            hasAudioUrls: !!scene.audioUrls,
            audioUrlsCount: scene.audioUrls?.length || 0,
            hasNarrationLines: !!scene.narrationLines,
            narrationLinesCount: scene.narrationLines?.length || 0
        });
    });

    
    globalStoryboardPlayer = new EnhancedStoryboardPlayer('storyboardPlayer', storyData.scenes);
}


function loadStoryboardScene(scenes, sceneNumber, elapsedTimeMs = 0) {
    console.log(`Loading scene ${sceneNumber}`, scenes, 'elapsedTime:', elapsedTimeMs);

    if (sceneNumber < 1 || sceneNumber > scenes.length) return;

    const scene = scenes[sceneNumber - 1];

    
    
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

    
    const storyImage = document.querySelector('.story-image');
    const narrationOverlay = document.querySelector('.narration-text-overlay');

    if (storyImage) {
        
        storyImage.classList.add('fade-out');
        if (narrationOverlay) {
            narrationOverlay.classList.add('slide-out');
        }

        setTimeout(() => {
            
            console.log('🖼️ Loading scene image:', {
                sceneNumber,
                hasImageUrl: !!scene.imageUrl,
                imageUrl: scene.imageUrl
            });

            if (scene.imageUrl) {
                
                storyImage.innerHTML = `<div class="image-placeholder" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;"><p>Loading ${scene.title || `Scene ${sceneNumber}`}...</p></div>`;

                
                const img = new Image();
                img.onload = function() {
                    console.log('✅ Image loaded successfully:', scene.imageUrl);
                    storyImage.innerHTML = `<img src="${scene.imageUrl}" alt="${scene.title}" class="actual-story-image">`;
                };
                img.onerror = function() {
                    console.error('❌ Image failed to load:', scene.imageUrl);
                    storyImage.innerHTML = `<div class="image-placeholder"><p>${scene.title || `Scene ${sceneNumber}`}</p></div>`;
                };
                img.src = scene.imageUrl;
            } else {
                console.warn('⚠️ No imageUrl for scene', sceneNumber);
                storyImage.innerHTML = `<div class="image-placeholder"><p>${scene.title || `Scene ${sceneNumber}`}</p></div>`;
            }

            
            if (narrationOverlay) {
                
                const narrationLines = scene.narrationLines && scene.narrationLines.length > 0
                    ? scene.narrationLines
                    : parseNarrationLines(scene.narration, sceneNumber);

                
                displayNarrationLinesSequentially(narrationOverlay, narrationLines, elapsedTimeMs);
            }

            
            setTimeout(() => {
                storyImage.classList.remove('fade-out');
                storyImage.classList.add('fade-in');
                if (narrationOverlay) {
                    narrationOverlay.classList.remove('slide-out');
                    narrationOverlay.classList.add('slide-in');
                }

                
                setTimeout(() => {
                    storyImage.classList.remove('fade-in');
                    if (narrationOverlay) {
                        narrationOverlay.classList.remove('slide-in');
                    }
                }, 500);
            }, 50);
        }, 250);
    }

    
    
    console.log('🔄 Resetting narration state at start of loadStoryboardScene');
    currentNarrationLines = null;
    currentNarrationOverlay = null;
    lastLineChangeTimestamp = Date.now();
    narrationTransitioning = false;

    
    
    if (typeof AudioNarration !== 'undefined') {
        console.log('🎵 Initializing AudioNarration with scene:', {
            sceneNumber: sceneNumber,
            hasAudioUrls: !!scene.audioUrls,
            audioUrlsCount: scene.audioUrls?.length || 0,
            audioUrlsPreview: scene.audioUrls?.slice(0, 2).map(url => url?.substring(0, 50))
        });

        
        AudioNarration.stop();

        
        
        AudioNarration.init(scene).then(() => {
            console.log('✅ AudioNarration initialized, now setting up callbacks');

            
            
            if (globalStoryboardPlayer && globalStoryboardPlayer.isPlaying && scene.audioUrls && scene.audioUrls.length > 0) {
                console.log('🎵 AUTO-START: Story is playing after init, waiting for initialization to clear...');

                
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

                
                waitForInitClear();
            } else {
                console.log('🎵 SKIP AUTO-START: Story not playing or no audio available');
            }

            
            AudioNarration.onLineComplete = (lineIndex, isLastLine) => {
                console.log(`🔔 Line ${lineIndex + 1} audio completed${isLastLine ? ' (LAST LINE)' : ''}`);

                
                
                if (!isLastLine && globalStoryboardPlayer && globalStoryboardPlayer.isPlaying) {
                    const nextLineIndex = lineIndex + 1;
                    console.log(`📖 Updating text display for line ${nextLineIndex + 1}...`);

                    
                    
                    currentNarrationIndex = nextLineIndex;

                    
                    lastLineChangeTimestamp = Date.now();

                    
                    if (currentNarrationOverlay && currentNarrationLines[nextLineIndex]) {
                        currentNarrationOverlay.style.transition = 'opacity 0.2s ease-in-out';
                        currentNarrationOverlay.style.opacity = '0';

                        setTimeout(() => {
                            currentNarrationOverlay.innerHTML = `<strong>${currentNarrationLines[nextLineIndex]}</strong>`;

                            
                            
                            requestAnimationFrame(() => {
                                currentNarrationOverlay.style.opacity = '1';
                            });

                            console.log(`📖 Text updated to line ${nextLineIndex + 1}/${currentNarrationLines.length} (index updated immediately, stability timer reset)`);
                        }, 200);
                    }
                } else if (isLastLine) {
                    
                    
                    const nextLineIndex = lineIndex + 1;
                    currentNarrationIndex = nextLineIndex;
                    console.log(`📖 Last line completed - updated currentNarrationIndex to ${nextLineIndex} to trigger gamification check`);
                }
            };

            
            AudioNarration.onAllLinesComplete = () => {
                console.log('🎬 ALL NARRATION COMPLETE - Checking for gamification...');

                
                if (globalStoryboardPlayer) {
                    globalStoryboardPlayer.audioCompletionTimestamp = Date.now();
                    console.log(`⏱️ Audio completion timestamp set: ${globalStoryboardPlayer.audioCompletionTimestamp}`);
                }

                
                
                const totalLines = currentNarrationLines.length;
                currentNarrationIndex = totalLines; 
                console.log(`📖 Updated currentNarrationIndex to ${currentNarrationIndex} (all ${totalLines} lines complete)`);

                
                
                if (globalStoryboardPlayer && globalStoryboardPlayer.currentQuestionShown) {
                    console.log('⚠️ Question already shown for this scene, skipping trigger');
                    return;
                }

                
                
                const gamificationEnabled = currentStory && currentStory.gamificationEnabled !== false;
                console.log('🎮 Gamification checks:', {
                    hasGamification: !!scene.gamification,
                    hasQuestion: scene.gamification?.hasQuestion,
                    gamificationEnabled: gamificationEnabled,
                    hasPlayer: !!globalStoryboardPlayer
                });

                
                if (scene.gamification && scene.gamification.hasQuestion && gamificationEnabled && globalStoryboardPlayer) {
                    console.log('🎮🎮🎮 IMMEDIATE GAMIFICATION TRIGGER - ALL NARRATION COMPLETE 🎮🎮🎮');

                    
                    globalStoryboardPlayer.isPlaying = false;
                    globalStoryboardPlayer.isAnimating = false;
                    globalStoryboardPlayer.wasPlayingBeforeQuestion = true;
                    globalStoryboardPlayer.updatePlayPauseButton();

                    
                    globalStoryboardPlayer.stopProgress();

                    
                    globalStoryboardPlayer.currentQuestionShown = true;

                    
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

    
    handleSceneGamification(scene, sceneNumber);

    
    currentSceneIndex = sceneNumber - 1;

    
    updateTimelineDots();
}


function handleSceneGamification(scene, sceneNumber) {
    const gamificationOverlay = document.getElementById('gamificationOverlay');

    
    
    

    if (!scene.gamification || !scene.gamification.hasQuestion || !currentStory.gamificationEnabled) {
        
        if (gamificationOverlay) {
            gamificationOverlay.classList.remove('show');
            gamificationOverlay.classList.add('hidden');
        }
    }
    
}


function displayQuestion(questionData) {
    const questionText = document.getElementById('questionText');
    const answerChoices = document.getElementById('answerChoices');
    const gamificationOverlay = document.getElementById('gamificationOverlay');

    if (!questionText || !answerChoices || !gamificationOverlay) {
        console.log('❌ Question UI elements not found');
        return;
    }

    console.log('🎮 Displaying question:', questionData.question);

    
    questionText.textContent = questionData.question;

    
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

    
    gamificationOverlay.classList.remove('hidden');
    gamificationOverlay.classList.add('show');
}


function handleQuestionAnswer(selectedAnswer, buttonElement, questionData) {
    const isCorrect = selectedAnswer === questionData.correctAnswer?.letter;
    const feedbackElement = document.getElementById('questionFeedback');
    const allButtons = document.querySelectorAll('#answerChoices .choice-btn');

    console.log(`🎮 Question answered: ${selectedAnswer}, Correct: ${isCorrect}`);
    console.log('🔍 Question data structure:', questionData);

    
    allButtons.forEach(btn => {
        btn.classList.add('disabled');
    });

    
    const selectedButton = document.querySelector(`[data-choice="${selectedAnswer}"]`);
    const correctButton = questionData.correctAnswer ?
        document.querySelector(`[data-choice="${questionData.correctAnswer.letter}"]`) : null;

    
    if (selectedButton) {
        selectedButton.classList.add(isCorrect ? 'correct' : 'incorrect');
    }

    
    if (!isCorrect && correctButton) {
        setTimeout(() => {
            correctButton.classList.add('correct');
        }, 600);
    }

    
    setTimeout(() => {
        if (feedbackElement) {
            const feedbackTextElement = feedbackElement.querySelector('.feedback-text');
            if (feedbackTextElement) {
                if (isCorrect) {
                    feedbackTextElement.textContent = 'Correct! Well done! 🌟';
                    feedbackTextElement.className = 'feedback-text correct';
                } else {
                    const correctAnswer = questionData.correctAnswer;

                    
                    if (correctAnswer && correctAnswer.letter && correctAnswer.text) {
                        feedbackTextElement.textContent = `Answer: ${correctAnswer.text}`;
                    } else if (correctAnswer && correctAnswer.letter) {
                        
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


function addSceneNavigation(scenes) {
    const timelineDots = document.getElementById('timelineDots');
    if (!timelineDots || !scenes) return;

    
    const dots = timelineDots.querySelectorAll('.dot');
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            
            
            if (window.RPMAvatar && window.RPMAvatar.avatarUrl && window.RPMAvatar.avatarUrl.trim() !== '' && !window.RPMAvatar.isFullyLoaded) {
                console.warn('⚠️ Avatar not fully loaded - cannot switch scenes');
                console.log(`   Loading progress: ${window.RPMAvatar.loadingProgress}%`);
                alert('Please wait for the avatar to finish loading before switching scenes.');
                return;
            }

            
            if (typeof AudioNarration !== 'undefined' && AudioNarration.isPlaying) {
                console.log('⏸️ Audio narration is playing - pausing before scene switch');
                AudioNarration.pause();
            }

            
            if (globalStoryboardPlayer && globalStoryboardPlayer.isPlaying) {
                console.log('⏸️ Story is playing - pausing before scene switch');
                globalStoryboardPlayer.isPlaying = false;
                globalStoryboardPlayer.stopProgress();

                
                if (window.backgroundMusicAudio && !window.backgroundMusicAudio.paused) {
                    window.backgroundMusicAudio.pause();
                    console.log('⏸️ Background music paused during scene switch');
                }

                
                const playIcon = document.querySelector('#playPauseBtn .play-icon');
                const pauseIcon = document.querySelector('#playPauseBtn .pause-icon');
                const btn = document.getElementById('playPauseBtn');
                if (playIcon) playIcon.style.display = 'inline';
                if (pauseIcon) pauseIcon.style.display = 'none';
                if (btn) btn.setAttribute('aria-pressed', 'false');

                
                if (typeof isNarrationPaused !== 'undefined') {
                    isNarrationPaused = true;
                }
            }

            
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

            
            dots.forEach(d => d.classList.remove('active'));

            
            dot.classList.add('active');

            
            if (globalStoryboardPlayer && globalStoryboardPlayer.jumpToScene) {
                
                globalStoryboardPlayer.currentQuestionShown = false;
                globalStoryboardPlayer.jumpToScene(index);
            } else {
                console.log(`⚠️ Using fallback method for scene ${index + 1}`);
                
                loadStoryboardScene(scenes, index + 1);
            }
        });
    });

    
    document.addEventListener('keydown', (e) => {
        const activeDot = timelineDots.querySelector('.dot.active');
        if (!activeDot) return;

        
        
        if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && window.RPMAvatar && window.RPMAvatar.avatarUrl && window.RPMAvatar.avatarUrl.trim() !== '' && !window.RPMAvatar.isFullyLoaded) {
            console.warn('⚠️ Avatar not fully loaded - cannot navigate scenes with keyboard');
            console.log(`   Loading progress: ${window.RPMAvatar.loadingProgress}%`);
            e.preventDefault();
            return;
        }

        
        if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && typeof AudioNarration !== 'undefined' && AudioNarration.isPlaying) {
            console.warn('⚠️ Audio narration is still playing - cannot navigate scenes with keyboard');
            e.preventDefault();
            return;
        }

        
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
                
                break;
            default:
                return;
        }

        if (newIndex !== currentIndex) {
            
            dots.forEach(d => d.classList.remove('active'));

            
            dots[newIndex].classList.add('active');

            
            loadStoryboardScene(scenes, newIndex + 1);
        }
    });
}


function updateTimelineDots() {
    const dots = document.querySelectorAll('.dot');
    dots.forEach((dot, index) => {
        const isActive = index === currentSceneIndex;
        const scene = currentStory.scenes[index];

        dot.classList.toggle('active', isActive);
        dot.setAttribute('aria-selected', isActive.toString());
        dot.setAttribute('tabindex', isActive ? '0' : '-1');

        
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



function initializeEnhancedFeatures() {
    
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


function goBackToDashboard() {
    
    stopBackgroundMusic();

    
    
    console.log('🔄 Navigating back to dashboard - clearing sessionStorage');
    try {
        sessionStorage.removeItem('currentStory');
        console.log('✅ SessionStorage cleared before navigation');
    } catch (e) {
        console.warn('⚠️ Error clearing sessionStorage:', e);
    }

    window.location.href = '/dashboard';
}



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

        
        this.isAnimating = false;
        this.animationFrame = null;
        this.lastUpdateTime = 0;
        this.lastSecondUpdate = -1;

        
        this.lastToggleTime = null;

        
        this.isFirstPlay = true;

        
        this.controlsTimeout = null;
        this.cursorTimeout = null;

        
        this.currentQuestionShown = false;
        this.wasPlayingBeforeQuestion = false;
        this.currentSceneStartTime = null;
        this.answeredQuestions = new Set(); 
        this.currentAttempts = 0; 
        this.maxAttempts = 3; 
        this.blockedChoices = new Set(); 
        this.sceneRealStartTime = null; 

        
        this.musicFadingOut = false; 

        
        this.audioCompletionTimestamp = null; 
        this.sceneTransitionDelay = 500; 

        this.init();
    }

    async init() {
        
        this.currentTime = 0;
        this.totalDuration = 0;
        this.currentSceneIndex = 0;
        this.totalTimeSet = false;

        
        this.answeredQuestions = new Set();

        
        this.currentTimeEl = null;
        this.totalTimeEl = null;

        if (this.scenes.length > 0) {
            
            const sceneDurations = await calculateSceneDurations(this.scenes);
            this.sceneTiming = calculateCumulativeTiming(sceneDurations);
            this.totalDuration = this.sceneTiming[this.sceneTiming.length - 1]?.endTime || 0;

            
            console.log('Story initialized with:', {
                scenes: this.scenes.length,
                totalDuration: this.totalDuration,
                totalDurationFormatted: this.formatTime(this.totalDuration),
                sceneTiming: this.sceneTiming
            });

            
            this.sceneTiming.forEach((timing, index) => {
                console.log(`Scene ${index + 1} timing:`, {
                    duration: timing.duration,
                    startTime: timing.startTime,
                    endTime: timing.endTime,
                    formattedStart: this.formatTime(timing.startTime),
                    formattedEnd: this.formatTime(timing.endTime)
                });
            });

            
            if (this.scenes.length >= 9) {
                console.log('🔍 Scene 9 data check:', {
                    sceneExists: !!this.scenes[8],
                    timingExists: !!this.sceneTiming[8],
                    sceneData: this.scenes[8],
                    timingData: this.sceneTiming[8]
                });
            }

            
            this.setInitialTimeDisplay();
            this.updateProgressBar();

            
            
            loadStoryboardScene(this.scenes, 1, 0);
            console.log('✅ Initial scene (Scene 1) loaded');
        } else {
            
            this.setInitialTimeDisplay();
        }

        this.bindEvents();
        this.setupFullscreenHandlers();
        this.setupKeyboardHandlers();

        
        this.initializeButtonStates();
    }


    initializeButtonStates() {
        const playIcon = document.querySelector('#playPauseBtn .play-icon');
        const pauseIcon = document.querySelector('#playPauseBtn .pause-icon');
        const btn = document.getElementById('playPauseBtn');

        
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

        
        document.addEventListener('mousemove', () => this.handleMouseMove());

        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
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
            
            player.classList.remove('animate-in');
            player.classList.remove('controls-visible', 'show-cursor');

            
            player.classList.add('animate-out');

            
            setTimeout(() => {
                player.classList.remove('fullscreen');
                player.classList.remove('animate-out');
            }, 400);
        } else {
            
            player.classList.add('fullscreen');
            player.classList.add('controls-visible', 'show-cursor');

            
            setTimeout(() => {
                player.classList.add('animate-in');
            }, 50);

            
            setTimeout(() => {
                if (player.classList.contains('fullscreen')) {
                    player.classList.remove('controls-visible', 'show-cursor');
                }
            }, 3000);
        }

        
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
        
        const playPauseBtn = document.getElementById('playPauseBtn');
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        }

        
        const progressBar = document.querySelector('.progress-bar');
        const progressHandle = document.querySelector('.progress-handle');

        if (progressBar) {
            
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

        
        for (let i = 0; i < this.sceneTiming.length; i++) {
            const timing = this.sceneTiming[i];
            if (this.currentTime >= timing.startTime && this.currentTime < timing.endTime) {
                if (this.currentSceneIndex !== i) {
                    this.jumpToScene(i);
                } else {
                    
                    const elapsedInScene = this.currentTime - timing.startTime;
                    this.sceneRealStartTime = timing.startTime; 
                    syncNarrationToTime(elapsedInScene);
                    console.log(`⏩ Seeked within scene ${i + 1} to ${Math.round(elapsedInScene/1000)}s`);

                    
                    this.checkSceneQuestionTiming();
                }
                break;
            }
        }
    }

    togglePlayPause() {
        
        
        if (window.RPMAvatar && window.RPMAvatar.avatarUrl && window.RPMAvatar.avatarUrl.trim() !== '' && !window.RPMAvatar.isFullyLoaded) {
            console.warn('⚠️ Avatar not fully loaded - cannot start playback');
            console.log(`   Loading progress: ${window.RPMAvatar.loadingProgress}%`);
            alert('Please wait for the avatar to finish loading before playing the story.');
            return;
        }

        
        const now = Date.now();
        if (this.lastToggleTime && (now - this.lastToggleTime) < 300) {
            console.log('⚠️ Debouncing play/pause toggle - too rapid');
            return;
        }
        this.lastToggleTime = now;

        
        this.isPlaying = !this.isPlaying;

        const playIcon = document.querySelector('#playPauseBtn .play-icon');
        const pauseIcon = document.querySelector('#playPauseBtn .pause-icon');
        const btn = document.getElementById('playPauseBtn');

        console.log(`🎮 togglePlayPause - New state: ${this.isPlaying ? 'PLAYING' : 'PAUSED'}`);

        if (this.isPlaying) {
            
            if (this.isFirstPlay) {
                console.log('🎬 First play detected - entering fullscreen mode automatically');
                const player = document.getElementById(this.containerId);
                if (player && !player.classList.contains('fullscreen')) {
                    this.toggleFullscreen();
                }
                this.isFirstPlay = false;
            }

            
            if (window.RPMAvatar && window.RPMAvatar.isRandomWaveActive) {
                console.log('⏹️ Stopping random wave animations - resuming playback');
                window.RPMAvatar.stopRandomWaveAnimations();
            }

            
            if (playIcon) playIcon.style.display = 'none';
            if (pauseIcon) pauseIcon.style.display = 'inline';
            if (btn) btn.setAttribute('aria-pressed', 'true');

            
            
            const isActuallyResuming = isNarrationPaused === true;

            console.log('🎮 Play state check:', {
                isActuallyResuming,
                isNarrationPaused,
                hasCurrentAudio: !!(typeof AudioNarration !== 'undefined' && AudioNarration.currentAudio),
                audioIsPlaying: typeof AudioNarration !== 'undefined' ? AudioNarration.isPlaying : 'N/A'
            });

            if (isActuallyResuming) {
                console.log('🔄 RESUMING from pause');
                
                window.justResumed = true;

                
                
                const clearResumeFlag = () => {
                    
                    if (typeof AudioNarration !== 'undefined' &&
                        AudioNarration.currentAudio &&
                        !AudioNarration.currentAudio.paused &&
                        AudioNarration.isPlaying) {
                        
                        setTimeout(() => {
                            window.justResumed = false;
                            console.log('✅ justResumed flag cleared - audio is playing stably');
                        }, 2000);
                    } else {
                        
                        setTimeout(clearResumeFlag, 500);
                    }
                };
                
                setTimeout(clearResumeFlag, 1000);

                
                resumeNarration();
            } else {
                console.log('▶️ FRESH START (not resuming)');
                
                isNarrationPaused = false;

                
                
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

            
            this.startProgress();

            
            if (window.backgroundMusicAudio && window.backgroundMusicAudio.paused) {
                
                const volumeSlider = document.getElementById('volumeSlider');
                const currentVolume = volumeSlider ? parseInt(volumeSlider.value) : (window.backgroundMusicAudio.volume * 100);

                if (currentVolume > 0) {
                    
                    window.backgroundMusicAudio.play().catch(err => console.log('Music play error:', err));
                } else {
                    console.log('🔇 Music is muted - not resuming playback');
                }
            }

            
            
        } else {
            
            console.log('⏸️ Pausing story playback...');

            
            if (playIcon) playIcon.style.display = 'inline';
            if (pauseIcon) pauseIcon.style.display = 'none';
            if (btn) btn.setAttribute('aria-pressed', 'false');

            
            this.stopProgress();

            
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

            
            console.log('⏸️ Calling pauseNarration() to pause narration audio...');
            pauseNarration();

            
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

        
        if (!this.sceneRealStartTime) {
            this.sceneRealStartTime = this.currentTime;
            console.log(`🎮 Scene timer initialized to:`, Math.round(this.sceneRealStartTime/1000));
        } else {
            console.log(`🎮 Scene timer already set to:`, Math.round(this.sceneRealStartTime/1000));
        }

        

        const animate = (currentTime) => {
            if (!this.isAnimating) {
                console.log(`🎮 ANIMATION STOPPED: isAnimating = false`);
                return;
            }

            const deltaTime = currentTime - this.lastUpdateTime;
            this.lastUpdateTime = currentTime;

            
            this.currentTime += deltaTime;

            
            const fadeOutDuration = 2000; 
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

            
            this.updateProgressBar();

            
            const currentSecond = Math.floor(this.currentTime / 1000);
            if (currentSecond !== this.lastSecondUpdate && currentSecond >= 0) {
                this.updateTimeDisplay();
                this.lastSecondUpdate = currentSecond;

                
                if (this.sceneRealStartTime !== null && this.sceneRealStartTime !== undefined) {
                    const elapsedInScene = this.currentTime - this.sceneRealStartTime;
                    syncNarrationToTime(elapsedInScene);
                }

                
                if (currentSecond % 5 === 0) { 
                    console.log(`🎮 Time progressing: ${currentSecond}s, Scene: ${this.currentSceneIndex + 1}, SceneStartTime: ${this.sceneRealStartTime ? Math.round(this.sceneRealStartTime/1000) : 'null'}`);
                }
            }

            this.checkSceneTransition();

            
            const animSecond = Math.floor(this.currentTime / 1000);
            if (animSecond % 5 === 0 && animSecond !== this.lastAnimationDebug) {
                console.log(`🎮 ANIMATION: ${animSecond}s - calling question timing`);
                this.lastAnimationDebug = animSecond;
            }

            this.checkSceneQuestionTiming();
            this.checkLastSceneCompletion();

            
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

        
        this.isAnimating = false;

        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
            console.log('✅ Animation frame cancelled');
        }

        
        console.log('💾 Current position saved:', {
            time: this.currentTime,
            scene: this.currentSceneIndex + 1
        });

        
        if (!this.isAnimating && !this.animationFrame) {
            console.log('✅ Progress stopped successfully');
        }
    }

    updateProgressBar() {
        if (this.totalDuration <= 0) return; 

        
        const safeCurrentTime = Math.min(this.currentTime, this.totalDuration);
        const percentage = Math.max(0, Math.min(100, (safeCurrentTime / this.totalDuration) * 100));

        const progressFill = document.querySelector('.progress-fill');
        const progressHandle = document.querySelector('.progress-handle');

        if (progressFill) {
            
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
            
            if (typeof AudioNarration !== 'undefined' && AudioNarration.isPlaying) {
                console.log(`🎵 BLOCKING scene transition: Audio narration still playing for scene ${this.currentSceneIndex + 1}`);

                
                const currentSceneTiming = this.sceneTiming[this.currentSceneIndex];
                if (currentSceneTiming) {
                    this.currentTime = currentSceneTiming.endTime - 50; 
                }
                return; 
            }

            
            if (this.audioCompletionTimestamp !== null) {
                const timeSinceCompletion = Date.now() - this.audioCompletionTimestamp;
                if (timeSinceCompletion < this.sceneTransitionDelay) {
                    console.log(`🎵 BLOCKING scene transition: Audio completed ${timeSinceCompletion}ms ago, waiting ${this.sceneTransitionDelay - timeSinceCompletion}ms more`);

                    
                    const currentSceneTiming = this.sceneTiming[this.currentSceneIndex];
                    if (currentSceneTiming) {
                        this.currentTime = currentSceneTiming.endTime - 50; 
                    }
                    return; 
                }
                
                console.log(`✅ Audio completion delay passed (${timeSinceCompletion}ms), allowing scene transition`);
                this.audioCompletionTimestamp = null;
            }

            
            const currentScene = this.scenes[this.currentSceneIndex];
            const gamification = currentScene?.gamification;

            if (gamification && gamification.hasQuestion) {
                const sceneKey = `scene_${this.currentSceneIndex}`;
                const questionAnswered = this.answeredQuestions && this.answeredQuestions[sceneKey];

                if (!questionAnswered) {
                    console.log(`🎮 BLOCKING scene transition: Scene ${this.currentSceneIndex + 1} has unanswered question`);

                    
                    const currentSceneTiming = this.sceneTiming[this.currentSceneIndex];
                    if (currentSceneTiming) {
                        
                        this.currentTime = currentSceneTiming.endTime - 100; 
                    }

                    
                    if (this.isPlaying) {
                        this.isPlaying = false;
                        this.isAnimating = false;
                        this.updatePlayPauseButton();
                    }

                    return; 
                }
            }

            
            const overlay = document.getElementById('gamificationOverlay');
            const questionAlreadyShowing = overlay && overlay.classList.contains('show');

            if (questionAlreadyShowing) {
                console.log(`🎮 Question showing, hiding it to allow scene navigation`);
                
                this.hideGamificationQuestion(false);
            }

            
            const oldSceneIndex = this.currentSceneIndex;
            this.currentSceneIndex = newSceneIndex;
            this.currentQuestionShown = false; 

            
            
            const newSceneTiming = this.sceneTiming[this.currentSceneIndex];
            this.sceneRealStartTime = newSceneTiming ? newSceneTiming.startTime : this.currentTime;
            console.log(`🎬 Scene ${this.currentSceneIndex + 1} real start time: ${Math.round(this.sceneRealStartTime/1000)}s (scheduled), currentTime: ${Math.round(this.currentTime/1000)}s`)

            console.log(`📍 Scene transition: ${oldSceneIndex + 1} → ${this.currentSceneIndex + 1} at story time ${Math.round(this.currentTime/1000)}s (scene timer reset to 0)`);

            
            
            
            currentNarrationIndex = 0;
            console.log('🔄 Reset currentNarrationIndex to 0 for new scene (prevents instant gamification)');

            
            
            if (window.RPMAvatar && window.RPMAvatar.isInitialized) {
                console.log('🎭 SCENE TRANSITION: Maintaining teaching animation state');
                window.RPMAvatar.teachingAnimationActive = true;
                window.RPMAvatar.isSpeaking = true;

                
                if (!window.RPMAvatar.poseTransitionActive) {
                    console.log('🎭 SCENE TRANSITION: Forcing teaching pose to stay active');
                    window.RPMAvatar.transitionToTeachingPose();
                }
            }

            
            const elapsedInNewScene = this.sceneTiming[this.currentSceneIndex]
                ? this.currentTime - this.sceneTiming[this.currentSceneIndex].startTime
                : 0;

            
            
            
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

        
        if (gamification && gamification.hasQuestion && !this.currentQuestionShown) {
            console.log(`🎮 PROCESSING: Scene has question`);

            
            
            const triggerLine = gamification.triggerLine || (totalLines > 0 ? totalLines - 1 : 5);

            console.log(`🎮 Trigger line: ${triggerLine + 1}, Current line: ${currentLineIndex + 1}`);

            
            const audioFinished = typeof AudioNarration === 'undefined' || !AudioNarration.isPlaying;
            console.log(`🎮 Audio finished: ${audioFinished}`);

            if (currentLineIndex >= triggerLine && audioFinished) {
                console.log(`🎮🎮🎮 TRIGGERING QUESTION for Scene ${this.currentSceneIndex + 1}! 🎮🎮🎮`);

                
                this.isPlaying = false;
                this.isAnimating = false;
                this.wasPlayingBeforeQuestion = true;
                this.updatePlayPauseButton();

                
                this.currentQuestionShown = true;
                this.showGamificationQuestion(gamification);
            }
        }
    }

    checkLastSceneCompletion() {
        
        const isLastScene = this.currentSceneIndex === this.scenes.length - 1;
        if (!isLastScene) return;

        const currentScene = this.scenes[this.currentSceneIndex];

        
        if (currentScene && currentScene.gamification && currentScene.gamification.hasQuestion) {
            return; 
        }

        
        const currentSceneTiming = this.sceneTiming[this.currentSceneIndex];
        if (!currentSceneTiming) return;

        const sceneEndTime = currentSceneTiming.endTime;
        const hasReachedEnd = this.currentTime >= sceneEndTime;

        if (hasReachedEnd) {
            console.log(`🎮 Last scene completed (no question) - story finished`);
            
        }
    }

    getCurrentSceneIndex() {
        for (let i = 0; i < this.sceneTiming.length; i++) {
            if (this.currentTime >= this.sceneTiming[i].startTime &&
                this.currentTime < this.sceneTiming[i].endTime) {
                return i;
            }
        }
        return this.sceneTiming.length - 1; 
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
            
            if (!this.sceneTiming[sceneIndex]) {
                console.error(`❌ Scene timing not found for scene ${sceneIndex + 1}`);
                return;
            }

            
            const wasPlaying = this.isPlaying;

            
            this.hideGamificationQuestion(false);

            
            this.audioCompletionTimestamp = null;
            console.log('🔄 Cleared audio completion timestamp for manual scene jump');

            this.currentTime = this.sceneTiming[sceneIndex].startTime;
            this.currentSceneIndex = sceneIndex;
            this.currentQuestionShown = false; 

            
            const sceneKey = `scene_${sceneIndex}`;
            this.answeredQuestions.delete(sceneKey);
            this.currentAttempts = 0; 
            this.blockedChoices.clear(); 

            
            
            this.sceneRealStartTime = this.currentTime;

            
            this.lastSecondUpdate = -1;
            this.lastUpdateTime = performance.now();

            
            const elapsedInScene = this.currentTime - this.sceneTiming[sceneIndex].startTime;

            
            
            
            currentNarrationIndex = 0;
            console.log('🔄 Reset currentNarrationIndex to 0 for new scene (prevents instant gamification)');

            
            
            
            currentNarrationLines = null;
            currentNarrationOverlay = null;
            lastLineChangeTimestamp = Date.now(); 
            narrationTransitioning = false;
            console.log('🔄 Cleared narration state variables to prevent stale data during scene transition');

            
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
            this.updateTimeDisplay(); 

            
            
            if (wasPlaying && window.RPMAvatar && window.RPMAvatar.isInitialized) {
                console.log('🎭 JUMP SCENE: Maintaining teaching animation state (was playing)');
                window.RPMAvatar.teachingAnimationActive = true;
                window.RPMAvatar.isSpeaking = true;

                
                if (!window.RPMAvatar.poseTransitionActive) {
                    console.log('🎭 JUMP SCENE: Forcing teaching pose to stay active');
                    window.RPMAvatar.transitionToTeachingPose();
                }
            }

            
            
            this.isPlaying = false;
            this.isAnimating = false;
            console.log(`🎮 Scene switched - story paused (user can press play to continue)`);
            this.updatePlayPauseButton();

            loadStoryboardScene(this.scenes, sceneIndex + 1, elapsedInScene);

            
            if (typeof pauseNarration === 'function') {
                pauseNarration();
            }

            
            this.musicFadingOut = false;

            
            
            if (window.backgroundMusicAudio) {
                
                window.backgroundMusicAudio.loop = true;

                
                if (!window.backgroundMusicAudio.paused) {
                    window.backgroundMusicAudio.pause();
                    console.log('🔇 Background music paused after scene switch');
                }
            }

            
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
                this.animationFrame = null;
            }
            

            

        } else {
            console.error(`❌ Cannot jump to scene ${sceneIndex + 1}: Invalid scene index`, {
                sceneIndex,
                scenesLength: this.scenes.length,
                validRange: `0 to ${this.scenes.length - 1}`
            });
        }
    }

    

    showGamificationQuestion(gamification) {
        console.log(`🎮 showGamificationQuestion called with:`, gamification);

        
        const overlay = document.getElementById('gamificationOverlay');
        if (!overlay) {
            console.error('❌ Gamification overlay not found in DOM!');
            return;
        }

        
        overlay.classList.remove('hidden');
        overlay.classList.add('show');
        console.log('🎮 Gamification overlay classes:', overlay.className);

        
        const existingButtons = document.querySelectorAll('.choice-btn');
        existingButtons.forEach(btn => {
            btn.classList.remove('correct', 'incorrect', 'correct-pulse');
        });

        
        this.wasPlayingBeforeQuestion = this.isPlaying;

        
        if (typeof AudioNarration !== 'undefined') {
            AudioNarration.stop();
            console.log('🎵 Narration audio stopped for gamification');
        }
        if (typeof pauseNarration === 'function') {
            pauseNarration();
            console.log('🎵 Narration paused for gamification');
        }

        
        
        console.log('🎵 Checking background music state:', {
            exists: !!window.backgroundMusicAudio,
            paused: window.backgroundMusicAudio ? window.backgroundMusicAudio.paused : 'N/A'
        });

        
        crossfadeToQuestionMusic();

        
        if (this.isPlaying) {
            this.isPlaying = false;
            this.isAnimating = false;

            
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
                this.animationFrame = null;
            }

            
            this.updatePlayPauseButton();

            
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

        
        questionText.textContent = gamification.question;

        
        if (this.currentAttempts === 0) {
            this.blockedChoices.clear();
        }

        
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

        
        feedback.classList.add('hidden');
        feedback.classList.remove('show');

        
        console.log(`🎮 Showing gamification overlay for question:`, gamification.question);

        
        overlay.classList.remove('hidden');
        overlay.classList.remove('show'); 

        
        overlay.offsetHeight;

        
        overlay.classList.add('show');

        console.log(`🎮 Overlay shown with classes:`, overlay.className);
        console.log(`🎮 Overlay opacity:`, window.getComputedStyle(overlay).opacity);
        console.log(`🎮 Overlay visibility:`, window.getComputedStyle(overlay).visibility);

        
        
    }

    handleAnswerChoice(selectedLetter, correctAnswer, gamificationData) {
        const buttons = document.querySelectorAll('.choice-btn:not(.blocked)');
        const feedback = document.getElementById('questionFeedback');
        const feedbackText = feedback.querySelector('.feedback-text');

        
        this.currentAttempts++;

        console.log(`🎮 Answer attempt ${this.currentAttempts}/${this.maxAttempts}: Selected ${selectedLetter}, Correct is ${correctAnswer.letter}`);

        
        const selectedButton = document.querySelector(`[data-choice="${selectedLetter}"]`);
        const correctButton = document.querySelector(`[data-choice="${correctAnswer.letter}"]`);

        const isCorrect = selectedLetter === correctAnswer.letter;

        if (isCorrect) {
            
            console.log(`🎮 Correct answer! Proceeding to next scene.`);

            
            playCorrectAnswerSound();

            
            buttons.forEach(btn => {
                btn.classList.add('disabled');
                btn.style.pointerEvents = 'none';
            });

            
            if (selectedButton) {
                selectedButton.classList.add('disabled');
                selectedButton.style.pointerEvents = 'none';

                
                setTimeout(() => {
                    selectedButton.classList.add('correct-pulse');
                    console.log(`🎮 Started pulsing animation for correct answer - should continue for 3+ seconds`);
                }, 200);
            }

            
            setTimeout(() => {
                if (feedbackText) {
                    feedbackText.textContent = `Correct! Well done!`;
                    feedbackText.className = 'feedback-text correct';
                }

                feedback.classList.remove('hidden');
                feedback.classList.add('show');
                console.log(`🎮 Showing success feedback, will wait 3 seconds before next scene`);

                
                setTimeout(() => {
                    console.log(`🎮 3 seconds elapsed, moving to next scene`);

                    
                    this.hideGamificationQuestion();
                    this.currentAttempts = 0; 
                    this.blockedChoices.clear(); 
                }, 3000); 
            }, 400);

        } else {
            
            console.log(`🎮 Wrong answer. Attempts: ${this.currentAttempts}/${this.maxAttempts}`);

            
            playWrongAnswerSound();

            
            this.blockedChoices.add(selectedLetter);

            
            if (selectedButton) {
                selectedButton.classList.add('incorrect', 'blocked');
                selectedButton.disabled = true;
            }

            if (this.currentAttempts >= this.maxAttempts) {
                
                console.log(`🎮 Max attempts reached (${this.maxAttempts}). Showing correct answer with animation for 3 seconds.`);

                
                buttons.forEach(btn => {
                    btn.classList.add('disabled');
                    btn.style.pointerEvents = 'none';
                    
                    if (btn !== correctButton) {
                        btn.classList.add('blocked');
                    }
                });

                
                setTimeout(() => {
                    
                    playCorrectAnswerSound();

                    
                    if (correctButton) {
                        
                        correctButton.classList.remove('correct', 'incorrect', 'blocked');
                        correctButton.classList.add('disabled');
                        correctButton.style.pointerEvents = 'none';
                        correctButton.disabled = true; 

                        
                        correctButton.classList.add('correct-pulse');
                        console.log(`🎮 Started pulsing animation for correct answer - NOT CLICKABLE, animation only`);
                    }
                }, 500); 

                
                setTimeout(() => {
                    if (feedbackText) {
                        feedbackText.textContent = `Correct answer: ${correctAnswer.text}`;
                        feedbackText.className = 'feedback-text incorrect';
                    }

                    feedback.classList.remove('hidden');
                    feedback.classList.add('show');
                    console.log(`🎮 Showing feedback, will wait 3 seconds before next scene`);

                    
                    setTimeout(() => {
                        console.log(`🎮 3 seconds elapsed, moving to next scene`);

                        
                        this.hideGamificationQuestion();
                        this.currentAttempts = 0; 
                        this.blockedChoices.clear(); 
                    }, 3000); 
                }, 400);

            } else {
                
                const remainingAttempts = this.maxAttempts - this.currentAttempts;
                console.log(`🎮 Wrong answer, ${remainingAttempts} attempts remaining. Letting user try again.`);

                
                playWrongAnswerSound();

                
                buttons.forEach(btn => {
                    btn.classList.add('disabled');
                    btn.style.pointerEvents = 'none';
                });

                
                setTimeout(() => {
                    if (feedbackText) {
                        feedbackText.textContent = `Try again!`;
                        feedbackText.className = 'feedback-text incorrect';
                    }

                    feedback.classList.remove('hidden');
                    setTimeout(() => {
                        feedback.classList.add('show');
                        console.log(`🎮 Showing "Try again!" feedback, all buttons disabled temporarily`);

                        
                        setTimeout(() => {
                            feedback.classList.remove('show');
                            console.log(`🎮 Hiding feedback, waiting additional 1 second before enabling retry`);

                            setTimeout(() => {
                                feedback.classList.add('hidden');

                                
                                setTimeout(() => {
                                    console.log(`🎮 Re-enabling unblocked choices for retry attempt`);

                                    
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
                                }, 1000); 
                            }, 300);
                        }, 2500); 
                    }, 50);
                }, 400); 
            }
        }
    }

    hideGamificationQuestion(pauseAfterHiding = true) {
        const overlay = document.getElementById('gamificationOverlay');
        if (!overlay) return;

        
        const isVisible = overlay.classList.contains('show');

        if (!isVisible) {
            console.log(`🎮 Overlay already hidden, skipping hide`);
            return;
        }

        console.log(`🎮 Hiding gamification overlay`);

        
        if (window.GamificationTTS) {
            window.GamificationTTS.cleanup();
        }

        
        crossfadeToStoryMusic();

        
        overlay.classList.remove('show');

        
        setTimeout(() => {
            console.log(`🎮 Cleaning up button animations and states`);
            const allButtons = document.querySelectorAll('.choice-btn');
            allButtons.forEach(btn => {
                
                btn.classList.remove('correct-pulse', 'correct', 'incorrect', 'disabled', 'blocked');
                btn.style.pointerEvents = '';
                btn.disabled = false;

                
                btn.offsetHeight;
            });
        }, 200); 
        setTimeout(() => {
            overlay.classList.add('hidden');

            
            this.currentQuestionShown = false;
            const sceneKey = `scene_${this.currentSceneIndex}`;
            this.answeredQuestions.add(sceneKey);

            
            if (isVisible && pauseAfterHiding) {
                console.log('🎮 Question answered - moving to next scene');

                
                const isLastScene = this.currentSceneIndex === this.scenes.length - 1;
                if (isLastScene) {
                    console.log('🎮 Last scene question answered - finishing story');
                    
                    this.currentTime = this.totalDuration;
                    this.isPlaying = false;
                    this.isAnimating = false;
                    this.updatePlayPauseButton();
                    this.updateProgressBar();
                    this.updateTimeDisplay();

                    
                    if (window.RPMAvatar && window.RPMAvatar.isFullyLoaded) {
                        console.log('👋 Triggering wave animation - story finished');
                        window.RPMAvatar.triggerWaveOnPause();
                    }

                    
                    fadeOutBackgroundMusic();
                } else {
                    
                    const nextSceneIndex = this.currentSceneIndex + 1;
                    if (nextSceneIndex < this.scenes.length) {
                        this.currentSceneIndex = nextSceneIndex;
                        this.currentTime = this.sceneTiming[nextSceneIndex].startTime;
                        this.sceneRealStartTime = this.currentTime; 
                        this.currentQuestionShown = false; 

                        
                        
                        
                        currentNarrationIndex = 0;
                        console.log('🔄 Reset currentNarrationIndex to 0 for new scene (prevents instant gamification)');

                        
                        if (window.RPMAvatar && window.RPMAvatar.isRandomWaveActive) {
                            console.log('⏹️ Stopping random wave animations - auto-resuming after question');
                            window.RPMAvatar.stopRandomWaveAnimations();
                        }

                        
                        
                        
                        this.isPlaying = true;
                        this.isAnimating = true;
                        this.wasPlayingBeforeQuestion = true; 
                        this.updatePlayPauseButton();
                        this.lastUpdateTime = performance.now();
                        this.lastSecondUpdate = -1;

                        
                        loadStoryboardScene(this.scenes, nextSceneIndex + 1);
                        console.log(`🎮 Advanced to scene ${nextSceneIndex + 1} after answering question (scene timer reset)`);

                        
                        this.startProgress();

                        
                        
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


function parseNarrationLines(narration, sceneNumber) {
    if (!narration) {
        return [`Scene ${sceneNumber} content`];
    }

    
    const numberedLinesMatch = narration.match(/^\d+\.\s*.+$/gm);

    if (numberedLinesMatch && numberedLinesMatch.length >= 6) {
        
        return numberedLinesMatch.slice(0, 6).map(line => line.replace(/^\d+\.\s*/, '').trim());
    }

    
    const lines = narration.split(/[\n\r]+/).filter(line => line.trim().length > 0);

    if (lines.length >= 6) {
        return lines.slice(0, 6);
    } else if (lines.length > 0) {
        
        return lines;
    }

    
    const sentences = narration.split(/[.!?]+/).filter(s => s.trim().length > 0).map(s => s.trim() + '.');
    return sentences.slice(0, 6);
}


let narrationInterval = null;
let narrationFirstTimeout = null; 
let narrationTransitioning = false; 
let currentNarrationLines = [];
let currentNarrationIndex = 0;
let currentNarrationOverlay = null;
let isNarrationPaused = true; 
let lastLineChangeTimestamp = 0; 
const SECONDS_PER_LINE = 7; 
const LINE_CHANGE_STABILITY_MS = 1500; 


function calculateNarrationLineIndex(elapsedTimeMs, totalLines) {
    if (!totalLines || totalLines === 0) return 0;

    
    if (typeof AudioNarration !== 'undefined' && AudioNarration.scene && AudioNarration.audioDurationsLoaded) {
        const lineIndex = AudioNarration.getLineIndexAtTime(elapsedTimeMs);
        return Math.max(0, Math.min(lineIndex, totalLines - 1));
    }

    
    const elapsedSeconds = elapsedTimeMs / 1000;
    const lineIndex = Math.floor(elapsedSeconds / SECONDS_PER_LINE);
    return Math.max(0, Math.min(lineIndex, totalLines - 1));
}


function syncNarrationToTime(elapsedTimeMs) {
    if (!currentNarrationLines || currentNarrationLines.length === 0 || !currentNarrationOverlay) {
        return;
    }

    
    if (isNarrationPaused) {
        return;
    }

    
    if (narrationTransitioning) {
        return;
    }

    
    if (typeof AudioNarration !== 'undefined' && AudioNarration.isInitializing) {
        console.log('🎵 Sync blocked - scene is initializing, preventing interference during transition');
        return;
    }

    
    if (typeof AudioNarration !== 'undefined' && AudioNarration.isResuming) {
        console.log('🎵 Sync blocked - audio is resuming, preventing interference');
        return;
    }

    
    
    if (window.justResumed) {
        
        return;
    }

    const targetLineIndex = calculateNarrationLineIndex(elapsedTimeMs, currentNarrationLines.length);

    
    if (targetLineIndex !== currentNarrationIndex) {
        console.log(`📖 Sync requested: line ${currentNarrationIndex + 1} → ${targetLineIndex + 1} at ${Math.round(elapsedTimeMs/1000)}s`);

        
        
        const timeSinceLastChange = Date.now() - lastLineChangeTimestamp;
        if (timeSinceLastChange < LINE_CHANGE_STABILITY_MS) {
            console.log(`📖 Sync blocked - stability period active (${timeSinceLastChange}ms < ${LINE_CHANGE_STABILITY_MS}ms)`);
            return;
        }

        
        if (window.justResumed) {
            console.log('🎵 Sync blocked - justResumed flag active, allowing resume to complete');
            return;
        }

        
        if (typeof AudioNarration !== 'undefined' && AudioNarration.isPlaying) {
            const audioLineIndex = AudioNarration.currentLineIndex;
            if (audioLineIndex === targetLineIndex) {
                console.log('🎵 Sync skipped - audio already playing correct line:', targetLineIndex + 1);
                
                if (currentNarrationIndex !== targetLineIndex) {
                    currentNarrationIndex = targetLineIndex;
                    if (currentNarrationOverlay && currentNarrationLines[targetLineIndex]) {
                        currentNarrationOverlay.innerHTML = `<strong>${currentNarrationLines[targetLineIndex]}</strong>`;
                        console.log(`📖 Text display synced to match audio line ${targetLineIndex + 1}`);
                    }
                }
                return; 
            }
            
            
            
            console.log(`🎵 Audio on line ${audioLineIndex + 1}, syncing text to line ${targetLineIndex + 1}`);
        }

        narrationTransitioning = true;

        
        currentNarrationOverlay.style.transition = 'opacity 0.3s ease-in-out';
        currentNarrationOverlay.style.opacity = '0';

        setTimeout(() => {
            currentNarrationIndex = targetLineIndex;
            currentNarrationOverlay.innerHTML = `<strong>${currentNarrationLines[currentNarrationIndex]}</strong>`;

            
            
            requestAnimationFrame(() => {
                currentNarrationOverlay.style.opacity = '1';
            });

            
            lastLineChangeTimestamp = Date.now();
            console.log(`📖 Synced to line ${currentNarrationIndex + 1}/${currentNarrationLines.length} - stability timer reset`);

            
            const shouldPlayAudio = !window.justResumed;

            
            
            
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

                
                
                
                if (scene && AudioNarration.hasAudio(scene)) {
                    
                    if (scene.audioUrls.length === 1) {
                        console.log('🎵 Sync - Skipping (single scene audio already playing)');
                    } else if (scene.audioUrls.length > 1) {
                        
                        
                        if (AudioNarration.isPlaying) {
                            console.log(`🎵 Sync - Skipping playLine (audio already playing line ${AudioNarration.currentLineIndex + 1}, will auto-progress to line ${currentNarrationIndex + 1})`);
                        } else {
                            
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

            
            setTimeout(() => {
                narrationTransitioning = false;
            }, 300);
        }, 300);
    }
}

function displayNarrationLinesSequentially(narrationOverlay, lines, startTimeMs = 0) {
    console.log('📖 displayNarrationLinesSequentially called, isNarrationPaused:', isNarrationPaused, 'startTime:', startTimeMs);

    
    if (narrationInterval) {
        clearInterval(narrationInterval);
        narrationInterval = null;
    }
    if (narrationFirstTimeout) {
        clearTimeout(narrationFirstTimeout);
        narrationFirstTimeout = null;
    }
    
    narrationTransitioning = false;

    
    currentNarrationLines = lines;
    currentNarrationOverlay = narrationOverlay;

    
    
    
    
    const isNewSceneLoad = startTimeMs < 1000; 
    const startLineIndex = isNewSceneLoad ? 0 : calculateNarrationLineIndex(startTimeMs, lines.length);
    currentNarrationIndex = startLineIndex;

    if (isNewSceneLoad && startTimeMs > 0) {
        console.log(`📖 Forced startLineIndex to 0 (was calculated as ${calculateNarrationLineIndex(startTimeMs, lines.length)}) - fresh scene load detected (startTime: ${startTimeMs}ms)`);
    }

    
    if (lines.length > 0) {
        
        narrationOverlay.style.transition = 'opacity 0.3s ease-in-out';
        narrationOverlay.style.opacity = '0';
        narrationOverlay.innerHTML = `<strong>${lines[currentNarrationIndex]}</strong>`;

        
        lastLineChangeTimestamp = Date.now();

        
        
        requestAnimationFrame(() => {
            narrationOverlay.style.opacity = '1';
            console.log(`📖 Showing line ${currentNarrationIndex + 1}/${lines.length} (synced to ${Math.round(startTimeMs/1000)}s) - stability timer set`);
        });

        
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
                
                
                if (AudioNarration.isPlaying) {
                    console.log('🎵 Audio already playing, skipping playLine to avoid interruption');
                } else if (scene.audioUrls.length === 1 && currentNarrationIndex === 0) {
                    
                    console.log('🎵 Playing single scene audio (full narration)');
                    AudioNarration.playLine(0).catch(err => {
                        console.warn('Audio playback failed, continuing with text:', err);
                    });
                } else if (scene.audioUrls.length > 1) {
                    
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

    
    
    console.log('📖 Narration display initialized. Transitions will be handled by syncNarrationToTime() during playback.');
}


function pauseNarration() {
    console.log('⏸️ pauseNarration() called - pausing narration state and audio');
    isNarrationPaused = true;

    
    if (typeof AudioNarration !== 'undefined' && AudioNarration) {
        console.log('⏸️ Calling AudioNarration.pause() to pause narration audio');
        AudioNarration.pause();

        
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
    
}


function resumeNarration() {
    console.log('▶️ Resuming narration...');

    isNarrationPaused = false;

    
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

        
        if (scene && AudioNarration.hasAudio(scene)) {
            
            currentNarrationIndex = AudioNarration.currentLineIndex;

            
            if (currentNarrationOverlay && currentNarrationLines[currentNarrationIndex]) {
                currentNarrationOverlay.innerHTML = `<strong>${currentNarrationLines[currentNarrationIndex]}</strong>`;
                console.log('📖 Synced text display to audio line:', currentNarrationIndex + 1);
            }

            
            
            
            console.log('🎵 Calling AudioNarration.resume() for line:', AudioNarration.currentLineIndex);
            AudioNarration.resume();
        }
    }
    
    
}


async function calculateNarrationDuration(scene) {
    
    if (scene.audioUrls && scene.audioUrls.length > 0 && typeof AudioNarration !== 'undefined') {
        try {
            
            await AudioNarration.init(scene);
            const totalDuration = AudioNarration.getTotalSceneDuration();
            console.log(`🎵 Scene ${scene.number || '?'} duration from audio: ${(totalDuration / 1000).toFixed(2)}s`);
            return totalDuration;
        } catch (error) {
            console.warn('⚠️ Failed to load audio durations for scene with audio, using fallback:', error);
            
            const linesPerScene = scene.narrationLines?.length || 6;
            const fixedDurationMs = linesPerScene * SECONDS_PER_LINE * 1000;
            return fixedDurationMs;
        }
    }

    
    
    console.log(`📏 Scene ${scene.number || '?'} has no audio - using 1s placeholder`);
    return 1000; 
}


async function calculateSceneDurations(scenes) {
    if (!scenes || !Array.isArray(scenes)) return [];

    const durationPromises = scenes.map(async (scene, index) => {
        const duration = await calculateNarrationDuration(scene);

        return {
            sceneIndex: index,
            title: scene.title || `Scene ${index + 1}`,
            duration: duration,
            durationSeconds: Math.ceil(duration / 1000),
            startTime: 0, 
            endTime: 0    
        };
    });

    return await Promise.all(durationPromises);
}


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

    
    
    if (volumeSlider && window.userSettings && typeof window.userSettings.music_volume === 'number') {
        const userMusicVolume = Math.round(window.userSettings.music_volume * 100);
        volumeSlider.value = userMusicVolume;
        volumeSlider.style.setProperty('--volume-progress', userMusicVolume + '%');
        console.log('🎵 Set volume slider baseline from user settings:', userMusicVolume + '%');
    }

    let musicData = null;

    
    if (currentStory && currentStory.music && currentStory.music.fileName) {
        musicData = currentStory.music;
        console.log('🎵 Loading music from story data:', musicData);
    }
    
    else if (window.userSettings && window.userSettings.background_music) {
        console.log('🎵 No music in story, loading from user settings:', window.userSettings.background_music);
        musicData = {
            enabled: true,
            fileName: window.userSettings.background_music,
            volume: (window.userSettings.music_volume * 100) || 10  
        };
        console.log('🎵 User settings music data:', musicData);
    }
    
    else {
        console.log('🎵 No music found, defaulting to adventure.mp3');
        musicData = {
            enabled: true,
            fileName: 'adventure.mp3',
            volume: 20  
        };
    }

    
    if (musicData && musicData.fileName) {
        
        const musicPath = '../../../public/files/music/' + musicData.fileName;
        console.log('🎵 Music path:', musicPath);
        backgroundMusicAudio = new Audio(musicPath);
        backgroundMusicAudio.loop = true;
        backgroundMusicAudio.volume = (musicData.volume || 20) / 100;

        
        backgroundMusicAudio.addEventListener('error', (e) => {
            console.warn('⚠️ Background music failed to load:', musicPath, e);
        });

        console.log('🎵 Audio element created with volume:', backgroundMusicAudio.volume);

        
        window.backgroundMusicAudio = backgroundMusicAudio;

        
        
        console.log('🎵 Audio element created - volume slider already set to user preference');

        
        console.log('🎵 Music loaded and ready to play when story starts');
    } else {
        console.warn('⚠️ No music data found in story or user settings');
        console.warn('   - currentStory exists:', !!currentStory);
        console.warn('   - currentStory.music exists:', !!(currentStory && currentStory.music));
        console.warn('   - currentStory.music.enabled:', currentStory && currentStory.music ? currentStory.music.enabled : 'N/A');
        console.warn('   - userSettings.background_music:', window.userSettings?.background_music || 'N/A');
    }

    
    if (volumeBtn) {
        volumeBtn.addEventListener('click', function() {
            if (backgroundMusicAudio) {
                if (backgroundMusicAudio.volume > 0) {
                    
                    backgroundMusicAudio.volume = 0;
                    if (volumeSlider) {
                        volumeSlider.value = 0;
                        volumeSlider.style.setProperty('--volume-progress', '0%');
                        volumeSlider.classList.add('muted');
                    }
                    if (volumeOnIcon) volumeOnIcon.style.display = 'none';
                    if (volumeOffIcon) volumeOffIcon.style.display = 'block';

                    
                    if (!backgroundMusicAudio.paused) {
                        backgroundMusicAudio.pause();
                    }
                } else {
                    
                    const targetVolume = currentStory && currentStory.music ? (currentStory.music.volume || 30) : 30;
                    backgroundMusicAudio.volume = targetVolume / 100;
                    if (volumeSlider) {
                        volumeSlider.value = targetVolume;
                        volumeSlider.style.setProperty('--volume-progress', targetVolume + '%');
                        volumeSlider.classList.remove('muted');
                    }
                    if (volumeOnIcon) volumeOnIcon.style.display = 'block';
                    if (volumeOffIcon) volumeOffIcon.style.display = 'none';

                    
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

    
    if (volumeSlider) {
        
        volumeSlider.style.setProperty('--volume-progress', volumeSlider.value + '%');

        volumeSlider.addEventListener('input', function() {
            const volume = parseInt(this.value);

            
            this.style.setProperty('--volume-progress', volume + '%');

            
            

            if (backgroundMusicAudio) {
                
                const wasAtZero = backgroundMusicAudio.volume === 0;

                
                backgroundMusicAudio.volume = volume / 100;

                
                if (volume === 0) {
                    this.classList.add('muted');
                    if (volumeOnIcon) volumeOnIcon.style.display = 'none';
                    if (volumeOffIcon) volumeOffIcon.style.display = 'block';

                    
                    if (!backgroundMusicAudio.paused) {
                        backgroundMusicAudio.pause();
                    }
                } else {
                    this.classList.remove('muted');
                    if (volumeOnIcon) volumeOnIcon.style.display = 'block';
                    if (volumeOffIcon) volumeOffIcon.style.display = 'none';

                    
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


function initializeNarrationVolumeDisplay() {
    console.log('🎤 Initializing narration volume display...');

    
    const narrationVolumeValue = document.getElementById('narrationVolumeValue');

    if (!narrationVolumeValue) {
        console.warn('⚠️ Narration volume display element not found');
        return;
    }

    
    let narrationVolume = 0.5; 

    if (window.userSettings && typeof window.userSettings.narration_volume === 'number') {
        narrationVolume = Math.max(0, Math.min(1, window.userSettings.narration_volume));
        console.log('🎤 Using user-configured narration volume:', (narrationVolume * 100) + '%');
    } else {
        console.log('🎤 Using default narration volume: 50%');
    }

    
    const percentage = Math.round(narrationVolume * 100);
    narrationVolumeValue.textContent = `${percentage}%`;

    console.log('✅ Narration volume display initialized to:', percentage + '%');
}

function playBackgroundMusic() {
    if (backgroundMusicAudio) {
        
        const volumeSlider = document.getElementById('volumeSlider');
        const sliderVolume = volumeSlider ? parseInt(volumeSlider.value) : null;

        
        let targetVolume = backgroundMusicAudio.volume;
        if (sliderVolume !== null) {
            targetVolume = sliderVolume / 100;
        }

        
        if (targetVolume === 0) {
            console.log('🔇 Music is muted - not playing audio');
            backgroundMusicAudio.volume = 0;
            backgroundMusicAudio.play().catch(err => console.log('Muted play attempt:', err));
            return;
        }

        
        backgroundMusicAudio.volume = 0;

        backgroundMusicAudio.play()
            .then(() => {
                console.log('✅ Background music playing, starting fade-in to', (targetVolume * 100) + '%');

                
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

                
                document.addEventListener('click', function playOnInteraction() {
                    if (backgroundMusicAudio && backgroundMusicAudio.paused) {
                        
                        const volumeSlider = document.getElementById('volumeSlider');
                        const sliderVolume = volumeSlider ? parseInt(volumeSlider.value) : null;
                        const targetVolume = sliderVolume !== null ? sliderVolume / 100 : (backgroundMusicAudio.volume || 0.30);

                        
                        if (targetVolume === 0) {
                            console.log('🔇 Music is muted - not playing on interaction');
                            return;
                        }

                        backgroundMusicAudio.volume = 0;

                        backgroundMusicAudio.play()
                            .then(() => {
                                console.log('✅ Background music playing after user interaction, starting fade-in');
                                document.removeEventListener('click', playOnInteraction);

                                
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

    
    backgroundMusicAudio.loop = false;
    console.log('🎵 Background music loop disabled');

    
    const fadeDuration = 2000;

    console.log(`🎵 Fading out background music over ${fadeDuration}ms`);

    const startVolume = backgroundMusicAudio.volume;
    const fadeInterval = 50; 
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


function initializeGamificationAudio() {
    console.log('🔊 Initializing gamification audio...');

    questionBgAudio = document.getElementById('questionBgAudio');
    correctAnswerAudio = document.getElementById('correctAnswerAudio');
    wrongAnswerAudio = document.getElementById('wrongAnswerAudio');

    if (questionBgAudio) {
        questionBgAudio.volume = 0.3; 
        questionBgAudio.addEventListener('error', (e) => {
            console.warn('⚠️ Question background audio failed to load:', e);
        });
        questionBgAudio.load(); 
        console.log('✅ Question background audio initialized at 30% volume');
    } else {
        console.error('❌ Question background audio element not found!');
    }

    if (correctAnswerAudio) {
        correctAnswerAudio.volume = 1.0; 
        correctAnswerAudio.addEventListener('error', (e) => {
            console.warn('⚠️ Correct answer audio failed to load:', e);
        });
        correctAnswerAudio.load(); 
        console.log('✅ Correct answer audio initialized at 100% volume');
    } else {
        console.error('❌ Correct answer audio element not found!');
    }

    if (wrongAnswerAudio) {
        wrongAnswerAudio.volume = 1.0; 
        wrongAnswerAudio.addEventListener('error', (e) => {
            console.warn('⚠️ Wrong answer audio failed to load:', e);
        });
        wrongAnswerAudio.load(); 
        console.log('✅ Wrong answer audio initialized at 100% volume');
    } else {
        console.error('❌ Wrong answer audio element not found!');
    }
}


function playQuestionBgMusic() {
    console.log('🎵 playQuestionBgMusic called');
    if (questionBgAudio) {
        console.log('🎵 Question audio element found, attempting to play...');
        questionBgAudio.currentTime = 0;
        questionBgAudio.loop = true; 
        questionBgAudio.volume = 0.3; 

        const playPromise = questionBgAudio.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    console.log('✅ Question background music playing at', (questionBgAudio.volume * 100) + '% volume');
                })
                .catch(err => {
                    console.error('❌ Question music play error:', err);
                    
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


function crossfadeToQuestionMusic() {
    const fadeDuration = 1000; 
    const fadeInterval = 50; 

    console.log('🎵 Starting crossfade to question music');

    
    if (questionBgAudio) {
        questionBgAudio.currentTime = 0;
        questionBgAudio.loop = true;
        questionBgAudio.volume = 0;

        questionBgAudio.play()
            .then(() => {
                console.log('✅ Question music started for crossfade');

                
                const storyStartVolume = window.backgroundMusicAudio ? window.backgroundMusicAudio.volume : 0;
                const questionTargetVolume = 0.3; 
                const steps = fadeDuration / fadeInterval;
                const storyVolumeStep = storyStartVolume / steps;
                const questionVolumeStep = questionTargetVolume / steps;

                let currentStep = 0;

                const crossfadeInterval = setInterval(() => {
                    currentStep++;

                    
                    if (window.backgroundMusicAudio && !window.backgroundMusicAudio.paused) {
                        const newStoryVolume = Math.max(0, storyStartVolume - (storyVolumeStep * currentStep));
                        window.backgroundMusicAudio.volume = newStoryVolume;

                        if (newStoryVolume <= 0) {
                            window.backgroundMusicAudio.pause();
                            console.log('✅ Story music faded out and paused');
                        }
                    }

                    
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
                
                if (window.backgroundMusicAudio && !window.backgroundMusicAudio.paused) {
                    window.backgroundMusicAudio.pause();
                }
                playQuestionBgMusic();
            });
    } else {
        console.error('❌ Question audio not available for crossfade');
        
        if (window.backgroundMusicAudio && !window.backgroundMusicAudio.paused) {
            window.backgroundMusicAudio.pause();
        }
    }
}


function crossfadeToStoryMusic() {
    const fadeDuration = 1000; 
    const fadeInterval = 50; 

    console.log('🎵 Starting crossfade to story music');

    if (!window.backgroundMusicAudio) {
        console.log('⚠️ No background music to crossfade to');
        stopQuestionBgMusic();
        return;
    }

    
    const volumeSlider = document.getElementById('volumeSlider');
    const currentVolume = volumeSlider ? parseInt(volumeSlider.value) : (currentStory && currentStory.music ? (currentStory.music.volume || 30) : 30);
    const storyTargetVolume = currentVolume / 100;

    
    if (window.backgroundMusicAudio.paused) {
        window.backgroundMusicAudio.volume = 0;
        window.backgroundMusicAudio.play()
            .then(() => {
                console.log('✅ Story music started for crossfade');
                performCrossfade();
            })
            .catch(err => {
                console.error('❌ Story music crossfade play error:', err);
                
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

            
            if (questionBgAudio && !questionBgAudio.paused) {
                const newQuestionVolume = Math.max(0, questionStartVolume - (questionVolumeStep * currentStep));
                questionBgAudio.volume = newQuestionVolume;

                if (newQuestionVolume <= 0) {
                    questionBgAudio.pause();
                    questionBgAudio.currentTime = 0;
                    console.log('✅ Question music faded out and stopped');
                }
            }

            
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


function stopQuestionBgMusic() {
    if (questionBgAudio && !questionBgAudio.paused) {
        questionBgAudio.pause();
        questionBgAudio.currentTime = 0;
        console.log('🔇 Question background music stopped');
    }
}


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


function goToAfterStoryQuiz() {
    console.log('🎯 Navigating to After Story Quiz...');

    
    if (backgroundMusicAudio) {
        backgroundMusicAudio.pause();
    }

    
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

    
    window.location.href = '/afterstoryquiz';
}






const GamificationTTS = {
    currentAudio: null,
    isReading: false,
    currentQuestion: null,
    currentChoices: [],

    
    init() {
        console.log('🎤 Initializing Automatic Gamification TTS...');
        console.log('✅ Gamification TTS initialized - automatic mode');
    },

    
    setQuestionData(questionText, choices) {
        this.currentQuestion = questionText;
        this.currentChoices = choices || [];
        console.log('🎤 Question data set:', { questionText, choicesCount: choices.length });
    },

    
    async readQuestion() {
        if (!this.currentQuestion) {
            console.warn('⚠️ No question text to read');
            return;
        }

        console.log('🎤 Reading question:', this.currentQuestion);

        
        this.stop();

        try {
            
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(this.currentQuestion);
                utterance.rate = 0.8; 
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

    
    async readChoices() {
        if (!this.currentChoices || this.currentChoices.length === 0) {
            console.warn('⚠️ No choices to read');
            return;
        }

        console.log('🎤 Reading choices:', this.currentChoices);

        
        this.stop();

        try {
            if ('speechSynthesis' in window) {
                this.isReading = true;

                
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
                            
                            setTimeout(resolve, 300);
                        };

                        utterance.onerror = (event) => {
                            console.error(`❌ Error reading choice ${choice.letter}:`, event);
                            resolve();
                        };

                        window.speechSynthesis.speak(utterance);
                        console.log(`🎤 Reading choice ${choice.letter}`);
                    });

                    
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

    
    async readQuestionAndChoices() {
        console.log('🎤 Auto-reading question and choices');

        await this.readQuestion();

        
        await new Promise(resolve => setTimeout(resolve, 800));

        if (this.isReading) {
            await this.readChoices();
        }
    },

    
    stop() {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }

        this.isReading = false;
        console.log('🛑 Stopped TTS');
    },

    
    cleanup() {
        this.stop();
        this.currentQuestion = null;
        this.currentChoices = [];
    }
};


if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => GamificationTTS.init());
} else {
    GamificationTTS.init();
}






async function testVoiceParsing() {
    console.log('🎤 Testing Voice Configuration...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    
    
    let storyData = currentStory;

    if (!storyData) {
        console.log('🔍 currentStory not available, loading from IndexedDB...');
        try {
            storyData = await loadStoryFromIndexedDB();
            if (!storyData) {
                
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

        
        const hasAudioNarrationModule = typeof AudioNarration !== 'undefined';
        console.log('🔧 AudioNarration Module Loaded:', hasAudioNarrationModule);

        if (hasAudioNarrationModule) {
            console.log('🔧 AudioNarration State:', {
                isPlaying: AudioNarration.isPlaying,
                currentLineIndex: AudioNarration.currentLineIndex,
                hasCurrentAudio: !!AudioNarration.currentAudio
            });
        }

        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 SUMMARY:');
        console.log(`   Voice: ${storyData.selectedVoice || 'Not set'}`);
        console.log(`   Voice ID: ${storyData.voiceId || 'Not set'}`);
        console.log(`   Scenes with audio: ${scenesWithAudio}/${storyData.scenes?.length || 0}`);
        console.log(`   Total audio URLs: ${totalAudioUrls}`);
        console.log(`   AudioNarration loaded: ${hasAudioNarrationModule}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        
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


window.goBackToDashboard = goBackToDashboard;
window.stopBackgroundMusic = stopBackgroundMusic;
window.goToAfterStoryQuiz = goToAfterStoryQuiz;
window.GamificationTTS = GamificationTTS;
window.testVoiceParsing = testVoiceParsing;






function cleanupAllAudio() {
    console.log('🧹 Cleaning up all audio resources before page unload...');

    
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

    
    if (globalStoryboardPlayer) {
        try {
            globalStoryboardPlayer.stopProgress();
            console.log('✅ Storyboard player cleaned up');
        } catch (e) {
            console.warn('⚠️ Error cleaning up storyboard player:', e);
        }
    }

    
    if (window.RPMAvatar) {
        try {
            console.log('🧹 Cleaning up RPM Avatar (Three.js resources)...');

            
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

            
            if (window.RPMAvatar.cleanup && typeof window.RPMAvatar.cleanup === 'function') {
                window.RPMAvatar.cleanup();
            }

            
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

            
            
            if (window.RPMAvatar.renderer) {
                console.log('🧹 Forcing WebGL context loss (Safari memory fix)...');
                try {
                    
                    const gl = window.RPMAvatar.renderer.getContext();
                    if (gl) {
                        
                        const loseContextExt = gl.getExtension('WEBGL_lose_context');
                        if (loseContextExt) {
                            loseContextExt.loseContext();
                            console.log('✅ WebGL context lost');
                        }
                    }
                } catch (contextError) {
                    console.warn('⚠️ Could not force context loss:', contextError);
                }

                
                window.RPMAvatar.renderer.dispose();
                window.RPMAvatar.renderer = null;
                console.log('✅ Three.js renderer disposed');
            }

            
            window.RPMAvatar.avatar = null;
            window.RPMAvatar.isInitialized = false;

            console.log('✅ RPM Avatar resources cleaned up');
        } catch (e) {
            console.warn('⚠️ Error cleaning up RPM Avatar:', e);
        }
    }

    
    if (window.GamificationTTS && typeof window.GamificationTTS.cleanup === 'function') {
        try {
            console.log('🧹 Cleaning up GamificationTTS...');
            window.GamificationTTS.cleanup();
            console.log('✅ GamificationTTS cleaned up');
        } catch (e) {
            console.warn('⚠️ Error cleaning up GamificationTTS:', e);
        }
    }

    
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


function cleanupAllResources() {
    cleanupAllAudio();
    
    clearStoryData(false); 
    cleanupIndexedDB();
}


window.addEventListener('beforeunload', cleanupAllResources);



window.addEventListener('pagehide', cleanupAllResources);


let openIndexedDBConnections = [];


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


function clearStoryData(clearSession = false) {
    console.log('🧹 Clearing story data from storage locations...');

    
    
    if (clearSession) {
        try {
            
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
        
        if (window.localStorage) {
            localStorage.removeItem('generatedStoryData');
            console.log('✅ Cleared localStorage story data');
        }
    } catch (e) {
        console.warn('⚠️ Error clearing localStorage:', e);
    }

    try {
        
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







let hiddenTimer;
const visibilityChangeHandler = () => {
    if (document.hidden) {
        
        hiddenTimer = setTimeout(() => {
            console.log('👁️ Page hidden for 5 minutes - cleaning up audio resources');
            cleanupAllAudio();
            cleanupIndexedDB();
        }, 5 * 60 * 1000); 
    } else {
        
        if (hiddenTimer) {
            clearTimeout(hiddenTimer);
            hiddenTimer = null;
        }
    }
};


EventListenerRegistry.add(document, 'visibilitychange', visibilityChangeHandler);

console.log('✅ Audio cleanup handlers registered (beforeunload + pagehide for reliability)');