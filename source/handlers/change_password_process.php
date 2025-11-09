<?php
session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../../vendor/autoload.php';
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

    $action = $_POST['action'] ?? '';

    switch($action) {
        case 'send_code':
            sendVerificationCode($pdo);
            break;

        case 'verify_code':
            verifyCode($pdo);
            break;

        case 'change_password':
            changePassword($pdo);
            break;

        case 'resend_code':
            resendCode($pdo);
            break;

        default:
            throw new Exception("Invalid action");
    }

} catch (Exception $e) {
    error_log("Change Password Error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

function sendVerificationCode($pdo) {
    $email = trim($_POST['email']);

    // Check if user is logged in
    if (!isset($_SESSION['user_id'])) {
        throw new Exception("You must be logged in to change your password");
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception("Invalid email format");
    }

    if (!preg_match('/^\d{7,9}@ub\.edu\.ph$/', $email)) {
        throw new Exception("Please use a valid UB email address");
    }

    // Check if email matches logged-in user's email
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ? AND email = ?");
    $stmt->execute([$_SESSION['user_id'], $email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        throw new Exception("Email does not match your account");
    }

    // Generate verification code
    $verification_code = sprintf('%06d', mt_rand(0, 999999));

    // Use MySQL's ADDTIME to ensure timezone consistency
    $stmt_time = $pdo->prepare("SELECT ADDTIME(NOW(), '0:15:0') as expires_at");
    $stmt_time->execute();
    $time_result = $stmt_time->fetch(PDO::FETCH_ASSOC);
    $expires_at = $time_result['expires_at'];

    // Store verification code in users table
    $stmt = $pdo->prepare("UPDATE users SET verification_code = ?, verification_code_expires = ? WHERE id = ?");
    $stmt->execute([$verification_code, $expires_at, $_SESSION['user_id']]);

    // Send email
    sendVerificationEmail($email, $user['first_name'], $verification_code);

    echo json_encode([
        'success' => true,
        'message' => 'Verification code sent to your email'
    ]);
}

function verifyCode($pdo) {
    $email = trim($_POST['email']);
    $verification_code = trim($_POST['verification_code']);

    // Check if user is logged in
    if (!isset($_SESSION['user_id'])) {
        throw new Exception("You must be logged in to verify code");
    }

    // Validate input
    if (empty($email) || empty($verification_code)) {
        throw new Exception("Email and verification code are required");
    }

    if (!preg_match('/^\d{6}$/', $verification_code)) {
        throw new Exception("Please enter a valid 6-digit verification code");
    }

    // Check for valid verification code
    $stmt = $pdo->prepare("SELECT *, verification_code_expires > NOW() as is_valid FROM users WHERE id = ? AND email = ? AND verification_code = ?");
    $stmt->execute([$_SESSION['user_id'], $email, $verification_code]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        throw new Exception("Invalid verification code. Please check and try again.");
    }

    if (!$user['is_valid']) {
        throw new Exception("Verification code has expired. Please request a new one.");
    }

    // Mark this email as verified in session
    $_SESSION['password_change_verified'] = $email;
    $_SESSION['password_change_time'] = time();

    echo json_encode([
        'success' => true,
        'message' => 'Code verified successfully'
    ]);
}

function changePassword($pdo) {
    // Check if user is logged in
    if (!isset($_SESSION['user_id'])) {
        throw new Exception("You must be logged in to change password");
    }

    $email = $_POST['email'];
    $new_password = $_POST['new_password'];
    $confirm_password = $_POST['confirm_password'] ?? '';

    // Check if user has verified their code in this session
    if (!isset($_SESSION['password_change_verified']) || $_SESSION['password_change_verified'] !== $email) {
        throw new Exception("Invalid session. Please verify your code first.");
    }

    // Check if verification session is still valid (15 minutes)
    if (!isset($_SESSION['password_change_time']) || (time() - $_SESSION['password_change_time']) > 900) {
        unset($_SESSION['password_change_verified']);
        unset($_SESSION['password_change_time']);
        throw new Exception("Session expired. Please start over.");
    }

    // Basic password validation
    if (strlen($new_password) < 6) {
        throw new Exception("Password must be at least 6 characters long");
    }

    // Check if passwords match
    if ($new_password !== $confirm_password) {
        throw new Exception("Passwords do not match");
    }

    // Verify the user and get current password
    $stmt = $pdo->prepare("SELECT password, verification_code_expires > NOW() as is_valid FROM users WHERE id = ? AND email = ? AND verification_code IS NOT NULL");
    $stmt->execute([$_SESSION['user_id'], $email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || !$user['is_valid']) {
        throw new Exception("Verification session expired. Please start over.");
    }

    // Check if new password is different from current password
    if (password_verify($new_password, $user['password'])) {
        throw new Exception("New password must be different from your current password");
    }

    // Hash the new password
    $hashed_password = password_hash($new_password, PASSWORD_DEFAULT);

    // Update the password and clear verification code
    $stmt = $pdo->prepare("UPDATE users SET password = ?, verification_code = NULL, verification_code_expires = NULL WHERE id = ?");
    $stmt->execute([$hashed_password, $_SESSION['user_id']]);

    // Clear all session data and destroy session (force re-login with new password)
    session_unset();
    session_destroy();

    echo json_encode([
        'success' => true,
        'message' => 'Password changed successfully'
    ]);
}

function resendCode($pdo) {
    $email = $_POST['email'];

    // Check if user is logged in
    if (!isset($_SESSION['user_id'])) {
        throw new Exception("You must be logged in to resend code");
    }

    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ? AND email = ?");
    $stmt->execute([$_SESSION['user_id'], $email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        throw new Exception("Email does not match your account");
    }

    // Generate new verification code
    $verification_code = sprintf('%06d', mt_rand(0, 999999));

    // Use MySQL's ADDTIME to ensure timezone consistency
    $stmt_time = $pdo->prepare("SELECT ADDTIME(NOW(), '0:15:0') as expires_at");
    $stmt_time->execute();
    $time_result = $stmt_time->fetch(PDO::FETCH_ASSOC);
    $expires_at = $time_result['expires_at'];

    // Update verification code
    $stmt = $pdo->prepare("UPDATE users SET verification_code = ?, verification_code_expires = ? WHERE id = ?");
    $stmt->execute([$verification_code, $expires_at, $_SESSION['user_id']]);

    // Send new email
    sendVerificationEmail($email, $user['first_name'], $verification_code, true);

    echo json_encode([
        'success' => true,
        'message' => 'New verification code sent successfully'
    ]);
}

function sendVerificationEmail($email, $first_name, $verification_code, $isResend = false) {
    $sendgridApiKey = EnvLoader::get('SENDGRID_API_KEY');

    if (!$sendgridApiKey) {
        throw new Exception("SENDGRID_API_KEY not configured");
    }

    $subject = $isResend ? 'AniKwento - New Password Change Verification Code' : 'AniKwento - Password Change Verification Code';
    $emoji = $isResend ? '🔄' : '🔐';
    $message = $isResend ?
        "We've generated a new verification code for your password change request." :
        "We received a request to change your AniKwento password.";

    $emailHtml = "
    <!DOCTYPE html>
    <html lang='en'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>AniKwento Password Change</title>
    </head>
    <body style='margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif;'>
        <div style='max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); overflow: hidden;'>
            <!-- Header -->
            <div style='background: linear-gradient(135deg, #801B32 0%, #972542 100%); padding: 30px 40px; text-align: center;'>
                <h1 style='color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);'>AniKwento</h1>
                <p style='color: #FFC553; margin: 8px 0 0 0; font-size: 14px; font-weight: 500;'>Empowering UB educators with AI-generated stories!</p>
            </div>

            <!-- Content -->
            <div style='padding: 40px;'>
                <h2 style='color: #801B32; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;'>Hi {$first_name}! {$emoji}</h2>

                <p style='color: #555555; line-height: 1.6; margin: 0 0 25px 0; font-size: 16px;'>
                    {$message}
                </p>

                <p style='color: #555555; line-height: 1.6; margin: 0 0 30px 0; font-size: 16px;'>
                    Please use this verification code to verify your identity:
                </p>

                <!-- Verification Code Box -->
                <div style='background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%); border: 3px solid #801B32; border-radius: 16px; padding: 30px; text-align: center; margin: 30px 0; box-shadow: 0 8px 25px rgba(128, 27, 50, 0.15);'>
                    <p style='color: #666666; font-size: 14px; margin: 0 0 15px 0; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;'>Verification Code</p>
                    <div style='background: #ffffff; border-radius: 12px; padding: 20px; margin: 10px 0; box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.1);'>
                        <h1 style='color: #801B32; font-size: 42px; font-weight: bold; margin: 0; letter-spacing: 8px; font-family: \"Courier New\", monospace; text-shadow: 0 2px 4px rgba(128, 27, 50, 0.2);'>{$verification_code}</h1>
                    </div>
                </div>

                <div style='background-color: #FFF8E1; border-left: 4px solid #FFC553; padding: 16px; border-radius: 8px; margin: 25px 0;'>
                    <p style='color: #E65100; margin: 0; font-size: 14px; font-weight: 500;'>
                        ⏰ This code will expire in <strong>15 minutes</strong>. Please complete the password change as soon as possible.
                    </p>
                </div>

                <div style='background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 8px; margin: 25px 0;'>
                    <p style='color: #dc2626; margin: 0; font-size: 14px; font-weight: 500;'>
                        🛡️ If you didn't request a password change, please ignore this email and contact support if you have concerns.
                    </p>
                </div>
            </div>

            <!-- Footer -->
            <div style='background-color: #f8f9fa; padding: 25px 40px; text-align: center; border-top: 1px solid #e9ecef;'>
                <p style='color: #666666; margin: 0; font-size: 12px; line-height: 1.5;'>
                    © 2025 AniKwento. All rights reserved.<br>
                    <span style='color: #801B32;'>Supporting UB teachers with innovative AI storytelling tools</span>
                </p>
            </div>
        </div>
    </body>
    </html>";

    // Send email via SendGrid API
    $fromEmail = EnvLoader::get('SENDGRID_FROM_EMAIL', 'noreply@anikwento.com');
    $fromName = EnvLoader::get('SENDGRID_FROM_NAME', 'AniKwento');

    $data = [
        'personalizations' => [
            [
                'to' => [['email' => $email]],
                'subject' => $subject
            ]
        ],
        'from' => [
            'email' => $fromEmail,
            'name' => $fromName
        ],
        'content' => [
            [
                'type' => 'text/html',
                'value' => $emailHtml
            ]
        ]
    ];

    $ch = curl_init('https://api.sendgrid.com/v3/mail/send');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $sendgridApiKey,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    // Log for debugging
    error_log("SendGrid API Response Code: " . $httpCode);
    if ($curlError) {
        error_log("SendGrid cURL Error: " . $curlError);
    }

    // SendGrid returns 202 for successful email acceptance
    if ($httpCode !== 202) {
        error_log("SendGrid API Error Response: " . $response);
        throw new Exception("Failed to send verification email. Please try again later.");
    }
}
?>
