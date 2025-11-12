<?php



if (session_status() === PHP_SESSION_NONE) {
    session_start();
}


if (!isset($_SESSION['user_id'])) {
    
    header('Location: /');
    exit();
}


require_once __DIR__ . '/db_connection.php';


$user_id = $_SESSION['user_id'];
$user_first_name = 'User'; 
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
    
    error_log("Error fetching user info: " . $e->getMessage());
}