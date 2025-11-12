<?php
/**
 * Get Custom Voices Handler
 * Retrieves all custom voices for the logged-in user
 */

// Start output buffering to catch any stray output
ob_start();

session_start();
header('Content-Type: application/json');

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    ob_clean();
    echo json_encode(['success' => false, 'error' => 'User not logged in']);
    exit;
}

$user_id = $_SESSION['user_id'];
require_once __DIR__ . '/db_connection.php';

// Ensure DB connection
if (!$conn) {
    ob_clean();
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    exit;
}

// Query all custom voices for this user
$stmt = $conn->prepare("SELECT voice_key, voice_name, voice_id, avatar_url, preview_url, created_at FROM custom_voices WHERE user_id = ? ORDER BY created_at DESC");

if (!$stmt) {
    ob_clean();
    echo json_encode(['success' => false, 'error' => 'Failed to prepare statement: ' . $conn->error]);
    exit;
}

$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

$custom_voices = [];
while ($row = $result->fetch_assoc()) {
    $custom_voices[] = [
        'voice_key' => $row['voice_key'],
        'voice_name' => $row['voice_name'],
        'voice_id' => $row['voice_id'],
        'avatar_url' => $row['avatar_url'],
        'preview_url' => $row['preview_url'],
        'created_at' => $row['created_at']
    ];
}

$stmt->close();
$conn->close();

ob_clean();
echo json_encode([
    'success' => true,
    'custom_voices' => $custom_voices,
    'count' => count($custom_voices)
]);
exit;
