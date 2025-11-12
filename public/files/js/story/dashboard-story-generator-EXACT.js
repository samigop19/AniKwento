




let previewStoryData = null;
let currentPreviewScene = 1;




function hidePreviewModal() {
    const previewModal = document.getElementById('previewModal');
    if (!previewModal) return;

    previewModal.classList.remove('show');
    setTimeout(() => {
        previewModal.classList.add('hidden');
        document.body.style.overflow = '';
        previewStoryData = null;

        
        window.currentStoryData = null;

        
        const openBootstrapModals = document.querySelectorAll('.modal.show');
        if (openBootstrapModals.length > 0) {
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(backdrop => {
                backdrop.style.display = '';
            });
        }
    }, 300);
}


window.hidePreviewModal = hidePreviewModal;







function showStoryPreview(storyData) {
    if (typeof window.showPreviewModal === 'function') {
        window.showPreviewModal(storyData);
    } else {
        console.error('showPreviewModal not available from enhanced.js');
    }
}



function initializePreviewModal() {
    const previewModal = document.getElementById('previewModal');

    
    

    
    function handlePreviewKeydown(e) {
        console.log('🎮 Keydown event detected:', e.key);

        if (!previewModal) {
            console.log('❌ Preview modal not found');
            return;
        }

        if (!previewModal.classList.contains('show')) {
            console.log('❌ Preview modal not visible, classes:', previewModal.classList.toString());
            return;
        }

        console.log('✅ Preview modal is active, processing key:', e.key);

        
        const activeDot = document.querySelector('#previewTimelineDots .dot.active');
        const currentScene = activeDot ? parseInt(activeDot.dataset.scene) : 1;
        const totalScenes = document.querySelectorAll('#previewTimelineDots .dot').length;

        
        const storyData = window.currentStoryData || null;

        switch(e.key) {
            case 'Escape':
                console.log('🔥 Escape pressed - closing modal');
                
                const closeBtn = document.getElementById('previewModalClose');
                if (closeBtn) closeBtn.click();
                break;
            case 'ArrowLeft':
                console.log('⬅️ Left arrow pressed');
                e.preventDefault();
                if (currentScene > 1 && typeof window.showPreviewScene === 'function') {
                    console.log(`📖 Going to previous scene: ${currentScene - 1}`);
                    window.showPreviewScene(currentScene - 1, storyData);
                } else {
                    console.log('❌ Already at first scene or showPreviewScene not available');
                }
                break;
            case 'ArrowRight':
                console.log('➡️ Right arrow pressed');
                e.preventDefault();
                if (currentScene < totalScenes && typeof window.showPreviewScene === 'function') {
                    console.log(`📖 Going to next scene: ${currentScene + 1}`);
                    window.showPreviewScene(currentScene + 1, storyData);
                } else {
                    console.log('❌ Already at last scene or showPreviewScene not available');
                }
                break;
            case 'Home':
                e.preventDefault();
                if (typeof window.showPreviewScene === 'function') {
                    window.showPreviewScene(1, storyData);
                }
                break;
            case 'End':
                e.preventDefault();
                if (totalScenes > 0 && typeof window.showPreviewScene === 'function') {
                    window.showPreviewScene(totalScenes, storyData);
                }
                break;
            default:
                
                if (e.key >= '1' && e.key <= '9') {
                    e.preventDefault();
                    const sceneNumber = parseInt(e.key);
                    if (sceneNumber <= totalScenes && typeof window.showPreviewScene === 'function') {
                        window.showPreviewScene(sceneNumber, storyData);
                    }
                } else if (e.key === '0') {
                    e.preventDefault();
                    
                    if (totalScenes >= 10 && typeof window.showPreviewScene === 'function') {
                        window.showPreviewScene(10, storyData);
                    }
                }
                break;
        }
    }

    
    document.addEventListener('keydown', handlePreviewKeydown);

    
    if (previewModal) {
        previewModal.addEventListener('keydown', handlePreviewKeydown);
    }
}





document.addEventListener('DOMContentLoaded', function() {
    console.log('[EXACT.js] DOM loaded, initializing PREVIEW MODAL ONLY');

    
    
    

    console.log('[EXACT.js] Skipping createStoryBtn attachment to prevent duplicate generation');

    
    initializePreviewModal();

    console.log('[EXACT.js] Preview modal functionality initialized.');
});
