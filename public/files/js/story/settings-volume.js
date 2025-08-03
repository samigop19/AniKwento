document.addEventListener('DOMContentLoaded', function() {
    const musicVolumeRange = document.getElementById('musicVolumeRange');
    const musicVolumeValue = document.getElementById('musicVolumeValue');

    if (musicVolumeRange && musicVolumeValue) {
        function updateMusicVolumeValue(value) {
            musicVolumeValue.textContent = value + '%';
            musicVolumeRange.style.setProperty('--value', value + '%');
        }

        musicVolumeRange.addEventListener('input', function() {
            updateMusicVolumeValue(this.value);
        });

        musicVolumeRange.addEventListener('change', function() {
            updateMusicVolumeValue(this.value);
        });

        updateMusicVolumeValue(musicVolumeRange.value);
    }
}); 