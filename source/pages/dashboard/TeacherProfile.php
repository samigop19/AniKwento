<?php
// Load user information from session
require_once $_SERVER['DOCUMENT_ROOT'] . '/source/handlers/get_user_info.php';

require_once $_SERVER['DOCUMENT_ROOT'] . '/source/handlers/db_connection.php';

// Load teacher profile for the current logged-in user
$sql = "SELECT * FROM teacher_profiles WHERE user_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();
$teacher = $result ? $result->fetch_assoc() : null;
$stmt->close();

// Check if profile is new/empty (for first-time users)
$is_new_profile = false;
if (!$teacher) {
    // This shouldn't happen if verification created the profile, but handle it just in case
    $teacher = [
        'id' => null,
        'user_id' => $user_id,
        'full_name' => '',
        'position' => '',
        'degree' => '',
        'institution' => '',
        'year_graduated' => '',
        'experience_years' => '',
        'experience_desc' => '',
        'email' => $user_email,
        'photo' => '',
        'certifications' => '[]',
        'skills' => '[]'
    ];
    $is_new_profile = true;
} else {
    // Check if profile has been filled out (check if essential fields are empty)
    $is_new_profile = empty(trim($teacher['position'])) &&
                      empty(trim($teacher['degree'])) &&
                      empty(trim($teacher['institution']));
}

// helper
function safe($value) {
    return htmlspecialchars($value ?? '', ENT_QUOTES, 'UTF-8');
}

// Ensure certifications and skills are arrays for rendering
$certs_raw = $teacher['certifications'] ?? '[]';
$certs = json_decode($certs_raw, true);
if (!is_array($certs)) $certs = array_filter(array_map('trim', explode(',', $certs_raw)));

$skills_raw = $teacher['skills'] ?? '[]';
$skills = json_decode($skills_raw, true);
if (!is_array($skills)) $skills = array_filter(array_map('trim', explode(',', $skills_raw)));
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Teacher Profile - AniKwento</title>

    <link rel="icon" type="image/x-icon" href="../../../public/files/images/AK_tab_logo.ico">
    <link rel="icon" type="image/png" sizes="32x32" href="../../../public/files/images/AK_tab_logo-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="../../../public/files/images/AK_tab_logo-16x16.png">
    <link rel="apple-touch-icon" sizes="180x180" href="../../../public/files/images/AK_tab_logo-180x180.png">
    <link rel="icon" type="image/png" sizes="192x192" href="../../../public/files/images/AK_tab_logo-192x192.png">
    <link rel="icon" type="image/png" sizes="512x512" href="../../../public/files/images/AK_tab_logo-512x512.png">
    <link rel="manifest" href="../../../public/site.webmanifest">

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="../../../public/files/css/TeacherProfilesample.css?v=2.3">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <button class="mobile-menu-toggle">
        <i class="fas fa-bars"></i>
    </button>

    <div class="dashboard">
        <!-- Sidebar header -->
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
                            <a href="/source/pages/dashboard/TeacherProfile.php" class="nav-link active">
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

        <!-- MAIN -->
        <main class="main">
            <div class="profile-container">
                <!-- Profile Header -->
                <div class="profile-header-section">
                    <div class="profile-main-info">
                        <div class="profile-picture-section">
                            <div class="profile-picture-wrapper">
                                <img src="<?= $teacher['photo'] ? safe($teacher['photo']) : 'images/teacher-placeholder.png' ?>" alt="Teacher Profile" class="profile-picture" id="profilePicture">
                                <div class="picture-overlay" data-bs-toggle="modal" data-bs-target="#editProfileModal">
                                    <button class="edit-picture-btn" type="button">
                                        <i class="fas fa-camera"></i>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="basic-info">
                            <div class="name-section">
                                <h1 class="teacher-name" id="displayName"><?= safe($teacher['full_name']) ?></h1>

                                <div style="display:flex; gap:10px;">
                                    <button class="btn-edit ms-2" onclick="shareProfile()">
                                        <i class="fas fa-share-alt"></i> Share
                                    </button>

                                    <button class="btn btn-edit" data-bs-toggle="modal" data-bs-target="#editProfileModal">
                                        <i class="fas fa-edit"></i> Edit Profile
                                    </button>
                                </div>
                            </div>

                            <p class="teacher-position" id="displayPosition"><?= safe($teacher['position']) ?></p>
                        </div>
                    </div>
                </div>

                <!-- Profile Content -->
                <div class="profile-content">
                    <div class="content-column">
                        <!-- First Row: Educational Background (Left) and Teaching Experience (Right) -->
                        <div class="row g-3 mb-3">
                            <div class="col-md-6">
                                <!-- Container A: Educational Background -->
                                <div class="profile-card h-100">
                                    <div class="card-header">
                                        <h3><i class="fas fa-graduation-cap"></i> Educational Background</h3>
                                    </div>
                                    <div class="card-body">
                                        <div class="info-row">
                                            <div class="info-label">Degree:</div>
                                            <div class="info-value" id="displayDegree"><?= safe($teacher['degree']) ?></div>
                                        </div>
                                        <div class="info-row">
                                            <div class="info-label">Institution:</div>
                                            <div class="info-value" id="displayInstitution"><?= safe($teacher['institution']) ?></div>
                                        </div>
                                        <div class="info-row">
                                            <div class="info-label">Year Graduated:</div>
                                            <div class="info-value">
                                                <span class="year-badge" id="displayYear"><?= safe($teacher['year_graduated']) ?></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="col-md-6">
                                <!-- Container B: Teaching Experience -->
                                <div class="profile-card h-100">
                                    <div class="card-header">
                                        <h3><i class="fas fa-briefcase"></i> Teaching Experience</h3>
                                    </div>
                                    <div class="card-body">
                                        <div class="experience-highlight">
                                            <?php if (!empty($teacher['experience_years'])): ?>
                                                <div class="experience-years" id="displayExperienceYears"><?= safe($teacher['experience_years']) ?> Years</div>
                                            <?php else: ?>
                                                <div class="experience-years" id="displayExperienceYears">0 Years</div>
                                            <?php endif; ?>
                                            <div class="experience-description" id="displayExperienceDesc"><?= nl2br(safe($teacher['experience_desc'])) ?></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Second Row: Certifications & Training -->
                        <div class="row g-3 mb-3">
                            <div class="col-12">
                                <!-- Container C: Certifications & Training -->
                                <div class="profile-card">
                                    <div class="card-header">
                                        <h3><i class="fas fa-certificate"></i> Certifications & Training</h3>
                                    </div>
                                    <div class="card-body">
                                        <div class="certification-grid" id="displayCertifications">
                                            <?php
                                            if (!empty($certs)) {
                                                foreach ($certs as $cert) {
                                                    if (trim($cert) === '') continue;
                                                    echo '<div class="cert-item"><i class="fas fa-award"></i><span>' . safe($cert) . '</span></div>';
                                                }
                                            } else {
                                                echo '<div class="cert-item"><i class="fas fa-award"></i><span>No certifications listed</span></div>';
                                            }
                                            ?>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Third Row: Special Skills & Interests -->
                        <div class="row g-3 mb-3">
                            <div class="col-12">
                                <!-- Container D: Special Skills & Interests -->
                                <div class="profile-card">
                                    <div class="card-header">
                                        <h3><i class="fas fa-star"></i> Special Skills & Interests</h3>
                                    </div>
                                    <div class="card-body">
                                        <div class="skills-showcase" id="displaySkills">
                                            <?php
                                            if (!empty($skills)) {
                                                foreach ($skills as $skill) {
                                                    if (trim($skill) === '') continue;
                                                    echo '<div class="skill-item"><div class="skill-icon"><i class="fas fa-lightbulb"></i></div><div class="skill-content"><div class="skill-name">' . safe($skill) . '</div></div></div>';
                                                }
                                            } else {
                                                echo '<div class="skill-item"><div class="skill-icon"><i class="fas fa-lightbulb"></i></div><div class="skill-content"><div class="skill-name">No skills listed</div></div></div>';
                                            }
                                            ?>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Contact Information (Centered Below) -->
                        <div class="row g-3">
                            <div class="col-12">
                                <div class="contact-info-wrapper">
                                    <div class="profile-card">
                                        <div class="card-header">
                                            <h3><i class="fas fa-envelope"></i> Contact Information</h3>
                                        </div>
                                        <div class="card-body">
                                            <div class="contact-info">
                                                <div class="contact-item">
                                                    <i class="fas fa-envelope"></i>
                                                    <div class="contact-details">
                                                        <div class="contact-label">School Email:</div>
                                                        <div class="contact-value" id="displayEmail"><?= safe($teacher['email']) ?></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div> <!-- content-column -->
                </div> <!-- profile-content -->
            </div> <!-- profile-container -->
        </main>
    </div> <!-- dashboard -->

    <!-- Welcome Modal for New Users -->
    <?php if ($is_new_profile): ?>
    <div class="modal fade" id="welcomeModal" tabindex="-1" aria-labelledby="welcomeModalLabel" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content welcome-modal-content">
                <div class="welcome-modal-header">
                    <div class="welcome-decoration-circles">
                        <div class="circle circle-1"></div>
                        <div class="circle circle-2"></div>
                        <div class="circle circle-3"></div>
                    </div>
                    <div class="welcome-icon-wrapper">
                        <i class="fas fa-hand-sparkles"></i>
                    </div>
                    <h2 class="welcome-title">
                        Welcome to AniKwento, <span class="user-name"><?php echo safe($user_first_name); ?></span>!
                    </h2>
                    <p class="welcome-subtitle">Let's set up your teacher profile</p>
                </div>

                <div class="welcome-modal-body">
                    <div class="profile-setup-card">
                        <div class="setup-icon-container">
                            <div class="setup-icon-bg">
                                <i class="fas fa-user-circle"></i>
                            </div>
                        </div>

                        <h3 class="setup-heading">Create Your Professional Profile</h3>

                        <div class="setup-description">
                            <div class="description-item">
                                <i class="fas fa-check-circle"></i>
                                <p>Share your credentials with parents or guardians and students</p>
                            </div>
                            <div class="description-item">
                                <i class="fas fa-check-circle"></i>
                                <p>Showcase your teaching experience and skills</p>
                            </div>
                            <div class="description-item">
                                <i class="fas fa-check-circle"></i>
                                <p>Build trust with your professional background</p>
                            </div>
                        </div>

                        <button type="button" class="btn-setup-profile" onclick="openProfileEditor()">
                            <span class="btn-icon"><i class="fas fa-edit"></i></span>
                            <span class="btn-text">Set Up My Profile Now</span>
                            <span class="btn-arrow"><i class="fas fa-arrow-right"></i></span>
                        </button>

                        <p class="setup-note">
                            <i class="fas fa-clock"></i> Takes only 3-5 minutes to complete
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <?php endif; ?>

    <!-- Share Profile Modal -->
    <div class="modal fade" id="shareProfileModal" tabindex="-1" aria-labelledby="shareProfileModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-sm" style="max-width: 450px;">
            <div class="modal-content" style="border-radius: 15px; overflow: hidden; border: none;">
                <div class="modal-header" style="background: linear-gradient(135deg, #801b32 0%, #a52742 100%); color: white; border: none; padding: 20px;">
                    <div>
                        <h5 class="modal-title" id="shareProfileModalLabel" style="font-weight: 600; font-size: 1.2rem; margin-bottom: 3px;">
                            <i class="fas fa-share-alt me-2"></i>Share with Parents or Guardians
                        </h5>
                        <p class="mb-0" style="font-size: 0.8rem; opacity: 0.9;">Copy your profile link</p>
                    </div>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body" style="padding: 20px;">
                    <div style="background: #f8f9fa; border-radius: 10px; padding: 15px; margin-bottom: 15px; border: 2px dashed #801b32;">
                        <label style="font-size: 0.75rem; color: #6c757d; margin-bottom: 8px; display: block; font-weight: 600;">
                            <i class="fas fa-link me-1"></i>Profile Link for Parents or Guardians
                        </label>
                        <div style="position: relative;">
                            <input type="text" id="shareUrlInput" readonly class="form-control" style="padding-right: 90px; border-radius: 8px; border: 1px solid #dee2e6; font-size: 0.8rem; background: white; padding: 8px 90px 8px 10px;">
                            <button onclick="copyShareLink()" class="btn" id="copyBtn" style="position: absolute; right: 4px; top: 50%; transform: translateY(-50%); background: #801b32; color: white; border: none; border-radius: 6px; padding: 6px 12px; font-size: 0.75rem; font-weight: 600; transition: all 0.3s;">
                                <i class="fas fa-copy me-1"></i>Copy
                            </button>
                        </div>
                    </div>
                    <div style="background: #e7f3ff; border-left: 3px solid #0066cc; padding: 12px; border-radius: 8px;">
                        <p style="color: #004085; margin: 0; font-size: 0.8rem; line-height: 1.5;">
                            <i class="fas fa-info-circle me-1"></i>
                            Parents or guardians can view your teaching background through this link.
                        </p>
                    </div>
                </div>
                <div class="modal-footer" style="background: #f8f9fa; border: none; padding: 12px 20px;">
                    <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal" style="border-radius: 8px; padding: 8px 20px; font-weight: 600; font-size: 0.85rem;">
                        <i class="fas fa-times me-1"></i>Close
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Edit Profile Modal -->
    <div class="modal fade" id="editProfileModal" tabindex="-1" aria-labelledby="editProfileModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content edit-profile-modal">
                <div class="modal-header">
                    <div>
                        <h5 class="modal-title" id="editProfileModalLabel"><i class="fas fa-edit"></i> Edit My Teacher Profile</h5>
                        <p class="text-white mb-0" style="font-size: 0.9rem;">Update your information to share with parents or guardians and students</p>
                    </div>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>

                <div class="modal-body">
                    <form id="editProfileForm" enctype="multipart/form-data" onsubmit="return false;">

                        <!-- Profile Picture Section -->
                        <div class="edit-section">
                            <h6 class="section-title"><i class="fas fa-camera"></i> Profile Picture</h6>
                            <p class="section-description">Upload a professional photo that parents or guardians and students will see</p>
                            <div class="picture-edit-section">
                                <div class="current-picture">
                                    <img src="<?= $teacher['photo'] ? safe($teacher['photo']) : 'images/teacher-placeholder.png' ?>" id="editProfilePicture" class="edit-profile-img" alt="Profile">
                                </div>
                                <div class="picture-controls">
                                    <input type="file" id="profilePictureInput" name="photo" accept="image/*" style="display:none" onchange="handleProfilePictureChange(event)">
                                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('profilePictureInput').click();">
                                        <i class="fas fa-upload"></i> Choose New Picture
                                    </button>
                                    <small class="form-text text-muted mt-2 d-block">Recommended: Square photo, at least 200x200 pixels</small>
                                </div>
                            </div>
                        </div>

                        <!-- Basic Information Section -->
                        <div class="edit-section">
                            <h6 class="section-title"><i class="fas fa-user"></i> Basic Information</h6>
                            <p class="section-description">Your name and current teaching position</p>
                            <div class="row g-3">
                                <div class="col-md-7">
                                    <label class="form-label fw-bold">Full Name <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" id="editName" name="full_name"
                                           value="<?= safe($teacher['full_name']) ?>"
                                           placeholder="e.g., Maria Santos"
                                           required>
                                    <small class="form-text text-muted">This is how parents or guardians and students will see your name</small>
                                </div>
                                <div class="col-md-5">
                                    <label class="form-label fw-bold">Current Position <span class="text-danger">*</span></label>
                                    <select class="form-select" id="editPosition" name="position" required>
                                        <option value="">Choose your position...</option>
                                        <option value="Kindergarten Teacher" <?= $teacher['position'] === 'Kindergarten Teacher' ? 'selected' : '' ?>>Kindergarten Teacher</option>
                                        <option value="Nursery Teacher" <?= $teacher['position'] === 'Nursery Teacher' ? 'selected' : '' ?>>Nursery Teacher</option>
                                        <option value="Pre-K Teacher" <?= $teacher['position'] === 'Pre-K Teacher' ? 'selected' : '' ?>>Pre-K Teacher</option>
                                        <option value="Assistant Teacher" <?= $teacher['position'] === 'Assistant Teacher' ? 'selected' : '' ?>>Assistant Teacher</option>
                                        <option value="Early Childhood Educator" <?= $teacher['position'] === 'Early Childhood Educator' ? 'selected' : '' ?>>Early Childhood Educator</option>
                                        <option value="Head Teacher" <?= $teacher['position'] === 'Head Teacher' ? 'selected' : '' ?>>Head Teacher</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- Educational Background Section -->
                        <div class="edit-section">
                            <h6 class="section-title"><i class="fas fa-graduation-cap"></i> Educational Background</h6>
                            <p class="section-description">Your degree and where you studied</p>
                            <div class="row g-3">
                                <div class="col-md-12">
                                    <label class="form-label fw-bold">Degree/Course <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" id="editDegree" name="degree"
                                           value="<?= safe($teacher['degree']) ?>"
                                           placeholder="e.g., Bachelor of Elementary Education"
                                           required>
                                </div>
                                <div class="col-md-8">
                                    <label class="form-label fw-bold">School/University <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" id="editInstitution" name="institution"
                                           value="<?= safe($teacher['institution']) ?>"
                                           placeholder="e.g., University of the Philippines"
                                           required>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label fw-bold">Year Graduated <span class="text-danger">*</span></label>
                                    <input type="number" class="form-control" id="editYear" name="year_graduated"
                                           value="<?= safe($teacher['year_graduated']) ?>"
                                           min="1950" max="<?= date('Y') ?>"
                                           placeholder="e.g., 2015"
                                           oninput="validateYear(this)"
                                           required>
                                    <small class="form-text text-muted">Enter a year between 1950 and <?= date('Y') ?></small>
                                </div>
                            </div>
                        </div>

                        <!-- Teaching Experience Section -->
                        <div class="edit-section">
                            <h6 class="section-title"><i class="fas fa-briefcase"></i> Teaching Experience</h6>
                            <p class="section-description">Share how long you've been teaching and your experience</p>
                            <div class="row g-3">
                                <div class="col-md-12">
                                    <label class="form-label fw-bold">Years of Teaching Experience <span class="text-danger">*</span></label>
                                    <input type="number" class="form-control" id="editExperienceYears" name="experience_years"
                                           value="<?= safe($teacher['experience_years']) ?>"
                                           min="0" max="60"
                                           placeholder="e.g., 5"
                                           oninput="validateExperience(this)"
                                           required>
                                    <small class="form-text text-muted">Enter the total number of years you've been teaching (0-60 years)</small>
                                </div>
                                <div class="col-md-12">
                                    <label class="form-label fw-bold">About Your Teaching Experience <span class="text-danger">*</span></label>
                                    <textarea class="form-control" id="editExperienceDesc" name="experience_desc"
                                              rows="4"
                                              placeholder="Tell parents or guardians about your teaching journey, the age groups you've worked with, and what you love about teaching..."
                                              required><?= safe($teacher['experience_desc']) ?></textarea>
                                    <small class="form-text text-muted">Share what makes you passionate about teaching young learners</small>
                                </div>
                            </div>
                        </div>

                        <!-- Contact Information Section -->
                        <div class="edit-section">
                            <h6 class="section-title"><i class="fas fa-envelope"></i> Contact Information</h6>
                            <p class="section-description">How parents or guardians can reach you</p>
                            <div class="row g-3">
                                <div class="col-md-12">
                                    <label class="form-label fw-bold">School Email Address <span class="text-danger">*</span></label>
                                    <input type="email" class="form-control" id="editEmail" name="email"
                                           value="<?= safe($teacher['email']) ?>"
                                           placeholder="e.g., teacher.maria@school.edu.ph"
                                           required>
                                    <small class="form-text text-muted">Use your school email - this will be visible to parents or guardians for communication</small>
                                </div>
                            </div>
                        </div>

                        <!-- Certifications Section -->
                        <div class="edit-section">
                            <h6 class="section-title"><i class="fas fa-certificate"></i> Certifications & Training</h6>
                            <p class="section-description">Professional certifications, licenses, and training you've completed</p>
                            <small class="form-text text-muted mb-3 d-block">Add relevant teaching licenses, professional development, or specialized training</small>
                            <div id="editCertifications">
                                <?php
                                    if (empty($certs)) $certs = [''];
                                    foreach ($certs as $cert) {
                                        echo '<div class="cert-edit-item mb-2"><input type="text" class="form-control cert-input" placeholder="e.g., Licensed Professional Teacher (LPT)" value="' . safe($cert) . '"><button type="button" class="btn btn-outline-danger btn-sm" onclick="removeCertification(this)"><i class="fas fa-trash"></i></button></div>';
                                    }
                                ?>
                            </div>
                            <button type="button" class="btn btn-outline-primary btn-sm mt-2" onclick="addCertification()">
                                <i class="fas fa-plus"></i> Add Another Certification
                            </button>
                        </div>

                        <!-- Skills & Interests Section -->
                        <div class="edit-section">
                            <h6 class="section-title"><i class="fas fa-star"></i> Special Skills & Interests</h6>
                            <p class="section-description">Your teaching specialties and interests that benefit your students</p>
                            <small class="form-text text-muted mb-3 d-block">Include skills like "Storytelling", "Music & Movement", "Arts & Crafts", "Bilingual Teaching", etc.</small>
                            <div id="editSkills">
                                <?php
                                    if (empty($skills)) $skills = [''];
                                    foreach ($skills as $skill) {
                                        echo '<div class="skill-edit-item mb-2"><input type="text" class="form-control skill-input" placeholder="e.g., Interactive Storytelling" value="' . safe($skill) . '"><button type="button" class="btn btn-outline-danger btn-sm" onclick="removeSkill(this)"><i class="fas fa-trash"></i></button></div>';
                                    }
                                ?>
                            </div>
                            <button type="button" class="btn btn-outline-primary btn-sm mt-2" onclick="addSkill()">
                                <i class="fas fa-plus"></i> Add Another Skill/Interest
                            </button>
                        </div>

                    </form>
                </div>

                <div class="modal-footer bg-light">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                    <button type="button" class="btn btn-success" onclick="saveProfile()">
                        <i class="fas fa-save"></i> Save My Profile
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- scripts -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
    // helper: show notification
    function showNotification(message, type = 'success') {
        const n = document.createElement('div');
        n.className = 'notification ' + (type === 'error' ? 'error' : '');
        n.innerHTML = `<i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i><span>${message}</span>`;
        document.body.appendChild(n);
        setTimeout(() => n.classList.add('show'), 50);
        setTimeout(() => { n.classList.remove('show'); setTimeout(() => n.remove(), 300); }, 3000);
    }

    // Validate year graduated
    function validateYear(input) {
        const currentYear = new Date().getFullYear();
        const minYear = 1950;
        const value = parseInt(input.value);

        if (value < minYear) {
            input.value = minYear;
        } else if (value > currentYear) {
            input.value = currentYear;
        }
    }

    // Validate teaching experience years
    function validateExperience(input) {
        const maxYears = 60;
        const value = parseInt(input.value);

        if (value < 0) {
            input.value = 0;
        } else if (value > maxYears) {
            input.value = maxYears;
        }
    }

    // preview chosen image
    function handleProfilePictureChange(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(ev) {
            document.getElementById('profilePicture').src = ev.target.result;
            document.getElementById('editProfilePicture').src = ev.target.result;
        };
        reader.readAsDataURL(file);
    }

    // dynamic cert/skill add/remove
    function addCertification() {
        const container = document.getElementById('editCertifications');
        const div = document.createElement('div');
        div.className = 'cert-edit-item mb-2';
        div.innerHTML = `<input type="text" class="form-control cert-input" placeholder="e.g., Licensed Professional Teacher (LPT)"><button type="button" class="btn btn-outline-danger btn-sm" onclick="removeCertification(this)"><i class="fas fa-trash"></i></button>`;
        container.appendChild(div);
    }
    function removeCertification(btn) { btn.parentElement.remove(); }

    function addSkill() {
        const container = document.getElementById('editSkills');
        const div = document.createElement('div');
        div.className = 'skill-edit-item mb-2';
        div.innerHTML = `<input type="text" class="form-control skill-input" placeholder="e.g., Interactive Storytelling"><button type="button" class="btn btn-outline-danger btn-sm" onclick="removeSkill(this)"><i class="fas fa-trash"></i></button>`;
        container.appendChild(div);
    }
    function removeSkill(btn) { btn.parentElement.remove(); }

    // build arrays from inputs
    function collectCertifications() {
        return Array.from(document.querySelectorAll('.cert-input')).map(i => i.value.trim()).filter(Boolean);
    }
    function collectSkills() {
        return Array.from(document.querySelectorAll('.skill-input')).map(i => i.value.trim()).filter(Boolean);
    }

    // Save to server: robustly handle non-JSON responses for debugging
    async function saveProfileToServer() {
        const fd = new FormData();

        fd.append('full_name', document.getElementById('editName').value || '');
        fd.append('position', document.getElementById('editPosition').value || '');
        fd.append('degree', document.getElementById('editDegree').value || '');
        fd.append('institution', document.getElementById('editInstitution').value || '');
        fd.append('year_graduated', document.getElementById('editYear').value || '');
        fd.append('experience_years', document.getElementById('editExperienceYears').value || '');
        fd.append('experience_desc', document.getElementById('editExperienceDesc').value || '');
        fd.append('email', document.getElementById('editEmail').value || '');

        // certifications & skills as JSON strings
        fd.append('certifications', JSON.stringify(collectCertifications()));
        fd.append('skills', JSON.stringify(collectSkills()));

        // photo file
        const photoEl = document.getElementById('profilePictureInput');
        if (photoEl && photoEl.files && photoEl.files.length) {
            fd.append('photo', photoEl.files[0]);
        }

        // Use absolute path for Railway compatibility
        const endpoint = '/source/handlers/save_profile.php';

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                body: fd,
                credentials: 'same-origin'
            });

            const text = await res.text();
            // try parse JSON; if not JSON, log for debugging and throw
            try {
                const json = JSON.parse(text);
                return json;
            } catch (err) {
                console.error('Non-JSON response from server:', text);
                return { success: false, error: 'Server returned non-JSON response. See console.' };
            }
        } catch (err) {
            console.error('Fetch error', err);
            throw err;
        }
    }

    // main save function with validation and UI update
    async function saveProfile() {
        // basic validation
        const required = ['editName','editPosition','editDegree','editInstitution','editYear','editExperienceYears','editExperienceDesc','editEmail'];
        let ok = true;
        required.forEach(id => {
            const el = document.getElementById(id);
            if (!el || !String(el.value || '').trim()) {
                if (el) el.classList.add('is-invalid');
                ok = false;
            } else {
                el.classList.remove('is-invalid');
            }
        });
        if (!ok) { showNotification('Please fill required fields', 'error'); return; }

        // Show loading animation
        const saveBtn = document.querySelector('.modal-footer .btn-success');
        const originalBtnContent = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...';

        // call server
        let result;
        try {
            result = await saveProfileToServer();
        } catch (err) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalBtnContent;
            showNotification('Network error. Could not save.', 'error');
            return;
        }

        // Hide loading animation
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtnContent;

        if (!result || !result.success) {
            showNotification('Error saving profile: ' + (result?.error || 'Unknown'), 'error');
            console.error('Save result:', result);
            return;
        }

        // update UI (reflect new values instantly)
        document.getElementById('displayName').textContent = document.getElementById('editName').value;
        document.getElementById('displayPosition').textContent = document.getElementById('editPosition').value;
        document.getElementById('displayDegree').textContent = document.getElementById('editDegree').value;
        document.getElementById('displayInstitution').textContent = document.getElementById('editInstitution').value;
        document.getElementById('displayYear').textContent = document.getElementById('editYear').value;
        document.getElementById('displayExperienceYears').textContent = document.getElementById('editExperienceYears').value + ' Years';
        document.getElementById('displayExperienceDesc').innerHTML = document.getElementById('editExperienceDesc').value.replace(/\n/g, '<br>');
        document.getElementById('displayEmail').textContent = document.getElementById('editEmail').value;

        // update certs display
        const certContainer = document.getElementById('displayCertifications');
        certContainer.innerHTML = '';
        collectCertifications().forEach(c => {
            const div = document.createElement('div');
            div.className = 'cert-item';
            div.innerHTML = `<i class="fas fa-award"></i><span>${c}</span>`;
            certContainer.appendChild(div);
        });

        // update skills display
        const skillsContainer = document.getElementById('displaySkills');
        skillsContainer.innerHTML = '';
        collectSkills().forEach(s => {
            const div = document.createElement('div');
            div.className = 'skill-item';
            div.innerHTML = `<div class="skill-icon"><i class="fas fa-lightbulb"></i></div><div class="skill-content"><div class="skill-name">${s}</div></div>`;
            skillsContainer.appendChild(div);
        });

        // close modal and show success
        const modalEl = document.getElementById('editProfileModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        showNotification('Profile updated successfully!', 'success');
    }

    // share profile (uses api/generate_share_token.php)
    async function shareProfile() {
      try {
        const res = await fetch('/source/handlers/generate_share_token.php', { method: 'POST' });
        const data = await res.json();

        if (!data.success || !data.token) {
          throw new Error(data.error || 'No token returned');
        }

        // Construct shareable public link
        const basePath = window.location.origin;
        const publicUrl = `${basePath}/source/pages/dashboard/public_profile.php?token=${data.token}`;

        // Set the URL in the modal input
        document.getElementById('shareUrlInput').value = publicUrl;

        // Show the modal
        const shareModal = new bootstrap.Modal(document.getElementById('shareProfileModal'));
        shareModal.show();

      } catch (err) {
        console.error('Share profile error:', err);
        showNotification('Failed to generate share link.', 'error');
      }
    }

    // Copy share link from modal
    async function copyShareLink() {
      const shareUrl = document.getElementById('shareUrlInput').value;
      const copyBtn = document.getElementById('copyBtn');

      try {
        // Try modern Clipboard API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(shareUrl);

          // Update button to show success
          const originalContent = copyBtn.innerHTML;
          copyBtn.innerHTML = '<i class="fas fa-check me-1"></i>Copied!';
          copyBtn.style.background = '#28a745';

          setTimeout(() => {
            copyBtn.innerHTML = originalContent;
            copyBtn.style.background = '#801b32';
          }, 2000);

          showNotification('Share link copied to clipboard!', 'success');
          return;
        }

        // Fallback: Legacy method using textarea
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        textarea.setAttribute('readonly', '');
        document.body.appendChild(textarea);

        textarea.select();
        textarea.setSelectionRange(0, shareUrl.length);

        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);

        if (successful) {
          // Update button to show success
          const originalContent = copyBtn.innerHTML;
          copyBtn.innerHTML = '<i class="fas fa-check me-1"></i>Copied!';
          copyBtn.style.background = '#28a745';

          setTimeout(() => {
            copyBtn.innerHTML = originalContent;
            copyBtn.style.background = '#801b32';
          }, 2000);

          showNotification('Share link copied to clipboard!', 'success');
        } else {
          showNotification('Please manually copy the link', 'error');
        }
      } catch (err) {
        console.error('Copy error:', err);
        showNotification('Please manually copy the link', 'error');
      }
    }


    // Open profile editor from welcome modal
    function openProfileEditor() {
        const welcomeModal = bootstrap.Modal.getInstance(document.getElementById('welcomeModal'));
        if (welcomeModal) welcomeModal.hide();

        const editModal = new bootstrap.Modal(document.getElementById('editProfileModal'));
        editModal.show();
    }

    // small helper to show server response in console for debugging when page loads
    document.addEventListener('DOMContentLoaded', () => {
        console.log('Teacher profile editor ready.');

        <?php if ($is_new_profile): ?>
        // Show welcome modal for new users
        const welcomeModal = new bootstrap.Modal(document.getElementById('welcomeModal'));
        welcomeModal.show();
        <?php endif; ?>

        // Mobile menu toggle functionality
        const menuToggle = document.querySelector('.mobile-menu-toggle');
        const header = document.querySelector('.header');
        const body = document.body;

        if (menuToggle && header) {
            menuToggle.addEventListener('click', function(e) {
                e.stopPropagation();
                header.classList.toggle('show');
                body.classList.toggle('menu-open');

                // Toggle icon and position
                const icon = this.querySelector('i');
                if (header.classList.contains('show')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                    // Move toggle button to the right when menu is open
                    menuToggle.style.left = '235px';
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                    // Move toggle button back to the left when menu is closed
                    menuToggle.style.left = '15px';
                }
            });

            // Close menu when clicking outside
            document.addEventListener('click', function(e) {
                if (header.classList.contains('show') &&
                    !header.contains(e.target) &&
                    !menuToggle.contains(e.target)) {
                    header.classList.remove('show');
                    body.classList.remove('menu-open');
                    const icon = menuToggle.querySelector('i');
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                    // Reset toggle button position
                    menuToggle.style.left = '15px';
                }
            });

            // Close menu when clicking on nav links
            const navLinks = header.querySelectorAll('.nav-link');
            navLinks.forEach(link => {
                link.addEventListener('click', function() {
                    header.classList.remove('show');
                    body.classList.remove('menu-open');
                    const icon = menuToggle.querySelector('i');
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                    // Reset toggle button position
                    menuToggle.style.left = '15px';
                });
            });
        }
    });
    </script>
</body>
</html>
