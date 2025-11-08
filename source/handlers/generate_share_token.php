<?php
header('Content-Type: application/json');

// Start session to get user_id
session_start();

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'User not logged in']);
    exit;
}

$current_user_id = $_SESSION['user_id'];

require_once __DIR__ . '/db_connection.php';

$token = '';
$stmt = $conn->prepare("SELECT share_token FROM teacher_profiles WHERE user_id = ?");
$stmt->bind_param('i', $current_user_id);
$stmt->execute();
$result = $stmt->get_result();
$row = $result->fetch_assoc();

if (!empty($row['share_token'])) {
    $token = $row['share_token'];
} else {
    $token = bin2hex(random_bytes(16));
    $upd = $conn->prepare("UPDATE teacher_profiles SET share_token=? WHERE user_id=?");
    $upd->bind_param('si', $token, $current_user_id);
    $upd->execute();
    $upd->close();
}

$stmt->close();
$conn->close();

echo json_encode(['success' => true, 'token' => $token]);
exit;
?>
