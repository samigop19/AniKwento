<?php
/**
 * Delete Custom Voice Handler
 * Deletes a custom voice from the custom_voices table
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

// Get voice_key from POST data
$voice_key = trim($_POST['voice_key'] ?? '');

// Validate required fields
if (empty($voice_key)) {
    echo json_encode(['success' => false, 'error' => 'Missing voice_key']);
    exit;
}

// Delete the custom voice (only if it belongs to this user)
$sql = "DELETE FROM custom_voices WHERE user_id = ? AND voice_key = ?";
$stmt = $conn->prepare($sql);

if (!$stmt) {
    echo json_encode(['success' => false, 'error' => 'Failed to prepare statement: ' . $conn->error]);
    exit;
}

$stmt->bind_param("is", $user_id, $voice_key);
$success = $stmt->execute();

if (!$success) {
    echo json_encode(['success' => false, 'error' => 'Failed to delete custom voice: ' . $stmt->error]);
    $stmt->close();
    $conn->close();
    exit;
}

$affected_rows = $stmt->affected_rows;
$stmt->close();
$conn->close();

if ($affected_rows === 0) {
    echo json_encode(['success' => false, 'error' => 'Custom voice not found or already deleted']);
    exit;
}

echo json_encode([
    'success' => true,
    'message' => 'Custom voice deleted successfully',
    'voice_key' => $voice_key
]);
exit;
