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

    if (!isset($_POST['email'])) {
        throw new Exception("Email is required");
    }

    $email = $_POST['email'];

    $stmt = $pdo->prepare("SELECT * FROM pending_users WHERE email = ?");
    $stmt->execute([$email]);
    $pending_user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$pending_user) {
        throw new Exception("No pending registration found for this email");
    }

    $verification_code = sprintf('%06d', mt_rand(0, 999999));
    $expires_at = date('Y-m-d H:i:s', strtotime('+15 minutes'));

    $stmt = $pdo->prepare("UPDATE pending_users SET verification_code = ?, verification_code_expires = ? WHERE email = ?");
    $stmt->execute([$verification_code, $expires_at, $email]);

    $mail = new PHPMailer(true);
    
    $mail->isSMTP();
    $mail->Host       = EnvLoader::get('SMTP_HOST', 'smtp.gmail.com');
    $mail->SMTPAuth   = true;
    $mail->Username   = EnvLoader::get('SMTP_USERNAME');
    $mail->Password   = EnvLoader::get('SMTP_PASSWORD');
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = EnvLoader::get('SMTP_PORT', 587);

    $mail->setFrom(EnvLoader::get('SMTP_USERNAME'), EnvLoader::get('APP_NAME', 'AniKwento'));
    $mail->addAddress($email, $pending_user['first_name'] . ' ' . $pending_user['last_name']);

    $mail->isHTML(true);
    $mail->Subject = 'AniKwento - New Verification Code';
    $mail->Body    = "
    <!DOCTYPE html>
    <html lang='en'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>AniKwento New Verification Code</title>
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
                <h2 style='color: #801B32; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;'>Hi {$pending_user['first_name']}! 🔄</h2>
                
                <p style='color: #555555; line-height: 1.6; margin: 0 0 25px 0; font-size: 16px;'>
                    We've generated a new verification code for your AniKwento registration.
                </p>
                
                <p style='color: #555555; line-height: 1.6; margin: 0 0 30px 0; font-size: 16px;'>
                    Please use this new verification code to complete your account setup:
                </p>
                
                <!-- Verification Code Box -->
                <div style='background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%); border: 3px solid #801B32; border-radius: 16px; padding: 30px; text-align: center; margin: 30px 0; box-shadow: 0 8px 25px rgba(128, 27, 50, 0.15);'>
                    <p style='color: #666666; font-size: 14px; margin: 0 0 15px 0; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;'>New Verification Code</p>
                    <div style='background: #ffffff; border-radius: 12px; padding: 20px; margin: 10px 0; box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.1);'>
                        <h1 style='color: #801B32; font-size: 42px; font-weight: bold; margin: 0; letter-spacing: 8px; font-family: \"Courier New\", monospace; text-shadow: 0 2px 4px rgba(128, 27, 50, 0.2);'>{$verification_code}</h1>
                    </div>
                </div>
                
                <div style='background-color: #FFF8E1; border-left: 4px solid #FFC553; padding: 16px; border-radius: 8px; margin: 25px 0;'>
                    <p style='color: #E65100; margin: 0; font-size: 14px; font-weight: 500;'>
                        ⏰ This new code will expire in <strong>15 minutes</strong>. Your previous code has been deactivated.
                    </p>
                </div>
                
                <p style='color: #777777; line-height: 1.6; margin: 25px 0 0 0; font-size: 14px;'>
                    If you didn't request a new verification code, you can safely ignore this email.
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

    echo json_encode([
        'success' => true,
        'message' => 'New verification code sent successfully'
    ]);

} catch (Exception $e) {
    error_log("Resend Code Error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>