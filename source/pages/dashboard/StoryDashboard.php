<?php
// Load user information from session
require_once $_SERVER['DOCUMENT_ROOT'] . '/source/handlers/get_user_info.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Stories - AniKwento</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="../../../public/files/css/StoryDashboard.css?v=2.4">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <button class="mobile-menu-toggle">
        <i class="fas fa-bars"></i>
    </button>
    <div class="dashboard">
        <header class="header">
            <div class="header-content">
                <h3 class="mb-4">Teacher <?php echo $user_first_name; ?></h3>
                <nav>
                    <ul class="nav flex-column">
                        <li class="nav-item">
                            <a href="/source/pages/dashboard/StoryDashboard.php" class="nav-link active">
                                <img src="../../../public/files/images/StoryIC.png" class="icon" alt="">
                                <span>My Stories</span>
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="/source/pages/dashboard/TeacherProfile.php" class="nav-link">
                                <i class="far fa-user-circle icon"></i>
                                <span>My Profile</span>
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="/source/pages/dashboard/SettingsDashboard.php" class="nav-link">
                                <img src="../../../public/files/images/SettingIC.png" class="icon" alt="">
                                <span>Settings</span>
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="/source/pages/dashboard/StoryHelp.php" class="nav-link">
                                <img src="../../../public/files/images/HelpIC.png" class="icon" alt="">
                                <span>Help</span>
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="/source/handlers/logout_process.php" class="nav-link">
                                <img src="../../../public/files/images/LogoutIC.png" class="icon" alt="">
                                <span>Logout</span>
                            </a>
                        </li>
                    </ul>
                </nav>
                <img src="../../../public/files/images/AKlogo.png" alt="AniKwento Logo" class="footer-logo">
            </div>
        </header>
        <main class="main">
            <div class="container-fluid">
                <div class="story-grid">
                    <!-- Add new story button -->
                    <div class="add-new" data-bs-toggle="modal" data-bs-target="#createStoryModal">
                        <span class="plus-icon">+</span>
                    </div>
                    <!-- Single placeholder story card for design reference - will be removed when real stories load -->
                    <div class="story-card card" data-bs-toggle="modal" data-bs-target="#story1Modal" data-sample="true">
                        <img src="../../../public/files/images/story1.png" class="card-img-top" alt="Story 1">
                        <div class="card-body">
                            <h4 class="card-title">Sample Story</h4>
                            <div class="learning-tags">
                                <span class="tag">🎨 Colors</span>
                                <span class="tag">👥 Friendship</span>
                                <span class="tag">🚂 Transportation</span>
                            </div>
                        </div>
                        <div class="story-actions">
                            <button class="btn btn-link" onclick="event.stopPropagation()"><img src="../../../public/files/images/delete.png" alt="Delete"></button>
                            <button class="btn btn-link" onclick="event.stopPropagation()"><img src="../../../public/files/images/download.png" alt="Download"></button>
                            <button class="btn btn-success" title="View Story">
                                <img src="../../../public/files/images/play.png" alt="Play">
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
    
    <!-- Sample story modal for design reference -->
    <div class="modal fade" id="story1Modal" tabindex="-1" aria-labelledby="story1ModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <button type="button" class="btn-close position-absolute end-0 top-0 m-3" data-bs-dismiss="modal" aria-label="Close" style="z-index: 1;"></button>
                <div class="modal-body">
                    <img src="../../../public/files/images/story1.png" class="modal-story-image" alt="Colorful train traveling through a mountain landscape with rainbow carriages" loading="lazy">
                    <div class="modal-story-content">
                        <h5 id="story1ModalLabel">Sample Story (Design Reference)</h5>
                        <div class="modal-learning-tags" role="list" aria-label="Story learning topics">
                            <span class="modal-tag" role="listitem">
                                <span class="tag-icon" aria-hidden="true">🎨</span>
                                <span class="tag-text">Colors</span>
                            </span>
                            <span class="modal-tag" role="listitem">
                                <span class="tag-icon" aria-hidden="true">👥</span>
                                <span class="tag-text">Friendship</span>
                            </span>
                            <span class="modal-tag" role="listitem">
                                <span class="tag-icon" aria-hidden="true">🚂</span>
                                <span class="tag-text">Transportation</span>
                            </span>
                        </div>
                        <p>This is a sample story card for design reference. Real stories will be loaded dynamically from the database.</p>
                        <div class="modal-actions">
                            <button class="btn btn-danger" aria-label="Delete story" disabled>
                                <img src="../../../public/files/images/delete.png" alt="" aria-hidden="true">
                                <span>Delete</span>
                            </button>
                            <button class="btn btn-primary" aria-label="Download story" disabled>
                                <img src="../../../public/files/images/download.png" alt="" aria-hidden="true">
                                <span>Download</span>
                            </button>
                            <button class="btn btn-success" aria-label="Play story" disabled>
                                <img src="../../../public/files/images/play.png" alt="" aria-hidden="true">
                                <span>Play</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <!-- Browser Compatibility Warning Modal -->
    <div class="modal fade" id="browserWarningModal" tabindex="-1" aria-labelledby="browserWarningModalLabel" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content" style="border: 3px solid #dc3545; border-radius: 15px;">
                <div class="modal-header" style="background: linear-gradient(135deg, #dc3545, #c82333); color: white; border-radius: 12px 12px 0 0;">
                    <h5 class="modal-title" id="browserWarningModalLabel">
                        <i class="fas fa-exclamation-triangle"></i> Browser Storage Blocked
                    </h5>
                </div>
                <div class="modal-body" style="padding: 30px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <i class="fas fa-database" style="font-size: 60px; color: #dc3545; opacity: 0.3;"></i>
                    </div>
                    <h6 style="color: #dc3545; font-weight: 600; margin-bottom: 15px;">Story Creation Disabled</h6>
                    <p style="margin-bottom: 20px;">Your browser is blocking IndexedDB, which is required to save stories with audio. Story creation is temporarily disabled.</p>

                    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <h6 style="color: #856404; font-weight: 600; margin-bottom: 10px;">
                            <i class="fas fa-lightbulb"></i> How to Fix (Brave Browser):
                        </h6>
                        <ol style="color: #856404; margin-bottom: 0; padding-left: 20px; font-size: 14px;">
                            <li>Click the <strong>Brave Shields</strong> icon (🦁 lion) in the address bar</li>
                            <li>Click <strong>"Advanced View"</strong> or <strong>"Advanced Controls"</strong></li>
                            <li>Find <strong>"Block Fingerprinting"</strong> setting</li>
                            <li>Change it to <strong>"Allow all fingerprinting"</strong> or <strong>"Standard"</strong></li>
                            <li>Click <strong>"Refresh"</strong> button below</li>
                        </ol>
                    </div>

                    <div style="background: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                        <h6 style="color: #0c5460; font-weight: 600; margin-bottom: 5px;">
                            <i class="fas fa-info-circle"></i> Alternative Solution:
                        </h6>
                        <p style="color: #0c5460; margin-bottom: 0; font-size: 14px;">
                            Use <strong>Safari, Chrome, or Firefox</strong> for the best experience.
                        </p>
                    </div>
                </div>
                <div class="modal-footer" style="justify-content: space-between;">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary" onclick="location.reload()">
                        <i class="fas fa-sync-alt"></i> Refresh Page
                    </button>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="createStoryModal" tabindex="-1" aria-labelledby="createStoryModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-scrollable modal-lg">
            <div class="modal-content create-story-modal">
                <button type="button" class="btn-close position-absolute end-0 top-0 m-3" data-bs-dismiss="modal" aria-label="Close" style="z-index: 1;"></button>
                <div class="modal-body">
                    <div class="modal-story-content">
                        <h5>Create New Story</h5>
                        <div id="createStoryForm">
                            <div class="story-prompt-section">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <label for="storyPrompt" class="form-label mb-0">Story Prompt (Optional)</label>
                                    <div class="d-flex align-items-center gap-3">
                                        <span id="themeCharCounter" class="small" style="color: white;">0/500</span>
                                        <button type="button" class="btn btn-sm btn-new-ideas" onclick="refreshPromptSuggestions()">
                                            <i class="fas fa-sync-alt"></i> New Ideas
                                        </button>
                                    </div>
                                </div>
                                <textarea class="form-control" id="storyPrompt" placeholder="Leave blank to generate a random story, or describe what you'd like the story to be about..." autocomplete="off" maxlength="500"></textarea>
                                <div class="story-suggestions">
                                    <p class="suggestions-title">
                                        <i class="fas fa-sparkles" style="color: #FFD700; margin-right: 5px;"></i>
                                        AI-Generated Story Ideas:
                                    </p>
                                    <div class="suggestion-chips" id="suggestionChips">
                                        <div style="grid-column: 1 / -1; text-align: center; padding: 30px 20px; color: white;">
                                            <i class="fas fa-sparkles fa-2x mb-3" style="animation: pulse 1.5s ease-in-out infinite; color: #FFD700;"></i>
                                            <p style="margin: 0; font-size: 14px; color: white;">Loading theme ideas...</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="settings-grid">
                                <div class="settings-section student-names-section">
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <h6 class="section-title mb-0">Characters (Optional) - <span id="characterCount">1/5</span></h6>
                                        <div class="dropdown">
                                            <button type="button" class="add-student-btn dropdown-toggle" id="addCharacterDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                                                <i class="fas fa-plus"></i>
                                            </button>
                                            <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="addCharacterDropdown">
                                                <li><a class="dropdown-item" href="#" id="addStudentOption"><i class="fas fa-user"></i> Add Student</a></li>
                                                <li><a class="dropdown-item" href="#" id="addPetOption"><i class="fas fa-paw"></i> Add Pet</a></li>
                                            </ul>
                                        </div>
                                    </div>
                                    <div class="character-inputs-container" id="characterInputsContainer">
                                        <div class="row g-3" id="studentsGrid">
                                            <div class="col-md-6 student-field" data-student="1" data-character-type="student">
                                                <label class="form-label fw-semibold">Student 1</label>
                                                <input type="hidden" id="character1Type" value="student">
                                                <div class="mb-2">
                                                    <input
                                                        type="text"
                                                        id="character1Name"
                                                        class="form-control student-name-input"
                                                        placeholder="Student name"
                                                        maxlength="20"
                                                        autocomplete="off"
                                                    >
                                                </div>
                                                <select id="character1Gender" class="form-select student-gender-select" autocomplete="off">
                                                    <option value="">Gender</option>
                                                    <option value="boy">Boy</option>
                                                    <option value="girl">Girl</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="settings-section voice-section">
                                    <h6 class="section-title">Storyteller Voice</h6>
                                    <div class="voice-control">
                                        <select class="form-select" id="voiceOption" autocomplete="off">
                                            <option value="" disabled selected>Select Storyteller Voice</option>
                                            <option value="Rachel">Rachel - Calm & Gentle Storyteller</option>
                                            <option value="Amara">Amara - Warm & Engaging Narrator</option>
                                            <option value="Lily">Lily - Friendly & Expressive Voice</option>
                                        </select>
                                        <button type="button" class="voice-preview-btn" id="voicePreviewBtn" style="display: none;">
                                            <i class="fas fa-play" id="voicePreviewIcon"></i>
                                            <span id="voicePreviewText">Preview</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                                <div class="settings-section gamification-section" style="grid-column: 1 / -1;">
                                    <h6 class="section-title">Gamification</h6>
                                    <div class="row g-4">
                                        <div class="col-md-4">
                                            <div class="timing-options">
                                                <label class="form-label fw-semibold mb-3">When to Ask Questions</label>
                                                <div class="form-check">
                                                    <input class="form-check-input" type="radio" name="questionTiming" id="noneQuestions" value="none" checked>
                                                    <label class="form-check-label" for="noneQuestions">
                                                        None
                                                    </label>
                                                </div>
                                                <div class="form-check">
                                                    <input class="form-check-input" type="radio" name="questionTiming" id="duringStory" value="during">
                                                    <label class="form-check-label" for="duringStory">
                                                        During Story
                                                    </label>
                                                </div>
                                                <div class="form-check">
                                                    <input class="form-check-input" type="radio" name="questionTiming" id="afterStory" value="after">
                                                    <label class="form-check-label" for="afterStory">
                                                        After Story
                                                    </label>
                                                </div>
                                                <div class="form-check">
                                                    <input class="form-check-input" type="radio" name="questionTiming" id="bothTiming" value="both">
                                                    <label class="form-check-label" for="bothTiming">
                                                        Both
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-md-8">
                                            <div class="question-types">
                                                <label class="form-label fw-semibold mb-3">Question Types <span class="limit-indicator" id="selectionCounter">(Select up to 2) - 0/2 selected</span></label>
                                                <div class="row g-2">
                                                    <div class="col-md-6">
                                                        <div class="form-check">
                                                            <input class="form-check-input question-type-checkbox" type="checkbox" name="questionTypes" value="Color Recognition" id="colorRecognition">
                                                            <label class="form-check-label" for="colorRecognition">
                                                                <i class="fas fa-palette"></i> Color Recognition
                                                            </label>
                                                        </div>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <div class="form-check">
                                                            <input class="form-check-input question-type-checkbox" type="checkbox" name="questionTypes" value="Shape Matching" id="shapeMatching">
                                                            <label class="form-check-label" for="shapeMatching">
                                                                <i class="fas fa-shapes"></i> Shape Matching
                                                            </label>
                                                        </div>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <div class="form-check">
                                                            <input class="form-check-input question-type-checkbox" type="checkbox" name="questionTypes" value="Number Counting" id="numberCounting">
                                                            <label class="form-check-label" for="numberCounting">
                                                                <i class="fas fa-sort-numeric-up"></i> Number Counting
                                                            </label>
                                                        </div>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <div class="form-check">
                                                            <input class="form-check-input question-type-checkbox" type="checkbox" name="questionTypes" value="Emotion Identification" id="emotionIdentification">
                                                            <label class="form-check-label" for="emotionIdentification">
                                                                <i class="fas fa-smile-beam"></i> Emotion Identification
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                              
                            <div class="create-button-container">
                                <button type="button" class="btn create-btn" id="createStoryBtn">
                                    <span id="createBtnText">Generate Story</span>
                                    <div id="createBtnSpinner" class="hidden inline-block ml-2">
                                        <i class="fas fa-spinner fa-spin"></i>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="modal fade" id="progressModal" tabindex="-1" aria-labelledby="progressModalLabel" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content progress-modal">
                <div class="modal-body text-center">
                    <h5 id="progressTitle">Creating Your Story</h5>
                    <p style="color: rgba(255,255,255,0.8); margin-bottom: 20px; font-size: 14px;" id="progressDescription">Please wait while we create your story... Go grab a coffee while you wait!</p>
                    <div class="progress-container">
                        <div class="progress">
                            <div class="progress-bar" role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" id="mainProgressBar"></div>
                        </div>
                        <div class="progress-text" id="progressText">Getting started...</div>
                    </div>
                    <div id="gamificationProgress" class="hidden" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.2);">
                        <div style="color: rgba(255,255,255,0.9); font-size: 14px; margin-bottom: 8px;">Interactive Learning</div>
                        <div style="color: rgba(255,255,255,0.7); font-size: 12px;" id="gamificationDetails">Adding questions and activities...</div>
                    </div>
                    <div style="margin-top: 20px;">
                        <button type="button" class="btn btn-secondary" id="cancelGenerationBtn">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div id="storyResults" class="bg-white rounded-2xl shadow-xl p-8 mt-8" style="display: none;">
    </div>

    <div id="consoleSection" class="hidden bg-gray-900 rounded-2xl shadow-xl p-6 mb-8" style="position: fixed; bottom: 20px; right: 20px; width: 400px; max-height: 300px; z-index: 1000;">
        <h3 class="text-lg font-bold text-white mb-4 flex items-center">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
            </svg>
            Console Output
        </h3>
        <div id="consoleOutput" class="bg-black rounded-lg p-4 h-48 overflow-y-auto text-green-400 font-mono text-sm"></div>
    </div>

    <!-- Thumbnail Modal -->
    <div id="thumbnailModal" class="thumbnail-modal hidden">
        <div class="thumbnail-modal-overlay"></div>
        <div class="thumbnail-modal-content">
            <button id="thumbnailModalClose" class="thumbnail-modal-close-btn">&times;</button>

            <div class="thumbnail-modal-body">
                <div class="thumbnail-sparkle-effect"></div>

                <div class="thumbnail-header-section">
                    <h2 class="thumbnail-story-title" id="thumbnailStoryTitle">Your Amazing Story</h2>

                </div>

                <div class="thumbnail-image-container">
                    <div class="thumbnail-image-frame">
                        <div class="thumbnail-corner corner-tl"></div>
                        <div class="thumbnail-corner corner-tr"></div>
                        <div class="thumbnail-corner corner-bl"></div>
                        <div class="thumbnail-corner corner-br"></div>

                        <img id="thumbnailImage" src="" alt="Story Thumbnail" class="thumbnail-image">

                        <div class="thumbnail-shimmer"></div>
                    </div>
                </div>

                <div class="thumbnail-action-section">
                    <button id="viewStoryPreviewBtn" class="thumbnail-preview-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polygon points="10 8 16 12 10 16 10 8"></polygon>
                        </svg>
                        <span>Preview</span>
                        <div class="btn-shine"></div>
                    </button>

                </div>
            </div>
        </div>
    </div>

    <div id="previewModal" class="preview-modal hidden">
        <div class="preview-modal-overlay"></div>
        <div class="preview-modal-content">
            <div class="preview-modal-header">
                <h2>Story Preview</h2>
                <h3 class="preview-story-title" id="previewStoryTitle">Sample Educational Story</h3>
                <button id="previewModalClose" class="preview-modal-close-btn">&times;</button>
            </div>
            
            <div class="preview-storyboard-player">
                <div class="preview-blackboard-container">
                    <div class="wooden-frame">
                        <div class="blackboard-screen">
                            <div class="story-image">
                                <div class="image-placeholder" id="previewImagePlaceholder">
                                    <p>Scene Image will be displayed here</p>
                                </div>
                            </div>
                            
                            <div class="narration-text-overlay" id="previewNarration">
                                Click the dots below to preview each scene of your story!
                            </div>

                            <div class="scene-retry-container" id="sceneRetryContainer" style="display: none;">
                                <button class="scene-retry-btn" id="sceneRetryBtn" title="Recreate this scene with enhanced prompt">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                                    </svg>
                                    <span>Recreate</span>
                                </button>
                            </div>

                        </div>
                    </div>
                </div>

                <div class="preview-scene-navigation">
                    <div class="scene-label">Scenes:</div>
                    <div class="timeline-dots" id="previewTimelineDots">
                    </div>
                </div>

                <div class="preview-music-controls">
                    <div class="music-label">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M9 18V5l12-2v13"></path>
                            <circle cx="6" cy="18" r="3"></circle>
                            <circle cx="18" cy="16" r="3"></circle>
                        </svg>
                        <span>Background Music</span>
                    </div>
                    <div class="music-actions">
                        <select id="previewMusicSelect" class="music-select">
                            <option value="">No Music</option>
                            <option value="playful.mp3">Playful Adventure</option>
                            <option value="adventure.mp3">Epic Adventure</option>
                            <option value="adventure_2.mp3">Adventure Journey</option>
                            <option value="magical.mp3">Magical Wonder</option>
                        </select>
                        <button id="previewMusicPlayBtn" class="music-play-btn">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" id="playIcon">
                                <polygon points="8,5 19,12 8,19"/>
                            </svg>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" id="pauseIcon" style="display: none;">
                                <rect x="6" y="4" width="4" height="16"/>
                                <rect x="14" y="4" width="4" height="16"/>
                            </svg>
                            <span id="playBtnText">Play</span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="preview-modal-actions">
                <div class="preview-action-buttons">
                    <button id="saveStoryBtn" class="btn btn-success">
                        <i class="fas fa-save"></i> Save Story
                    </button>
                    <button id="continueToStoryboard" class="btn btn-primary">
                        <i class="fas fa-play"></i> Play
                    </button>
                    <button id="regenerateStory" class="btn btn-secondary">
                        <i class="fas fa-sync-alt"></i> Generate New Story
                    </button>
                </div>
            </div>
        </div>
    </div>

    <script src="../../../public/files/js/common/mobiletoggle.js"></script>
    <script src="../../../public/files/js/common/modal.js"> </script>
    <script src="../../../public/files/js/common/range.js"> </script>

    <!-- CRITICAL: Timer Manager prevents tab throttling during story generation -->
    <script src="../../../public/files/js/story/timer-manager.js"></script>

    <!-- IMPORTANT: Clear form fields on page load - must load early -->
    <script src="../../../public/files/js/story/clear-form-on-load.js"></script>

    <!-- Theme character counter -->
    <script src="../../../public/files/js/story/theme-character-counter.js"></script>

    <!-- IMPORTANT: Load user default settings from Settings Dashboard -->
    <script src="../../../public/files/js/story/load-default-settings.js"></script>

    <script src="../../../public/files/js/story/utils/story-utils.js"></script>
    <script src="../../../public/files/js/story/notification-system.js"></script>
    <script src="../../../public/files/js/story/character-validation.js"></script>

    <script src="../../../public/files/js/story/api/fal-ai-integration.js"></script>
    <script src="../../../public/files/js/story/tts-integration.js"></script>
    <script src="../../../public/files/js/story/tts-story-generator.js"></script>
    <script src="../../../public/files/js/story/voice-preview.js"></script>
    <script src="../../../public/files/js/story/dashboard-story-generation-enhanced.js"></script>

    <script src="../../../public/files/js/story/dashboard-story-generator-EXACT.js"></script>

    <script src="../../../public/files/js/story/dashboard-main.js"></script>
    <script src="../../../public/files/js/story/dashboard-story-loader.js"></script>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

    <script src="../../../public/files/js/story/dashboard-preview-modal.js"></script>

</body>
</html>
