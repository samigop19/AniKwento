<?php
// Load user information from session
require_once $_SERVER['DOCUMENT_ROOT'] . '/source/handlers/get_user_info.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Settings - AniKwento</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link id="theme-style" rel="stylesheet" href="../../../public/files/css/SettingsDashboard.css">
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
              <a href="StoryDashboard.php" class="nav-link">
                <img src="../../../public/files/images/StoryIC.png" class="icon" alt="">
                <span>My Stories</span>
              </a>
            </li>
            <li class="nav-item">
              <a href="TeacherProfile.php" class="nav-link">
                <i class="far fa-user-circle icon"></i>
                <span>My Profile</span>
              </a>
            </li>
            <li class="nav-item">
              <a href="SettingsDashboard.php" class="nav-link active">
                <img src="../../../public/files/images/SettingIC.png" class="icon" alt="">
                <span>Settings</span>
              </a>
            </li>
            <li class="nav-item">
              <a href="StoryHelp.php" class="nav-link">
                <img src="../../../public/files/images/HelpIC.png" class="icon" alt="">
                <span>Help</span>
              </a>
            </li>
            <li class="nav-item">
              <a href="../../handlers/logout_process.php" class="nav-link">
                <img src="../../../public/files/images/LogoutIC.png" class="icon" alt="">
                <span>Logout</span>
              </a>
            </li>
          </ul>
        </nav>
        <img src="../../../public/files/images/AKlogo.png" alt="AniKwento Logo" class="footer-logo">
      </div>
    </header>

    <div class="main">
      <div class="settings-container">
        <h2 class="settings-title">
          <img src="../../../public/files/images/SettingsSettingsIcon.png" alt="Settings Icon">
          Story Settings
          <span class="help-text">These will be your default settings for story creation</span>
        </h2>

        <!-- Voice Narration Section -->
        <div class="settings-section">
          <h3>Storyteller Voice <i class="fas fa-question-circle help-icon" data-bs-toggle="tooltip" title="Choose or add a storyteller voice for your stories"></i></h3>
          <div class="option-group">
            <div class="voice-selection">
              <label>Select Storyteller Voice:</label>
              <div class="voice-selector-wrapper">
                <select id="voiceSelector" class="form-select">
                  <option value="Rachel">Rachel - Calm & Gentle Storyteller</option>
                  <option value="Amara">Amara - Warm & Engaging Narrator</option>
                  <option value="Lily">Lily - Friendly & Expressive Voice</option>
                  <option value="add-voice" id="addVoiceOption">+ Add Voice</option>
                </select>
                <button class="delete-voice-btn-icon" id="deleteVoiceBtn" style="display: none;" data-bs-toggle="tooltip" data-bs-placement="top" title="Delete custom voice">
                  <i class="fas fa-trash-alt"></i>
                </button>
              </div>
              <div class="voice-actions">
                <button class="preview-voice-btn" onclick="previewVoice()" data-bs-toggle="tooltip" data-bs-placement="top" title="Listen to a sample of the selected voice">
                  <i class="fas fa-play"></i> Preview Voice
                  <div class="preview-indicator"></div>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Narration Volume Control -->
        <div class="settings-section">
          <h3>Narration Volume <i class="fas fa-question-circle help-icon" data-bs-toggle="tooltip" title="Control the storyteller voice volume in your stories"></i></h3>
          <div class="option-group">
            <div class="volume-control">
              <label>Storyteller Voice Volume:</label>
              <div class="volume-slider">
                <input type="range" class="custom-range" id="narrationVolumeRange" min="0" max="100" value="100">
                <span class="volume-value" id="narrationVolumeValue">100%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Background Music Section -->
        <div class="settings-section">
          <h3>Default Background Music <i class="fas fa-question-circle help-icon" data-bs-toggle="tooltip" title="Choose kid-friendly background music"></i></h3>
          <div class="option-group">
            <div class="music-selection">
              <label>Default Music:</label>
              <select id="musicSelector" class="form-select">
                <option value="">No Music</option>
                <option value="playful.mp3">Playful Adventure</option>
                <option value="adventure.mp3">Epic Adventure</option>
                <option value="adventure_2.mp3">Adventure Journey</option>
                <option value="magical.mp3">Magical Wonder</option>
              </select>
              <button class="preview-voice-btn" onclick="previewMusic()" data-bs-toggle="tooltip" title="Listen to a sample of the selected music">
                <i class="fas fa-play"></i> Preview Music
                <div class="preview-indicator"></div>
              </button>
              <div class="volume-control">
                <label>Music Volume:</label>
                <div class="volume-slider">
                  <input type="range" class="custom-range" id="musicVolumeRange" min="0" max="100" value="50">
                  <span class="volume-value" id="musicVolumeValue">50%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Interactive Questions Section -->
        <div class="settings-section">
          <h3>Default Interactive Questions <i class="fas fa-question-circle help-icon" data-bs-toggle="tooltip" title="Configure age-appropriate questions for 3-4 year olds"></i></h3>
          <div class="option-group">
            <div class="question-timing">
              <label class="section-label">Default Question Timing:</label>
              <div class="timing-options">
                <div class="form-check custom-radio">
                  <input class="form-check-input" type="radio" name="questionTiming" id="noneQuestions" value="none">
                  <label class="form-check-label" for="noneQuestions">
                    <i class="fas fa-times-circle"></i>
                    <span class="label-text">No Questions</span>
                  </label>
                </div>
                <div class="form-check custom-radio">
                  <input class="form-check-input" type="radio" name="questionTiming" id="duringStory" value="during">
                  <label class="form-check-label" for="duringStory">
                    <i class="fas fa-book-reader"></i>
                    <span class="label-text">During the Story</span>
                  </label>
                </div>
                <div class="form-check custom-radio">
                  <input class="form-check-input" type="radio" name="questionTiming" id="afterStory" value="after" checked>
                  <label class="form-check-label" for="afterStory">
                    <i class="fas fa-flag-checkered"></i>
                    <span class="label-text">After the Story</span>
                  </label>
                </div>
                <div class="form-check custom-radio">
                  <input class="form-check-input" type="radio" name="questionTiming" id="bothTiming" value="both">
                  <label class="form-check-label" for="bothTiming">
                    <i class="fas fa-clock"></i>
                    <span class="label-text">Both</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="question-types">
              <div class="types-header">
                <label class="section-label">Default Question Types for 3-4 Year Olds:</label>
                <span class="selection-limit">(Select up to 2)</span>
              </div>
              <div class="types-grid">
                <div class="form-check custom-checkbox">
                  <input class="form-check-input question-type" type="checkbox" id="colorRecognition" value="colorRecognition" checked>
                  <label class="form-check-label" for="colorRecognition">
                    <div class="checkbox-content">
                      <div class="checkbox-header">
                        <i class="fas fa-palette"></i>
                        <span class="label-text">Color Recognition</span>
                      </div>
                      <span class="example-text">Example: "What color is the happy butterfly?"</span>
                    </div>
                  </label>
                </div>
                <div class="form-check custom-checkbox">
                  <input class="form-check-input question-type" type="checkbox" id="shapeMatching" value="shapeMatching" checked>
                  <label class="form-check-label" for="shapeMatching">
                    <div class="checkbox-content">
                      <div class="checkbox-header">
                        <i class="fas fa-shapes"></i>
                        <span class="label-text">Shape Matching</span>
                      </div>
                      <span class="example-text">Example: "Can you find the circle?"</span>
                    </div>
                  </label>
                </div>
                <div class="form-check custom-checkbox">
                  <input class="form-check-input question-type" type="checkbox" id="simpleNumbers" value="numberCounting">
                  <label class="form-check-label" for="simpleNumbers">
                    <div class="checkbox-content">
                      <div class="checkbox-header">
                        <i class="fas fa-sort-numeric-up"></i>
                        <span class="label-text">Simple Counting (1-5)</span>
                      </div>
                      <span class="example-text">Example: "How many flowers do you see?"</span>
                    </div>
                  </label>
                </div>
                <div class="form-check custom-checkbox">
                  <input class="form-check-input question-type" type="checkbox" id="emotions" value="emotionIdentification">
                  <label class="form-check-label" for="emotions">
                    <div class="checkbox-content">
                      <div class="checkbox-header">
                        <i class="fas fa-smile"></i>
                        <span class="label-text">Basic Emotions</span>
                      </div>
                      <span class="example-text">Example: "How does the puppy feel?"</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Settings Preview -->
        <div class="settings-preview">
          <h3>Settings Preview <i class="fas fa-eye"></i></h3>
          <div class="preview-content">
            <div class="preview-item">
              <i class="fas fa-microphone-alt"></i>
              <span id="voicePreviewText">Rachel - Calm & Gentle Storyteller</span>
            </div>
            <div class="preview-item">
              <i class="fas fa-volume-up"></i>
              <span id="narrationVolumePreviewText">Narration: 100%</span>
            </div>
            <div class="preview-item">
              <i class="fas fa-music"></i>
              <span id="musicPreviewText">No Music</span>
            </div>
            <div class="preview-item">
              <i class="fas fa-question-circle"></i>
              <span id="questionPreviewText">2 Question Types Selected</span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="settings-actions">
          <button class="save-btn" id="saveSettingsBtn" data-bs-toggle="tooltip" title="Save your settings as defaults">
            <i class="fas fa-save"></i> Save Settings
          </button>
          <button class="discard-btn" id="resetSettingsBtn" data-bs-toggle="tooltip" title="Reset all settings to default">
            <i class="fas fa-undo"></i> Reset to Default
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Add Voice Modal -->
  <div class="modal fade" id="addVoiceModal" tabindex="-1" aria-labelledby="addVoiceModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="addVoiceModalLabel">
            <i class="fas fa-microphone-alt"></i> Add Custom Voice
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <form id="addVoiceForm">
            <div class="mb-3">
              <label for="modalVoiceName" class="form-label">Voice Display Name <span class="text-danger">*</span></label>
              <input type="text" class="form-control" id="modalVoiceName" placeholder="e.g., Miss Sarah" required maxlength="50">
              <small class="form-text text-muted">Friendly name for your custom voice</small>
            </div>
            <div class="mb-3">
              <label for="modalVoiceId" class="form-label">ElevenLabs Voice ID <span class="text-danger">*</span></label>
              <input type="text" class="form-control" id="modalVoiceId" placeholder="Enter voice ID from ElevenLabs" required>
              <small class="form-text text-muted">Get this from your ElevenLabs account</small>
            </div>
            <div class="mb-3">
              <label for="modalAvatarUrl" class="form-label">ReadyPlayerMe Avatar URL <span class="text-danger">*</span></label>
              <input type="url" class="form-control" id="modalAvatarUrl" placeholder="https://models.readyplayer.me/..." required>
              <small class="form-text text-muted">Link to your ReadyPlayerMe 3D avatar</small>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
          <button type="button" class="btn btn-primary" id="saveVoiceBtn">
            <i class="fas fa-save"></i> Save Voice
          </button>
        </div>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <script src="../../../public/files/js/story/notification-system.js"></script>
  <script src="../../../public/files/js/story/preview.js"></script>
  <script src="../../../public/files/js/common/mobiletoggle.js"></script>
  <script src="../../../public/files/js/story/settings-dashboard.js"></script>

  <script>
    window.history.forward();
    function preventBack() {
        window.history.forward();
    }
    setTimeout("preventBack()", 0);
    window.onunload = function () { null };

    // Initialize Bootstrap tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl)
    })
  </script>
</body>
</html>
