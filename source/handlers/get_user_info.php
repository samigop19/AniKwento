<?php
/**
 * User Information Handler
 * Fetches the logged-in user's information from the database
 * This file should be included at the top of protected pages
 */

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    // Redirect to login page if not logged in
    header('Location: /source/pages/home.html');
    exit();
}

// Include database connection
require_once __DIR__ . '/db_connection.php';

// Fetch user information
$user_id = $_SESSION['user_id'];
$user_first_name = 'User'; // Default fallback
$user_last_name = '';
$user_email = '';

try {
    $stmt = $conn->prepare("SELECT first_name, last_name, email FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result && $result->num_rows > 0) {
        $user = $result->fetch_assoc();
        $user_first_name = htmlspecialchars($user['first_name'], ENT_QUOTES, 'UTF-8');
        $user_last_name = htmlspecialchars($user['last_name'], ENT_QUOTES, 'UTF-8');
        $user_email = htmlspecialchars($user['email'], ENT_QUOTES, 'UTF-8');
    }

    $stmt->close();
} catch (Exception $e) {
    // Log error but continue with default name
    error_log("Error fetching user info: " . $e->getMessage());
}
?>
