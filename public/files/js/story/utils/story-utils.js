// Story Utility Functions
// Extracted from StoryDashboard.html for better organization

// Extract character names from story text
function extractCharacterNames(storyText) {
    const characterNames = new Set();
    const lines = storyText.split('\n');
    
    lines.forEach(line => {
        const charactersMatch = line.match(/\*\s*Characters in Scene:\s*(.+)/i);
        if (charactersMatch) {
            const charactersStr = charactersMatch[1];
            const characters = charactersStr.split(',').map(name => name.trim());
            characters.forEach(character => {
                if (character && character !== 'None' && character !== 'none') {
                    characterNames.add(character);
                }
            });
        }
    });
    
    return Array.from(characterNames);
}

// Extract characters in specific scene
function extractCharactersInScene(story, sceneNumber) {
    const scenePattern = new RegExp(`Scene\\s+${sceneNumber}[\\s\\S]*?\\*\\s*Characters in Scene:\\s*([^\\n*]+)`, 'i');
    const match = story.match(scenePattern);
    
    if (match) {
        const charactersLine = match[1].trim();
        const characters = charactersLine.split(',').map(name => name.trim()).filter(name => {
            return name && !name.toLowerCase().includes('narrator') && name.length > 0;
        });
        console.log(`🔍 Found characters in Scene ${sceneNumber}: ${characters.join(', ')}`);
        return characters;
    }
    
    console.warn(`⚠️ Could not find characters for Scene ${sceneNumber}, using all characters as fallback`);
    return extractCharacterNames(story);
}

// Extract scene narration from story data
function extractSceneNarration(storyText, sceneNumber) {
    const scenePattern = new RegExp(`Scene ${sceneNumber}[\\s\\S]*?\\* Narration/Dialogue: ([^\\n]+)`);
    const match = storyText.match(scenePattern);
    return match ? match[1].trim() : `Scene ${sceneNumber} narration`;
}

// Count scenes in story
function countScenes(storyText) {
    const sceneMatches = storyText.match(/Scene \d+/g);
    return sceneMatches ? sceneMatches.length : 0;
}

// Custom prompt handling for Step 1
function createCustomStoryPrompt(customPrompt) {
    if (!customPrompt || customPrompt.trim().length === 0) {
        console.log('📝 No custom prompt provided, using default');
        return null; // Return null so the workflow uses the default
    }

    // Get the original STEP1_STORY_PROMPT from the global scope (defined in StoryGenerate_Functions.js)
    if (typeof window.STEP1_STORY_PROMPT === 'undefined') {
        console.error('🚨 STEP1_STORY_PROMPT is not available globally');
        return null;
    }

    // Simply replace the diverse theme options section with the custom prompt
    const customizedPrompt = window.STEP1_STORY_PROMPT.replace(
        /DIVERSE THEME OPTIONS - Choose ONE different theme each time[^:]*:/,
        `CUSTOM THEME - Create a story specifically about: "${customPrompt}"`
    ).replace(
        /Write your complete 5-scene story now with a fresh, creative theme\./,
        `Write your complete 5-scene story now focusing specifically on: "${customPrompt}"`
    );

    console.log('📝 Using customized story prompt with user topic:', customPrompt);
    return customizedPrompt;
}

// Update progress bar
function updateProgressBar(percent, text) {
    const progressBar = document.querySelector('#progressModal .progress-bar');
    const progressText = document.querySelector('#progressModal .progress-text');
    
    if (progressBar && percent !== null) {
        progressBar.style.width = percent + '%';
        progressBar.setAttribute('aria-valuenow', percent);
    }
    
    if (progressText && text) {
        progressText.textContent = text;
    }
}

// Update status (used by StoryGenerate workflow)
function updateStatus(message) {
    updateProgressBar(null, message);
}

// Initialize story preview
function initializeStoryPreview(story) {
    console.log('Initializing story preview:', story);
    // Preview initialization logic here
}

// Update storyboard with generated content
function updateStoryboardWithGeneratedContent() {
    console.log('Updating storyboard with generated content');
    
    // Store the generated story data in sessionStorage for cross-page access
    sessionStorage.setItem('generatedStoryData', JSON.stringify(generatedStory));
    sessionStorage.setItem('storyTitle', generatedStory.title);
}

// Initialize story preview (duplicate removed)
function initializeStoryPreview(storyData) {
    console.log('Story Preview Data:', storyData);
    
    const previewTitle = document.querySelector('#previewModal .story-title');
    const scenesContainer = document.querySelector('#previewModal .scenes-container');
    
    if (previewTitle) {
        previewTitle.textContent = storyData.title || 'Story Preview';
    }
    
    if (scenesContainer && storyData.scenes) {
        scenesContainer.innerHTML = '';
        
        storyData.scenes.forEach((scene, index) => {
            const sceneElement = document.createElement('div');
            sceneElement.className = 'scene-preview';
            sceneElement.innerHTML = `
                <div class="scene-header">Scene ${scene.number || index + 1}</div>
                <div class="scene-image">
                    ${scene.imageUrl ? `<img src="${scene.imageUrl}" alt="Scene ${scene.number || index + 1}" loading="lazy">` : '<div class="no-image">No image available</div>'}
                </div>
                <div class="scene-narration">${scene.narration || 'No narration available'}</div>
            `;
            scenesContainer.appendChild(sceneElement);
        });
    }
}

// Update preview scene
function updatePreviewScene(sceneNumber, sceneData) {
    const sceneElement = document.querySelector(`[data-scene="${sceneNumber}"]`);
    
    if (sceneElement) {
        const imageElement = sceneElement.querySelector('.scene-image img');
        const narrationElement = sceneElement.querySelector('.scene-narration');
        
        if (imageElement && sceneData.imageUrl) {
            imageElement.src = sceneData.imageUrl;
        }
        
        if (narrationElement && sceneData.narration) {
            narrationElement.textContent = sceneData.narration;
        }
    }
}

// Preview go to scene
function previewGoToScene(sceneNumber) {
    const allScenes = document.querySelectorAll('.scene-preview');
    const targetScene = document.querySelector(`[data-scene="${sceneNumber}"]`);
    
    allScenes.forEach(scene => {
        scene.classList.remove('active');
    });
    
    if (targetScene) {
        targetScene.classList.add('active');
        targetScene.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
}

// Launch full player
function launchFullPlayer() {
    if (generatedStory && generatedStory.scenes && generatedStory.scenes.length > 0) {
        // Store story data in sessionStorage
        sessionStorage.setItem('generatedStoryData', JSON.stringify(generatedStory));
        sessionStorage.setItem('storyTitle', generatedStory.title);
        
        // Navigate to StoryPlayer
        window.location.href = '../story/StoryPlayer.html';
    } else {
        alert('Please generate a story first before launching the full player.');
    }
}

// View story function
function viewStory(event, storyId) {
    event.preventDefault();
    
    const sampleStories = {
        1: {
            title: "Learning Colors with Maya",
            scenes: [
                {
                    number: 1,
                    narration: "Maya discovers different colors in her classroom.",
                    imageUrl: "/Applications/MAMP/htdocs/AniKwento/public/files/images/Previews/new_friends.png"
                },
                {
                    number: 2,
                    narration: "She finds red apples and blue books.",
                    imageUrl: "/Applications/MAMP/htdocs/AniKwento/public/files/images/Previews/shapes.png"
                }
            ]
        }
    };
    
    const storyData = sampleStories[storyId];
    if (storyData) {
        generatedStory = storyData;
        showExistingStoryPreview(storyData);
    }
}

// Show existing story preview
function showExistingStoryPreview(storyData) {
    const previewModal = new bootstrap.Modal(document.getElementById('previewModal'));
    
    initializeStoryPreview(storyData);
    
    previewModal.show();
}

// Play story function
function playStory(imageUrl, title) {
    sessionStorage.setItem('currentStoryImage', imageUrl);
    sessionStorage.setItem('storyTitle', title);
    window.location.href = '../story/StoryPlayer.html';
}

// Make functions available globally for onclick handlers
window.viewStory = viewStory;
window.launchFullPlayer = launchFullPlayer;
window.initializeStoryPreview = initializeStoryPreview;