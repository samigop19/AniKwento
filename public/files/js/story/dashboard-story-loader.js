


document.addEventListener('DOMContentLoaded', function() {
    console.log('📚 Story Dashboard Loader initialized');
    loadUserStories();
});


async function loadUserStories() {
    console.log('📚 Loading user stories...');

    const storyGrid = document.querySelector('.story-grid');
    if (!storyGrid) {
        console.error('❌ Story grid container not found');
        return;
    }

    try {
        
        showLoadingState(storyGrid);

        
        const response = await fetch('/source/handlers/get_user_stories.php', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to load stories');
        }

        console.log('✅ Loaded stories:', data);

        
        clearLoadingState(storyGrid);

        
        displayStories(data.stories, storyGrid);

    } catch (error) {
        console.error('❌ Error loading stories:', error);

        
        clearLoadingState(storyGrid);
        showErrorState(storyGrid, error.message);
    }
}


function showLoadingState(container) {
    
    const loadingHTML = `
        <div class="loading-stories">
            <i class="fas fa-spinner fa-spin fa-3x mb-3" style="color: #801B32;"></i>
            <p style="color: #666; font-size: 16px;">Loading your stories...</p>
        </div>
    `;

    
    const addNewBtn = container.querySelector('.add-new');

    
    const cards = container.querySelectorAll('.story-card:not([data-sample])');
    cards.forEach(card => card.remove());

    
    if (addNewBtn) {
        addNewBtn.insertAdjacentHTML('beforebegin', loadingHTML);
    } else {
        container.insertAdjacentHTML('beforeend', loadingHTML);
    }
}


function clearLoadingState(container) {
    const loadingElement = container.querySelector('.loading-stories');
    if (loadingElement) {
        loadingElement.remove();
    }
}


function showErrorState(container, errorMessage) {
    const errorHTML = `
        <div class="error-stories" style="grid-column: 1 / -1; text-align: center; padding: 40px 20px;">
            <i class="fas fa-exclamation-triangle fa-3x mb-3" style="color: #DC2626;"></i>
            <p style="color: #666; font-size: 16px; margin-bottom: 10px;">Failed to load stories</p>
            <p style="color: #999; font-size: 14px;">${errorMessage}</p>
            <button class="btn btn-primary mt-3" onclick="loadUserStories()">
                <i class="fas fa-sync-alt"></i> Try Again
            </button>
        </div>
    `;

    const addNewBtn = container.querySelector('.add-new');
    if (addNewBtn) {
        addNewBtn.insertAdjacentHTML('beforebegin', errorHTML);
    } else {
        container.insertAdjacentHTML('beforeend', errorHTML);
    }
}


function displayStories(stories, container) {
    console.log(`📚 Displaying ${stories.length} stories`);

    
    const sampleCard = container.querySelector('.story-card[data-bs-target="#story1Modal"]');
    if (sampleCard) {
        sampleCard.remove();
    }

    if (stories.length === 0) {
        
        const emptyHTML = `
            <div class="empty-stories" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                <h4 style="color: #999; font-size: 18px;">No Stories Yet</h4>
            </div>
        `;

        const addNewBtn = container.querySelector('.add-new');
        if (addNewBtn) {
            addNewBtn.insertAdjacentHTML('afterend', emptyHTML);
        } else {
            container.insertAdjacentHTML('beforeend', emptyHTML);
        }
        return;
    }

    
    const addNewBtn = container.querySelector('.add-new');

    
    const storyCardsHTML = stories.map(story => createStoryCard(story)).join('');

    
    if (addNewBtn) {
        addNewBtn.insertAdjacentHTML('afterend', storyCardsHTML);
    } else {
        container.insertAdjacentHTML('beforeend', storyCardsHTML);
    }

    console.log('✅ Stories displayed successfully');
}


function createStoryCard(story) {
    const modalId = `story${story.id}Modal`;
    const thumbnailUrl = story.thumbnail_url || '../../../public/files/images/story1.png';
    const title = story.title || 'Untitled Story';
    const theme = story.theme || 'General';
    const sceneCount = story.total_scenes || 10;
    const playCount = story.play_count || 0;
    const hasGamification = story.has_gamification;

    
    const createdDate = new Date(story.created_at);
    const formattedDate = createdDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    return `
        <div class="story-card card" data-bs-toggle="modal" data-bs-target="#${modalId}" data-story-id="${story.id}">
            <img src="${thumbnailUrl}" class="card-img-top" alt="${title}" onerror="this.src='../../../public/files/images/story1.png'">
            <div class="card-body">
                <h4 class="card-title">${title}</h4>
                <div class="learning-tags">
                    <span class="tag">📖 ${theme}</span>
                    <span class="tag">🎬 ${sceneCount} Scenes</span>
                    ${hasGamification ? '<span class="tag">🎮 Quiz</span>' : ''}
                </div>
                <div class="story-meta" style="margin-top: 10px; font-size: 12px; color: #888;">
                    <i class="fas fa-calendar-alt"></i> ${formattedDate}
                    ${playCount > 0 ? `<span style="margin-left: 10px;"><i class="fas fa-play-circle"></i> ${playCount}</span>` : ''}
                </div>
            </div>
            <div class="story-actions">
                <button class="btn btn-link" onclick="event.stopPropagation(); deleteStory(${story.id})">
                    <img src="../../../public/files/images/delete.png" alt="Delete">
                </button>
                <button class="btn btn-link" onclick="event.stopPropagation(); shareStory(${story.id})">
                    <img src="../../../public/files/images/download.png" alt="Download">
                </button>
                <button class="btn btn-success" onclick="event.stopPropagation(); playStoryById(${story.id})" title="View Story">
                    <img src="../../../public/files/images/play.png" alt="Play">
                </button>
            </div>
        </div>

        <!-- Story Detail Modal -->
        <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}Label" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <button type="button" class="btn-close position-absolute end-0 top-0 m-3" data-bs-dismiss="modal" aria-label="Close" style="z-index: 1;"></button>
                    <div class="modal-body">
                        <img src="${thumbnailUrl}" class="modal-story-image" alt="${title}" loading="lazy" onerror="this.src='../../../public/files/images/story1.png'">
                        <div class="modal-story-content">
                            <h5 id="${modalId}Label">${title}</h5>
                            <div class="modal-learning-tags" role="list" aria-label="Story information">
                                <span class="modal-tag" role="listitem">
                                    <span class="tag-icon" aria-hidden="true">📖</span>
                                    <span class="tag-text">${theme}</span>
                                </span>
                                <span class="modal-tag" role="listitem">
                                    <span class="tag-icon" aria-hidden="true">🎬</span>
                                    <span class="tag-text">${sceneCount} Scenes</span>
                                </span>
                                ${hasGamification ? `
                                <span class="modal-tag" role="listitem">
                                    <span class="tag-icon" aria-hidden="true">🎮</span>
                                    <span class="tag-text">Interactive Quiz</span>
                                </span>
                                ` : ''}
                            </div>
                            <p style="color: #666; margin-top: 15px;">
                                Created on ${formattedDate} •
                                ${story.selected_voice ? `Voice: ${story.selected_voice}` : 'Default Voice'}
                            </p>
                            <div class="modal-actions">
                                <button class="btn btn-danger" aria-label="Delete story" onclick="deleteStory(${story.id})">
                                    <img src="../../../public/files/images/delete.png" alt="" aria-hidden="true">
                                    <span>Delete</span>
                                </button>
                                <button class="btn btn-primary" aria-label="Download story" onclick="shareStory(${story.id})">
                                    <img src="../../../public/files/images/download.png" alt="" aria-hidden="true">
                                    <span>Download</span>
                                </button>
                                <button class="btn btn-success" aria-label="Play story" onclick="playStoryById(${story.id})">
                                    <img src="../../../public/files/images/play.png" alt="" aria-hidden="true">
                                    <span>Play</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}


async function playStoryById(storyId) {
    console.log('▶️ Playing story ID:', storyId);

    try {
        
        const response = await fetch(`/source/handlers/get_story_detail.php?story_id=${storyId}`);

        if (!response.ok) {
            throw new Error('Failed to load story details');
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to load story');
        }

        
        sessionStorage.setItem('currentStory', JSON.stringify(data.story));
        window.location.href = '/storyboard';

    } catch (error) {
        console.error('❌ Error playing story:', error);

        if (typeof notificationSystem !== 'undefined') {
            notificationSystem.error('Failed to load story: ' + error.message);
        } else {
            alert('Failed to load story: ' + error.message);
        }
    }
}


async function deleteStory(storyId) {
    if (!confirm('Are you sure you want to delete this story? This action cannot be undone.')) {
        return;
    }

    console.log('🗑️ Deleting story ID:', storyId);

    
    const storyCard = document.querySelector(`.story-card[data-story-id="${storyId}"]`);
    const deleteButtons = document.querySelectorAll(`[onclick*="deleteStory(${storyId})"]`);

    
    deleteButtons.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.6';
        btn.style.cursor = 'not-allowed';
    });

    
    if (storyCard) {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'delete-loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="delete-spinner-container">
                <div class="delete-spinner"></div>
                <p style="color: #801B32; margin-top: 10px; font-weight: 600;">Deleting...</p>
            </div>
        `;
        storyCard.style.position = 'relative';
        storyCard.appendChild(loadingOverlay);
    }

    try {
        const response = await fetch('/source/handlers/delete_story.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ story_id: storyId })
        });

        if (!response.ok) {
            throw new Error('Failed to delete story');
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to delete story');
        }

        console.log('✅ Story deleted successfully');

        if (typeof notificationSystem !== 'undefined') {
            notificationSystem.success('Story deleted successfully');
        } else {
            alert('Story deleted successfully');
        }

        
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        });

        
        setTimeout(() => {
            loadUserStories();
        }, 300);

    } catch (error) {
        console.error('❌ Error deleting story:', error);

        
        if (storyCard) {
            const overlay = storyCard.querySelector('.delete-loading-overlay');
            if (overlay) {
                overlay.remove();
            }
        }

        
        deleteButtons.forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        });

        if (typeof notificationSystem !== 'undefined') {
            notificationSystem.error('Failed to delete story: ' + error.message);
        } else {
            alert('Failed to delete story: ' + error.message);
        }
    }
}


async function shareStory(storyId) {
    console.log('🔗 Sharing story ID:', storyId);

    try {
        const response = await fetch('/source/handlers/generate_share_token.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ story_id: storyId })
        });

        if (!response.ok) {
            throw new Error('Failed to generate share link');
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to generate share link');
        }

        
        const shareUrl = `${window.location.origin}/source/pages/storyboard/StoryPlayer.html?share=${data.token}`;

        
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(shareUrl);

            if (typeof notificationSystem !== 'undefined') {
                notificationSystem.success('Share link copied to clipboard!');
            } else {
                alert('Share link copied to clipboard:\n' + shareUrl);
            }
        } else {
            
            prompt('Copy this share link:', shareUrl);
        }

        console.log('✅ Share link generated:', shareUrl);

    } catch (error) {
        console.error('❌ Error sharing story:', error);

        if (typeof notificationSystem !== 'undefined') {
            notificationSystem.error('Failed to generate share link: ' + error.message);
        } else {
            alert('Failed to generate share link: ' + error.message);
        }
    }
}


window.loadUserStories = loadUserStories;
window.playStoryById = playStoryById;
window.deleteStory = deleteStory;
window.shareStory = shareStory;
