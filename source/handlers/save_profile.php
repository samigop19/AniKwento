<?php
// JSON response headers
header('Content-Type: application/json');
error_reporting(0);

// Start session to get user_id
session_start();

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'User not logged in']);
    exit;
}

$current_user_id = $_SESSION['user_id'];

require_once __DIR__ . '/db_connection.php';

// Ensure DB connection
if (!$conn) {
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    exit;
}

// Helper: sanitize input
function clean($v) {
    return trim($v ?? '');
}

// Collect posted data
$full_name         = clean($_POST['full_name'] ?? '');
$position          = clean($_POST['position'] ?? '');
$degree            = clean($_POST['degree'] ?? '');
$institution       = clean($_POST['institution'] ?? '');
$year_graduated    = intval($_POST['year_graduated'] ?? 0);
$experience_years  = intval($_POST['experience_years'] ?? 0);
$experience_desc   = clean($_POST['experience_desc'] ?? '');
$email             = clean($_POST['email'] ?? '');
$certifications    = $_POST['certifications'] ?? '[]';
$skills            = $_POST['skills'] ?? '[]';

// Validate JSON for certifications/skills
if (!json_decode($certifications) && $certifications !== '[]') {
    $certifications = json_encode([]);
}
if (!json_decode($skills) && $skills !== '[]') {
    $skills = json_encode([]);
}

// ---- Handle file upload ----
$photoFilename = null;

if (!empty($_FILES['photo']['name'])) {
    $uploadDir = $_SERVER['DOCUMENT_ROOT'] . '/source/uploads/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    $tmpName = $_FILES['photo']['tmp_name'];
    $originalName = basename($_FILES['photo']['name']);
    $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

    // Accept only certain types
    $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    if (!in_array($ext, $allowed)) {
        echo json_encode(['success' => false, 'error' => 'Invalid file type']);
        exit;
    }

    // Unique file name
    $photoFilename = uniqid('teacher_', true) . '.' . $ext;
    $destPath = $uploadDir . $photoFilename;

    if (!move_uploaded_file($tmpName, $destPath)) {
        echo json_encode(['success' => false, 'error' => 'File upload failed']);
        exit;
    }
}

// ---- Update or Insert teacher row for the current user ----
// First check if profile exists for this user
$check_stmt = $conn->prepare("SELECT id FROM teacher_profiles WHERE user_id = ?");
$check_stmt->bind_param("i", $current_user_id);
$check_stmt->execute();
$check_result = $check_stmt->get_result();
$profile_exists = $check_result->num_rows > 0;
$check_stmt->close();

if ($profile_exists) {
    // Update existing profile
    if ($photoFilename) {
        $sql = "UPDATE teacher_profiles
                SET full_name=?, position=?, degree=?, institution=?, year_graduated=?, experience_years=?,
                    experience_desc=?, email=?, certifications=?, skills=?, photo=?
                WHERE user_id=?";
    } else {
        $sql = "UPDATE teacher_profiles
                SET full_name=?, position=?, degree=?, institution=?, year_graduated=?, experience_years=?,
                    experience_desc=?, email=?, certifications=?, skills=?
                WHERE user_id=?";
    }

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        echo json_encode(['success' => false, 'error' => 'Failed to prepare statement: ' . $conn->error]);
        exit;
    }

    if ($photoFilename) {
        $stmt->bind_param(
            "ssssiisssssi",
            $full_name,
            $position,
            $degree,
            $institution,
            $year_graduated,
            $experience_years,
            $experience_desc,
            $email,
            $certifications,
            $skills,
            $photoFilename,
            $current_user_id
        );
    } else {
        $stmt->bind_param(
            "ssssiissssi",
            $full_name,
            $position,
            $degree,
            $institution,
            $year_graduated,
            $experience_years,
            $experience_desc,
            $email,
            $certifications,
            $skills,
            $current_user_id
        );
    }
} else {
    // Insert new profile (this handles cases where profile wasn't auto-created)
    if ($photoFilename) {
        $sql = "INSERT INTO teacher_profiles (user_id, full_name, position, degree, institution, year_graduated, experience_years, experience_desc, email, certifications, skills, photo)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    } else {
        $sql = "INSERT INTO teacher_profiles (user_id, full_name, position, degree, institution, year_graduated, experience_years, experience_desc, email, certifications, skills, photo)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '')";
    }

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        echo json_encode(['success' => false, 'error' => 'Failed to prepare statement: ' . $conn->error]);
        exit;
    }

    if ($photoFilename) {
        $stmt->bind_param(
            "issssiisssss",
            $current_user_id,
            $full_name,
            $position,
            $degree,
            $institution,
            $year_graduated,
            $experience_years,
            $experience_desc,
            $email,
            $certifications,
            $skills,
            $photoFilename
        );
    } else {
        $stmt->bind_param(
            "issssiissss",
            $current_user_id,
            $full_name,
            $position,
            $degree,
            $institution,
            $year_graduated,
            $experience_years,
            $experience_desc,
            $email,
            $certifications,
            $skills
        );
    }
}

$ok = $stmt->execute();

if (!$ok) {
    echo json_encode(['success' => false, 'error' => 'Database operation failed: ' . $stmt->error]);
    $stmt->close();
    $conn->close();
    exit;
}

$stmt->close();
$conn->close();

echo json_encode(['success' => true]);
exit;
?>
