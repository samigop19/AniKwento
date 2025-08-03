document.addEventListener('DOMContentLoaded', function() {
    const storyCards = document.querySelectorAll('.story-card');
    const studentNamesContainer = document.querySelector('.student-names-container');
    const createStoryModal = document.getElementById('createStoryModal');
    const progressModal = document.getElementById('progressModal');
    const previewModal = document.getElementById('previewModal');
    const progressBar = document.querySelector('.progress-bar');
    const progressText = document.querySelector('.progress-text');
    const previewImage = document.getElementById('previewImage');
    const storyTitle = document.querySelector('.story-title');
    const storyDescription = document.querySelector('.story-description');
    const generateAgainBtn = document.getElementById('generateAgain');
    const saveStoryBtn = document.getElementById('saveStory');
    const playPauseBtn = document.getElementById('previewPlayPause');
    const muteBtn = document.getElementById('previewMute');
    const recordVoiceBtn = document.getElementById('recordVoiceBtn');
    const recordingControls = document.getElementById('recordingControls');
    const voiceSelect = document.getElementById('voiceOption');

    let isPlaying = false;
    let isMuted = false;
    let isRecording = false;
    let recordingTime = 0;
    let timerInterval;

    storyCards.forEach(card => {
        card.addEventListener('click', function(e) {
            if (!e.target.closest('.story-actions')) {
                const modalId = this.dataset.bsTarget;
                const modal = new bootstrap.Modal(document.querySelector(modalId));
                modal.show();
            }
        });
    });

    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        const deleteBtn = modal.querySelector('.btn-danger');
        const downloadBtn = modal.querySelector('.btn-primary');
        const playBtn = modal.querySelector('.btn-success');

        modal.addEventListener('hidden.bs.modal', function() {
            document.body.classList.remove('modal-open');
            
            const modalBackdrops = document.getElementsByClassName('modal-backdrop');
            if (modalBackdrops.length > 0) {
                modalBackdrops[0].style.transition = 'opacity 0.15s linear';
                modalBackdrops[0].style.opacity = '0';
                setTimeout(() => {
                    modalBackdrops[0].remove();
                }, 150);
            }
        });

        deleteBtn?.addEventListener('click', function() {
            if (confirm('Are you sure you want to delete this story?')) {
                const currentModal = bootstrap.Modal.getInstance(modal);
                currentModal.hide();
            }
        });

        downloadBtn?.addEventListener('click', function() {});

        playBtn?.addEventListener('click', function() {});
    });

    if (recordVoiceBtn && recordingControls && voiceSelect) {
        recordVoiceBtn.addEventListener('click', function() {
            recordingControls.style.display = 'block';
            voiceSelect.value = '';
            recordVoiceBtn.classList.add('recording');
        });
    }

    if (recordBtn) {
        recordBtn.addEventListener('click', function() {
            if (!isRecording) {
                startRecording();
            } else {
                stopRecording();
            }
        });
    }

    function startRecording() {
        isRecording = true;
        recordBtn.classList.add('recording');
        recordStatus.textContent = 'Recording in progress...';
        startTimer();
    }

    function stopRecording() {
        isRecording = false;
        recordBtn.classList.remove('recording');
        recordStatus.textContent = 'Recording saved';
        stopTimer();
    }

    function startTimer() {
        recordingTime = 0;
        timerInterval = setInterval(() => {
            recordingTime++;
            const minutes = Math.floor(recordingTime / 60);
            const seconds = recordingTime % 60;
            recordTimer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    function stopTimer() {
        clearInterval(timerInterval);
    }

    if (studentNamesContainer) {
        document.querySelector('.btn-add-student')?.addEventListener('click', function() {
            const inputGroup = document.createElement('div');
            inputGroup.className = 'student-name-input-group';
            
            inputGroup.innerHTML = `
                <input type="text" class="form-control form-control-sm" 
                       placeholder="Enter student name" 
                       maxlength="40">
                <button type="button" class="btn btn-sm btn-remove-student">
                    <i class="fas fa-minus"></i>
                </button>
            `;
            
            studentNamesContainer.appendChild(inputGroup);
            
            inputGroup.querySelector('.btn-remove-student').addEventListener('click', function() {
                inputGroup.remove();
            });
        });
    }

    function showProgressModal() {
        const progressModal = new bootstrap.Modal(document.getElementById('progressModal'));
        progressModal.show();
        simulateProgress();
    }

    function simulateProgress() {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                setTimeout(() => {
                    const progressModalInstance = bootstrap.Modal.getInstance(progressModal);
                    progressModalInstance.hide();
                    showPreviewModal();
                }, 500);
            }
            progressBar.style.width = `${progress}%`;
            progressBar.setAttribute('aria-valuenow', progress);
            updateProgressText(progress);
        }, 500);
    }

    function updateProgressText(progress) {
        const messages = [
            'Crafting your magical story...',
            'Adding colorful illustrations...',
            'Sprinkling some fairy dust...',
            'Almost ready for the adventure!'
        ];
        const index = Math.floor((progress / 100) * messages.length);
        progressText.textContent = messages[Math.min(index, messages.length - 1)];
    }

    function showPreviewModal() {
        const previewModal = new bootstrap.Modal(document.getElementById('previewModal'));
        previewModal.show();
    }

    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', () => {
            isPlaying = !isPlaying;
            playPauseBtn.innerHTML = isPlaying ? 
                '<i class="fas fa-pause"></i>' : 
                '<i class="fas fa-play"></i>';
        });
    }

    if (muteBtn) {
        muteBtn.addEventListener('click', () => {
            isMuted = !isMuted;
            muteBtn.innerHTML = isMuted ? 
                '<i class="fas fa-volume-mute"></i>' : 
                '<i class="fas fa-volume-up"></i>';
        });
    }

    if (generateAgainBtn) {
        generateAgainBtn.addEventListener('click', () => {
            const previewModalInstance = bootstrap.Modal.getInstance(previewModal);
            previewModalInstance.hide();
            showProgressModal();
        });
    }

    if (saveStoryBtn) {
        saveStoryBtn.addEventListener('click', () => {
            const previewModalInstance = bootstrap.Modal.getInstance(previewModal);
            previewModalInstance.hide();
            showSuccessToast();
        });
    }

    function showSuccessToast() {
        const toast = document.createElement('div');
        toast.className = 'validation-toast success-toast';
        toast.innerHTML = `
            <div class="validation-toast-header">
                <i class="fas fa-check-circle"></i>
                <span>Success!</span>
            </div>
            <div class="validation-toast-body">
                <p>Your story has been saved successfully.</p>
            </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
});
