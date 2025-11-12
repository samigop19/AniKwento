// Preview Modal Helper Functions for Story Dashboard
// This file provides utility functions for the preview modal
// Main preview modal functionality is in dashboard-story-generation-enhanced.js

// Preview modal variables
let previewStoryData = null;
let currentPreviewScene = 1;

// NOTE: showPreviewModal is now handled by dashboard-story-generation-enhanced.js
// This prevents function overwriting and maintains enhanced.js as the main handler

function hidePreviewModal() {
    const previewModal = document.getElementById('previewModal');
    if (!previewModal) return;

    previewModal.classList.remove('show');
    setTimeout(() => {
        previewModal.classList.add('hidden');
        document.body.style.overflow = '';
        previewStoryData = null;

        // Clear window.currentStoryData when modal is closed
        window.currentStoryData = null;

        // Restore Bootstrap modal backdrops if any Bootstrap modals are still open
        const openBootstrapModals = document.querySelectorAll('.modal.show');
        if (openBootstrapModals.length > 0) {
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(backdrop => {
                backdrop.style.display = '';
            });
        }
    }, 300);
}

// Export to window for use by other scripts
window.hidePreviewModal = hidePreviewModal;

// NOTE: generateStoryTitle, updatePreviewModalContent, and loadPreviewScene
// are now handled in dashboard-story-generation-enhanced.js
// This prevents function duplication and maintains enhanced.js as the main handler

// Alias function to match the current call
// Uses the showPreviewModal from dashboard-story-generation-enhanced.js
function showStoryPreview(storyData) {
    if (typeof window.showPreviewModal === 'function') {
        window.showPreviewModal(storyData);
    } else {
        console.error('showPreviewModal not available from enhanced.js');
    }
}

// Enhanced preview modal initialization - Keyboard navigation only
// Button handlers are in dashboard-story-generation-enhanced.js
function initializePreviewModal() {
    const previewModal = document.getElementById('previewModal');

    // NOTE: Button handlers (close, continue, regenerate) are all handled in
    // dashboard-story-generation-enhanced.js to avoid duplication

    // Keyboard navigation for preview modal
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

        // Get current scene from the active dot
        const activeDot = document.querySelector('#previewTimelineDots .dot.active');
        const currentScene = activeDot ? parseInt(activeDot.dataset.scene) : 1;
        const totalScenes = document.querySelectorAll('#previewTimelineDots .dot').length;

        // Get story data from window if available (set by enhanced.js)
        const storyData = window.currentStoryData || null;

        switch(e.key) {
            case 'Escape':
                console.log('🔥 Escape pressed - closing modal');
                // Trigger the close button click (which uses enhanced.js handler)
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
                // Handle number keys 1-9 and 0 for scene 10
                if (e.key >= '1' && e.key <= '9') {
                    e.preventDefault();
                    const sceneNumber = parseInt(e.key);
                    if (sceneNumber <= totalScenes && typeof window.showPreviewScene === 'function') {
                        window.showPreviewScene(sceneNumber, storyData);
                    }
                } else if (e.key === '0') {
                    e.preventDefault();
                    // Key '0' jumps to scene 10 if it exists
                    if (totalScenes >= 10 && typeof window.showPreviewScene === 'function') {
                        window.showPreviewScene(10, storyData);
                    }
                }
                break;
        }
    }

    // Add keyboard event listeners to both document and modal
    document.addEventListener('keydown', handlePreviewKeydown);

    // Also add to modal itself when it gets focus
    if (previewModal) {
        previewModal.addEventListener('keydown', handlePreviewKeydown);
    }
}

// NOTE: generateStoryFromDashboard is now handled in dashboard-story-generation-enhanced.js
// This prevents function duplication and maintains enhanced.js as the main handler

// Initialize modal controls
document.addEventListener('DOMContentLoaded', function() {
    console.log('[EXACT.js] DOM loaded, initializing PREVIEW MODAL ONLY');

    // CRITICAL: DO NOT attach to createStoryBtn here!
    // The button is handled by dashboard-story-generation-enhanced.js
    // This file ONLY handles preview modal functionality

    console.log('[EXACT.js] Skipping createStoryBtn attachment to prevent duplicate generation');

    // Initialize enhanced preview modal functionality
    initializePreviewModal();

    console.log('[EXACT.js] Preview modal functionality initialized.');
});
