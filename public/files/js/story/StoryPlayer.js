document.addEventListener('DOMContentLoaded', function() {
    
    const storyImage = document.getElementById('storyImage');
    const playBtn = document.querySelector('.play-btn');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    const backBtn = document.querySelector('.back-btn');
    const progressBar = document.querySelector('.progress-bar');
    const progressFilled = document.querySelector('.progress-filled');
    const currentTime = document.querySelector('.current-time');
    const totalTime = document.querySelector('.total-time');
    const volumeBtn = document.querySelector('.volume-btn');
    const volumeSlider = document.querySelector('.volume-slider input');
    const fullscreenBtn = document.querySelector('.fullscreen-btn');


    let isPlaying = false;
    let currentSlide = 0;
    let slideInterval;
    const slideDuration = 3000; 
    let slides = []; 

 
    let audioContext;
    let gainNode;
    let audioElement;

   
    function initializeStory() {
        const storyImage = sessionStorage.getItem('storyImage');
        const storyTitle = sessionStorage.getItem('storyTitle');
        
        if (storyImage) {
            document.getElementById('storyImage').src = storyImage;
        }
        if (storyTitle) {
            document.querySelector('.story-title').textContent = storyTitle;
        }
    }

   
    function initializeAudio() {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioElement = new Audio();
        gainNode = audioContext.createGain();
        
        const source = audioContext.createMediaElementSource(audioElement);
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        
        gainNode.gain.value = volumeSlider.value / 100;
    }

    
    function initializeVolume() {
        const savedVolume = localStorage.getItem('storyPlayerVolume') || 100;
        volumeSlider.value = savedVolume;
        updateVolumeIcon(savedVolume);
        if (gainNode) {
            gainNode.gain.value = savedVolume / 100;
        }
    }

    function updateVolumeIcon(value) {
        const volumeIcon = volumeBtn.querySelector('i');
        if (value == 0) {
            volumeIcon.className = 'fas fa-volume-mute';
        } else if (value < 50) {
            volumeIcon.className = 'fas fa-volume-down';
        } else {
            volumeIcon.className = 'fas fa-volume-up';
        }
    }

    
    function togglePlay() {
        if (isPlaying) {
            pauseStory();
        } else {
            playStory();
        }
    }

    function playStory() {
        isPlaying = true;
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        slideInterval = setInterval(nextSlide, slideDuration);
        updateProgress();
    }

    function pauseStory() {
        isPlaying = false;
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        clearInterval(slideInterval);
    }

   
    function nextSlide() {
        currentSlide++;
        if (currentSlide >= slides.length) {
            currentSlide = 0;
        }
        updateSlide();
    }

    function prevSlide() {
        currentSlide--;
        if (currentSlide < 0) {
            currentSlide = slides.length - 1;
        }
        updateSlide();
    }

    function updateSlide() {
        storyImage.src = slides[currentSlide];
        updateProgress();
    }

    
    function updateProgress() {
        const progress = (currentSlide / (slides.length - 1)) * 100;
        progressFilled.style.width = `${progress}%`;
        updateTimeDisplay();
    }

    function updateTimeDisplay() {
        const current = formatTime(currentSlide * slideDuration / 1000);
        const total = formatTime(slides.length * slideDuration / 1000);
        currentTime.textContent = current;
        totalTime.textContent = total;
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

   
    function toggleVolume() {
        const volumeIcon = volumeBtn.querySelector('i');
        if (volumeSlider.value > 0) {
            volumeSlider.dataset.lastValue = volumeSlider.value;
            volumeSlider.value = 0;
            volumeIcon.className = 'fas fa-volume-mute';
        } else {
            volumeSlider.value = volumeSlider.dataset.lastValue || 100;
            volumeIcon.className = 'fas fa-volume-up';
        }
    }

   
    function handleVolumeChange(e) {
        const value = e.target.value;
        updateVolumeIcon(value);
        
        if (gainNode) {
            gainNode.gain.value = value / 100;
        }
        
        localStorage.setItem('storyPlayerVolume', value);
    }

    
    function toggleFullscreen() {
        const container = document.querySelector('.player-container');
        
        if (!document.fullscreenElement && 
            !document.webkitFullscreenElement &&
            !document.msFullscreenElement) {
            
            if (container.requestFullscreen) {
                container.requestFullscreen();
            } else if (container.webkitRequestFullscreen) {
                container.webkitRequestFullscreen();
            } else if (container.msRequestFullscreen) {
                container.msRequestFullscreen();
            }
            
            fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
            
            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
        }
    }

   
    function goBack() {
        sessionStorage.removeItem('storyImage');
        sessionStorage.removeItem('storyTitle');
        window.location.href = 'StoryDashboard.php';
    }

    
    playBtn.addEventListener('click', togglePlay);
    prevBtn.addEventListener('click', prevSlide);
    nextBtn.addEventListener('click', nextSlide);
    backBtn.addEventListener('click', goBack);
    volumeBtn.addEventListener('click', (e) => {
        if (e.target.closest('.volume-slider')) {
            e.stopPropagation(); 
        } else {
            toggleVolume();
        }
    });
    fullscreenBtn.addEventListener('click', toggleFullscreen);
    volumeSlider.addEventListener('input', handleVolumeChange);
    volumeSlider.addEventListener('change', handleVolumeChange);
    
   
    initializeStory();

   
    document.addEventListener('keydown', (e) => {
        switch(e.code) {
            case 'Space': togglePlay(); break;
            case 'ArrowLeft': prevSlide(); break;
            case 'ArrowRight': nextSlide(); break;
            case 'Escape': goBack(); break;
        }
    });

    
    document.addEventListener('fullscreenchange', updateFullscreenButton);
    document.addEventListener('webkitfullscreenchange', updateFullscreenButton);
    document.addEventListener('mozfullscreenchange', updateFullscreenButton);
    document.addEventListener('MSFullscreenChange', updateFullscreenButton);

    function updateFullscreenButton() {
        const isFullscreen = document.fullscreenElement || 
                           document.webkitFullscreenElement || 
                           document.msFullscreenElement;
        
        fullscreenBtn.innerHTML = isFullscreen ? 
            '<i class="fas fa-compress"></i>' : 
            '<i class="fas fa-expand"></i>';
    }

   
    initializeAudio();
    initializeVolume();
});

document.addEventListener('keydown', (e) => {
    switch(e.code) {
       
        case 'KeyF': toggleFullscreen(); break;
        case 'KeyM': toggleVolume(); break;
    }
});