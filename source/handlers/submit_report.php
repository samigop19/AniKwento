<?php
session_start();
require_once 'db_connection.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
    exit;
}

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Please login first']);
    exit;
}

$user_id = $_SESSION['user_id'];
$problem = $_POST['problem'] ?? '';
$urgency = $_POST['urgency'] ?? '';
$activity = $_POST['activity'] ?? '';
$details = $_POST['details'] ?? '';

if (empty($problem)) {
    echo json_encode(['success' => false, 'message' => 'Please select a problem type']);
    exit;
}


$createTable = "CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    problem VARCHAR(100) NOT NULL,
    urgency VARCHAR(50),
    activity VARCHAR(100),
    details TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES teachers(id)
)";
$conn->query($createTable);

$stmt = $conn->prepare("INSERT INTO reports (user_id, problem, urgency, activity, details) VALUES (?, ?, ?, ?, ?)");
$stmt->bind_param("issss", $user_id, $problem, $urgency, $activity, $details);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Report submitted successfully. We\'ll look into it!']);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to submit report']);
}

$stmt->close();
$conn->close();
