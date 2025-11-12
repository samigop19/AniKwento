<?php
/**
 * Save Custom Voice Handler
 * Saves a custom voice to the custom_voices table
 */

session_start();
header('Content-Type: application/json');
error_reporting(0);

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'User not logged in']);
    exit;
}

$user_id = $_SESSION['user_id'];
require_once __DIR__ . '/db_connection.php';

// Ensure DB connection
if (!$conn) {
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    exit;
}

// Collect and sanitize POST data
$voice_key = trim($_POST['voice_key'] ?? '');
$voice_name = trim($_POST['voice_name'] ?? '');
$voice_id = trim($_POST['voice_id'] ?? '');
$avatar_url = trim($_POST['avatar_url'] ?? '');
$preview_url = trim($_POST['preview_url'] ?? '');

// Validate required fields
if (empty($voice_key) || empty($voice_name) || empty($voice_id)) {
    echo json_encode(['success' => false, 'error' => 'Missing required fields']);
    exit;
}

// Check if this voice_key already exists for this user
$check_stmt = $conn->prepare("SELECT id FROM custom_voices WHERE user_id = ? AND voice_key = ?");
$check_stmt->bind_param("is", $user_id, $voice_key);
$check_stmt->execute();
$result = $check_stmt->get_result();
$voice_exists = $result->num_rows > 0;
$check_stmt->close();

if ($voice_exists) {
    // Update existing custom voice
    $sql = "UPDATE custom_voices SET
            voice_name = ?,
            voice_id = ?,
            avatar_url = ?,
            preview_url = ?
            WHERE user_id = ? AND voice_key = ?";

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        echo json_encode(['success' => false, 'error' => 'Failed to prepare update statement: ' . $conn->error]);
        exit;
    }

    $stmt->bind_param(
        "ssssis",
        $voice_name,
        $voice_id,
        $avatar_url,
        $preview_url,
        $user_id,
        $voice_key
    );
} else {
    // Insert new custom voice
    $sql = "INSERT INTO custom_voices (
                user_id, voice_key, voice_name, voice_id, avatar_url, preview_url
            ) VALUES (?, ?, ?, ?, ?, ?)";

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        echo json_encode(['success' => false, 'error' => 'Failed to prepare insert statement: ' . $conn->error]);
        exit;
    }

    $stmt->bind_param(
        "isssss",
        $user_id,
        $voice_key,
        $voice_name,
        $voice_id,
        $avatar_url,
        $preview_url
    );
}

$success = $stmt->execute();

if (!$success) {
    echo json_encode(['success' => false, 'error' => 'Database operation failed: ' . $stmt->error]);
    $stmt->close();
    $conn->close();
    exit;
}

$stmt->close();
$conn->close();

echo json_encode([
    'success' => true,
    'message' => 'Custom voice saved successfully',
    'voice' => [
        'voice_key' => $voice_key,
        'voice_name' => $voice_name,
        'voice_id' => $voice_id,
        'avatar_url' => $avatar_url,
        'preview_url' => $preview_url
    ]
]);
exit;
