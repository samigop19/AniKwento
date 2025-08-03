let audioContext;
let currentPreview = null;

const voiceSamples = {
    'teacher': null,
    'ai-cheerful': 'audio/ai-cheerful-sample.mp3',
    'ai-gentle': 'audio/ai-gentle-sample.mp3',
    'ai-engaging': 'audio/ai-engaging-sample.mp3'
};

const musicSamples = {
    'gentle': 'audio/gentle-lullaby.mp3',
    'playful': 'audio/playful-adventure.mp3',
    'nature': 'audio/nature-sounds.mp3'
};

document.addEventListener('click', initAudioContext, { once: true });

function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

async function previewVoice() {
    const voiceSelector = document.getElementById('voiceSelector');
    const previewButton = document.querySelector('.preview-voice-btn');
    const selectedVoice = voiceSelector.value;

    if (currentPreview) {
        stopPreview();
        return;
    }

    if (!voiceSamples[selectedVoice]) {
        showToast('No preview available for this voice option');
        return;
    }

    try {
        previewButton.classList.add('playing');
        previewButton.innerHTML = '<i class="fas fa-stop"></i> Stop Preview<div class="preview-indicator"></div>';
        
        const response = await fetch(voiceSamples[selectedVoice]);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        currentPreview = audioContext.createBufferSource();
        currentPreview.buffer = audioBuffer;
        currentPreview.connect(audioContext.destination);
        
        currentPreview.onended = () => {
            stopPreview();
        };
        
        currentPreview.start();
    } catch (error) {
        console.error('Error playing preview:', error);
        showToast('Error playing preview');
        stopPreview();
    }
}

async function previewMusic() {
    const musicSelector = document.getElementById('musicSelector');
    const previewButton = document.querySelector('.music-selection .preview-voice-btn');
    const selectedMusic = musicSelector.value;
    const volumeRange = document.getElementById('volumeRange');

    if (currentPreview) {
        stopPreview();
        return;
    }

    if (!selectedMusic) {
        showToast('Please select a music option first');
        return;
    }

    try {
        previewButton.classList.add('playing');
        previewButton.innerHTML = '<i class="fas fa-stop"></i> Stop Preview<div class="preview-indicator"></div>';
        
        const response = await fetch(musicSamples[selectedMusic]);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        currentPreview = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        
        currentPreview.buffer = audioBuffer;
        currentPreview.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
      
        gainNode.gain.value = volumeRange.value / 100;
        
        currentPreview.onended = () => {
            stopPreview();
        };
        
        currentPreview.start();
        
       
        volumeRange.addEventListener('input', () => {
            gainNode.gain.value = volumeRange.value / 100;
        });
    } catch (error) {
        console.error('Error playing preview:', error);
        showToast('Error playing preview');
        stopPreview();
    }
}

function stopPreview() {
    if (currentPreview) {
        currentPreview.stop();
        currentPreview = null;
    }
    
  
    document.querySelectorAll('.preview-voice-btn').forEach(button => {
        button.classList.remove('playing');
        if (button.closest('.music-selection')) {
            button.innerHTML = '<i class="fas fa-play"></i> Preview Music<div class="preview-indicator"></div>';
        } else {
            button.innerHTML = '<i class="fas fa-play"></i> Preview Voice<div class="preview-indicator"></div>';
        }
    });
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }, 100);
}

function previewAITone() {
  const select = document.getElementById('aiToneSelector');
  const selectedOption = select.options[select.selectedIndex];
  if (!selectedOption.value) {
    alert('Please select a narrator first');
    return;
  }
  alert(`Preview of ${selectedOption.text}...`);
}

let storyboardGenerator;
let storyboardPlayer;
let currentStoryData = null;

document.addEventListener('DOMContentLoaded', function() {
    const createStoryForm = document.getElementById('createStoryForm');
    const createStoryModal = document.getElementById('createStoryModal');
    const progressModal = new bootstrap.Modal(document.getElementById('progressModal'));
    const previewModal = new bootstrap.Modal(document.getElementById('previewModal'));
    const progressBar = document.querySelector('.progress-bar');
    const progressText = document.querySelector('.progress-text');
    const generateAgainBtn = document.getElementById('generateAgain');
    const saveStoryBtn = document.getElementById('saveStory');
    
    // Initialize storyboard generator
    storyboardGenerator = new StoryboardGenerator();

  
    const previewImages = [
        '../images/Previews/animals.png',
        '../images/Previews/cloud.png',
        '../images/Previews/fruits.png',
        '../images/Previews/new_friends.png',
        '../images/Previews/shapes.png',
        '../images/Previews/toys.png'
    ];

   
    const storyThemes = [
        {
            title: 'Animal Adventures',
            description: 'Join our furry friends on an exciting journey through the magical forest, learning about different animals and their unique characteristics.'
        },
        {
            title: 'Weather Wonders',
            description: 'Explore the fascinating world of weather with Cloud the friendly cloud, discovering the magic of rain, sun, and rainbows.'
        },
        {
            title: 'Fruit Friends',
            description: 'Meet the colorful fruit friends in their garden, learning about healthy eating habits and the importance of sharing.'
        },
        {
            title: 'Making New Friends',
            description: 'Follow along as we learn about friendship, kindness, and the joy of making new friends in school.'
        },
        {
            title: 'Shape Squad',
            description: 'Join the Shape Squad on their mission to build a beautiful playground while learning about different shapes and colors.'
        },
        {
            title: 'Toy Box Tales',
            description: 'Discover the magical world inside a toy box where toys come to life and teach valuable lessons about teamwork.'
        }
    ];

    
    function resetForm() {
        // Don't reset API key as user might want to keep it
        // document.getElementById('googleApiKey').value = '';
        
        document.getElementById('storyPrompt').value = '';

        document.getElementById('voiceOption').selectedIndex = 0;

        document.getElementById('musicOption').selectedIndex = 0;

       
        const volumeRange = document.getElementById('volumeRange');
        if (volumeRange) {
            volumeRange.value = 50;
            const volumeValue = document.querySelector('.volume-value');
            if (volumeValue) {
                volumeValue.textContent = '50%';
            }
        }

 
        const defaultTiming = document.getElementById('bothTiming');
        if (defaultTiming) {
            defaultTiming.checked = true;
        }

        
        document.querySelectorAll('.question-type-checkbox').forEach(checkbox => {
            checkbox.checked = false;
            checkbox.disabled = false;
        });

       
        const studentInputs = document.querySelectorAll('.student-name-input');
        studentInputs.forEach((input, index) => {
            if (index === 0) {
                input.querySelector('input').value = '';
            } else {
                input.remove();
            }
        });
    }

  
    createStoryModal.addEventListener('hidden.bs.modal', function () {
        resetForm();
    });

   
    document.getElementById('previewModal').addEventListener('hidden.bs.modal', function () {
        resetForm();
    });

   
    function validateForm() {
        const apiKey = document.getElementById('storyApiKey').value.trim();
        const voiceOption = document.getElementById('voiceOption').value;
        const musicOption = document.getElementById('musicOption').value;
        const questionTiming = document.querySelector('input[name="questionTiming"]:checked');
        const questionTypes = document.querySelectorAll('.question-type-checkbox:checked');

        let errors = [];

        if (!apiKey) {
            errors.push('Please enter your API key');
        }

        if (!voiceOption) {
            errors.push('Please select a voice option');
        }

        if (!musicOption) {
            errors.push('Please select background music');
        }

        if (!questionTiming) {
            errors.push('Please select when to ask questions');
        }

        if (questionTypes.length === 0) {
            errors.push('Please select at least one question type');
        }

        if (errors.length > 0) {
            const errorMessage = errors.join('\\n');
            showValidationError(errorMessage);
            return false;
        }

        return true;
    }

    
    function showValidationError(message) {
        const errorToast = document.createElement('div');
        errorToast.className = 'validation-toast';
        errorToast.innerHTML = `
            <div class="validation-toast-header">
                <i class="fas fa-exclamation-circle"></i>
                <span>Please Complete Required Fields</span>
            </div>
            <div class="validation-toast-body">
                ${message.split('\\n').map(error => `<p>${error}</p>`).join('')}
            </div>
        `;
        document.body.appendChild(errorToast);

        setTimeout(() => {
            errorToast.classList.add('show');
            setTimeout(() => {
                errorToast.classList.remove('show');
                setTimeout(() => {
                    errorToast.remove();
                }, 300);
            }, 5000);
        }, 100);
    }

    createStoryForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        const apiKey = document.getElementById('storyApiKey').value.trim();
        const provider = document.getElementById('apiProvider').value;
        storyboardGenerator.setApiKey(apiKey, provider);
        
        progressModal.show();
        
        try {
            // Phase 1: Generate story
            updateProgress(10, 'Generating story...');
            const story = await storyboardGenerator.generateStory();
            
            // Phase 2: Generate character descriptions
            updateProgress(30, 'Creating character descriptions...');
            const characters = await storyboardGenerator.generateCharacterDescriptions();
            
            // Phase 3: Generate scene images
            updateProgress(50, 'Generating scene images...');
            const images = await storyboardGenerator.generateAllSceneImages((current, total) => {
                const imageProgress = 50 + (current / total) * 40;
                updateProgress(imageProgress, `Generating scene ${current} of ${total}...`);
            });
            
            updateProgress(100, 'Finalizing your story...');
            
            // Get complete story data
            currentStoryData = storyboardGenerator.getStoryData();
            
            setTimeout(() => {
                progressModal.hide();
                showStoryboardPreview();
            }, 500);
            
        } catch (error) {
            console.error('Error generating story:', error);
            progressModal.hide();
            showValidationError('Failed to generate story. Please check your API key and try again.');
        }
    });
    
    function updateProgress(percentage, text) {
        progressBar.style.width = percentage + '%';
        progressBar.setAttribute('aria-valuenow', percentage);
        progressText.textContent = text;
    }

    function showStoryboardPreview() {
        if (!currentStoryData) {
            console.error('No story data available for preview');
            return;
        }
        
        // Initialize storyboard player
        const playerContainer = document.getElementById('storyboardPlayerContainer');
        storyboardPlayer = new StoryboardPlayer(playerContainer);
        
        // Load the generated story data
        storyboardPlayer.loadStory(currentStoryData);
        
        // Show the preview modal
        previewModal.show();
    }

  
    let isPlaying = false;
    let isMuted = false;

    playPauseBtn.addEventListener('click', function() {
        isPlaying = !isPlaying;
        this.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
    });

    muteBtn.addEventListener('click', function() {
        isMuted = !isMuted;
        this.innerHTML = isMuted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
    });

    generateAgainBtn.addEventListener('click', async function() {
        previewModal.hide();
        
        if (storyboardPlayer) {
            storyboardPlayer.destroy();
            storyboardPlayer = null;
        }
        
        storyboardGenerator.reset();
        
        setTimeout(async () => {
            progressModal.show();
            updateProgress(0, 'Generating story elements...');
            
            try {
                const apiKey = document.getElementById('storyApiKey').value.trim();
                const provider = document.getElementById('apiProvider').value;
                storyboardGenerator.setApiKey(apiKey, provider);
                
                // Phase 1: Generate story
                updateProgress(10, 'Generating story...');
                const story = await storyboardGenerator.generateStory();
                
                // Phase 2: Generate character descriptions
                updateProgress(30, 'Creating character descriptions...');
                const characters = await storyboardGenerator.generateCharacterDescriptions();
                
                // Phase 3: Generate scene images
                updateProgress(50, 'Generating scene images...');
                const images = await storyboardGenerator.generateAllSceneImages((current, total) => {
                    const imageProgress = 50 + (current / total) * 40;
                    updateProgress(imageProgress, `Generating scene ${current} of ${total}...`);
                });
                
                updateProgress(100, 'Finalizing your story...');
                
                // Get complete story data
                currentStoryData = storyboardGenerator.getStoryData();
                
                setTimeout(() => {
                    progressModal.hide();
                    showStoryboardPreview();
                }, 500);
                
            } catch (error) {
                console.error('Error regenerating story:', error);
                progressModal.hide();
                showValidationError('Failed to regenerate story. Please try again.');
            }
        }, 500);
    });

    saveStoryBtn.addEventListener('click', function() {
        
        previewModal.hide();
        
       
        const successToast = document.createElement('div');
        successToast.className = 'validation-toast success-toast';
        successToast.innerHTML = `
            <div class="validation-toast-header">
                <i class="fas fa-check-circle"></i>
                <span>Story Saved Successfully</span>
            </div>
            <div class="validation-toast-body">
                <p>Your story has been saved and is ready to use!</p>
            </div>
        `;
        document.body.appendChild(successToast);

        setTimeout(() => {
            successToast.classList.add('show');
            setTimeout(() => {
                successToast.classList.remove('show');
                setTimeout(() => {
                    successToast.remove();
                }, 300);
            }, 3000);
        }, 100);

     
        resetForm();
    });
});