<?php
// public_profile.php
require_once $_SERVER['DOCUMENT_ROOT'] . '/source/handlers/db_connection.php';

//Grab the token from URL
$token = $_GET['token'] ?? '';
$token = trim($token);

//Fetch teacher by share_token
$stmt = $conn->prepare(
  'SELECT * FROM teacher_profiles WHERE share_token = ?'
);
$stmt->bind_param('s', $token);
$stmt->execute();
$teacher = $stmt->get_result()->fetch_assoc();

if (!$teacher) {
  http_response_code(404);
  exit('Profile not found or link expired.');
}

//Helper to escape output
function safe($value) {
  return htmlspecialchars($value ?? '', ENT_QUOTES, 'UTF-8');
}

$certs  = json_decode($teacher['certifications']  ?? '[]', true);
$certs  = is_array($certs)  ? $certs  : explode(',', $teacher['certifications']);
$skills = json_decode($teacher['skills'] ?? '[]', true);
$skills = is_array($skills) ? $skills : explode(',', $teacher['skills']);
?>

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title><?= safe($teacher['full_name']) ?> — Teacher Profile</title>

  <!-- Main styles -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
        rel="stylesheet" />
  <link rel="stylesheet" href="/public/files/css/TeacherProfilesample.css" />


  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"/>

  <style>
    .header, .mobile-menu-toggle,
    .edit-profile-modal, .btn-edit,
    .picture-overlay { display: none !important; }
    .main { margin-left: 0 !important; }
  </style>
</head>
<body>
  <div class="main">
    <div class="profile-container">
 
      <!-- Profile Header -->
      <div class="profile-header-section">
        
        <div class="profile-main-info">
          
          <div class="profile-picture-section">
            
            <div class="profile-picture-wrapper">

              <img src="<?= $teacher['photo']
                    ? safe($teacher['photo'])
                    : '/public/files/images/teacher-placeholder.png' ?>"
                   alt="Profile Photo"
                   class="profile-picture">

            </div>
          </div>
          <div class="basic-info">
            <div class="name-section">
              <h1 class="teacher-name"><?= safe($teacher['full_name']) ?></h1>
            </div>
            <p class="teacher-position"><?= safe($teacher['position']) ?></p>
          </div>
          <img src="/public/files/images/AKlogo.png" alt="AniKwento Logo" class="header-logo">
        </div>
      </div>

      <!-- Profile Content -->
      <div class="profile-content">
        <div class="content-column">
          <!-- First Row: Educational Background (Left) and Teaching Experience (Right) -->
          <div class="row g-3 mb-3">
            <div class="col-md-6">
              <!-- Educational Background -->
              <div class="profile-card h-100">
                <div class="card-header">
                  <h3><i class="fas fa-graduation-cap"></i> Educational Background</h3>
                </div>
                <div class="card-body">
                  <div class="info-row">
                    <div class="info-label">Degree:</div>
                    <div class="info-value"><?= safe($teacher['degree']) ?></div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Institution:</div>
                    <div class="info-value"><?= safe($teacher['institution']) ?></div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Year Graduated:</div>
                    <div class="info-value">
                      <span class="year-badge"><?= safe($teacher['year_graduated']) ?></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-md-6">
              <!-- Teaching Experience -->
              <div class="profile-card h-100">
                <div class="card-header">
                  <h3><i class="fas fa-briefcase"></i> Teaching Experience</h3>
                </div>
                <div class="card-body">
                  <div class="experience-highlight">
                    <div class="experience-years">
                      <?= safe($teacher['experience_years']) ?> Years
                    </div>
                    <div class="experience-description">
                      <?= nl2br(safe($teacher['experience_desc'])) ?>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Second Row: Certifications & Training -->
          <div class="row g-3 mb-3">
            <div class="col-12">
              <!-- Certifications & Training -->
              <div class="profile-card">
                <div class="card-header">
                  <h3><i class="fas fa-certificate"></i> Certifications & Training</h3>
                </div>
                <div class="card-body">
                  <div class="certification-grid">
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
              <!-- Special Skills & Interests -->
              <div class="profile-card">
                <div class="card-header">
                  <h3><i class="fas fa-star"></i> Special Skills & Interests</h3>
                </div>
                <div class="card-body">
                  <div class="skills-showcase">
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
                          <div class="contact-value"><?= safe($teacher['email']) ?></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div> <!-- /.content-column -->
      </div> <!-- /.profile-content -->

    </div> <!-- /.profile-container -->
  </div> <!-- /.main -->

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
