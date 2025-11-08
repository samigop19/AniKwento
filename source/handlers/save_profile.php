<?php
// Start output buffering to prevent any premature output
ob_start();

// Enable error logging but suppress display
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// Start session to get user_id
session_start();

// Clean any previous output and set JSON header
ob_clean();
header('Content-Type: application/json; charset=utf-8');

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    ob_clean();
    echo json_encode(['success' => false, 'error' => 'User not logged in']);
    ob_end_flush();
    exit;
}

$current_user_id = $_SESSION['user_id'];

// Use absolute path for Railway compatibility
require_once $_SERVER['DOCUMENT_ROOT'] . '/source/handlers/db_connection.php';

// Ensure DB connection exists and is valid
if (!isset($conn) || $conn->connect_error) {
    ob_clean();
    $error_msg = isset($conn) ? $conn->connect_error : 'Database connection object not initialized';
    error_log("DB Connection Error in save_profile.php: " . $error_msg);
    echo json_encode(['success' => false, 'error' => 'Database connection failed: ' . $error_msg]);
    ob_end_flush();
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

// ---- Handle file upload to R2 ----
$photoUrl = null;

if (!empty($_FILES['photo']['name']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
    try {
        require_once __DIR__ . '/r2_storage.php';

        $tmpName = $_FILES['photo']['tmp_name'];
        $originalName = basename($_FILES['photo']['name']);
        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

        // Accept only certain types
        $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        if (!in_array($ext, $allowed)) {
            ob_clean();
            echo json_encode(['success' => false, 'error' => 'Invalid file type. Allowed: jpg, jpeg, png, gif, webp']);
            ob_end_flush();
            exit;
        }

        // Determine MIME type
        $mimeTypes = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp'
        ];
        $mimeType = $mimeTypes[$ext] ?? 'image/jpeg';

        // Generate unique filename for R2
        $r2Filename = 'profiles/teacher_' . $current_user_id . '_' . uniqid() . '.' . $ext;

        // Upload to R2
        $r2Storage = new R2Storage();
        $uploadResult = $r2Storage->uploadImage($tmpName, $r2Filename, $mimeType);

        if (!$uploadResult['success']) {
            throw new Exception($uploadResult['error'] ?? 'R2 upload failed');
        }

        $photoUrl = $uploadResult['url'];
        error_log("Successfully uploaded profile picture to R2: " . $photoUrl);

    } catch (Exception $e) {
        error_log("File upload error in save_profile.php: " . $e->getMessage());
        ob_clean();
        echo json_encode(['success' => false, 'error' => 'File upload failed: ' . $e->getMessage()]);
        ob_end_flush();
        exit;
    }
} elseif (!empty($_FILES['photo']['name']) && $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
    error_log("File upload error code: " . $_FILES['photo']['error']);
}

// ---- Update or Insert teacher row for the current user ----
try {
    // First check if profile exists for this user
    $check_stmt = $conn->prepare("SELECT id FROM teacher_profiles WHERE user_id = ?");
    if (!$check_stmt) {
        throw new Exception("Failed to prepare check statement: " . $conn->error);
    }
    $check_stmt->bind_param("i", $current_user_id);
    if (!$check_stmt->execute()) {
        throw new Exception("Failed to execute check statement: " . $check_stmt->error);
    }
    $check_result = $check_stmt->get_result();
    $profile_exists = $check_result->num_rows > 0;
    $check_stmt->close();
} catch (Exception $e) {
    error_log("Database check error in save_profile.php: " . $e->getMessage());
    ob_clean();
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    ob_end_flush();
    exit;
}

if ($profile_exists) {
    // Update existing profile
    if ($photoUrl) {
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
        ob_clean();
        echo json_encode(['success' => false, 'error' => 'Failed to prepare statement: ' . $conn->error]);
        ob_end_flush();
        exit;
    }

    if ($photoUrl) {
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
            $photoUrl,
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
    if ($photoUrl) {
        $sql = "INSERT INTO teacher_profiles (user_id, full_name, position, degree, institution, year_graduated, experience_years, experience_desc, email, certifications, skills, photo)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    } else {
        $sql = "INSERT INTO teacher_profiles (user_id, full_name, position, degree, institution, year_graduated, experience_years, experience_desc, email, certifications, skills, photo)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '')";
    }

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        ob_clean();
        echo json_encode(['success' => false, 'error' => 'Failed to prepare statement: ' . $conn->error]);
        ob_end_flush();
        exit;
    }

    if ($photoUrl) {
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
            $photoUrl
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

try {
    $ok = $stmt->execute();

    if (!$ok) {
        throw new Exception('Database operation failed: ' . $stmt->error);
    }

    $stmt->close();
    $conn->close();

    // Clean buffer and send JSON response
    ob_clean();
    echo json_encode(['success' => true]);
    ob_end_flush();
} catch (Exception $e) {
    error_log("Database operation error in save_profile.php: " . $e->getMessage());
    ob_clean();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    ob_end_flush();
    if (isset($stmt)) $stmt->close();
    if (isset($conn)) $conn->close();
}
exit;
