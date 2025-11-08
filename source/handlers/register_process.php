<?php
session_start();
header('Content-Type: application/json');

require_once '../../vendor/autoload.php';
require_once __DIR__ . '/../config/env.php';
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

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

    $first_name = trim($_POST['first_name']);
    $last_name = trim($_POST['last_name']);
    $email = trim($_POST['email']);
    $password = $_POST['password'];

    // Validate names
    if (!preg_match('/^[A-Za-z\s]{2,50}$/', $first_name)) {
        throw new Exception("First name must be 2-50 characters and contain only letters and spaces");
    }

    if (!preg_match('/^[A-Za-z\s]{2,50}$/', $last_name)) {
        throw new Exception("Last name must be 2-50 characters and contain only letters and spaces");
    }

    // Validate email format - accept three patterns:
    // 1. 7-digit student ID format: 1234567@ub.edu.ph
    // 2. firstname.lastname format: firstname.lastname@ub.edu.ph
    // 3. A-#### format: A-1234@ub.edu.ph
    $validEmailPattern = '/^(\d{7}|[a-zA-Z]+\.[a-zA-Z]+|A-\d{4})@ub\.edu\.ph$/';

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception("Invalid email format");
    }

    if (!preg_match($validEmailPattern, $email)) {
        throw new Exception("Please use a valid UB email address (7-digit ID, firstname.lastname, or A-1234 format)");
    }

    if (strlen($password) < 6) {
        throw new Exception("Password must be at least 6 characters long");
    }

    $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetchColumn() > 0) {
        throw new Exception("This email is already registered");
    }

    $stmt = $pdo->prepare("SELECT COUNT(*) FROM pending_users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetchColumn() > 0) {
        $stmt = $pdo->prepare("DELETE FROM pending_users WHERE email = ?");
        $stmt->execute([$email]);
    }

    $verification_code = sprintf('%06d', mt_rand(0, 999999));
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);
    $expires_at = date('Y-m-d H:i:s', strtotime('+15 minutes'));

    $stmt = $pdo->prepare("INSERT INTO pending_users (first_name, last_name, email, password, verification_code, expires_at) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([$first_name, $last_name, $email, $hashed_password, $verification_code, $expires_at]);

    $mail = new PHPMailer(true);
    
    $mail->isSMTP();
    $mail->Host       = EnvLoader::get('SMTP_HOST', 'smtp.gmail.com');
    $mail->SMTPAuth   = true;
    $mail->Username   = EnvLoader::get('SMTP_USERNAME');
    $mail->Password   = EnvLoader::get('SMTP_PASSWORD');
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = EnvLoader::get('SMTP_PORT', 587);

    $mail->setFrom(EnvLoader::get('SMTP_USERNAME'), EnvLoader::get('APP_NAME', 'AniKwento'));
    $mail->addAddress($email, $first_name . ' ' . $last_name);

    $mail->isHTML(true);
    $mail->Subject = 'AniKwento - Email Verification Code';
    $mail->Body    = "
    <!DOCTYPE html>
    <html lang='en'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>AniKwento Verification</title>
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
                <h2 style='color: #801B32; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;'>Hi {$first_name}! 👋</h2>
                
                <p style='color: #555555; line-height: 1.6; margin: 0 0 25px 0; font-size: 16px;'>
                    Welcome to AniKwento! We're excited to have you join our platform designed for University of Batangas educators.
                </p>
                
                <p style='color: #555555; line-height: 1.6; margin: 0 0 30px 0; font-size: 16px;'>
                    To complete your registration, please enter the verification code below:
                </p>
                
                <!-- Verification Code Box -->
                <div style='background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%); border: 3px solid #801B32; border-radius: 16px; padding: 30px; text-align: center; margin: 30px 0; box-shadow: 0 8px 25px rgba(128, 27, 50, 0.15);'>
                    <p style='color: #666666; font-size: 14px; margin: 0 0 15px 0; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;'>Your Verification Code</p>
                    <div style='background: #ffffff; border-radius: 12px; padding: 20px; margin: 10px 0; box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.1);'>
                        <h1 style='color: #801B32; font-size: 42px; font-weight: bold; margin: 0; letter-spacing: 8px; font-family: \"Courier New\", monospace; text-shadow: 0 2px 4px rgba(128, 27, 50, 0.2);'>{$verification_code}</h1>
                    </div>
                </div>
                
                <div style='background-color: #FFF8E1; border-left: 4px solid #FFC553; padding: 16px; border-radius: 8px; margin: 25px 0;'>
                    <p style='color: #E65100; margin: 0; font-size: 14px; font-weight: 500;'>
                        ⏰ This code will expire in <strong>15 minutes</strong>. Please verify your account as soon as possible.
                    </p>
                </div>
                
                <p style='color: #777777; line-height: 1.6; margin: 25px 0 0 0; font-size: 14px;'>
                    If you didn't create an account with AniKwento, you can safely ignore this email.
                </p>
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

    $mail->send();

    $_SESSION['pending_email'] = $email;
    
    echo json_encode([
        'success' => true, 
        'message' => 'Verification code sent to your email'
    ]);

} catch (Exception $e) {
    error_log("Registration Error: " . $e->getMessage());
    echo json_encode([
        'success' => false, 
        'message' => $e->getMessage()
    ]);
}
?>