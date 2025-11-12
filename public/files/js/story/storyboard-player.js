class StoryboardPlayer {
    constructor(container) {
        this.container = container;
        this.currentScene = 0;
        this.isPlaying = false;
        this.isPaused = false;
        this.scenes = [];
        this.images = [];
        this.autoPlayTimer = null;
        this.defaultSceneDuration = 5000; 
        
        this.createPlayerUI();
    }

    createPlayerUI() {
        this.container.innerHTML = `
            <div class="storyboard-player">
                <div class="player-header">
                    <h3 class="story-title"></h3>
                    <div class="player-controls">
                        <button class="btn-control" id="playPauseBtn">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="btn-control" id="stopBtn">
                            <i class="fas fa-stop"></i>
                        </button>
                        <button class="btn-control" id="muteBtn">
                            <i class="fas fa-volume-up"></i>
                        </button>
                    </div>
                </div>
                
                <div class="player-main">
                    <div class="scene-container">
                        <img class="scene-image" alt="Story Scene" />
                        <div class="scene-loading">
                            <div class="loading-spinner"></div>
                            <p>Loading scene...</p>
                        </div>
                    </div>
                    
                    <div class="scene-text">
                        <p class="narration-text"></p>
                        <div class="scene-info">
                            <span class="scene-counter">Scene 1 of 1</span>
                            <span class="characters-in-scene"></span>
                        </div>
                    </div>
                </div>
                
                <div class="player-footer">
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress-fill"></div>
                            <div class="progress-thumb"></div>
                        </div>
                        <div class="time-display">
                            <span class="current-time">0:00</span>
                            <span class="total-time">0:00</span>
                        </div>
                    </div>
                    
                    <div class="scene-navigation">
                        <button class="btn-nav" id="prevBtn">
                            <i class="fas fa-chevron-left"></i>
                            Previous
                        </button>
                        <button class="btn-nav" id="nextBtn">
                            Next
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents();
    }

    bindEvents() {
        const playPauseBtn = this.container.querySelector('#playPauseBtn');
        const stopBtn = this.container.querySelector('#stopBtn');
        const muteBtn = this.container.querySelector('#muteBtn');
        const prevBtn = this.container.querySelector('#prevBtn');
        const nextBtn = this.container.querySelector('#nextBtn');
        const progressBar = this.container.querySelector('.progress-bar');

        playPauseBtn.addEventListener('click', () => {
            if (this.isPlaying && !this.isPaused) {
                this.pause();
            } else {
                this.play();
            }
        });

        stopBtn.addEventListener('click', () => {
            this.stop();
        });

        muteBtn.addEventListener('click', () => {
            this.toggleMute();
        });

        prevBtn.addEventListener('click', () => {
            this.previousScene();
        });

        nextBtn.addEventListener('click', () => {
            this.nextScene();
        });

        progressBar.addEventListener('click', (e) => {
            const rect = progressBar.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const progressPercent = clickX / rect.width;
            const targetScene = Math.floor(progressPercent * this.scenes.length);
            this.goToScene(targetScene);
        });

        
        document.addEventListener('keydown', (e) => {
            if (this.container.style.display !== 'none') {
                switch(e.code) {
                    case 'Space':
                        e.preventDefault();
                        if (this.isPlaying && !this.isPaused) {
                            this.pause();
                        } else {
                            this.play();
                        }
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.previousScene();
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.nextScene();
                        break;
                    case 'Escape':
                        e.preventDefault();
                        this.stop();
                        break;
                }
            }
        });
    }

    loadStory(storyData) {
        this.scenes = storyData.scenes || [];
        this.images = storyData.images || [];
        this.currentScene = 0;

        const titleElement = this.container.querySelector('.story-title');
        titleElement.textContent = storyData.story?.title || 'Untitled Story';

        this.updateTotalTime();
        this.displayScene(0);
    }

    displayScene(sceneIndex) {
        if (sceneIndex < 0 || sceneIndex >= this.scenes.length) {
            return;
        }

        this.currentScene = sceneIndex;
        const scene = this.scenes[sceneIndex];
        const imageData = this.images.find(img => img.sceneNumber === scene.number);

        
        const narrationElement = this.container.querySelector('.narration-text');
        narrationElement.textContent = scene.narration;

        
        const sceneCounterElement = this.container.querySelector('.scene-counter');
        const sceneDuration = scene.duration || (this.defaultSceneDuration / 1000);
        sceneCounterElement.textContent = `Scene ${sceneIndex + 1} of ${this.scenes.length} (${sceneDuration}s)`;

        const charactersElement = this.container.querySelector('.characters-in-scene');
        if (scene.characters && scene.characters.length > 0) {
            charactersElement.textContent = `Characters: ${scene.characters.join(', ')}`;
        } else {
            charactersElement.textContent = 'No characters in this scene';
        }

        
        const imageElement = this.container.querySelector('.scene-image');
        const loadingElement = this.container.querySelector('.scene-loading');

        if (imageData && imageData.imageUrl) {
            loadingElement.style.display = 'flex';
            imageElement.style.display = 'none';

            const img = new Image();
            img.onload = () => {
                imageElement.src = imageData.imageUrl;
                imageElement.style.display = 'block';
                loadingElement.style.display = 'none';
            };
            img.onerror = () => {
                loadingElement.innerHTML = `
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Image failed to load</p>
                    </div>
                `;
            };
            img.src = imageData.imageUrl;
        } else {
            imageElement.style.display = 'none';
            loadingElement.innerHTML = `
                <div class="no-image-state">
                    <i class="fas fa-image"></i>
                    <p>No image available for this scene</p>
                </div>
            `;
            loadingElement.style.display = 'flex';
        }

        this.updateProgress();

        
        const prevBtn = this.container.querySelector('#prevBtn');
        const nextBtn = this.container.querySelector('#nextBtn');
        
        prevBtn.disabled = sceneIndex === 0;
        nextBtn.disabled = sceneIndex === this.scenes.length - 1;

        
        this.announceSceneChange(scene);
    }

    announceSceneChange(scene) {
        
        let announcement = this.container.querySelector('.sr-announcement');
        if (!announcement) {
            announcement = document.createElement('div');
            announcement.className = 'sr-announcement';
            announcement.setAttribute('aria-live', 'polite');
            announcement.setAttribute('aria-atomic', 'true');
            announcement.style.position = 'absolute';
            announcement.style.left = '-10000px';
            announcement.style.width = '1px';
            announcement.style.height = '1px';
            announcement.style.overflow = 'hidden';
            this.container.appendChild(announcement);
        }

        announcement.textContent = `Scene ${this.currentScene + 1}: ${scene.narration}`;
    }

    play() {
        if (this.scenes.length === 0) {
            return;
        }

        this.isPlaying = true;
        this.isPaused = false;

        const playPauseBtn = this.container.querySelector('#playPauseBtn');
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';

        this.startAutoPlay();
    }

    pause() {
        this.isPaused = true;
        this.stopAutoPlay();

        const playPauseBtn = this.container.querySelector('#playPauseBtn');
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    }

    stop() {
        this.isPlaying = false;
        this.isPaused = false;
        this.stopAutoPlay();
        this.goToScene(0);

        const playPauseBtn = this.container.querySelector('#playPauseBtn');
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    }

    startAutoPlay() {
        this.stopAutoPlay();
        
        const currentSceneData = this.scenes[this.currentScene];
        const sceneDuration = (currentSceneData?.duration || (this.defaultSceneDuration / 1000)) * 1000;
        
        this.autoPlayTimer = setTimeout(() => {
            if (this.isPlaying && !this.isPaused) {
                if (this.currentScene < this.scenes.length - 1) {
                    this.nextScene();
                    this.startAutoPlay();
                } else {
                    
                    this.stop();
                    this.onStoryComplete();
                }
            }
        }, sceneDuration);
    }

    stopAutoPlay() {
        if (this.autoPlayTimer) {
            clearTimeout(this.autoPlayTimer);
            this.autoPlayTimer = null;
        }
    }

    nextScene() {
        if (this.currentScene < this.scenes.length - 1) {
            this.displayScene(this.currentScene + 1);
        }
    }

    previousScene() {
        if (this.currentScene > 0) {
            this.displayScene(this.currentScene - 1);
        }
    }

    goToScene(sceneIndex) {
        this.displayScene(sceneIndex);
    }

    toggleMute() {
        const muteBtn = this.container.querySelector('#muteBtn');
        const isMuted = muteBtn.classList.contains('muted');
        
        if (isMuted) {
            muteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            muteBtn.classList.remove('muted');
        } else {
            muteBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
            muteBtn.classList.add('muted');
        }
    }

    updateProgress() {
        const progressFill = this.container.querySelector('.progress-fill');
        const progressThumb = this.container.querySelector('.progress-thumb');
        const currentTimeElement = this.container.querySelector('.current-time');

        if (this.scenes.length > 0) {
            const progress = (this.currentScene / (this.scenes.length - 1)) * 100;
            progressFill.style.width = `${progress}%`;
            progressThumb.style.left = `${progress}%`;

            
            let currentTime = 0;
            for (let i = 0; i < this.currentScene; i++) {
                currentTime += this.scenes[i].duration || (this.defaultSceneDuration / 1000);
            }
            currentTimeElement.textContent = this.formatTime(currentTime);
        }
    }

    updateTotalTime() {
        const totalTimeElement = this.container.querySelector('.total-time');
        const totalTime = this.scenes.reduce((total, scene) => {
            return total + (scene.duration || (this.defaultSceneDuration / 1000));
        }, 0);
        totalTimeElement.textContent = this.formatTime(totalTime);
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    onStoryComplete() {
        
        const completionToast = document.createElement('div');
        completionToast.className = 'story-completion-toast';
        completionToast.innerHTML = `
            <div class="completion-content">
                <i class="fas fa-check-circle"></i>
                <h4>Story Complete!</h4>
                <p>You've finished watching the entire story.</p>
                <button class="btn btn-primary" onclick="this.parentElement.parentElement.remove()">
                    Close
                </button>
            </div>
        `;
        
        document.body.appendChild(completionToast);
        
        setTimeout(() => {
            completionToast.classList.add('show');
        }, 100);
    }

    setSceneDuration(duration) {
        this.sceneDuration = duration * 1000; 
        this.updateTotalTime();
    }

    destroy() {
        this.stopAutoPlay();
        this.container.innerHTML = '';
    }
}

window.StoryboardPlayer = StoryboardPlayer;