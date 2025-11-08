<?php
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../config/env.php';

try {
    $pdo = new PDO(
        "mysql:host=" . EnvLoader::get('DB_HOST', 'localhost') . ";dbname=" . EnvLoader::get('DB_NAME', 'anikwento_db') . ";charset=utf8mb4",
        EnvLoader::get('DB_USERNAME', 'root'),
        EnvLoader::get('DB_PASSWORD', ''),
        array(
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
        )
    );

    if (!isset($_POST['verification_code']) || !isset($_POST['email'])) {
        throw new Exception("Missing verification code or email");
    }

    $verification_code = $_POST['verification_code'];
    $email = $_POST['email'];

    $stmt = $pdo->prepare("SELECT * FROM pending_users WHERE email = ? AND verification_code = ?");
    $stmt->execute([$email, $verification_code]);
    $pending_user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$pending_user) {
        throw new Exception("Invalid verification code");
    }

    if (new DateTime() > new DateTime($pending_user['verification_code_expires'])) {
        $stmt = $pdo->prepare("DELETE FROM pending_users WHERE email = ?");
        $stmt->execute([$email]);
        throw new Exception("Verification code has expired. Please register again.");
    }

    // Create user account
    $stmt = $pdo->prepare("INSERT INTO users (first_name, last_name, email, password, created_at) VALUES (?, ?, ?, ?, NOW())");
    $stmt->execute([
        $pending_user['first_name'],
        $pending_user['last_name'],
        $pending_user['email'],
        $pending_user['password']
    ]);

    // Get the newly created user ID
    $new_user_id = $pdo->lastInsertId();

    // Automatically create a new teacher profile for this user with empty/default fields
    $stmt = $pdo->prepare("INSERT INTO teacher_profiles (user_id, full_name, position, degree, institution, year_graduated, experience_years, experience_desc, email, certifications, skills, photo) VALUES (?, '', '', '', '', 0, 0, '', ?, '[]', '[]', '')");
    $stmt->execute([$new_user_id, $pending_user['email']]);

    $stmt = $pdo->prepare("DELETE FROM pending_users WHERE email = ?");
    $stmt->execute([$email]);

    unset($_SESSION['pending_email']);

    echo json_encode([
        'success' => true,
        'message' => 'Account verified successfully!'
    ]);

} catch (Exception $e) {
    error_log("Verification Error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>