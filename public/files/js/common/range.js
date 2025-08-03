document.addEventListener('DOMContentLoaded', function() {
    const volumeRange = document.getElementById('volumeRange');
    const volumeValue = document.querySelector('.volume-value');

    function updateVolumeValue(value) {
        volumeValue.textContent = value + '%';
    }

    volumeRange.addEventListener('input', function() {
        updateVolumeValue(this.value);
    });

    volumeRange.addEventListener('change', function() {
        updateVolumeValue(this.value);
    });

    updateVolumeValue(volumeRange.value);

    const storyVolumeRange = document.querySelector('.create-story-modal #volumeRange');
    if (storyVolumeRange) {
        function updateStoryVolumeValue(value) {
            const volumeValue = storyVolumeRange.closest('.volume-control')?.querySelector('.volume-value');
            if (volumeValue) {
                volumeValue.textContent = value + '%';
            }
            
            const percent = (value - storyVolumeRange.min) / (storyVolumeRange.max - storyVolumeRange.min) * 100;
            storyVolumeRange.style.background = `linear-gradient(to right, var(--secondary-color) ${percent}%, rgba(255, 255, 255, 0.15) ${percent}%)`;
        }

        updateStoryVolumeValue(storyVolumeRange.value);

        storyVolumeRange.addEventListener('input', function() {
            updateStoryVolumeValue(this.value);
        });

        storyVolumeRange.addEventListener('change', function() {
            updateStoryVolumeValue(this.value);
        });
    }
});