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
$topic = $_POST['topic'] ?? '';
$age_group = $_POST['age_group'] ?? '';
$feedback = $_POST['feedback'] ?? '';

if (empty($feedback)) {
    echo json_encode(['success' => false, 'message' => 'Please provide feedback']);
    exit;
}

// Create table if not exists
$createTable = "CREATE TABLE IF NOT EXISTS feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    topic VARCHAR(100),
    age_group VARCHAR(50),
    feedback TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES teachers(id)
)";
$conn->query($createTable);

$stmt = $conn->prepare("INSERT INTO feedback (user_id, topic, age_group, feedback) VALUES (?, ?, ?, ?)");
$stmt->bind_param("isss", $user_id, $topic, $age_group, $feedback);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Thank you for your feedback!']);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to submit feedback']);
}

$stmt->close();
$conn->close();
