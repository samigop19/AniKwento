<?php
require_once __DIR__ . '/../../config/init.php';
// Load user information from session
require_once $_SERVER['DOCUMENT_ROOT'] . '/source/handlers/get_user_info.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Help - AniKwento</title>

    <link rel="icon" type="image/x-icon" href="../../../public/files/images/favicon.ico">
    <link rel="icon" type="image/png" sizes="32x32" href="../../../public/files/images/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="../../../public/files/images/favicon-16x16.png">
    <link rel="apple-touch-icon" sizes="180x180" href="../../../public/files/images/apple-touch-icon.png">
    <link rel="manifest" href="../../../public/site.webmanifest">

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="files/css/font-awesome.min.css">
    <link rel="stylesheet" href="../../../public/files/css/StoryHelp.css?v=2.0">
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
                            <a href="/source/pages/dashboard/StoryDashboard.php" class="nav-link">
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
                            <a href="/source/pages/dashboard/StoryHelp.php" class="nav-link active">
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
            <div class="container">
                <div class="help-header">
                    <i class="fas fa-info-circle"></i>
                    <h1>Help</h1>
                </div>

                <div class="row g-4">
                    <!-- About AniKwento -->
                    <div class="col-md-6">
                        <div class="help-card">
                            <div class="help-icon">
                                <i class="fas fa-book"></i>
                            </div>
                            <h3>About AniKwento</h3>
                            <p>Discover what is AniKwento</p>
                            <a href="#" class="stretched-link" data-bs-toggle="modal" data-bs-target="#aboutModal"></a>
                        </div>
                    </div>

                    <!-- Change Password -->
                    <div class="col-md-6">
                        <div class="help-card">
                            <div class="help-icon">
                                <i class="fas fa-lock"></i>
                            </div>
                            <h3>Change Password</h3>
                            <p>Secure your account by changing your password</p>
                            <a href="#" class="stretched-link" data-bs-toggle="modal" data-bs-target="#accountModal"></a>
                        </div>
                    </div>

                    <!-- Contacts -->
                    <div class="col-md-6">
                        <div class="help-card">
                            <div class="help-icon">
                                <i class="fas fa-phone"></i>
                            </div>
                            <h3>Contacts</h3>
                            <p>Have questions or feedback? Reach out through our contact page to connect with us!</p>
                            <a href="#" class="stretched-link" data-bs-toggle="modal" data-bs-target="#contactsModal"></a>
                        </div>
                    </div>

                    <!-- Guide -->
                    <div class="col-md-6">
                        <div class="help-card">
                            <div class="help-icon">
                                <i class="fas fa-question-circle"></i>
                            </div>
                            <h3>Guide</h3>
                            <p>A general guide for AniKwento</p>
                            <a href="#" class="stretched-link" data-bs-toggle="modal" data-bs-target="#guideModal"></a>
                        </div>
                    </div>
            </div>
        </main>
    </div>


    <div class="modal fade" id="aboutModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title"><i class="fas fa-book me-2"></i>About AniKwento</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p><strong>Welcome to AniKwento!</strong></p>
                    <p>AniKwento helps kindergarten teachers create interactive, personalized stories for young learners ages 3-6. Create engaging stories in just minutes!</p>

                    <h6 class="mt-4 mb-3"><i class="fas fa-star me-2 text-warning"></i>Every Story Includes:</h6>
                    <ul>
                        <li><strong>10 Colorful Scenes</strong> with beautiful images</li>
                        <li><strong>Voice Narration with 3D Avatar</strong> - Choose from 3 friendly storyteller voices (Rachel, Amara, and Lily) or upload your own custom voice with ReadyPlayerMe avatar</li>
                        <li><strong>Characters</strong> - Add up to 5 students or pets as main characters in the story</li>
                        <li><strong>Learning Questions</strong> about colors, shapes, numbers, or emotions to reinforce understanding</li>
                        <li><strong>Background Music</strong> (required) for a calming and engaging atmosphere</li>
                        <li><strong>Save & Replay</strong> anytime you need</li>
                    </ul>

                    <h6 class="mt-4 mb-3"><i class="fas fa-book me-2 text-info"></i>Story Features:</h6>
                    <p class="mb-2">Create stories on any topic suitable for young learners, including colors, shapes, counting, friendship, kindness, emotions, nature, animals, family, teamwork, and sharing!</p>

                    <div class="mt-4 bg-light p-3 rounded">
                        <p class="small mb-0"><i class="fas fa-heart me-2 text-danger"></i><strong>Perfect for circle time, morning lessons, and keeping students engaged!</strong> Children love seeing their names in stories and learning through colorful visuals and interactive questions.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>


    <div class="modal fade" id="accountModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"><i class="fas fa-lock me-2"></i>Change Password</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
          
                <div class="step" id="step1">
                    <h6 class="mb-4">Step 1: Verify Your Email</h6>
                    <div class="mb-4">
                        <label class="form-label">UB Email Address</label>
                        <input type="text" class="form-control" id="ubEmail" placeholder="UB Mail"
                            style="padding-left: 0.75rem; border: none; border-bottom: 2px solid #801B32; border-radius: 0;"
                            required>
                        <button class="btn btn-primary mt-3" type="button" id="sendCodeBtn" style="width: 100%;">
                            Send Code <i class="fas fa-paper-plane ms-1"></i>
                        </button>
                    </div>
                </div>

    
                <div class="step" id="step2" style="display: none;">
                    <h6 class="mb-4">Step 2: Enter Verification Code</h6>
                    <div class="verification-section mb-4">
                        <div class="text-center mb-3">
                            <p class="mb-1">Enter the 6-digit code sent to:</p>
                            <strong id="emailDisplay"></strong>
                        </div>
                        <div class="verification-input-group">
                            <input type="text" class="form-control verification-input" maxlength="6" placeholder="000000" required>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mt-3">
                            <small class="text-muted">Didn't receive the code?</small>
                            <button type="button" class="btn btn-link p-0" id="resendCodeBtn">Resend Code</button>
                        </div>
                    </div>
                    <button class="btn btn-primary w-100" id="verifyCodeBtn">Verify Code</button>
                </div>

            
                <div class="step" id="step3" style="display: none;">
                    <h6 class="mb-4">Step 3: Change Password</h6>
                    <form id="changePasswordForm">
                        <div class="mb-4">
                            <label class="form-label">New Password</label>
                            <div class="input-group">
                                <input type="password" class="form-control" id="newPassword" required>
                                <button class="btn btn-outline-secondary toggle-password" type="button" data-target="newPassword">
                                    <i class="far fa-eye"></i>
                                </button>
                            </div>
                        </div>

                        <div class="mb-4">
                            <label class="form-label">Confirm New Password</label>
                            <div class="input-group">
                                <input type="password" class="form-control" id="confirmPassword" required>
                                <button class="btn btn-outline-secondary toggle-password" type="button" data-target="confirmPassword">
                                    <i class="far fa-eye"></i>
                                </button>
                            </div>
                        </div>

                        <button type="submit" class="btn btn-primary w-100">Change Password</button>
                    </form>
                </div>
            </div>
        </div>
    </div>
</div>


    <div class="modal fade" id="contactsModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title"><i class="fas fa-phone me-2"></i>Contact Us</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p class="mb-4">We're here to help! Reach out with questions or share your classroom experience.</p>

                    <div class="contact-methods">
                        <div class="contact-item mb-4">
                            <h6><i class="fas fa-envelope me-2 text-primary"></i>Email Us</h6>
                            <ul>
                                <li>2201237@ub.edu.ph (Aaron Jay Dalawampu)</li>
                                <li>2202741@ub.edu.ph (Samuel Gabriel Ignacio)</li>
                                <li>1201487@ub.edu.ph (Rod - Rick Villafuerte)</li>
                            </ul>
                            <small class="text-muted">Response within 24 hours</small>
                        </div>
                        <div class="contact-item mb-4">
                            <h6><i class="fas fa-clock me-2 text-success"></i>Support Hours</h6>
                            <p class="mb-0">Monday - Friday: 9:00 AM - 6:00 PM (Philippine Time)</p>
                        </div>
                        <div class="contact-item">
                            <h6><i class="fas fa-location-dot me-2 text-danger"></i>Location</h6>
                            <p class="mb-0">M.H. Del Pilar, Poblacion Batangas City</p>
                        </div>
                    </div>

                    <div class="mt-4 bg-light p-3 rounded">
                        <p class="small mb-0"><i class="fas fa-info-circle me-2"></i><strong>Quick help?</strong> Check our Guide section for answers!</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

  
   

    <div class="modal fade" id="guideModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title"><i class="fas fa-question-circle me-2"></i>AniKwento Guide</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p class="mb-4">Creating stories is easy! Follow these simple guides to get started.</p>

                    <div class="accordion" id="guideAccordion">
                        <div class="accordion-item">
                            <h2 class="accordion-header">
                                <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOne">
                                    <i class="fas fa-play-circle me-2"></i> How to Create a Story
                                </button>
                            </h2>
                            <div id="collapseOne" class="accordion-collapse collapse show" data-bs-parent="#guideAccordion">
                                <div class="accordion-body">
                                    <h6><i class="fas fa-rocket me-2 text-primary"></i>Quick Steps:</h6>

                                    <div class="bg-light p-3 rounded mb-3">
                                        <ol>
                                            <li class="mb-2"><strong>Click the "+" Button</strong> on My Stories page</li>
                                            <li class="mb-2"><strong>Enter a Story Topic</strong> (optional)
                                                <br><small class="text-muted">Example: "counting butterflies" or "learning colors"</small>
                                            </li>
                                            <li class="mb-2"><strong>Add Characters</strong> (optional, up to 5)
                                                <br><small class="text-muted">Add students or pets, and select boy or girl for each student</small>
                                            </li>
                                            <li class="mb-2"><strong>Pick a Voice</strong>
                                                <br><small class="text-muted">Choose from Rachel, Amara, or Lily (or use a custom voice)</small>
                                            </li>
                                            <li class="mb-2"><strong>Select Background Music</strong> (required)
                                                <br><small class="text-muted">Choose from: Playful Adventure, Epic Adventure, Adventure Journey, or Magical Wonder</small>
                                            </li>
                                            <li class="mb-2"><strong>Add Questions</strong> (optional)
                                                <br><small class="text-muted">Colors, shapes, numbers, or emotions</small>
                                            </li>
                                            <li class="mb-2"><strong>Click "Generate Story"</strong> - Wait 7-10 minutes</li>
                                            <li class="mb-0"><strong>Preview and Play!</strong></li>
                                        </ol>
                                    </div>

                                    <div class="alert alert-success mb-0">
                                        <i class="fas fa-check-circle me-2"></i><strong>Done!</strong> Your story is ready with 10 scenes, images, and voice narration!
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="accordion-item">
                            <h2 class="accordion-header">
                                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseTwo">
                                    <i class="fas fa-book-open me-2"></i> Understanding Your Story
                                </button>
                            </h2>
                            <div id="collapseTwo" class="accordion-collapse collapse" data-bs-parent="#guideAccordion">
                                <div class="accordion-body">
                                    <h6><i class="fas fa-info-circle me-2 text-primary"></i>What's Included:</h6>

                                    <ul class="mb-4">
                                        <li><strong>10 Colorful Scenes</strong> with beautiful illustrations</li>
                                        <li><strong>Up to 5 Main Characters</strong> - Your students or pets become the heroes!</li>
                                        <li><strong>Voice Narration</strong> with clear pronunciation</li>
                                        <li><strong>Interactive Questions</strong> to check understanding</li>
                                        <li><strong>Background Music</strong> (required)</li>
                                    </ul>

                                    <h6 class="mt-4 mb-2 text-primary"><i class="fas fa-graduation-cap me-2"></i>Question Types:</h6>
                                    <div class="bg-light p-3 rounded">
                                        <ul class="mb-0 small">
                                            <li><strong>Colors:</strong> Identify colors</li>
                                            <li><strong>Shapes:</strong> Recognize basic shapes</li>
                                            <li><strong>Numbers:</strong> Practice counting</li>
                                            <li><strong>Emotions:</strong> Develop emotional awareness</li>
                                        </ul>
                                    </div>

                                    <div class="alert alert-info mt-3 mb-0">
                                        <i class="fas fa-lightbulb me-2"></i><strong>Tip:</strong> Use a projector or large screen for best results. Test audio before story time!
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="accordion-item">
                            <h2 class="accordion-header">
                                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseThree">
                                    <i class="fas fa-chalkboard-teacher me-2"></i> Classroom Tips
                                </button>
                            </h2>
                            <div id="collapseThree" class="accordion-collapse collapse" data-bs-parent="#guideAccordion">
                                <div class="accordion-body">
                                    <h6><i class="fas fa-lightbulb me-2 text-success"></i>Get the Best Experience:</h6>

                                    <div class="mb-4">
                                        <h6 class="text-primary"><i class="fas fa-clock me-2"></i>Before Class:</h6>
                                        <ul class="small">
                                            <li>Create story ahead of time (7-10 minutes)</li>
                                            <li>Preview to match your lesson</li>
                                            <li>Test audio and projector</li>
                                            <li>Select background music (required)</li>
                                        </ul>
                                    </div>

                                    <div class="mb-4">
                                        <h6 class="text-primary"><i class="fas fa-users me-2"></i>During Story Time:</h6>
                                        <ul class="small">
                                            <li>Gather students where they can see clearly</li>
                                            <li>Build excitement about the topic</li>
                                            <li>Press play - auto-advance through scenes</li>
                                            <li>Pause to discuss or predict what's next</li>
                                            <li>Encourage group answers to questions</li>
                                        </ul>
                                    </div>

                                    <div class="mb-4">
                                        <h6 class="text-primary"><i class="fas fa-comment-dots me-2"></i>After Story:</h6>
                                        <ul class="small">
                                            <li>Discuss favorite parts and learnings</li>
                                            <li>Replay scenes on request</li>
                                            <li>Create follow-up activities (drawing, acting)</li>
                                            <li>Reuse story with other classes</li>
                                        </ul>
                                    </div>

                                    <div class="alert alert-success mb-0">
                                        <i class="fas fa-star me-2"></i><strong>Pro Tip:</strong> Stories work offline once created! Perfect for classrooms with unreliable WiFi!
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

   
    
    
    <script src="../../../public/files/js/common/mobiletoggle.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="../../../public/files/js/auth/password-manager.js"></script>
</body>
</html>